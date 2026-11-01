import type { FeatureVector } from '../features/types'
import type { AxisScores } from './axes'

export type ConfidenceLevel = 'low' | 'medium' | 'high'

export interface PersonaConfidence {
  level: ConfidenceLevel
  sampleSize: number
  /** Axes whose score sits within the flip margin around 50, so the letter may change with a new sample. */
  borderlineAxes: Array<keyof AxisScores>
  labelZh: string
  messageZh: string
}

const AXIS_NAME_ZH: Record<keyof AxisScores, string> = {
  field: '场域',
  density: '密度',
  temperature: '温度',
  rhythm: '节律',
}

/** Score distance from 50 under which an axis letter is considered unstable. */
export const BORDERLINE_MARGIN = 5
export const LOW_SAMPLE = 30
export const HIGH_SAMPLE = 80

/**
 * Honest confidence estimate for a statistical persona.
 * Pure function of local data: nothing is stored or transmitted.
 */
export function computePersonaConfidence(
  features: Pick<FeatureVector, 'analyzedPostCount'>,
  axes: AxisScores
): PersonaConfidence {
  const n = features.analyzedPostCount
  const borderlineAxes = (Object.keys(axes) as Array<keyof AxisScores>).filter(
    (k) => Math.abs(axes[k] - 50) <= BORDERLINE_MARGIN
  )

  let level: ConfidenceLevel = n < LOW_SAMPLE ? 'low' : n < HIGH_SAMPLE ? 'medium' : 'high'
  // Several coin-flip axes cap confidence even with plenty of posts.
  if (borderlineAxes.length >= 2 && level === 'high') level = 'medium'

  const parts: string[] = []
  if (n < LOW_SAMPLE) {
    parts.push(`仅分析 ${n} 条推文，样本偏少，结果仅供娱乐`)
  } else if (n < HIGH_SAMPLE) {
    parts.push(`基于 ${n} 条推文，结论可参考`)
  } else {
    parts.push(`基于 ${n} 条推文，样本充足`)
  }
  if (borderlineAxes.length > 0) {
    parts.push(`${borderlineAxes.map((k) => AXIS_NAME_ZH[k]).join('、')}接近临界，换一批推文字母可能改变`)
  }

  return {
    level,
    sampleSize: n,
    borderlineAxes,
    labelZh: level === 'high' ? '置信度 高' : level === 'medium' ? '置信度 中' : '置信度 低',
    messageZh: parts.join('；'),
  }
}
