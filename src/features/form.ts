import type { Post } from '../providers/types'

export interface FormFeatures {
  originalRate: number;
  replyRate: number;
  retweetRate: number;
  quoteRate: number;
  avgCharCount: number;
  longPostRate: number;
  mediaRate: number;
  linkRate: number;
  hashtagRate: number;
  mentionRate: number;
  emojiDensity: number;
}

// Regex for common emojis
const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu
const CJK_REGEX = /[\u4e00-\u9fff\u3040-\u30ff]/

export function extractFormFeatures(posts: Post[]): FormFeatures {
  const total = posts.length
  if (total === 0) {
    return {
      originalRate: 0,
      replyRate: 0,
      retweetRate: 0,
      quoteRate: 0,
      avgCharCount: 0,
      longPostRate: 0,
      mediaRate: 0,
      linkRate: 0,
      hashtagRate: 0,
      mentionRate: 0,
      emojiDensity: 0,
    }
  }

  let originalCount = 0
  let replyCount = 0
  let retweetCount = 0
  let quoteCount = 0
  let longPostCount = 0
  let mediaCount = 0
  let linkCount = 0
  let hashtagCount = 0
  let mentionCount = 0

  let authoredCount = 0
  let totalAuthoredChars = 0
  let totalAllChars = 0
  let totalEmojis = 0

  for (const post of posts) {
    const rawText = (post.text || '').trim()
    // Strip URLs when measuring genuine writing length on X
    const cleanText = rawText.replace(/https?:\/\/\S+/g, '').trim()
    const textLen = cleanText.length || rawText.length
    totalAllChars += textLen

    if (post.isRetweet) {
      retweetCount++
    } else {
      authoredCount++
      totalAuthoredChars += textLen

      const isCjk = CJK_REGEX.test(cleanText)
      // On X, 110+ Chinese characters (~250 English chars equivalent) is a substantive long post/thread
      const longThreshold = isCjk ? 110 : 210
      if (textLen >= longThreshold) {
        longPostCount++
      }

      if (post.isReply) {
        replyCount++
      } else if (post.isQuote) {
        quoteCount++
      } else {
        originalCount++
      }
    }

    if (post.hasMedia) mediaCount++
    if (post.hasLink) linkCount++
    if (post.hashtags && post.hashtags.length > 0) hashtagCount++
    if (post.mentions && post.mentions.length > 0) mentionCount++

    const emojis = rawText ? rawText.match(EMOJI_REGEX) : null
    if (emojis) {
      totalEmojis += emojis.length
    }
  }

  const toPercent = (n: number) => Math.round((n / total) * 100)
  const authoredBase = authoredCount > 0 ? authoredCount : total
  const avgCharCount =
    authoredCount > 0
      ? Math.round(totalAuthoredChars / authoredCount)
      : Math.round(totalAllChars / total)

  // Emojis per 100 characters
  const emojiDensity =
    totalAllChars > 0 ? Number(((totalEmojis / totalAllChars) * 100).toFixed(1)) : 0

  return {
    originalRate: toPercent(originalCount),
    replyRate: toPercent(replyCount),
    retweetRate: toPercent(retweetCount),
    quoteRate: toPercent(quoteCount),
    avgCharCount,
    longPostRate: Math.round((longPostCount / authoredBase) * 100),
    mediaRate: toPercent(mediaCount),
    linkRate: toPercent(linkCount),
    hashtagRate: toPercent(hashtagCount),
    mentionRate: toPercent(mentionCount),
    emojiDensity,
  }
}
