import type { AxisScores } from '../persona/axes'
import type { FeatureVector } from '../features/types'
import { OEJTS_ITEMS } from './items'

export function computePrefillAnswers(
  axes: AxisScores,
  features: FeatureVector
): Record<number, number> {
  const prefill: Record<number, number> = {}

  // Map 0-100 score to 1-5 scale:
  // 0 -> 1, 25 -> 2, 50 -> 3, 75 -> 4, 100 -> 5
  const toScale = (score: number) => {
    if (score <= 20) return 1
    if (score <= 40) return 2
    if (score <= 60) return 3
    if (score <= 80) return 4
    return 5
  }

  for (const item of OEJTS_ITEMS) {
    let rawScore = 50
    switch (item.dimension) {
      case 'IE':
        // High field (conversational) -> Extraverted (higher)
        rawScore = axes.field
        break
      case 'SN':
        // High density (sniper, short) -> Sensing (lower for N, higher for S)
        rawScore = 100 - axes.density
        break
      case 'FT':
        // High temp (feeler) -> Feeling (lower for T, higher for F)
        rawScore = 100 - axes.temperature
        break
      case 'JP':
        // High rhythm (drifter) -> Perceiving (higher for P)
        rawScore = axes.rhythm
        break
    }

    // Specific question micro-adjustments from exact feature values
    if (item.id === 1) { // Makes lists vs relies on memory
      if (features.longPostRate > 20) rawScore -= 20
    } else if (item.id === 3) { // Needs time alone
      if (features.replyRate > 40) rawScore -= 25
    } else if (item.id === 15) { // Parties
      if (features.replyRate > 50) rawScore += 25
    } else if (item.id === 21) { // Procrastination / burstiness
      if (features.burstinessFano > 1.8) rawScore += 20
    }

    prefill[item.id] = toScale(Math.min(Math.max(rawScore, 5), 95))
  }

  return prefill
}
