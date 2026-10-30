import type { Post } from '../providers/types'
import type { FeatureVector } from './types'
import { extractTimeFeatures } from './time'
import { extractFormFeatures } from './form'
import { extractLanguageFeatures } from './language'
import { extractSentimentFeatures } from './sentiment'
import { extractTopicFeatures } from './topics'
import { extractSocialFeatures } from './social'

export * from './types'
export * from './time'
export * from './form'
export * from './language'
export * from './sentiment'
export * from './topics'
export * from './social'

export function computeFeatureVector(posts: Post[]): FeatureVector {
  // Filter out pure retweets for text analysis so we analyze the user's authentic voice
  const userAuthoredPosts = posts.filter(p => !p.isRetweet)
  const analysisTarget = userAuthoredPosts.length > 0 ? userAuthoredPosts : posts

  const time = extractTimeFeatures(posts)
  const form = extractFormFeatures(posts)
  const language = extractLanguageFeatures(analysisTarget)
  const sentiment = extractSentimentFeatures(analysisTarget)
  const topics = extractTopicFeatures(analysisTarget)
  const social = extractSocialFeatures(posts)

  return {
    totalSampleCount: posts.length,
    analyzedPostCount: analysisTarget.length,

    // Time
    hourlyDistribution: time.hourlyDistribution,
    weekdayDistribution: time.weekdayDistribution,
    nightOwlIndex: time.nightOwlIndex,
    intervalMedianHours: time.intervalMedianHours,
    burstinessFano: time.burstinessFano,

    // Form
    originalRate: form.originalRate,
    replyRate: form.replyRate,
    retweetRate: form.retweetRate,
    quoteRate: form.quoteRate,
    avgCharCount: form.avgCharCount,
    longPostRate: form.longPostRate,
    mediaRate: form.mediaRate,
    linkRate: form.linkRate,
    hashtagRate: form.hashtagRate,
    mentionRate: form.mentionRate,
    emojiDensity: form.emojiDensity,

    // Language
    primaryLanguage: language.primaryLanguage,
    zhEnMixedRate: language.zhEnMixedRate,
    exclamationRate: language.exclamationRate,
    questionRate: language.questionRate,
    firstPersonRate: language.firstPersonRate,
    punctuationStyle: language.punctuationStyle,

    // Sentiment
    positiveSentimentRate: sentiment.positiveSentimentRate,
    negativeSentimentRate: sentiment.negativeSentimentRate,
    sentimentVolatility: sentiment.sentimentVolatility,

    // Topics
    topKeywords: topics.topKeywords,
    topHashtags: topics.topHashtags,

    // Social
    replyTargetHHI: social.replyTargetHHI,
    avgLikes: social.avgLikes,
    avgReposts: social.avgReposts,
    avgReplies: social.avgReplies,
    avgViews: social.avgViews,
    mostEngagedPost: social.mostEngagedPost,
  }
}
