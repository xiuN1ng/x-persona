import type { Post } from '../providers/types'

export interface SentimentFeatures {
  positiveSentimentRate: number;
  negativeSentimentRate: number;
  sentimentVolatility: number;
}

const ZH_POSITIVE_WORDS = new Set([
  '喜欢', '开心', '太棒', '赞', '牛逼', '厉害', '神作', '爱了', '支持', '期待',
  '优秀', '舒服', '感谢', '希望', '惊喜', '漂亮', '酷', '棒', '干货', '真香',
  '好玩', '快乐', '佩服', '好评', '美滋滋', '享受', '给力', '震撼', '好用', '财富自由',
  '哈哈', '哈哈哈', '笑死', '绝了', '太爽', '优雅', '惊艳', '丝滑', '起飞', '感动',
  '温暖', '治愈', '幸福', '可爱', '太强', '神仙', '吹爆', '泪目', '太顶', '狂喜',
])

const ZH_NEGATIVE_WORDS = new Set([
  '垃圾', '恶心', '难受', '崩溃', '无语', '离谱', '讨厌', '糟糕', '傻逼', '坑爹',
  '失望', '焦虑', '痛苦', '破防', '晦气', '避雷', '差评', '完蛋', '绝望', '愤怒',
  '烦人', '抱怨', '倒闭', '操蛋', '吐了', '累瘫', '被坑', '不行', '倒霉', '心碎',
  '麻了', '卧槽', '救命', '抓狂', '窒息', '服了', '扯淡', '割韭菜', '魔幻', '离大谱',
  '无奈', '头大', '血压', '智障', '荒谬', '累了', '困死', '烦死', '苦笑', '叹气',
])

const EN_POSITIVE_WORDS = new Set([
  'great', 'awesome', 'love', 'amazing', 'happy', 'cool', 'good', 'best', 'fantastic',
  'super', 'nice', 'wonderful', 'excellent', 'excited', 'fun', 'enjoy', 'brilliant',
  'impressive', 'promising', 'glad', 'huge', 'win', 'gem', 'legend', 'beautiful',
  'lol', 'lmao', 'goat', 'fire', 'based', 'blessed', 'hyped', 'incredible', 'sweet',
  'insane', 'peak', 'masterpiece', 'hilarious', 'vibe', 'vibes', 'adore', 'grateful',
])

const EN_NEGATIVE_WORDS = new Set([
  'bad', 'hate', 'terrible', 'worst', 'awful', 'sad', 'angry', 'sucks', 'annoying',
  'broken', 'horrible', 'waste', 'disaster', 'scam', 'fail', 'trash', 'pain', 'disappointed',
  'boring', 'mess', 'stupid', 'ridiculous', 'ugly', 'tired', 'crazy',
  'wtf', 'omg', 'cooked', 'cringe', 'cursed', 'doomed', 'exhausted', 'frustrated',
  'toxic', 'bullshit', 'nightmare', 'pathetic', 'weird', 'hell', 'dying', 'rip',
])

export function extractSentimentFeatures(posts: Post[]): SentimentFeatures {
  const total = posts.length
  if (total === 0) {
    return {
      positiveSentimentRate: 0,
      negativeSentimentRate: 0,
      sentimentVolatility: 0,
    }
  }

  const scores: number[] = []
  let positiveCount = 0
  let negativeCount = 0

  for (const post of posts) {
    const text = (post.text || '').toLowerCase()
    if (!text.trim()) continue

    let pos = 0
    let neg = 0

    // Chinese check
    for (const w of ZH_POSITIVE_WORDS) {
      if (text.includes(w)) pos++
    }
    for (const w of ZH_NEGATIVE_WORDS) {
      if (text.includes(w)) neg++
    }

    // Expressive punctuation / modal cues in X posts
    if (/[~～]{2,}|[！!]{2,}/.test(text)) pos += 0.5
    if (/[？\?]{2,}|\.{4,}|。。。/.test(text)) neg += 0.5

    // English word token match
    const enTokens = text.match(/[a-z]+/g) || []
    for (const token of enTokens) {
      if (EN_POSITIVE_WORDS.has(token)) pos++
      if (EN_NEGATIVE_WORDS.has(token)) neg++
    }

    const net = pos - neg
    let score = 0
    if (pos + neg > 0) {
      score = Number((net / (pos + neg)).toFixed(2))
    }

    scores.push(score)
    if (score > 0.12) positiveCount++
    else if (score < -0.12) negativeCount++
  }

  const validCount = scores.length || 1
  const mean = scores.reduce((acc, v) => acc + v, 0) / validCount
  const variance = scores.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / validCount

  return {
    positiveSentimentRate: Math.round((positiveCount / validCount) * 100),
    negativeSentimentRate: Math.round((negativeCount / validCount) * 100),
    sentimentVolatility: Number(variance.toFixed(3)),
  }
}
