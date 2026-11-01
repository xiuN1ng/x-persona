import type { Post } from '../providers/types'
import type { KeywordItem, HashtagItem } from './types'

type Segmenter = { doSegment: (text: string) => Array<{ w?: string }> }
let segmenterInstance: Segmenter | null = null
let segmenterLoading: Promise<void> | null = null

/**
 * Lazily loads the heavy Chinese dictionary (segmentit) as a separate chunk.
 * Until it resolves, topic extraction degrades gracefully to a Latin-token fallback.
 */
export function preloadSegmenter(): Promise<void> {
  if (segmenterInstance) return Promise.resolve()
  if (!segmenterLoading) {
    segmenterLoading = import('segmentit')
      .then(({ Segment, useDefault }) => {
        segmenterInstance = useDefault(new Segment()) as unknown as Segmenter
      })
      .catch(() => {
        segmenterLoading = null
      })
  }
  return segmenterLoading
}

function getSegmenter(): Segmenter | null {
  return segmenterInstance
}

const STOP_WORDS = new Set([
  // Chinese stop words
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '被', '从', '把', '更', '后', '但', '能', '还', '用', '做',
  '跟', '给', '对', '把', '过', '得', '着', '可以', '怎么', '什么', '为什么', '我们',
  '这个', '那个', '因为', '所以', '如果', '或者', '大家', '其实', '已经', '觉得',
  // English stop words
  'the', 'and', 'for', 'with', 'that', 'this', 'have', 'from', 'are', 'was', 'not',
  'will', 'can', 'just', 'all', 'out', 'about', 'get', 'like', 'one', 'more', 'what',
  'who', 'when', 'how', 'there', 'some', 'your', 'their', 'they', 'our', 'them',
  'than', 'then', 'into', 'only', 'also', 'over', 'after', 'such', 'very', 'even',
  'https', 'http', 'com', 'status', 'twitter', 'pic',
])

export interface TopicFeatures {
  topKeywords: KeywordItem[];
  topHashtags: HashtagItem[];
}

export function extractTopicFeatures(posts: Post[]): TopicFeatures {
  const segmenter = getSegmenter()
  const wordCounts = new Map<string, number>()
  const tagCounts = new Map<string, number>()

  for (const post of posts) {
    // 1. Hashtags
    if (post.hashtags) {
      for (const rawTag of post.hashtags) {
        const tag = rawTag.trim().toLowerCase()
        if (tag.length > 0) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
        }
      }
    }

    // 2. Clean text for keyword segmentation
    let text = post.text || ''
    // remove urls
    text = text.replace(/https?:\/\/\S+/gi, '')
    // remove handles
    text = text.replace(/@[a-zA-Z0-9_]+/g, '')
    // remove emojis
    text = text.replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, ' ')

    if (!text.trim()) continue

    // Run segmentit
    try {
      if (!segmenter) throw new Error('segmenter not loaded')
      const segments = segmenter.doSegment(text)
      for (const item of segments) {
        const word = (item.w || '').trim().toLowerCase()
        if (word.length <= 1) continue
        if (STOP_WORDS.has(word)) continue
        if (/^\d+$/.test(word)) continue // ignore pure numbers

        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      }
    } catch {
      // Fallback: Latin regex
      const latinTokens = text.match(/[a-zA-Z]{3,}/g) || []
      for (const token of latinTokens) {
        const word = token.toLowerCase()
        if (!STOP_WORDS.has(word)) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
        }
      }
    }
  }

  // Top 10 keywords
  const topKeywords: KeywordItem[] = Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Top 5 hashtags
  const topHashtags: HashtagItem[] = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    topKeywords,
    topHashtags,
  }
}
