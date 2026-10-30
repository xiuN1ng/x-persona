import type { Post } from '../providers/types'

export interface TimeFeatures {
  hourlyDistribution: number[];
  weekdayDistribution: number[];
  nightOwlIndex: number;
  intervalMedianHours: number;
  burstinessFano: number;
}

export function extractTimeFeatures(posts: Post[]): TimeFeatures {
  const hourly = new Array(24).fill(0)
  const weekday = new Array(7).fill(0)

  if (posts.length === 0) {
    return {
      hourlyDistribution: hourly,
      weekdayDistribution: weekday,
      nightOwlIndex: 0,
      intervalMedianHours: 0,
      burstinessFano: 1,
    }
  }

  let nightOwlCount = 0
  const timestamps: number[] = []

  for (const post of posts) {
    const date = new Date(post.createdTimestamp * 1000)
    if (isNaN(date.getTime())) continue

    const hour = date.getHours()
    const day = date.getDay()

    hourly[hour]++
    weekday[day]++

    if (hour >= 0 && hour < 6) {
      nightOwlCount++
    }

    timestamps.push(post.createdTimestamp)
  }

  const validCount = timestamps.length || 1
  const nightOwlIndex = Math.round((nightOwlCount / validCount) * 100)

  // Calculate intervals
  timestamps.sort((a, b) => a - b)
  const intervalsHours: number[] = []
  for (let i = 1; i < timestamps.length; i++) {
    const diffHours = (timestamps[i] - timestamps[i - 1]) / 3600
    if (diffHours >= 0) {
      intervalsHours.push(diffHours)
    }
  }

  let intervalMedianHours = 0
  let burstinessFano = 1

  if (intervalsHours.length > 0) {
    const sorted = [...intervalsHours].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    intervalMedianHours = sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2

    // Fano Factor = Variance / Mean
    const mean = intervalsHours.reduce((acc, v) => acc + v, 0) / intervalsHours.length
    if (mean > 0) {
      const variance = intervalsHours.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / intervalsHours.length
      burstinessFano = Number((variance / mean).toFixed(2))
    }
  }

  return {
    hourlyDistribution: hourly,
    weekdayDistribution: weekday,
    nightOwlIndex,
    intervalMedianHours: Number(intervalMedianHours.toFixed(1)),
    burstinessFano,
  }
}
