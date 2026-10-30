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

  let totalChars = 0
  let totalEmojis = 0

  for (const post of posts) {
    if (post.isRetweet) {
      retweetCount++
    } else if (post.isReply) {
      replyCount++
    } else if (post.isQuote) {
      quoteCount++
    } else {
      originalCount++
    }

    const textLen = (post.text || '').trim().length
    totalChars += textLen

    if (textLen >= 300) {
      longPostCount++
    }

    if (post.hasMedia) mediaCount++
    if (post.hasLink) linkCount++
    if (post.hashtags && post.hashtags.length > 0) hashtagCount++
    if (post.mentions && post.mentions.length > 0) mentionCount++

    const emojis = post.text ? post.text.match(EMOJI_REGEX) : null
    if (emojis) {
      totalEmojis += emojis.length
    }
  }

  const toPercent = (n: number) => Math.round((n / total) * 100)

  // Emojis per 100 characters
  const emojiDensity = totalChars > 0 ? Number(((totalEmojis / totalChars) * 100).toFixed(1)) : 0

  return {
    originalRate: toPercent(originalCount),
    replyRate: toPercent(replyCount),
    retweetRate: toPercent(retweetCount),
    quoteRate: toPercent(quoteCount),
    avgCharCount: Math.round(totalChars / total),
    longPostRate: toPercent(longPostCount),
    mediaRate: toPercent(mediaCount),
    linkRate: toPercent(linkCount),
    hashtagRate: toPercent(hashtagCount),
    mentionRate: toPercent(mentionCount),
    emojiDensity,
  }
}
