import { create } from 'zustand'
import type { Profile, Post } from '../providers/types'
import { FxTwitterProvider } from '../providers/fxtwitter'
import { getCachedUserData, setCachedUserData } from '../providers/cache'
import type { FeatureVector } from '../features/types'
import { computeFeatureVector } from '../features'
import { computeAxisScores, determineArchetype, type PersonaResult } from '../persona/axes'
import type { PersonaLlmOutput } from '../llm/schema'
import { scoreOejts, comparePersonas, type OejtsScores, type ComparisonResult } from '../oejts/scoring'
import { computePrefillAnswers } from '../oejts/prefill'
import { decodeShareState } from '../share/url-state'
import { ARCHETYPES } from '../persona/archetypes'

export type ActiveTab = 'report' | 'llm' | 'oejts' | 'compare'

interface PersonaStoreState {
  handle: string;
  loading: boolean;
  progress: { current: number; total: number; message: string };
  error: string | null;

  profile: Profile | null;
  posts: Post[];
  features: FeatureVector | null;
  persona: PersonaResult | null;

  llmOutput: PersonaLlmOutput | null;
  pastedLlmText: string;

  oejtsAnswers: Record<number, number>;
  oejtsScores: OejtsScores | null;
  comparison: ComparisonResult | null;

  activeTab: ActiveTab;
  isSharedView: boolean;

  // Actions
  setHandle: (handle: string) => void;
  setPastedLlmText: (text: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
  fetchPersonaData: (targetHandle: string, forceFresh?: boolean) => Promise<void>;
  importArchivePosts: (posts: Post[], handle?: string) => void;
  applyLlmOutput: (output: PersonaLlmOutput) => void;
  setOejtsAnswer: (id: number, value: number) => void;
  applyPrefillOejts: () => void;
  finishOejts: () => void;
  initFromUrlHash: () => boolean;
  reset: () => void;
}

export const usePersonaStore = create<PersonaStoreState>((set, get) => ({
  handle: '',
  loading: false,
  progress: { current: 0, total: 100, message: '' },
  error: null,

  profile: null,
  posts: [],
  features: null,
  persona: null,

  llmOutput: null,
  pastedLlmText: '',

  oejtsAnswers: {},
  oejtsScores: null,
  comparison: null,

  activeTab: 'report',
  isSharedView: false,

  setHandle: (handle) => set({ handle }),
  setPastedLlmText: (pastedLlmText) => set({ pastedLlmText }),
  setActiveTab: (activeTab) => set({ activeTab }),

  fetchPersonaData: async (targetHandle: string, forceFresh = false) => {
    const cleanHandle = targetHandle.trim().replace(/^@+/, '')
    if (!cleanHandle) {
      set({ error: '请输入有效的 X 用户名' })
      return
    }

    set({
      loading: true,
      error: null,
      handle: cleanHandle,
      progress: { current: 10, total: 100, message: '正在检查本地缓存...' },
    })

    try {
      // 1. Check cache first unless force fresh
      if (!forceFresh) {
        const cached = await getCachedUserData(cleanHandle)
        if (cached && cached.posts.length > 0) {
          set({ progress: { current: 60, total: 100, message: '从本地加载推文数据并计算特征...' } })
          const features = computeFeatureVector(cached.posts)
          const axes = computeAxisScores(features)
          const persona = determineArchetype(axes)
          set({
            profile: cached.profile,
            posts: cached.posts,
            features,
            persona,
            loading: false,
            activeTab: 'report',
            oejtsAnswers: computePrefillAnswers(axes, features),
          })
          return
        }
      }

      // 2. Fetch via FxTwitter
      const provider = new FxTwitterProvider()
      set({ progress: { current: 20, total: 100, message: `正在拉取 @${cleanHandle} 的用户画像...` } })

      const profile = await provider.fetchProfile(cleanHandle)

      set({ progress: { current: 40, total: 100, message: '正在拉取推文历史与互动数据...' } })

      const posts = await provider.fetchTimeline(cleanHandle, {
        max: 160,
        includeReplies: true,
        onProgress: (fetched, total) => {
          set({
            progress: {
              current: Math.min(40 + Math.round((fetched / total) * 45), 85),
              total: 100,
              message: `已获取 ${fetched} 条公开推文...`,
            },
          })
        },
      })

      if (posts.length === 0) {
        throw new Error('未获取到该用户的公开推文，可能为私密账号或无发帖历史')
      }

      // 3. Cache data
      await setCachedUserData(cleanHandle, profile, posts)

      // 4. Feature Extraction & Persona
      set({ progress: { current: 90, total: 100, message: '正在计算行为特征向量与原型矩阵...' } })

      const features = computeFeatureVector(posts)
      const axes = computeAxisScores(features)
      const persona = determineArchetype(axes)
      const prefilledAnswers = computePrefillAnswers(axes, features)

      set({
        profile,
        posts,
        features,
        persona,
        oejtsAnswers: prefilledAnswers,
        loading: false,
        activeTab: 'report',
      })
    } catch (err: any) {
      set({
        loading: false,
        error: err.message || '拉取数据失败，请重试或检查账号是否公开',
      })
    }
  },

  importArchivePosts: (posts: Post[], mockHandle = 'archive_user') => {
    if (posts.length === 0) return
    const profile: Profile = {
      screenName: mockHandle,
      name: mockHandle,
      description: 'Imported from local X archive',
      avatarUrl: '',
      followers: 0,
      following: 0,
      statusesCount: posts.length,
      likesCount: 0,
      verified: false,
    }

    const features = computeFeatureVector(posts)
    const axes = computeAxisScores(features)
    const persona = determineArchetype(axes)
    const prefilledAnswers = computePrefillAnswers(axes, features)

    set({
      handle: mockHandle,
      profile,
      posts,
      features,
      persona,
      oejtsAnswers: prefilledAnswers,
      activeTab: 'report',
      error: null,
    })
  },

  applyLlmOutput: (output: PersonaLlmOutput) => {
    const currentPersona = get().persona
    if (!currentPersona) return

    // Allow LLM to fine-tune axes if valid
    const newAxes = {
      field: output.axis.field,
      density: output.axis.density,
      temperature: output.axis.temperature,
      rhythm: output.axis.rhythm,
    }
    const archetype = ARCHETYPES[output.archetype] || currentPersona.archetype

    set({
      llmOutput: output,
      persona: {
        code: output.archetype,
        axes: newAxes,
        archetype,
      },
      activeTab: 'report',
    })
  },

  setOejtsAnswer: (id: number, value: number) => {
    set(state => ({
      oejtsAnswers: {
        ...state.oejtsAnswers,
        [id]: value,
      },
    }))
  },

  applyPrefillOejts: () => {
    const { persona, features } = get()
    if (!persona || !features) return
    const prefilled = computePrefillAnswers(persona.axes, features)
    set({ oejtsAnswers: prefilled })
  },

  finishOejts: () => {
    const { oejtsAnswers, persona } = get()
    if (!persona) return

    const oejtsScores = scoreOejts(oejtsAnswers)
    const comparison = comparePersonas(persona.axes, oejtsScores, persona.code)

    set({
      oejtsScores,
      comparison,
      activeTab: 'compare',
    })
  },

  initFromUrlHash: () => {
    if (typeof window === 'undefined') return false
    const hash = window.location.hash
    if (!hash || !hash.includes('#r=')) return false

    const shared = decodeShareState(hash)
    if (!shared) return false

    const archetype = ARCHETYPES[shared.archetypeCode] || ARCHETYPES.CSFD

    set({
      handle: shared.profile.screenName,
      profile: {
        screenName: shared.profile.screenName,
        name: shared.profile.name,
        avatarUrl: shared.profile.avatarUrl || '',
        followers: shared.profile.followers || 0,
        following: 0,
        statusesCount: shared.profile.statusesCount || 0,
        likesCount: 0,
        description: '',
        verified: false,
      },
      persona: {
        code: shared.archetypeCode,
        axes: shared.axes,
        archetype,
      },
      llmOutput: shared.llmOutput || null,
      isSharedView: true,
      activeTab: 'report',
    })

    return true
  },

  reset: () => {
    set({
      handle: '',
      loading: false,
      error: null,
      profile: null,
      posts: [],
      features: null,
      persona: null,
      llmOutput: null,
      pastedLlmText: '',
      oejtsAnswers: {},
      oejtsScores: null,
      comparison: null,
      activeTab: 'report',
      isSharedView: false,
    })
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  },
}))
