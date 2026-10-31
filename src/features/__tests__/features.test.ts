import { describe, it, expect } from 'vitest'
import { computeFeatureVector } from '../index'
import type { Post } from '../../providers/types'
import { computeAxisScores, determineArchetype } from '../../persona/axes'

describe('Feature Engineering & Persona Inference', () => {
  const mockPosts: Post[] = [
    {
      id: '1',
      createdAt: '2026-10-29T03:00:00Z',
      createdTimestamp: Math.floor(new Date(2026, 9, 29, 3, 0, 0).getTime() / 1000), // 3 AM local
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
      createdTimestamp: Math.floor(new Date(2026, 9, 29, 10, 0, 0).getTime() / 1000),
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

    const persona = determineArchetype(axes, features)
    expect(persona.code).toMatch(/^[BC][ES][AF][KD]$/)
    expect(persona.archetype.nameZh).toBeTruthy()
    expect(persona.displayTitleZh).toContain('·')
  })

  it('differentiates distinct X creator profiles across all 4 axes and titles', () => {
    // Profile A: Disciplined daytime long-form Chinese tech analyst (BEAK)
    const techAnalystPosts: Post[] = Array.from({ length: 12 }, (_, i) => ({
      id: `tech-${i}`,
      createdAt: '2026-10-20T10:00:00Z',
      // Exact 10:00 AM local time every day (regular circadian window, 0% night owl)
      createdTimestamp: Math.floor(new Date(2026, 9, 1 + i, 10, 0, 0).getTime() / 1000),
      text: '今天深入拆解了分布式推理系统的底层架构与显存带宽瓶颈。通过对比 KV Cache 量化与投机采样在不同 Batch Size 下的吞吐量曲线，可以清晰看到算力利用率的分水岭。完整技术报告与开源基准测试代码见链接 https://example.com/bench',
      lang: 'zh',
      isReply: false,
      isRetweet: false,
      isQuote: false,
      likes: 45,
      reposts: 12,
      replies: 2,
      views: 2200,
      hasMedia: false,
      hasLink: true,
      hashtags: ['Infra'],
      mentions: [],
    }))

    // Profile B: Night-owl interactive community conversationalist (CSFD)
    const nightHours = [1, 2, 3, 4, 5, 23, 0, 2, 4, 1, 3, 5]
    const dayOffsets = [0, 0, 0, 4, 4, 5, 9, 9, 9, 15, 15, 22]
    const nightSalonPosts: Post[] = Array.from({ length: 12 }, (_, i) => ({
      id: `salon-${i}`,
      createdAt: '2026-10-20T03:00:00Z',
      // Timezone-independent local night-owl hours with erratic multi-day bursts
      createdTimestamp: Math.floor(
        new Date(2026, 9, 1 + dayOffsets[i], nightHours[i], (i * 17) % 60, 0).getTime() / 1000
      ),
      text: `@friend_${i} 哈哈哈笑死我了！！这波真的太绝了，你们觉得呢？🎉🔥`,
      lang: 'zh',
      isReply: i % 2 === 0,
      isRetweet: false,
      isQuote: i % 3 === 0,
      replyToHandle: `friend_${i}`,
      likes: 20,
      reposts: 3,
      replies: 8,
      views: 600,
      hasMedia: true,
      hasLink: false,
      hashtags: [],
      mentions: [`friend_${i}`],
    }))

    const fA = computeFeatureVector(techAnalystPosts)
    const pA = determineArchetype(computeAxisScores(fA), fA)

    const fB = computeFeatureVector(nightSalonPosts)
    const pB = determineArchetype(computeAxisScores(fB), fB)

    expect(pA.code).toBe('BEAK')
    expect(pB.code).toBe('CSFD')
    expect(pA.displayTitleZh).not.toBe(pB.displayTitleZh)
  })
})
