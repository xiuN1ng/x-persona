import { describe, it, expect } from 'vitest'
import { computeFeatureVector } from '../index'
import type { Post } from '../../providers/types'
import { computeAxisScores, determineArchetype } from '../../persona/axes'

describe('Feature Engineering & Persona Inference', () => {
  const mockPosts: Post[] = [
    {
      id: '1',
      createdAt: '2026-10-29T03:00:00Z',
      createdTimestamp: 1793242800, // 3 AM night owl
      text: '深夜写了一篇关于人工智能大模型的思考，真的很震撼，太喜欢这个方向了！',
      lang: 'zh',
      isReply: false,
      isRetweet: false,
      isQuote: false,
      likes: 120,
      reposts: 35,
      replies: 10,
      views: 3500,
      hasMedia: true,
      hasLink: false,
      hashtags: ['AI', '开源'],
      mentions: [],
    },
    {
      id: '2',
      createdAt: '2026-10-29T10:00:00Z',
      createdTimestamp: 1793268000,
      text: '@user2 完全同意你的观点！继续加油！',
      lang: 'zh',
      isReply: true,
      isRetweet: false,
      isQuote: false,
      replyToHandle: 'user2',
      likes: 15,
      reposts: 2,
      replies: 3,
      views: 450,
      hasMedia: false,
      hasLink: false,
      hashtags: [],
      mentions: ['user2'],
    },
  ]

  it('computes feature vector accurately', () => {
    const features = computeFeatureVector(mockPosts)

    expect(features.totalSampleCount).toBe(2)
    expect(features.originalRate).toBe(50)
    expect(features.replyRate).toBe(50)
    expect(features.primaryLanguage).toBe('zh')
    expect(features.topKeywords.length).toBeGreaterThan(0)
  })

  it('computes 4 axes and determines a valid archetype', () => {
    const features = computeFeatureVector(mockPosts)
    const axes = computeAxisScores(features)

    expect(axes.field).toBeGreaterThanOrEqual(0)
    expect(axes.field).toBeLessThanOrEqual(100)
    expect(axes.density).toBeGreaterThanOrEqual(0)
    expect(axes.density).toBeLessThanOrEqual(100)
    expect(axes.temperature).toBeGreaterThanOrEqual(0)
    expect(axes.temperature).toBeLessThanOrEqual(100)
    expect(axes.rhythm).toBeGreaterThanOrEqual(0)
    expect(axes.rhythm).toBeLessThanOrEqual(100)

    const persona = determineArchetype(axes)
    expect(persona.code).toMatch(/^[BC][ES][AF][KD]$/)
    expect(persona.archetype.nameZh).toBeTruthy()
    expect(persona.archetype.taglineZh).toBeTruthy()
  })
})
