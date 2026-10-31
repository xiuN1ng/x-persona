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
  modifierZh: string; // X-native behavioral prefix, e.g. '万赞破圈'
  modifierEn: string; // e.g. 'VIRAL CATALYST'
  displayTitleZh: string; // e.g. '万赞破圈·赛博布道者'
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(Math.round(value), min), max)
}

/**
 * Calibrated 4D X-Native Axis Scoring Engine
 * Designed around real-world X (Twitter) timeline distributions so all 16 archetypes
 * are evenly reachable across diverse creators.
 */
export function computeAxisScores(features: FeatureVector): AxisScores {
  // ============================================================================
  // 1. FIELD (场域): B 独立广播 (0) <---> C 社区共鸣/对话 (100) [Threshold: 50]
  // ============================================================================
  // On X's public timeline, interaction manifests not only as direct replies,
  // but also @mentions, quote tweets, asking questions, and high comment-to-like ratios.
  const discussionRatio =
    features.avgLikes > 0 ? features.avgReplies / features.avgLikes : 0

  let field = 18
  field += features.replyRate * 1.15
  field += features.mentionRate * 0.82
  field += features.quoteRate * 1.10
  field += features.retweetRate * 0.42
  field += Math.min(features.questionRate * 0.75, 16)
  field += Math.min(discussionRatio * 135, 18)

  if (features.replyRate >= 8) {
    if (features.replyTargetHHI < 0.22) {
      // Broad social butterfly across many accounts
      field += 8
    } else if (features.replyTargetHHI > 0.55) {
      // Mostly self-threading or replying to a single account
      field -= 8
    }
  }

  // Pure monologue broadcaster adjustment
  if (features.originalRate >= 82 && features.replyRate < 8 && features.mentionRate < 10) {
    field -= 10
  }

  // ============================================================================
  // 2. DENSITY (密度): E 深度长文 (0) <---> S 瞬时碎片/短推 (100) [Threshold: 50]
  // ============================================================================
  // Language-adaptive character baseline:
  // 1 Chinese/Japanese character carries ~1.85x the information density of 1 ASCII letter.
  const cjkMultiplier =
    features.primaryLanguage === 'zh' || features.primaryLanguage === 'ja'
      ? 1.85
      : features.zhEnMixedRate >= 20
      ? 1.45
      : 1.0

  const effectiveChars = features.avgCharCount * cjkMultiplier
  // 115 effective chars (~62 Chinese chars or 115 English chars) is the 50-point balance
  let density = 50 + (115 - effectiveChars) * 0.44

  // Long-form threads & curated deep links pull toward Essayist (E < 50)
  density -= features.longPostRate * 0.68
  density -= Math.min(features.linkRate * 0.24, 10)

  // Short visual captions or high-frequency punchlines pull toward Sniper (S >= 50)
  if (features.avgCharCount < 38 && features.mediaRate >= 35) {
    density += 9
  }

  // ============================================================================
  // 3. TEMPERATURE (温度): A 冷静解构 (0) <---> F 鲜活感性 (100) [Threshold: 50]
  // ============================================================================
  let temperature = 38
  const emotionRate = features.positiveSentimentRate + features.negativeSentimentRate

  // Expressive / Feeler signals (+)
  temperature += emotionRate * 0.42
  temperature += Math.min(features.sentimentVolatility * 28, 14)
  temperature += Math.min(features.exclamationRate * 0.48, 18)
  temperature += Math.min(features.emojiDensity * 7.5, 18)
  temperature += Math.min(features.firstPersonRate * 0.32, 14)
  temperature += Math.min(features.mediaRate * 0.14, 9)

  // Analytical / Rational signals (-)
  temperature -= Math.min(features.linkRate * 0.34, 14)
  temperature -= Math.min(features.zhEnMixedRate * 0.16, 10)
  temperature -= Math.min(features.longPostRate * 0.18, 9)

  if (features.exclamationRate < 8 && features.emojiDensity < 0.25) {
    temperature -= 10
  }

  // ============================================================================
  // 4. RHYTHM (节律): K 规律秩序 (0) <---> D 随性游牧 (100) [Threshold: 50]
  // ============================================================================
  // Uses circadian window concentration + log-scaled interval burstiness + night-owl index
  // instead of raw Fano factor (which explodes whenever humans sleep or skip a day).
  let rhythm = 46

  // Circadian top-4-hour concentration (0..1)
  const totalHourly = features.hourlyDistribution.reduce((a, b) => a + b, 0)
  if (totalHourly >= 5) {
    const sortedHours = [...features.hourlyDistribution].sort((a, b) => b - a)
    const top4Sum = sortedHours.slice(0, 4).reduce((a, b) => a + b, 0)
    const top4Share = top4Sum / totalHourly // typical range: 0.30 .. 0.75
    // High concentration in fixed daily hours -> Clock (K < 50)
    rhythm += (0.46 - top4Share) * 55
  }

  // Log-scaled burstiness around realistic human baseline (Fano ~ 12 -> log10 = 1.08)
  const logFano = Math.log10(Math.max(1, features.burstinessFano))
  rhythm += clamp((logFano - 1.08) * 22, -16, 20)

  // Night owl behavior (00:00 - 06:00)
  if (features.nightOwlIndex <= 8) {
    rhythm -= 8
  } else if (features.nightOwlIndex > 12) {
    rhythm += Math.min((features.nightOwlIndex - 12) * 0.85, 24)
  }

  return {
    field: clamp(field),
    density: clamp(density),
    temperature: clamp(temperature),
    rhythm: clamp(rhythm),
  }
}

/**
 * Derives an X-native behavioral modifier prefix from the user's standout platform metrics
 */
export function deriveXBehavioralModifier(
  axes: AxisScores,
  features?: FeatureVector
): { modifierZh: string; modifierEn: string } {
  if (features) {
    if (
      features.avgLikes >= 150 ||
      features.avgViews >= 15000 ||
      (features.mostEngagedPost && features.mostEngagedPost.likes >= 500)
    ) {
      return { modifierZh: '万赞破圈', modifierEn: 'VIRAL CATALYST' }
    }
    if (features.nightOwlIndex >= 24) {
      return { modifierZh: '凌晨三点', modifierEn: '3AM NOCTURNE' }
    }
    if (features.mediaRate >= 42) {
      return { modifierZh: '视觉策展', modifierEn: 'VISUAL CURATOR' }
    }
    if (features.linkRate >= 26) {
      return { modifierZh: '信源捕手', modifierEn: 'ALPHA HUNTER' }
    }
    if (features.zhEnMixedRate >= 32) {
      return { modifierZh: '双语极客', modifierEn: 'BILINGUAL GEEK' }
    }
    if (features.longPostRate >= 22 || features.avgCharCount >= 115) {
      return { modifierZh: '深度连载', modifierEn: 'THREAD ARCHITECT' }
    }
    if (features.hashtagRate >= 28) {
      return { modifierZh: '话题风暴', modifierEn: 'TREND WEAVER' }
    }
    if (features.replyRate >= 25 || features.mentionRate >= 28) {
      return { modifierZh: '茶馆主理', modifierEn: 'SALON HOST' }
    }
    if (features.retweetRate + features.quoteRate >= 28) {
      return { modifierZh: '星际转播', modifierEn: 'SIGNAL RELAY' }
    }
    if (features.questionRate >= 20) {
      return { modifierZh: '灵魂发问', modifierEn: 'SOCRATIC PROBE' }
    }
    if (features.exclamationRate >= 26 || features.emojiDensity >= 2.0) {
      return { modifierZh: '高能感叹', modifierEn: 'HIGH VOLTAGE' }
    }
    if (features.avgCharCount > 0 && features.avgCharCount <= 36 && features.emojiDensity < 0.3) {
      return { modifierZh: '极简冷冽', modifierEn: 'ZERO NOISE' }
    }
  }

  // Fallback: derive from the user's most extreme axis deviation from 50
  const deviations = [
    {
      dist: Math.abs(axes.field - 50),
      zh: axes.field < 50 ? '独立电台' : '共鸣磁场',
      en: axes.field < 50 ? 'SOLO BROADCAST' : 'ECHO NEXUS',
    },
    {
      dist: Math.abs(axes.density - 50),
      zh: axes.density < 50 ? '深水长文' : '瞬时狙击',
      en: axes.density < 50 ? 'DEEP ESSAY' : 'FLASH SNIPER',
    },
    {
      dist: Math.abs(axes.temperature - 50),
      zh: axes.temperature < 50 ? '冷峻解构' : '炽热真性',
      en: axes.temperature < 50 ? 'COLD LOGIC' : 'PURE PULSE',
    },
    {
      dist: Math.abs(axes.rhythm - 50),
      zh: axes.rhythm < 50 ? '精密律动' : '自由游牧',
      en: axes.rhythm < 50 ? 'CHRONO ORDER' : 'FREE NOMAD',
    },
  ].sort((a, b) => b.dist - a.dist)

  return {
    modifierZh: deviations[0].zh,
    modifierEn: deviations[0].en,
  }
}

export function determineArchetype(
  axes: AxisScores,
  features?: FeatureVector
): PersonaResult {
  const c1 = axes.field >= 50 ? 'C' : 'B'
  const c2 = axes.density >= 50 ? 'S' : 'E'
  const c3 = axes.temperature >= 50 ? 'F' : 'A'
  const c4 = axes.rhythm >= 50 ? 'D' : 'K'

  const code = `${c1}${c2}${c3}${c4}`
  const archetype = ARCHETYPES[code] || ARCHETYPES.CSFD
  const { modifierZh, modifierEn } = deriveXBehavioralModifier(axes, features)

  return {
    code,
    axes,
    archetype,
    modifierZh,
    modifierEn,
    displayTitleZh: `${modifierZh}·${archetype.nameZh}`,
  }
}
