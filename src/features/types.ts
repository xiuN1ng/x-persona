export interface KeywordItem {
  word: string;
  count: number;
}

export interface HashtagItem {
  tag: string;
  count: number;
}

export interface FeatureVector {
  // 样本基本信息
  totalSampleCount: number;
  analyzedPostCount: number; // 排除纯转推后的有效分析帖

  // 时间维度
  hourlyDistribution: number[]; // 24 entries (0-23)
  weekdayDistribution: number[]; // 7 entries (0=Sun, 6=Sat)
  nightOwlIndex: number; // 0-100: percentage of posts between 00:00 - 06:00
  intervalMedianHours: number; // Median time between posts in hours
  burstinessFano: number; // Fano factor (variance / mean) of post intervals

  // 形态维度
  originalRate: number; // 0-100
  replyRate: number; // 0-100
  retweetRate: number; // 0-100
  quoteRate: number; // 0-100
  avgCharCount: number; // Average character length per post
  longPostRate: number; // Percentage with > 300 characters
  mediaRate: number; // Percentage with images/videos
  linkRate: number; // Percentage with external links
  hashtagRate: number; // Percentage with #hashtags
  mentionRate: number; // Percentage with @mentions
  emojiDensity: number; // Emojis per 100 characters

  // 语言维度
  primaryLanguage: string; // 'zh' | 'en' | 'ja' | 'other'
  zhEnMixedRate: number; // Rate of posts mixing Chinese & English
  exclamationRate: number; // Posts with exclamation marks %
  questionRate: number; // Posts with question marks %
  firstPersonRate: number; // Posts containing first-person pronouns %
  punctuationStyle: 'fullwidth' | 'halfwidth' | 'mixed';

  // 情绪维度
  positiveSentimentRate: number; // 0-100
  negativeSentimentRate: number; // 0-100
  sentimentVolatility: number; // Variance of post sentiments

  // 话题维度
  topKeywords: KeywordItem[];
  topHashtags: HashtagItem[];

  // 社交维度
  replyTargetHHI: number; // Herfindahl-Hirschman Index (0-1) of reply recipients
  avgLikes: number;
  avgReposts: number;
  avgReplies: number;
  avgViews: number;
  mostEngagedPost?: {
    id: string;
    text: string;
    likes: number;
    reposts: number;
    views: number;
  };
}
