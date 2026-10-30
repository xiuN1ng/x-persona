import type { FeatureVector } from '../features/types'
import { ARCHETYPES, type ArchetypeInfo } from './archetypes'

export interface AxisScores {
  field: number; // 0 = Broadcaster (B), 100 = Conversationalist (C)
  density: number; // 0 = Essayist (E), 100 = Sniper (S)
  temperature: number; // 0 = Analyst (A), 100 = Feeler (F)
  rhythm: number; // 0 = Clock (K), 100 = Drifter (D)
}

export interface PersonaResult {
  code: string; // 4-letter code, e.g. 'CSFD'
  axes: AxisScores;
  archetype: ArchetypeInfo;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(Math.round(value), min), max)
}

export function computeAxisScores(features: FeatureVector): AxisScores {
  // 1. Field (场域): B (0) <---> C (100)
  // Dominated by replyRate vs originalRate, adjusted by HHI
  let field = 50
  const replyDiff = features.replyRate - features.originalRate // -100 to +100
  field = 50 + replyDiff * 0.6
  if (features.replyTargetHHI > 0.4) {
    // Concentrated replies (private chatting rather than public conversation)
    field -= 10
  } else if (features.replyTargetHHI < 0.1 && features.replyRate > 30) {
    // Highly diverse conversationalist
    field += 10
  }

  // 2. Density (密度): E (0) <---> S (100)
  // High avgCharCount & longPostRate -> Essayist (lower)
  // Short tweets (< 60 chars) -> Sniper (higher)
  let density = 50
  if (features.avgCharCount <= 50) {
    density = 80 + (50 - features.avgCharCount) * 0.4
  } else if (features.avgCharCount >= 200) {
    density = 20 - Math.min((features.avgCharCount - 200) * 0.05, 15)
  } else {
    // 50 to 200 chars
    density = 80 - ((features.avgCharCount - 50) / 150) * 60
  }
  // Penalize by long post rate
  density -= features.longPostRate * 0.5

  // 3. Temperature (温度): A (0) <---> F (100)
  // Analyst vs Feeler
  let temperature = 40
  const emotionRate = (features.positiveSentimentRate + features.negativeSentimentRate) // 0-100
  temperature += emotionRate * 0.35
  temperature += Math.min(features.exclamationRate * 0.6, 20)
  temperature += Math.min(features.emojiDensity * 8, 20)
  temperature += Math.min(features.firstPersonRate * 0.3, 15)

  // 4. Rhythm (节律): K (0) <---> D (100)
  // Clock (regular, scheduled) vs Drifter (chaotic, night owl, bursty)
  let rhythm = 40
  // Night owls lean strongly towards Drifter
  rhythm += Math.min(features.nightOwlIndex * 0.8, 30)
  // Fano factor > 1 indicates burstiness
  if (features.burstinessFano > 1.5) {
    rhythm += Math.min((features.burstinessFano - 1.5) * 12, 30)
  } else if (features.burstinessFano < 0.9) {
    rhythm -= 15
  }

  return {
    field: clamp(field),
    density: clamp(density),
    temperature: clamp(temperature),
    rhythm: clamp(rhythm),
  }
}

export function determineArchetype(axes: AxisScores): PersonaResult {
  const c1 = axes.field >= 50 ? 'C' : 'B'
  const c2 = axes.density >= 50 ? 'S' : 'E'
  const c3 = axes.temperature >= 50 ? 'F' : 'A'
  const c4 = axes.rhythm >= 50 ? 'D' : 'K'

  const code = `${c1}${c2}${c3}${c4}`
  const archetype = ARCHETYPES[code] || ARCHETYPES.CSFD

  return {
    code,
    axes,
    archetype,
  }
}
