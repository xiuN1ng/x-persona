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
import { fusePersonas, type FusionPersonaResult } from '../persona/fusion-engine'

export type ActiveTab = 'report' | 'llm' | 'oejts'
export type CardSlot = 'outer' | 'inner' | 'fusion'

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
  fusionPersona: FusionPersonaResult | null;

  activeTab: ActiveTab;
  selectedCardSlot: CardSlot;
  isFused: boolean;
  isFusingAnimation: boolean;
  showTrinityGallery: boolean;
  isSharedView: boolean;

  // Actions
  setHandle: (handle: string) => void;
  setPastedLlmText: (text: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedCardSlot: (slot: CardSlot) => void;
  setShowTrinityGallery: (show: boolean) => void;
  fetchPersonaData: (targetHandle: string, forceFresh?: boolean) => Promise<void>;
  importArchivePosts: (posts: Post[], handle?: string) => void;
  applyLlmOutput: (output: PersonaLlmOutput) => void;
  setOejtsAnswer: (id: number, value: number) => void;
  applyPrefillOejts: () => void;
  finishOejts: () => void;
  triggerFusion: () => void;
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
  fusionPersona: null,

  activeTab: 'report',
  selectedCardSlot: 'outer',
  isFused: false,
  isFusingAnimation: false,
  showTrinityGallery: false,
  isSharedView: false,

  setHandle: (handle) => set({ handle }),
  setPastedLlmText: (pastedLlmText) => set({ pastedLlmText }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedCardSlot: (selectedCardSlot) => set({ selectedCardSlot, showTrinityGallery: false }),
  setShowTrinityGallery: (showTrinityGallery) => set({ showTrinityGallery }),

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
      if (!forceFresh) {
        const cached = await getCachedUserData(cleanHandle)
        if (cached && cached.posts.length > 0) {
          set({ progress: { current: 60, total: 100, message: '从本地加载推文数据并锻造表世界卡牌...' } })
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
            selectedCardSlot: 'outer',
            oejtsAnswers: computePrefillAnswers(axes, features),
            oejtsScores: null,
            comparison: null,
            fusionPersona: null,
            isFused: false,
            showTrinityGallery: false,
          })
          return
        }
      }

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

      await setCachedUserData(cleanHandle, profile, posts)

      set({ progress: { current: 90, total: 100, message: '正在程序化生成【表世界·赛博人格卡】...' } })

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
        oejtsScores: null,
        comparison: null,
        fusionPersona: null,
        isFused: false,
        showTrinityGallery: false,
        loading: false,
        activeTab: 'report',
        selectedCardSlot: 'outer',
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
      oejtsScores: null,
      comparison: null,
      fusionPersona: null,
      isFused: false,
      showTrinityGallery: false,
      activeTab: 'report',
      selectedCardSlot: 'outer',
      error: null,
    })
  },

  applyLlmOutput: (output: PersonaLlmOutput) => {
    const { persona, oejtsScores } = get()
    if (!persona) return

    const newAxes = {
      field: output.axis.field,
      density: output.axis.density,
      temperature: output.axis.temperature,
      rhythm: output.axis.rhythm,
    }
    const archetype = ARCHETYPES[output.archetype] || persona.archetype
    const updatedPersona: PersonaResult = {
      code: output.archetype,
      axes: newAxes,
      archetype,
    }

    // Re-compute comparison & fusion if inner card already exists
    let comparison = get().comparison
    let fusionPersona = get().fusionPersona
    if (oejtsScores) {
      comparison = comparePersonas(newAxes, oejtsScores, updatedPersona.code)
      fusionPersona = fusePersonas(updatedPersona, oejtsScores, comparison)
    }

    set({
      llmOutput: output,
      persona: updatedPersona,
      comparison,
      fusionPersona,
      activeTab: 'report',
      selectedCardSlot: 'outer',
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
    const fusionPersona = fusePersonas(persona, oejtsScores, comparison)

    set({
      oejtsScores,
      comparison,
      fusionPersona,
      activeTab: 'report',
      selectedCardSlot: 'inner', // Immediately show Card II (Inner Self Card)
    })
  },

  triggerFusion: () => {
    const { persona, oejtsScores, comparison } = get()
    if (!persona || !oejtsScores || !comparison) return

    const fusionPersona = fusePersonas(persona, oejtsScores, comparison)
    set({ isFusingAnimation: true, fusionPersona })

    setTimeout(() => {
      set({
        isFusingAnimation: false,
        isFused: true,
        selectedCardSlot: 'fusion',
        activeTab: 'report',
        showTrinityGallery: false,
      })
    }, 1100)
  },

  initFromUrlHash: () => {
    if (typeof window === 'undefined') return false
    const hash = window.location.hash
    if (!hash || !hash.includes('#r=')) return false

    const shared = decodeShareState(hash)
    if (!shared) return false

    const archetype = ARCHETYPES[shared.archetypeCode] || ARCHETYPES.CSFD
    const outerPersona: PersonaResult = {
      code: shared.archetypeCode,
      axes: shared.axes,
      archetype,
    }

    let oejtsScores: OejtsScores | null = null
    let comparison: ComparisonResult | null = null
    let fusionPersona: FusionPersonaResult | null = null

    if (shared.oejts) {
      oejtsScores = {
        ieRaw: 24,
        snRaw: 24,
        ftRaw: 24,
        jpRaw: 24,
        type: shared.oejts.type,
        ieNormalized: shared.oejts.ieNormalized ?? 50,
        snNormalized: shared.oejts.snNormalized ?? 50,
        ftNormalized: shared.oejts.ftNormalized ?? 50,
        jpNormalized: shared.oejts.jpNormalized ?? 50,
      }
      comparison = comparePersonas(outerPersona.axes, oejtsScores, outerPersona.code)
      fusionPersona = fusePersonas(outerPersona, oejtsScores, comparison)
    }

    const isFused = Boolean(shared.isFused && fusionPersona)

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
      persona: outerPersona,
      llmOutput: shared.llmOutput || null,
      oejtsScores,
      comparison,
      fusionPersona,
      isFused,
      selectedCardSlot: isFused ? 'fusion' : oejtsScores ? 'inner' : 'outer',
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
      fusionPersona: null,
      activeTab: 'report',
      selectedCardSlot: 'outer',
      isFused: false,
      isFusingAnimation: false,
      showTrinityGallery: false,
      isSharedView: false,
    })
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  },
}))
