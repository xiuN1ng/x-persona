import type { PersonaResult, AxisScores } from './axes'
import type { OejtsScores, ComparisonResult } from '../oejts/scoring'
import { INNER_ARCHETYPES, type InnerArchetypeInfo } from './inner-archetypes'

export interface FusionPersonaResult {
  fusionCode: string; // e.g. 'BEFD×INFP'
  titleZh: string; // e.g. '织梦共鸣 · 狂想剑客'
  titleEn: string;
  alchemyClassZh: string;
  alchemyClassEn: string;
  rarity: string; // e.g. 'UR · 0.39%'
  consistencyIndex: number;
  entropyScore: number; // 0-100 measure of creative tension between outer & inner
  fusedAxes: AxisScores;
  innerAxesAsOuterScale: AxisScores; // Mapped to same 4-axis space for dual-polygon rendering
  loreZh: string;
  passiveNameZh: string;
  passiveDescZh: string;
  innerArchetype: InnerArchetypeInfo;
}

const OUTER_CORE_NOUNS: Record<string, { zh: string; en: string; icon: string }> = {
  BEAK: { zh: '圣堂史官', en: 'Chronicle Sovereign', icon: '⏳' },
  BEAD: { zh: '星渊贤者', en: 'Abyssal Sage', icon: '🌌' },
  BEFK: { zh: '传火祭司', en: 'Flame Keeper', icon: '🕯️' },
  BEFD: { zh: '狂想剑客', en: 'Rhapsody Swordsman', icon: '⚔️' },
  BSAK: { zh: '瞬光先驱', en: 'Tachyon Herald', icon: '⚡' },
  BSAD: { zh: '刻金炼师', en: 'Gold Epigrammatist', icon: '⚜️' },
  BSFK: { zh: '咏风旅人', en: 'Breeze Wayfarer', icon: '🍃' },
  BSFD: { zh: '午夜灵媒', en: 'Midnight Medium', icon: '🔮' },
  CEAK: { zh: '守夜导师', en: 'Watchtower Mentor', icon: '🦉' },
  CEAD: { zh: '真理辩士', en: 'Socratic Dialectician', icon: '🏛️' },
  CEFK: { zh: '森罗庇护者', en: 'Sanctuary Warden', icon: '🌿' },
  CEFD: { zh: '炽阳共鸣者', en: 'Solar Resonator', icon: '☀️' },
  CSAK: { zh: '断罪游侠', en: 'Verdict Phantom', icon: '🗡️' },
  CSAD: { zh: '戏命弄臣', en: 'Fate Jester', icon: '🃏' },
  CSFK: { zh: '幻象使节', en: 'Mirage Envoy', icon: '🎭' },
  CSFD: { zh: '弄潮领主', en: 'Tidewalker Lord', icon: '🌊' },
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(Math.max(Math.round(v), min), max)
}

export function fusePersonas(
  outer: PersonaResult,
  inner: OejtsScores,
  comparison: ComparisonResult
): FusionPersonaResult {
  const innerInfo = INNER_ARCHETYPES[inner.type] || INNER_ARCHETYPES.INFP
  const outerNoun = OUTER_CORE_NOUNS[outer.code] || OUTER_CORE_NOUNS.BEFD

  // Map inner OEJTS normalized scores into the exact same 4-axis space as Outer
  // Outer Field (B=0, C=100) <-> Inner IE (I=0, E=100)
  // Outer Density (E=0, S=100) <-> Inner SN (N=0, S=100 => 100 - snNormalized)
  // Outer Temp (A=0, F=100) <-> Inner FT (T=0, F=100 => 100 - ftNormalized)
  // Outer Rhythm (K=0, D=100) <-> Inner JP (J=0, P=100)
  const innerAxesAsOuterScale: AxisScores = {
    field: inner.ieNormalized,
    density: clamp(100 - inner.snNormalized),
    temperature: clamp(100 - inner.ftNormalized),
    rhythm: inner.jpNormalized,
  }

  // Fused harmonic axes
  const fusedAxes: AxisScores = {
    field: clamp(outer.axes.field * 0.55 + innerAxesAsOuterScale.field * 0.45),
    density: clamp(outer.axes.density * 0.55 + innerAxesAsOuterScale.density * 0.45),
    temperature: clamp(outer.axes.temperature * 0.55 + innerAxesAsOuterScale.temperature * 0.45),
    rhythm: clamp(outer.axes.rhythm * 0.55 + innerAxesAsOuterScale.rhythm * 0.45),
  }

  const consistency = comparison.consistencyIndex
  const entropyScore = clamp(100 - consistency)

  let modifierZh = '双生'
  let alchemyClassZh = '光影交织 · 双生同盟'
  let alchemyClassEn = 'TWIN ECLIPSE · MYTHIC'
  let rarity = 'UR · 稀有度 0.39%'

  if (consistency >= 80) {
    modifierZh = '纯血'
    alchemyClassZh = '表里合一 · 纯血觉醒'
    alchemyClassEn = 'PURE RESONANCE · GENESIS'
    rarity = 'LR · 稀有度 0.18%'
  } else if (consistency < 58) {
    modifierZh = '裂变'
    alchemyClassZh = '极性逆转 · 混沌奇点'
    alchemyClassEn = 'PARADOX SINGULARITY · ABYSS'
    rarity = 'UR+ · 稀有度 0.24%'
  }

  const titleZh = `${innerInfo.fusionPrefixZh}${modifierZh}·${outerNoun.zh}`
  const titleEn = `${innerInfo.fusionPrefixEn} ${outerNoun.en}`

  // Determine the dominant tension or resonance for the RPG Passive Skill
  const diffs = [
    { key: 'field', val: comparison.fieldDiff, abs: Math.abs(comparison.fieldDiff) },
    { key: 'density', val: comparison.densityDiff, abs: Math.abs(comparison.densityDiff) },
    { key: 'temp', val: comparison.tempDiff, abs: Math.abs(comparison.tempDiff) },
    { key: 'rhythm', val: comparison.rhythmDiff, abs: Math.abs(comparison.rhythmDiff) },
  ].sort((a, b) => b.abs - a.abs)

  const topDiff = diffs[0]
  let passiveNameZh = '【灵魂坍缩 · 观测者效应】'
  let passiveDescZh = ''

  if (consistency >= 80) {
    passiveNameZh = '【言灵合一 · 无垢领域】'
    passiveDescZh = `表世界的「${outer.archetype.nameZh}」与里世界的「${innerInfo.nameZh}」达成 ${consistency}% 同步率，时间线上的每一句输出皆为本心直觉的直接投影。`
  } else if (topDiff.key === 'field') {
    if (topDiff.val > 0) {
      passiveNameZh = '【赛博盛装 · 隐者狂欢】'
      passiveDescZh = `内心是渴望独处的「${innerInfo.nameZh}」，却在时间线上化身高频连接者。社交面具是你探索世界的特种外骨骼。`
    } else {
      passiveNameZh = '【孤岛广播 · 深海潜航】'
      passiveDescZh = `现实里拥有充沛的社交能量，在 X 上却收敛为冷峻克制的独立广播者，只向同频者发射加密电波。`
    }
  } else if (topDiff.key === 'temp') {
    if (topDiff.val > 0) {
      passiveNameZh = '【冰核熔炉 · 深夜铸剑】'
      passiveDescZh = `潜意识里理性克制，却将 X 当作滚烫的情绪与灵感泄洪口，在理性代码与感性武侠梦之间自由切换。`
    } else {
      passiveNameZh = '【绝对零度 · 琉璃装甲】'
      passiveDescZh = `把柔软细腻的「${innerInfo.nameZh}」本心封存在高密度的客观分析与技术外壳之下，无人能窥见护城河内的暗涌。`
    }
  } else {
    passiveNameZh = '【双界跃迁 · 量子脉冲】'
    passiveDescZh = `在「${outer.archetype.nameZh}」的赛博行动与「${innerInfo.nameZh}」的精神内核间高速震荡，反差张力转化为极强的创造爆发力。`
  }

  const loreZh = `当外显的【${outer.code}·${outer.archetype.nameZh}】与潜意识的【${inner.type}·${innerInfo.nameZh}】在炼成阵中碰撞，知行契合度定格于 ${consistency}%（混沌熵值 ${entropyScore}）。${passiveDescZh}`

  return {
    fusionCode: `${outer.code}×${inner.type}`,
    titleZh,
    titleEn,
    alchemyClassZh,
    alchemyClassEn,
    rarity,
    consistencyIndex: consistency,
    entropyScore,
    fusedAxes,
    innerAxesAsOuterScale,
    loreZh,
    passiveNameZh,
    passiveDescZh,
    innerArchetype: innerInfo,
  }
}
