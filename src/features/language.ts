import type { Post } from '../providers/types'

export interface LanguageFeatures {
  primaryLanguage: string;
  zhEnMixedRate: number;
  exclamationRate: number;
  questionRate: number;
  firstPersonRate: number;
  punctuationStyle: 'fullwidth' | 'halfwidth' | 'mixed';
}

const CJK_REGEX = /[\u4e00-\u9fa5]/g
const JAPANESE_KANA_REGEX = /[\u3040-\u309F\u30A0-\u30FF]/g
const LATIN_WORD_REGEX = /[a-zA-Z]{3,}/g

const ZH_FIRST_PERSON = /(^|[^\p{L}])(我|我们|咱们|俺|鄙人)/u
const EN_FIRST_PERSON = /\b(i|me|my|mine|myself|we|us|our|ours)\b/i
const JA_FIRST_PERSON = /(私|僕|俺|自分|わし)/

const FULLWIDTH_PUNCT = /[，。！？；：“”‘’（）]/g
const HALFWIDTH_PUNCT = /[,.!?;:"'()]/g

export function extractLanguageFeatures(posts: Post[]): LanguageFeatures {
  const total = posts.length
  if (total === 0) {
    return {
      primaryLanguage: 'en',
      zhEnMixedRate: 0,
      exclamationRate: 0,
      questionRate: 0,
      firstPersonRate: 0,
      punctuationStyle: 'halfwidth',
    }
  }

  let cjkCount = 0
  let kanaCount = 0
  let latinCount = 0

  let mixedCount = 0
  let exclamationCount = 0
  let questionCount = 0
  let firstPersonCount = 0

  let totalFullwidthPunct = 0
  let totalHalfwidthPunct = 0

  for (const post of posts) {
    const text = post.text || ''
    if (!text.trim()) continue

    const cjkMatches = text.match(CJK_REGEX)
    const kanaMatches = text.match(JAPANESE_KANA_REGEX)
    const latinMatches = text.match(LATIN_WORD_REGEX)

    const hasCjk = Boolean(cjkMatches && cjkMatches.length > 2)
    const hasKana = Boolean(kanaMatches && kanaMatches.length > 2)
    const hasLatin = Boolean(latinMatches && latinMatches.length > 2)

    if (hasKana) kanaCount++
    else if (hasCjk) cjkCount++
    else if (hasLatin) latinCount++

    // Mixed Chinese & English
    if (hasCjk && hasLatin) {
      mixedCount++
    }

    // Exclamation & Question
    if (/[!！]/.test(text)) exclamationCount++
    if (/[?？]/.test(text)) questionCount++

    // First person
    if (
      ZH_FIRST_PERSON.test(text) ||
      EN_FIRST_PERSON.test(text) ||
      JA_FIRST_PERSON.test(text)
    ) {
      firstPersonCount++
    }

    const fullMatches = text.match(FULLWIDTH_PUNCT)
    if (fullMatches) totalFullwidthPunct += fullMatches.length
    const halfMatches = text.match(HALFWIDTH_PUNCT)
    if (halfMatches) totalHalfwidthPunct += halfMatches.length
  }

  // Determine primary language
  let primaryLanguage = 'zh'
  if (kanaCount > cjkCount && kanaCount > latinCount) {
    primaryLanguage = 'ja'
  } else if (latinCount > cjkCount && latinCount > kanaCount) {
    primaryLanguage = 'en'
  } else if (cjkCount === 0 && latinCount === 0) {
    primaryLanguage = 'en'
  }

  // Punctuation style
  let punctuationStyle: 'fullwidth' | 'halfwidth' | 'mixed' = 'mixed'
  const totalPunct = totalFullwidthPunct + totalHalfwidthPunct
  if (totalPunct > 0) {
    const fullRatio = totalFullwidthPunct / totalPunct
    if (fullRatio > 0.75) punctuationStyle = 'fullwidth'
    else if (fullRatio < 0.25) punctuationStyle = 'halfwidth'
  }

  const toPercent = (n: number) => Math.round((n / total) * 100)

  return {
    primaryLanguage,
    zhEnMixedRate: toPercent(mixedCount),
    exclamationRate: toPercent(exclamationCount),
    questionRate: toPercent(questionCount),
    firstPersonRate: toPercent(firstPersonCount),
    punctuationStyle,
  }
}
