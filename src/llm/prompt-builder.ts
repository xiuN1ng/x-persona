import type { Profile, Post } from '../providers/types'
import type { FeatureVector } from '../features/types'
import type { AxisScores } from '../persona/axes'

export interface PromptBuilderOptions {
  profile: Profile;
  features: FeatureVector;
  posts: Post[];
  precalculatedAxes: AxisScores;
  lang?: 'zh' | 'en';
}

export function buildLlmPrompt(opts: PromptBuilderOptions): string {
  const { profile, features, posts, precalculatedAxes, lang = 'zh' } = opts

  // Select top sample posts (mix of highest engaged and recent)
  const sampledPosts = [...posts]
    .filter(p => !p.isRetweet && (p.text || '').trim().length > 10)
    .sort((a, b) => (b.likes + b.reposts * 2) - (a.likes + a.reposts * 2))
    .slice(0, 80)

  const postSamplesText = sampledPosts
    .map((p, i) => `[${i + 1}] (赞:${p.likes} 转:${p.reposts}${p.isReply ? ' [回复]' : ''}) ${p.text.replace(/\n+/g, ' ')}`)
    .join('\n')

  const topWords = features.topKeywords.map(k => `${k.word}(${k.count})`).join(', ')
  const topTags = features.topHashtags.map(t => `#${t.tag}(${t.count})`).join(', ')

  if (lang === 'en') {
    return `You are a sharp, witty, and psychologically perceptive social media analyst.
Your task is to analyze the following X (Twitter) user based on their hard data features and post samples, and return a structured JSON report.

### 1. User Profile
- Handle: @${profile.screenName} (${profile.name})
- Bio: ${profile.description || 'None'}
- Followers: ${profile.followers} | Following: ${profile.following} | Total Statuses: ${profile.statusesCount}

### 2. Extracted Behavioral Facts (Pre-calculated by client)
- Sample Size: ${features.totalSampleCount} posts analyzed
- Posting Rhythm: Night-owl index (0-6 AM): ${features.nightOwlIndex}%, Median post interval: ${features.intervalMedianHours} hours, Burstiness (Fano factor): ${features.burstinessFano}
- Content Form: Original ${features.originalRate}%, Replies ${features.replyRate}%, Retweets ${features.retweetRate}%, Quotes ${features.quoteRate}%
- Length & Density: Average ${features.avgCharCount} chars/post, Long posts (>300 chars): ${features.longPostRate}%
- Media & Links: Images/Video ${features.mediaRate}%, External links ${features.linkRate}%
- Emotional Metrics: Positive words: ${features.positiveSentimentRate}%, Negative words: ${features.negativeSentimentRate}%, Volatility: ${features.sentimentVolatility}
- Punctuation & Style: Exclamation rate: ${features.exclamationRate}%, Question rate: ${features.questionRate}%, First-person pronoun rate: ${features.firstPersonRate}%
- Top Keywords: ${topWords || 'None'}
- Top Hashtags: ${topTags || 'None'}
- Initial Axis Suggestion: Field=${precalculatedAxes.field}, Density=${precalculatedAxes.density}, Temp=${precalculatedAxes.temperature}, Rhythm=${precalculatedAxes.rhythm}

### 3. Representative Post Samples
${postSamplesText}

### 4. Analysis Framework (16 Archetypes)
- Axis 1 (Field): Broadcaster [B] (0-49) vs Conversationalist [C] (50-100)
- Axis 2 (Density): Essayist [E] (0-49) vs Sniper [S] (50-100)
- Axis 3 (Temp): Analyst [A] (0-49) vs Feeler [F] (50-100)
- Axis 4 (Rhythm): Clock [K] (0-49) vs Drifter [D] (50-100)
Resulting 4-letter code: [B/C][E/S][A/F][K/D] (e.g. CSFD, BEAD, CSAK)

### 5. Strict Output Requirement
Return ONLY a valid JSON object matching this schema (no markdown fences, no surrounding commentary):
{
  "archetype": "CSFD",
  "axis": {
    "field": ${precalculatedAxes.field},
    "density": ${precalculatedAxes.density},
    "temperature": ${precalculatedAxes.temperature},
    "rhythm": ${precalculatedAxes.rhythm}
  },
  "roast": "Hilarious, razor-sharp one-liner roast summarizing their timeline persona (under 40 words)",
  "portrait": "In-depth psychoanalysis of their digital persona, motivation, and online vibe (150-250 words)",
  "strengths": ["Clear strength 1", "Strength 2", "Strength 3"],
  "redFlags": ["Quirky flaw/red flag 1", "Red flag 2", "Red flag 3"],
  "spiritAnimal": { "name": "Animal or mythical creature", "reason": "Why it represents them" },
  "bestMatch": "Archetype code they get along with best (e.g. BSAD)",
  "prediction2027": "A funny and plausible prediction of what they will be tweeting in 2027",
  "mbtiGuess": {
    "type": "INTP",
    "confidence": 0.85,
    "evidence": ["Evidence 1 from tweets", "Evidence 2"]
  }
}`
  }

  // Chinese default
  return `你是一位兼具辛辣幽默感与心理学深度洞察的资深社交网络分析师。
请根据以下从 X (Twitter) 提取的真实推文行为数据和样本，为该用户输出一份生动、扎心、洞察力拉满的“X 人格报告”。

### 1. 账号基本资料
- 用户名: @${profile.screenName} (${profile.name})
- 简介: ${profile.description || '无'}
- 粉丝数: ${profile.followers} | 关注数: ${profile.following} | 累计发帖量: ${profile.statusesCount}

### 2. 行为特征事实段（纯前端实测统计算法生成）
- 样本数量: 分析了最近 ${features.totalSampleCount} 条推文
- 发帖节律: 夜猫指数 (0-6点发帖占比): ${features.nightOwlIndex}% | 发帖间隔中位数: ${features.intervalMedianHours} 小时 | 爆发度 (Fano因子): ${features.burstinessFano}
- 互动形态: 原创 ${features.originalRate}% | 回复 ${features.replyRate}% | 纯转推 ${features.retweetRate}% | 引用 ${features.quoteRate}%
- 文本密度: 平均字数 ${features.avgCharCount} 字/帖 | 长文率 (>300字): ${features.longPostRate}%
- 媒体外链: 配图/视频率 ${features.mediaRate}% | 外链率 ${features.linkRate}%
- 情绪色彩: 正向情绪词率: ${features.positiveSentimentRate}% | 负向情绪词率: ${features.negativeSentimentRate}% | 情绪方差: ${features.sentimentVolatility}
- 标点习惯: 感叹号率: ${features.exclamationRate}% | 问号率: ${features.questionRate}% | 第一人称(我)占比: ${features.firstPersonRate}%
- 高频关键词: ${topWords || '暂无'}
- 核心话题: ${topTags || '暂无'}
- 算法初测四维分: 场域=${precalculatedAxes.field}, 密度=${precalculatedAxes.density}, 温度=${precalculatedAxes.temperature}, 节律=${precalculatedAxes.rhythm}

### 3. 代表性推文抽样（按热度与互动精选）
${postSamplesText}

### 4. 分析体系（16 种 X 原型代码规则）
- 维度 1（场域）: 广播者 [B] (0-49) vs 对话者 [C] (50-100)
- 维度 2（密度）: 长文家 [E] (0-49) vs 碎片派 [S] (50-100)
- 维度 3（温度）: 冷静派 [A] (0-49) vs 情绪派 [F] (50-100)
- 维度 4（节律）: 规律型 [K] (0-49) vs 随性型 [D] (50-100)
最终四字代码: [B/C][E/S][A/F][K/D]（如 CSFD 全网冲浪互动王, BEAD 灵感长文狂人, CSAK 精准补刀手 等）。你可以依据推文内容在初测分基础上微调 (±15)。

### 5. 输出格式要求
请严格仅返回符合以下 JSON 结构的纯文本（不要带 markdown 代码块标记，不要额外寒暄）：
{
  "archetype": "CSFD",
  "axis": {
    "field": ${precalculatedAxes.field},
    "density": ${precalculatedAxes.density},
    "temperature": ${precalculatedAxes.temperature},
    "rhythm": ${precalculatedAxes.rhythm}
  },
  "roast": "一句让人拍案叫绝、既扎心又充满爱意的吐槽（80字以内，极具推特圈内梗）",
  "portrait": "深度画像：剖析TA在网络面具下的真实心智模型、表达欲来源与潜意识焦虑（200-300字）",
  "strengths": ["闪光点1", "闪光点2", "闪光点3"],
  "redFlags": ["被吐槽点/雷点1", "雷点2", "雷点3"],
  "spiritAnimal": { "name": "精神动物/意象（如：喝浓缩咖啡的猫头鹰）", "reason": "为什么贴合TA的理由" },
  "bestMatch": "最契合的原型代码（如 BSAD）",
  "prediction2027": "脑洞大开预测：2027年TA会在推特发些什么",
  "mbtiGuess": {
    "type": "INTP",
    "confidence": 0.85,
    "evidence": ["依据1", "依据2"]
  }
}`
}
