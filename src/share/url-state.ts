import LZString from 'lz-string'
import type { AxisScores } from '../persona/axes'
import type { PersonaLlmOutput } from '../llm/schema'

export const OPEN_SOURCE_PAGE_URL = 'https://xiun1ng.github.io/x-persona/'
export const OPEN_SOURCE_DISPLAY_HOST = 'xiun1ng.github.io/x-persona'

export interface ShareState {
  version: 1;
  profile: {
    screenName: string;
    name: string;
    avatarUrl?: string;
    followers: number;
    statusesCount: number;
  };
  axes: AxisScores;
  archetypeCode: string;
  llmOutput?: PersonaLlmOutput;
  oejts?: {
    type: string;
    consistencyIndex: number;
    ieNormalized?: number;
    snNormalized?: number;
    ftNormalized?: number;
    jpNormalized?: number;
  };
  isFused?: boolean;
}

export function encodeShareState(state: ShareState): string {
  try {
    const json = JSON.stringify(state)
    return LZString.compressToEncodedURIComponent(json)
  } catch (err) {
    console.error('[ShareState] Failed to encode state', err)
    return ''
  }
}

export function decodeShareState(encodedHash: string): ShareState | null {
  try {
    const raw = encodedHash.replace(/^#r=/, '').replace(/^#/, '')
    if (!raw) return null
    const json = LZString.decompressFromEncodedURIComponent(raw)
    if (!json) return null
    const parsed = JSON.parse(json)
    if (parsed && parsed.archetypeCode && parsed.profile) {
      return parsed as ShareState
    }
    return null
  } catch (err) {
    console.warn('[ShareState] Failed to decode URL state', err)
    return null
  }
}

export function getPublicPageBaseUrl(): string {
  if (typeof window === 'undefined') return OPEN_SOURCE_PAGE_URL
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
    return OPEN_SOURCE_PAGE_URL
  }
  const base = `${window.location.origin}${window.location.pathname}`
  return base.endsWith('/') ? base : `${base}/`
}

export function buildShareUrl(state: ShareState): string {
  const hash = encodeShareState(state)
  const baseUrl = getPublicPageBaseUrl()
  return `${baseUrl}#r=${hash}`
}

export function buildTweetIntentUrl(text: string, shareUrl?: string): string {
  const targetUrl = shareUrl || OPEN_SOURCE_PAGE_URL
  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(targetUrl)
  return `https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}`
}
