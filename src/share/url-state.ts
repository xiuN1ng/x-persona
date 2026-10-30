import LZString from 'lz-string'
import type { AxisScores } from '../persona/axes'
import type { PersonaLlmOutput } from '../llm/schema'

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
  };
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

export function buildShareUrl(state: ShareState): string {
  const hash = encodeShareState(state)
  const origin = window.location.origin
  const pathname = window.location.pathname
  return `${origin}${pathname}#r=${hash}`
}

export function buildTweetIntentUrl(text: string, shareUrl: string): string {
  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(shareUrl)
  return `https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}`
}
