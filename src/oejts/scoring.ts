import type { AxisScores } from '../persona/axes'

export interface OejtsScores {
  ieRaw: number;
  snRaw: number;
  ftRaw: number;
  jpRaw: number;
  type: string; // e.g. 'INTP'
  ieNormalized: number; // 0 = I, 100 = E
  snNormalized: number; // 0 = S, 100 = N
  ftNormalized: number; // 0 = F, 100 = T
  jpNormalized: number; // 0 = J, 100 = P
}

export interface ComparisonResult {
  consistencyIndex: number; // 0-100
  tweetType: string;
  oejtsType: string;
  fieldDiff: number; // Tweet Field vs OEJTS E/I
  densityDiff: number;
  tempDiff: number;
  rhythmDiff: number;
  summaryZh: string;
  summaryEn: string;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(Math.max(Math.round(v), min), max)
}

export function scoreOejts(answers: Record<number, number>): OejtsScores {
  const getQ = (id: number): number => answers[id] || 3 // default neutral 3

  // Official OEJTS 1.2 formulas
  const ieRaw = 30 - getQ(3) - getQ(7) - getQ(11) + getQ(15) - getQ(19) + getQ(23) + getQ(27) - getQ(31)
  const snRaw = 12 + getQ(4) + getQ(8) + getQ(12) + getQ(16) + getQ(20) - getQ(24) - getQ(28) + getQ(32)
  const ftRaw = 30 - getQ(2) + getQ(6) + getQ(10) - getQ(14) - getQ(18) + getQ(22) - getQ(26) - getQ(30)
  const jpRaw = 18 + getQ(1) + getQ(5) - getQ(9) + getQ(13) - getQ(17) + getQ(21) - getQ(25) + getQ(29)

  const e_or_i = ieRaw > 24 ? 'E' : 'I'
  const n_or_s = snRaw > 24 ? 'N' : 'S'
  const t_or_f = ftRaw > 24 ? 'T' : 'F'
  const p_or_j = jpRaw > 24 ? 'P' : 'J'

  const type = `${e_or_i}${n_or_s}${t_or_f}${p_or_j}`

  // Normalized to 0-100 (where 24 is exact center 50)
  const ieNormalized = clamp(50 + (ieRaw - 24) * 3.5)
  const snNormalized = clamp(50 + (snRaw - 24) * 3.5)
  const ftNormalized = clamp(50 + (ftRaw - 24) * 3.5)
  const jpNormalized = clamp(50 + (jpRaw - 24) * 3.5)

  return {
    ieRaw,
    snRaw,
    ftRaw,
    jpRaw,
    type,
    ieNormalized,
    snNormalized,
    ftNormalized,
    jpNormalized,
  }
}

export function comparePersonas(
  tweetAxes: AxisScores,
  oejts: OejtsScores,
  tweetCode: string
): ComparisonResult {
  // Soft mapping:
  // Tweet Field (B=0, C=100) vs OEJTS IE (I=0, E=100)
  const fieldDiff = tweetAxes.field - oejts.ieNormalized
  // Tweet Density (E=0, S=100) vs OEJTS SN (N=0, S=100 -> note: Essayist is N-like, Sniper is S-like)
  const densityDiff = tweetAxes.density - (100 - oejts.snNormalized)
  // Tweet Temperature (A=0, F=100) vs OEJTS FT (T=0, F=100)
  const tempDiff = tweetAxes.temperature - (100 - oejts.ftNormalized)
  // Tweet Rhythm (K=0, D=100) vs OEJTS JP (J=0, P=100)
  const rhythmDiff = tweetAxes.rhythm - oejts.jpNormalized

  const avgDiff = (Math.abs(fieldDiff) + Math.abs(densityDiff) + Math.abs(tempDiff) + Math.abs(rhythmDiff)) / 4
  const consistencyIndex = clamp(100 - avgDiff)

  let summaryZh = ''
  let summaryEn = ''

  if (consistencyIndex >= 85) {
    summaryZh = `知行合一：你在推文里的真实言行与自评问卷高度吻合（一致性 ${consistencyIndex}%）。你没有任何网络人设包袱，时间线就是真实的你自己。`
    summaryEn = `High Authenticity: Your timeline persona matches your self-assessed personality closely (${consistencyIndex}% consistency). What people see on X is genuinely who you are.`
  } else if (consistencyIndex >= 60) {
    const mainDifference = Math.abs(fieldDiff) > Math.abs(tempDiff)
      ? (fieldDiff > 0 ? '你在推特上比自评更外向活跃' : '你在推特上比自评更内敛克制')
      : (tempDiff > 0 ? '你在推特上释放了比平时更充沛的情感' : '你在推特上呈现了比平时更冷静理智的思维')
    summaryZh = `双面镜像：你在现实自评与网络表达之间存在有趣的微妙反差（一致性 ${consistencyIndex}%）。${mainDifference}。`
    summaryEn = `Intriguing Contrast: Your digital behavior shows subtle persona divergence from your self-assessment (${consistencyIndex}% consistency).`
  } else {
    summaryZh = `反差萌/第二人格：你在推特上的表达风格与自评截然不同（一致性仅 ${consistencyIndex}%）。推特是你的专属赛博面具与精神后花园！`
    summaryEn = `Dramatic Alter-Ego: Your online persona is strikingly different from your private self-assessment (${consistencyIndex}% consistency). X is truly your playground for digital rebirth!`
  }

  return {
    consistencyIndex,
    tweetType: tweetCode,
    oejtsType: oejts.type,
    fieldDiff,
    densityDiff,
    tempDiff,
    rhythmDiff,
    summaryZh,
    summaryEn,
  }
}
