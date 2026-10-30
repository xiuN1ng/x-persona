import React, { useEffect, useRef } from 'react'
import type { AxisScores } from '../../persona/axes'
import type { AvatarVisualFeatures } from '../../providers/types'

// Fast deterministic PRNG (Mulberry32)
export function createRng(seed: number) {
  let s = seed >>> 0
  return function () {
    s += 0x6d2b79f5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashStr(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function parseHexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, '')
  if (clean.length !== 6) return [212, 175, 55]
  const n = parseInt(clean, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h: number, s: number, l: number): string {
  const hNorm = ((h % 360) + 360) % 360
  const sNorm = Math.max(0, Math.min(100, s)) / 100
  const lNorm = Math.max(0, Math.min(100, l)) / 100
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1))
  const m = lNorm - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hNorm < 60) [r, g, b] = [c, x, 0]
  else if (hNorm < 120) [r, g, b] = [x, c, 0]
  else if (hNorm < 180) [r, g, b] = [0, c, x]
  else if (hNorm < 240) [r, g, b] = [0, x, c]
  else if (hNorm < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toByte = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`
}

/**
 * Bounded Hue & Saturation Perturbation within Aesthetic Safe Zone (±20° max hue shift)
 * Guarantees every user's card is uniquely tinted while never producing ugly/muddy colors.
 */
export function perturbHexBounded(hex: string, hueDeltaDeg: number, satDeltaPct = 0, lightDeltaPct = 0): string {
  const [r, g, b] = parseHexToRgb(hex)
  const [h, s, l] = rgbToHsl(r, g, b)
  const clampedHueDelta = Math.max(-20, Math.min(20, hueDeltaDeg))
  return hslToHex(h + clampedHueDelta, s + satDeltaPct, l + lightDeltaPct)
}

export function blendHexColors(hexA: string, hexB: string, weightB: number): string {
  const wB = Math.max(0, Math.min(1, weightB))
  const wA = 1 - wB
  const [r1, g1, b1] = parseHexToRgb(hexA)
  const [r2, g2, b2] = parseHexToRgb(hexB)
  const r = Math.round(r1 * wA + r2 * wB)
  const g = Math.round(g1 * wA + g2 * wB)
  const b = Math.round(b1 * wA + b2 * wB)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Deterministic Seeded 2D Value-Gradient Noise for fxhash-style Curl Flow Fields
 */
function createSeededNoise2D(seed: number) {
  const rng = createRng(seed)
  const perm = new Uint8Array(512)
  const gradX = new Float32Array(256)
  const gradY = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    perm[i] = i
    const angle = rng() * Math.PI * 2
    gradX[i] = Math.cos(angle)
    gradY[i] = Math.sin(angle)
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = perm[i]
    perm[i] = perm[j]
    perm[j] = tmp
  }
  for (let i = 0; i < 256; i++) {
    perm[i + 256] = perm[i]
  }

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (a: number, b: number, t: number) => a + t * (b - a)

  return function noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const u = fade(xf)
    const v = fade(yf)

    const aa = perm[perm[X] + Y]
    const ab = perm[perm[X] + Y + 1]
    const ba = perm[perm[X + 1] + Y]
    const bb = perm[perm[X + 1] + Y + 1]

    const dotAA = gradX[aa] * xf + gradY[aa] * yf
    const dotBA = gradX[ba] * (xf - 1) + gradY[ba] * yf
    const dotAB = gradX[ab] * xf + gradY[ab] * (yf - 1)
    const dotBB = gradX[bb] * (xf - 1) + gradY[bb] * (yf - 1)

    return lerp(lerp(dotAA, dotBA, u), lerp(dotAB, dotBB, u), v)
  }
}

export type FlowTextureFamily =
  | 'laminar-grid'          // BEAK / Structured Columnist: crisp meridian grid + parallel laminar ribbons
  | 'neural-constellation'  // CEFD / Empathetic Conversationalist: multi-node network + warm turbulent curl flow
  | 'vortex-spiral'         // Deep Philosopher / Mystic: logarithmic harmonic spiral + interference waves
  | 'quantum-pulse'         // Kinetic / Shitposter / Hacker: high-frequency radial pulse + electric streamlines

export type CardRarityTier = 'common' | 'holo' | 'prismatic' | 'rainbow'

export interface GenerativeDNA {
  seed: number;
  paletteName: string;
  isLightTheme: boolean;
  bgBase: string;
  bgSecondary: string;
  surfaceBg: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  foilColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;

  // fxhash 3-Layer Parametric Generative Fields
  flowFamily: FlowTextureFamily;
  flowFrequency: number;       // 0.004 .. 0.016
  flowTurbulence: number;      // 0.25 .. 1.85
  flowLineCount: number;       // 36 .. 78
  networkNodeCount: number;    // 0 .. 22 (driven by Field C vs B)
  gridDensity: number;         // 4 .. 14 (driven by Rhythm K vs D)
  particleCount: number;       // 12 .. 48
  peakHour: number;            // 0 .. 23 (dominant circadian hour)
  rarityTier: CardRarityTier;
  rarityLabel: string;
  rarityScore: number;         // 0 .. 100

  // Silent internal avatar weight (30%)
  avatarWeightPercent: number;
  avatarSwatches: string[];
  avatarDominantHue: number;

  // Sacred Geometry & Parametric Rose parameters (uniquely derived per user)
  symmetryOrder: number;      // e.g. 6, 8, 10, 12, 14, 16
  starStep: number;           // Polygram step {N/k}
  outerPetalReach: number;    // 0.65 .. 0.98
  outerPetalSpread: number;   // 0.18 .. 0.52 (cubic bezier control width)
  innerPetalReach: number;    // 0.38 .. 0.68
  innerPetalSpread: number;   // 0.15 .. 0.45
  orbitRadii: [number, number, number, number];
  orbitAngles: [number, number, number, number];
  rayCount: number;           // 16 .. 36
  rayModulation: number;
  ringStyle: 'astrolabe' | 'solstice' | 'chronos' | 'alchemical';

  // Kept for unit test compatibility
  chladniN: number;
  chladniM: number;
  chladniA: number;
  chladniB: number;
  hypotrochoidR: number;
  hypotrochoidr: number;
  hypotrochoidd: number;
  lissajousKx: number;
  lissajousKy: number;
  turbulence: number;
  frameStyle: 'celestial' | 'cyber-hud' | 'tarot-arch' | 'alchemical-seal';
  topologyMode: 'chladni' | 'flowfield' | 'constellation' | 'vortex';
}

interface ArchetypeVisualSpec {
  worldIdx: number;
  flowFamily: FlowTextureFamily;
  hueBias: number; // Base hue offset in [-12, +12]
}

/**
 * 16 Archetype Base Visual Specs (Hand-tuned Aesthetic Safe Zones + Native Texture Families)
 * e.g. BEAK = Cool Structured Grid & Laminar Ribbons; CEFD = Warm Multi-Node Network & Turbulent Flow
 */
const ARCHETYPE_SPECS: Record<string, ArchetypeVisualSpec> = {
  // Broadcast + Essay (Deep Thinkers / Columnists)
  BEAK: { worldIdx: 2, flowFamily: 'laminar-grid', hueBias: -6 },
  BEAD: { worldIdx: 0, flowFamily: 'vortex-spiral', hueBias: 4 },
  BEFK: { worldIdx: 1, flowFamily: 'laminar-grid', hueBias: 0 },
  BEFD: { worldIdx: 6, flowFamily: 'vortex-spiral', hueBias: 8 },
  // Broadcast + Spark (Broadcasters / Shitposters / Pulse)
  BSAK: { worldIdx: 3, flowFamily: 'laminar-grid', hueBias: -4 },
  BSAD: { worldIdx: 7, flowFamily: 'quantum-pulse', hueBias: 6 },
  BSFK: { worldIdx: 5, flowFamily: 'quantum-pulse', hueBias: -5 },
  BSFD: { worldIdx: 4, flowFamily: 'quantum-pulse', hueBias: 10 },
  // Conversation + Essay (Debaters / Mentors / Salon Hosts)
  CEAK: { worldIdx: 2, flowFamily: 'laminar-grid', hueBias: 6 },
  CEAD: { worldIdx: 7, flowFamily: 'neural-constellation', hueBias: -8 },
  CEFK: { worldIdx: 3, flowFamily: 'neural-constellation', hueBias: 5 },
  CEFD: { worldIdx: 4, flowFamily: 'neural-constellation', hueBias: -4 },
  // Conversation + Spark (Vibers / Connectors / Night Owls)
  CSAK: { worldIdx: 1, flowFamily: 'neural-constellation', hueBias: 4 },
  CSAD: { worldIdx: 0, flowFamily: 'quantum-pulse', hueBias: -8 },
  CSFK: { worldIdx: 5, flowFamily: 'neural-constellation', hueBias: 6 },
  CSFD: { worldIdx: 6, flowFamily: 'neural-constellation', hueBias: -6 },
}

const MBTI_SPECS: Record<string, ArchetypeVisualSpec> = {
  INTJ: { worldIdx: 0, flowFamily: 'laminar-grid', hueBias: -4 },
  INTP: { worldIdx: 2, flowFamily: 'vortex-spiral', hueBias: 6 },
  ENTJ: { worldIdx: 0, flowFamily: 'laminar-grid', hueBias: 8 },
  ENTP: { worldIdx: 7, flowFamily: 'quantum-pulse', hueBias: -6 },
  INFJ: { worldIdx: 6, flowFamily: 'vortex-spiral', hueBias: -5 },
  INFP: { worldIdx: 5, flowFamily: 'vortex-spiral', hueBias: 6 },
  ENFJ: { worldIdx: 4, flowFamily: 'neural-constellation', hueBias: -4 },
  ENFP: { worldIdx: 4, flowFamily: 'neural-constellation', hueBias: 10 },
  ISTJ: { worldIdx: 2, flowFamily: 'laminar-grid', hueBias: 0 },
  ISFJ: { worldIdx: 3, flowFamily: 'laminar-grid', hueBias: 4 },
  ESTJ: { worldIdx: 1, flowFamily: 'laminar-grid', hueBias: -4 },
  ESFJ: { worldIdx: 5, flowFamily: 'neural-constellation', hueBias: 4 },
  ISTP: { worldIdx: 7, flowFamily: 'quantum-pulse', hueBias: -8 },
  ISFP: { worldIdx: 3, flowFamily: 'vortex-spiral', hueBias: 8 },
  ESTP: { worldIdx: 4, flowFamily: 'quantum-pulse', hueBias: -8 },
  ESFP: { worldIdx: 6, flowFamily: 'neural-constellation', hueBias: 8 },
}

interface LuxuryColorWorld {
  name: string;
  isLight: boolean;
  bgBase: string;
  bgSecondary: string;
  surfaceBg: string;
  primary: string;
  secondary: string;
  tertiary: string;
  foil: string;
  text: string;
  muted: string;
}

const LUXURY_WORLDS: LuxuryColorWorld[] = [
  // 0: 曜石鎏金 (Obsidian & Champagne Gold)
  {
    name: '曜石鎏金',
    isLight: false,
    bgBase: '#0b0c10',
    bgSecondary: '#141722',
    surfaceBg: 'rgba(18, 21, 32, 0.86)',
    primary: '#e5c158',
    secondary: '#c59b27',
    tertiary: '#f7e5a9',
    foil: '#fff3c4',
    text: '#f8fafc',
    muted: '#94a3b8',
  },
  // 1: 象牙金箔 (Alabaster Ivory & Warm Gold - Fresh Clean Light)
  {
    name: '象牙金箔',
    isLight: true,
    bgBase: '#fbf9f5',
    bgSecondary: '#f2ece1',
    surfaceBg: 'rgba(255, 253, 249, 0.90)',
    primary: '#b48327',
    secondary: '#8c5a16',
    tertiary: '#d4a338',
    foil: '#9a6b1f',
    text: '#1c1917',
    muted: '#78716c',
  },
  // 2: 苍穹星银 (Midnight Sapphire & Celestial Silver)
  {
    name: '苍穹星银',
    isLight: false,
    bgBase: '#080d1a',
    bgSecondary: '#101c35',
    surfaceBg: 'rgba(13, 23, 44, 0.86)',
    primary: '#7dd3fc',
    secondary: '#38bdf8',
    tertiary: '#e0f2fe',
    foil: '#bae6fd',
    text: '#f0f9ff',
    muted: '#93c5fd',
  },
  // 3: 秘境青瓷 (Celadon Jade & Botanical Gold - Fresh Light)
  {
    name: '秘境青瓷',
    isLight: true,
    bgBase: '#f4f9f6',
    bgSecondary: '#e3f1ea',
    surfaceBg: 'rgba(249, 253, 251, 0.90)',
    primary: '#0f766e',
    secondary: '#b48327',
    tertiary: '#14b8a6',
    foil: '#0d9488',
    text: '#0f2922',
    muted: '#52796f',
  },
  // 4: 绯红天鹅绒 (Imperial Crimson & Rose Gold)
  {
    name: '绯红天鹅绒',
    isLight: false,
    bgBase: '#14080e',
    bgSecondary: '#28101c',
    surfaceBg: 'rgba(32, 13, 23, 0.86)',
    primary: '#fda4af',
    secondary: '#f43f5e',
    tertiary: '#fecdd3',
    foil: '#ffe4e6',
    text: '#fff1f2',
    muted: '#fda4af',
  },
  // 5: 晨曦珍珠 (Iridescent Pearl & Soft Violet - Fresh Light)
  {
    name: '晨曦珍珠',
    isLight: true,
    bgBase: '#faf8ff',
    bgSecondary: '#efeafd',
    surfaceBg: 'rgba(253, 252, 255, 0.90)',
    primary: '#6d28d9',
    secondary: '#b48327',
    tertiary: '#8b5cf6',
    foil: '#7c3aed',
    text: '#1e1b4b',
    muted: '#6b7280',
  },
  // 6: 紫微星轨 (Astral Velvet & Champagne)
  {
    name: '紫微星轨',
    isLight: false,
    bgBase: '#0d0818',
    bgSecondary: '#1b1132',
    surfaceBg: 'rgba(22, 14, 40, 0.86)',
    primary: '#d8b4fe',
    secondary: '#eab308',
    tertiary: '#f3e8ff',
    foil: '#fef08a',
    text: '#faf5ff',
    muted: '#c4b5fd',
  },
  // 7: 深林鎏翠 (Emerald Noir & Brass)
  {
    name: '深林鎏翠',
    isLight: false,
    bgBase: '#06120e',
    bgSecondary: '#0d261e',
    surfaceBg: 'rgba(10, 30, 24, 0.86)',
    primary: '#6ee7b7',
    secondary: '#d97706',
    tertiary: '#a7f3d0',
    foil: '#fde68a',
    text: '#ecfdf5',
    muted: '#6ee7b7',
  },
]

export interface ExtraGenerativeMetrics {
  nightOwl?: number;
  burstiness?: number;
  avgChars?: number;
  consistency?: number;
  hourlyDistribution?: number[];
  avatarFeatures?: AvatarVisualFeatures;
}

/**
 * Pure fxhash-style parameter derivation function:
 * Maps (handle + 4D axes + circadian histogram + avatar visual DNA) -> deterministic GenerativeDNA
 */
export function computeGenerativeDNA(
  variant: 'outer' | 'inner' | 'fusion',
  code: string,
  axes: AxisScores,
  handle: string,
  extraMetrics?: ExtraGenerativeMetrics | number[]
): GenerativeDNA {
  const extra: ExtraGenerativeMetrics = Array.isArray(extraMetrics)
    ? { hourlyDistribution: extraMetrics }
    : extraMetrics || {}
  const avatar = extra.avatarFeatures

  // 70% Persona + 30% Avatar Visual DNA (silently blended under the hood)
  const AVATAR_W = 0.30
  const PERSONA_W = 0.70

  const avatarSeedStr = avatar
    ? `${avatar.perceptualHash}:${avatar.dominantHue}:${avatar.luminance}:${avatar.detailDensity}`
    : 'default-avatar'

  const rawStr = `${variant}:${code}:${handle.toLowerCase()}:${axes.field}:${axes.density}:${axes.temperature}:${axes.rhythm}:${extra.avgChars ?? 100}:${extra.burstiness ?? 1}:${avatarSeedStr}`
  const seed = hashStr(rawStr)
  const rng = createRng(seed)

  const wField = avatar ? axes.field * PERSONA_W + avatar.contrast * AVATAR_W : axes.field
  const wDensity = avatar ? axes.density * PERSONA_W + avatar.detailDensity * AVATAR_W : axes.density
  const wTemp = avatar ? axes.temperature * PERSONA_W + avatar.warmth * AVATAR_W : axes.temperature
  const wRhythm = avatar ? axes.rhythm * PERSONA_W + avatar.saturation * AVATAR_W : axes.rhythm

  // Look up Archetype Base Spec (16 outer codes + 16 inner MBTI codes)
  const cleanCode = code.slice(0, 4).toUpperCase()
  const baseSpec: ArchetypeVisualSpec =
    variant === 'inner'
      ? MBTI_SPECS[cleanCode] || { worldIdx: 5, flowFamily: 'vortex-spiral', hueBias: 0 }
      : variant === 'fusion'
      ? {
          worldIdx: (extra.consistency ?? 75) >= 75 ? 0 : 6,
          flowFamily: wField >= 50 ? 'neural-constellation' : 'vortex-spiral',
          hueBias: 0,
        }
      : ARCHETYPE_SPECS[cleanCode] || {
          worldIdx: seed % LUXURY_WORLDS.length,
          flowFamily: wField >= 50 ? 'neural-constellation' : 'laminar-grid',
          hueBias: 0,
        }

  const world = LUXURY_WORLDS[baseSpec.worldIdx] || LUXURY_WORLDS[0]

  // Bounded Perturbation within ±20° Aesthetic Safe Zone:
  // Combines archetype hueBias + personal 4D score perturbation + avatar hue harmony
  const personalHueDelta =
    baseSpec.hueBias + ((wTemp - 50) / 50) * 10 + ((wField - 50) / 50) * 6
  const satDelta = ((wTemp - 50) / 50) * 8

  const perturbedPrimary = perturbHexBounded(world.primary, personalHueDelta, satDelta, 0)
  const perturbedSecondary = perturbHexBounded(world.secondary, -personalHueDelta * 0.7, satDelta, 0)
  const perturbedTertiary = perturbHexBounded(world.tertiary, personalHueDelta * 0.5, satDelta * 0.5, 0)

  // Silent 22% harmonic blend with avatar's extracted palette
  const primaryColor = avatar
    ? blendHexColors(perturbedPrimary, avatar.dominantColorHex, 0.22)
    : perturbedPrimary
  const secondaryColor = avatar
    ? blendHexColors(perturbedSecondary, avatar.secondaryColorHex, 0.22)
    : perturbedSecondary
  const tertiaryColor = avatar
    ? blendHexColors(perturbedTertiary, avatar.accentColorHex, 0.24)
    : perturbedTertiary

  const [pr, pg, pb] = parseHexToRgb(primaryColor)
  const borderColor = `rgba(${pr}, ${pg}, ${pb}, ${world.isLight ? 0.42 : 0.52})`

  // Layer 1 Flow Field Parameters (directly driven by 4D axes)
  // Temperature (A->F) drives curl turbulence; Density (E->S) drives spatial frequency;
  // Field (B->C) drives social network node count; Rhythm (K->D) drives grid regularity vs particle scatter
  const flowFrequency = 0.005 + (wDensity / 100) * 0.009
  const flowTurbulence = 0.28 + (wTemp / 100) * 1.45
  const flowLineCount = Math.round(42 + ((100 - wDensity) / 100) * 32)
  const networkNodeCount = wField >= 45 ? Math.round(8 + (wField / 100) * 14) : Math.round((wField / 100) * 6)
  const gridDensity = wRhythm < 55 ? Math.round(6 + ((100 - wRhythm) / 100) * 8) : 4
  const particleCount = Math.round(14 + (wRhythm / 100) * 28)

  // Dominant circadian peak hour (0..23)
  let peakHour = (seed % 24)
  if (extra.hourlyDistribution && extra.hourlyDistribution.length === 24) {
    let bestH = 0
    let bestV = -1
    for (let h = 0; h < 24; h++) {
      if (extra.hourlyDistribution[h] > bestV) {
        bestV = extra.hourlyDistribution[h]
        bestH = h
      }
    }
    peakHour = bestH
  }

  // Layer 3 Multi-Dimensional Rarity Calculation (Independent of Follower Count!)
  // Driven by circadian rarity (night owl), burstiness Fano factor, craft depth (avgChars), and extreme axis conviction
  const nightOwlBonus = Math.min(28, (extra.nightOwl ?? 0.12) * 110)
  const burstBonus = Math.min(25, Math.log10(Math.max(1, extra.burstiness ?? 10)) * 8)
  const craftBonus = Math.min(22, ((extra.avgChars ?? 80) / 180) * 20)
  const convictionBonus =
    (Math.abs(axes.field - 50) +
      Math.abs(axes.density - 50) +
      Math.abs(axes.temperature - 50) +
      Math.abs(axes.rhythm - 50)) /
    8
  const rawRarityScore = Math.min(
    99,
    Math.round(
      (variant === 'fusion' ? 88 : 25) +
        nightOwlBonus +
        burstBonus +
        craftBonus +
        convictionBonus
    )
  )

  const rarityTier: CardRarityTier =
    variant === 'fusion' || rawRarityScore >= 82
      ? 'rainbow'
      : rawRarityScore >= 66
      ? 'prismatic'
      : rawRarityScore >= 48
      ? 'holo'
      : 'common'

  const rarityLabel =
    rarityTier === 'rainbow'
      ? '✦ SECRET RAINBOW'
      : rarityTier === 'prismatic'
      ? '◆ PRISMATIC FOIL'
      : rarityTier === 'holo'
      ? '◇ HOLO FOIL'
      : '○ COLLECTOR EDITION'

  // Sacred Geometry Parameters
  const symmetryChoices = [6, 8, 10, 12, 14, 16]
  const symIdx =
    (Math.round(wField / 12) + Math.round(wRhythm / 14) + (seed % 6)) % symmetryChoices.length
  const symmetryOrder = symmetryChoices[symIdx]
  const starStep = symmetryOrder >= 12 ? 5 : symmetryOrder >= 8 ? 3 : 2

  const outerPetalReach = 0.72 + (wRhythm / 100) * 0.24
  const outerPetalSpread = 0.22 + (wTemp / 100) * 0.28
  const innerPetalReach = 0.42 + (wDensity / 100) * 0.24
  const innerPetalSpread = 0.18 + (wField / 100) * 0.25

  const orbitRadii: [number, number, number, number] = [
    36 + (wField / 100) * 10,
    52 + (wDensity / 100) * 10,
    68 + (wTemp / 100) * 10,
    84 + (wRhythm / 100) * 10,
  ]

  const orbitAngles: [number, number, number, number] = [
    (axes.field * 3.6 + (seed % 60)) % 360,
    (axes.density * 3.6 + 90 + ((seed >>> 4) % 60)) % 360,
    (axes.temperature * 3.6 + 180 + ((seed >>> 8) % 60)) % 360,
    (axes.rhythm * 3.6 + 270 + ((seed >>> 12) % 60)) % 360,
  ]

  const rayCount = symmetryOrder * 2
  const rayModulation = 0.15 + (wRhythm / 100) * 0.35

  const ringStyles: GenerativeDNA['ringStyle'][] = ['astrolabe', 'solstice', 'chronos', 'alchemical']
  const ringStyle = ringStyles[seed % ringStyles.length]

  // Legacy fields preserved for unit test assertions
  const chladniN = 1.5 + (Math.round(wField / 12) % 6) + rng() * 0.65
  const chladniM = 2.2 + (Math.round(wDensity / 10) % 7) + rng() * 0.65
  const chladniA = ((wTemp - 50) / 45) * 1.9 + (rng() - 0.5) * 0.6
  const chladniB = ((wRhythm - 50) / 45) * 1.9 + (rng() - 0.5) * 0.6
  const hypotrochoidR = 60
  const hypotrochoidr = (hypotrochoidR / symmetryOrder) * (1 + (seed % 3))
  const hypotrochoidd = 20 + (wTemp / 100) * 34

  return {
    seed,
    paletteName: world.name,
    isLightTheme: world.isLight,
    bgBase: world.bgBase,
    bgSecondary: world.bgSecondary,
    surfaceBg: world.surfaceBg,
    primaryColor,
    secondaryColor,
    tertiaryColor,
    foilColor: world.foil,
    textColor: world.text,
    mutedTextColor: world.muted,
    borderColor,
    flowFamily: baseSpec.flowFamily,
    flowFrequency,
    flowTurbulence,
    flowLineCount,
    networkNodeCount,
    gridDensity,
    particleCount,
    peakHour,
    rarityTier,
    rarityLabel,
    rarityScore: rawRarityScore,
    avatarWeightPercent: 30,
    avatarSwatches: avatar?.paletteSwatches || [primaryColor, secondaryColor, tertiaryColor],
    avatarDominantHue: avatar?.dominantHue ?? (seed % 360),
    symmetryOrder,
    starStep,
    outerPetalReach,
    outerPetalSpread,
    innerPetalReach,
    innerPetalSpread,
    orbitRadii,
    orbitAngles,
    rayCount,
    rayModulation,
    ringStyle,
    chladniN,
    chladniM,
    chladniA,
    chladniB,
    hypotrochoidR,
    hypotrochoidr,
    hypotrochoidd,
    lissajousKx: 3,
    lissajousKy: 4,
    turbulence: flowTurbulence,
    frameStyle: variant === 'fusion' ? 'alchemical-seal' : variant === 'inner' ? 'tarot-arch' : 'celestial',
    topologyMode:
      baseSpec.flowFamily === 'neural-constellation'
        ? 'constellation'
        : baseSpec.flowFamily === 'vortex-spiral'
        ? 'vortex'
        : 'flowfield',
  }
}

/**
 * Helper: Builds a smooth N-fold symmetrical Lotus / Rose Window SVG path using cubic Beziers
 */
function buildSacredRosePath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  order: number,
  spreadFactor: number,
  phaseOffsetRad = 0
): string {
  const cmds: string[] = []
  const stepAngle = (Math.PI * 2) / order

  for (let i = 0; i < order; i++) {
    const a0 = i * stepAngle - stepAngle * 0.5 + phaseOffsetRad
    const aMid = i * stepAngle + phaseOffsetRad
    const a1 = i * stepAngle + stepAngle * 0.5 + phaseOffsetRad

    const x0 = cx + Math.cos(a0) * innerR
    const y0 = cy + Math.sin(a0) * innerR

    const xTip = cx + Math.cos(aMid) * outerR
    const yTip = cy + Math.sin(aMid) * outerR

    const x1 = cx + Math.cos(a1) * innerR
    const y1 = cy + Math.sin(a1) * innerR

    const ctrlR = innerR + (outerR - innerR) * 0.62
    const ctrlSpread = stepAngle * spreadFactor

    const cp1x = cx + Math.cos(aMid - ctrlSpread) * ctrlR
    const cp1y = cy + Math.sin(aMid - ctrlSpread) * ctrlR

    const cp2x = cx + Math.cos(aMid + ctrlSpread) * ctrlR
    const cp2y = cy + Math.sin(aMid + ctrlSpread) * ctrlR

    cmds.push(
      `M ${x0.toFixed(2)} ${y0.toFixed(2)} Q ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${xTip.toFixed(2)} ${yTip.toFixed(2)} Q ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
    )
  }

  return cmds.join(' ')
}

/**
 * Helper: Builds a continuous Star Polygram {N/k} path
 */
function buildStarPolygramPoints(
  cx: number,
  cy: number,
  radius: number,
  order: number,
  step: number,
  rotationRad = 0
): string {
  const pts: string[] = []
  for (let i = 0; i < order; i++) {
    const a = ((i * step) % order) * ((Math.PI * 2) / order) - Math.PI / 2 + rotationRad
    pts.push(`${(cx + Math.cos(a) * radius).toFixed(2)},${(cy + Math.sin(a) * radius).toFixed(2)}`)
  }
  return pts.join(' ')
}

/**
 * LAYER 1 (BOTTOM): fxhash-Style Seeded Generative Flow Field & Archetype Texture Canvas
 * Renders silk-smooth anti-aliased flow lines, structured architectural grids (for BEAK/K types),
 * or multi-node social constellations (for CEFD/C types) onto a 2x Retina Canvas 2D.
 */
export const ProceduralPatternCanvas: React.FC<{
  dna: GenerativeDNA;
  axes: AxisScores;
  isBack?: boolean;
  hourlyDistribution?: number[];
}> = ({ dna, isBack = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 380
    const H = 575
    const dpr = 2
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const rng = createRng(dna.seed ^ (isBack ? 0x9e3779b9 : 0x13579bdf))
    const noise2D = createSeededNoise2D(dna.seed ^ (isBack ? 0x85ebca6b : 0xc2b2ae35))

    // 1. Rich Base Gradient
    const baseGrad = ctx.createLinearGradient(0, 0, W, H)
    baseGrad.addColorStop(0, dna.bgBase)
    baseGrad.addColorStop(0.5, dna.bgSecondary)
    baseGrad.addColorStop(1, dna.bgBase)
    ctx.fillStyle = baseGrad
    ctx.fillRect(0, 0, W, H)

    // 2. Ambient Radial Aura
    const glowY = isBack ? H * 0.5 : H * 0.31
    const radGrad = ctx.createRadialGradient(W * 0.5, glowY, 10, W * 0.5, glowY, 260)
    const [pr, pg, pb] = parseHexToRgb(dna.primaryColor)
    const [sr, sg, sb] = parseHexToRgb(dna.secondaryColor)
    const [tr, tg, tb] = parseHexToRgb(dna.tertiaryColor)
    radGrad.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, ${dna.isLightTheme ? 0.16 : 0.22})`)
    radGrad.addColorStop(0.55, `rgba(${sr}, ${sg}, ${sb}, ${dna.isLightTheme ? 0.06 : 0.09})`)
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = radGrad
    ctx.fillRect(0, 0, W, H)

    // 3. Archetype-Specific Structural Underlay
    if (dna.flowFamily === 'laminar-grid') {
      // BEAK / Structured Columnist: crisp architectural meridian grid & rule lines
      ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, ${dna.isLightTheme ? 0.08 : 0.09})`
      ctx.lineWidth = 0.6
      const step = Math.round(W / dna.gridDensity)
      for (let x = step; x < W; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 18)
        ctx.lineTo(x, H - 18)
        ctx.stroke()
      }
      for (let y = step; y < H; y += step) {
        ctx.beginPath()
        ctx.moveTo(18, y)
        ctx.lineTo(W - 18, y)
        ctx.stroke()
      }
    }

    // 4. Seeded Curl-Noise Silk Streamlines (Differentiated by FlowFamily)
    const lineCount = isBack ? Math.round(dna.flowLineCount * 0.7) : dna.flowLineCount
    const freq = dna.flowFrequency
    const turb = dna.flowTurbulence

    for (let i = 0; i < lineCount; i++) {
      let x = rng() * W
      let y = rng() * H
      const steps = 42 + Math.floor(rng() * 34)
      const stepLen = 3.8

      ctx.beginPath()
      ctx.moveTo(x, y)

      for (let s = 0; s < steps; s++) {
        let angle = 0
        if (dna.flowFamily === 'laminar-grid') {
          // Smooth horizontal/diagonal laminar ribbons with gentle harmonic undulation
          const n = noise2D(x * freq * 0.7, y * freq * 0.7)
          angle = Math.PI * 0.18 + n * turb * 0.55
        } else if (dna.flowFamily === 'vortex-spiral') {
          // Orbital spiral streamlines around the mandala center
          const dx = x - W * 0.5
          const dy = y - glowY
          const baseAngle = Math.atan2(dy, dx) + Math.PI * 0.52
          const n = noise2D(x * freq, y * freq)
          angle = baseAngle + n * turb * 0.45
        } else if (dna.flowFamily === 'quantum-pulse') {
          // High-energy frequency-modulated wave streamlines
          const n = noise2D(x * freq * 1.35, y * freq * 1.35)
          angle = Math.sin(y * 0.025) * 1.1 + n * turb * 1.25
        } else {
          // 'neural-constellation': Organic curl-noise turbulent flow field
          const n = noise2D(x * freq, y * freq)
          angle = n * Math.PI * turb * 1.4
        }

        x += Math.cos(angle) * stepLen
        y += Math.sin(angle) * stepLen
        ctx.lineTo(x, y)

        if (x < -10 || x > W + 10 || y < -10 || y > H + 10) break
      }

      const useSecondary = i % 3 === 0
      const alpha = dna.isLightTheme
        ? 0.07 + (i % 5) * 0.015
        : 0.08 + (i % 5) * 0.02
      ctx.strokeStyle = useSecondary
        ? `rgba(${sr}, ${sg}, ${sb}, ${alpha})`
        : `rgba(${pr}, ${pg}, ${pb}, ${alpha})`
      ctx.lineWidth = i % 6 === 0 ? 1.1 : 0.65
      ctx.stroke()
    }

    // 5. Multi-Node Social Network Constellation (Prominent for 'C' Conversation types like CEFD)
    if (dna.networkNodeCount > 0 && !isBack) {
      const nodes: Array<{ x: number; y: number; r: number }> = []
      for (let i = 0; i < dna.networkNodeCount; i++) {
        nodes.push({
          x: 28 + rng() * (W - 56),
          y: 36 + rng() * (H - 72),
          r: 1.2 + rng() * 1.8,
        })
      }

      ctx.lineWidth = 0.6
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
          if (dist < 105) {
            const linkAlpha = (1 - dist / 105) * (dna.isLightTheme ? 0.14 : 0.18)
            ctx.strokeStyle = `rgba(${tr}, ${tg}, ${tb}, ${linkAlpha.toFixed(3)})`
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      for (const nd of nodes) {
        ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${dna.isLightTheme ? 0.25 : 0.35})`
        ctx.beginPath()
        ctx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 6. Luminous Stardust Particles (Driven by Rhythm / Spontaneous D)
    const pCount = isBack ? Math.round(dna.particleCount * 0.5) : dna.particleCount
    for (let i = 0; i < pCount; i++) {
      const px = 20 + rng() * (W - 40)
      const py = 20 + rng() * (H - 40)
      const pradius = 0.6 + rng() * 1.3
      const pAlpha = dna.isLightTheme ? 0.15 + rng() * 0.2 : 0.18 + rng() * 0.32
      ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${pAlpha.toFixed(2)})`
      ctx.beginPath()
      ctx.arc(px, py, pradius, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [dna, isBack])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}

/**
 * LAYER 2 (MIDDLE): Crisp Vector SVG Data Graphics + 24-Hour Circadian Ring Histogram
 * Makes the user immediately recognize "This is MY data":
 * - True 24-hour posting histogram around the outer ring (e.g. a 3 AM spike for late-night gamedevs, or 8 AM rise for morning columnists)
 * - Parametric Sacred Rose Mandala + Planetary Axis Orbits + Avatar Medallion
 */
export const ProceduralSigilCenterpiece: React.FC<{
  dna: GenerativeDNA;
  axes: AxisScores;
  secondaryAxes?: AxisScores;
  badgeIcon: string;
  secondaryIcon?: string;
  avatarUrl?: string;
  hourlyDistribution?: number[];
}> = ({ dna, badgeIcon, secondaryIcon, avatarUrl, hourlyDistribution }) => {
  const size = 196
  const cx = size / 2
  const cy = size / 2
  const maxR = 86

  // True 24-hour circadian distribution (00:00 at top, clockwise)
  const rawHourly =
    hourlyDistribution && hourlyDistribution.length === 24
      ? hourlyDistribution
      : Array.from({ length: 24 }, (_, hr) => {
          const distFromPeak = Math.min(
            Math.abs(hr - dna.peakHour),
            24 - Math.abs(hr - dna.peakHour)
          )
          return Math.max(1, Math.round(12 - distFromPeak * 1.4 + ((hr * 7 + dna.seed) % 4)))
        })
  const maxHourVal = Math.max(...rawHourly, 1)

  const outerRosePath = buildSacredRosePath(
    cx,
    cy,
    22,
    maxR * dna.outerPetalReach * 0.88,
    dna.symmetryOrder,
    dna.outerPetalSpread,
    0
  )
  const innerRosePath = buildSacredRosePath(
    cx,
    cy,
    18,
    maxR * dna.innerPetalReach * 0.9,
    dna.symmetryOrder,
    dna.innerPetalSpread,
    Math.PI / dna.symmetryOrder
  )
  const starPts1 = buildStarPolygramPoints(cx, cy, maxR * 0.76, dna.symmetryOrder, dna.starStep, 0)
  const starPts2 = buildStarPolygramPoints(
    cx,
    cy,
    maxR * 0.76,
    dna.symmetryOrder,
    dna.starStep,
    Math.PI / dna.symmetryOrder
  )

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs>
          <radialGradient id={`roseFill-${dna.seed}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={dna.primaryColor} stopOpacity="0.28" />
            <stop offset="70%" stopColor={dna.secondaryColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={dna.primaryColor} stopOpacity="0.02" />
          </radialGradient>
        </defs>

        {/* Outer Fine Astrolabe Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={maxR + 8}
          fill="none"
          stroke={dna.primaryColor}
          strokeOpacity="0.24"
          strokeWidth="0.75"
        />
        <circle
          cx={cx}
          cy={cy}
          r={maxR - 8}
          fill="none"
          stroke={dna.primaryColor}
          strokeOpacity="0.42"
          strokeWidth="0.9"
          strokeDasharray="2 3"
        />

        {/* TRUE 24-HOUR CIRCADIAN RING HISTOGRAM (00:00 Top, 06:00 Right, 12:00 Bottom, 18:00 Left) */}
        {rawHourly.map((val, hr) => {
          const angle = (hr / 24) * Math.PI * 2 - Math.PI / 2
          const norm = val / maxHourVal
          const isPeak = hr === dna.peakHour && val > 0
          const rBase = maxR - 8
          const barLen = 3 + norm * 15 // Spikes outward up to maxR + 7
          const x1 = cx + Math.cos(angle) * rBase
          const y1 = cy + Math.sin(angle) * rBase
          const x2 = cx + Math.cos(angle) * (rBase + barLen)
          const y2 = cy + Math.sin(angle) * (rBase + barLen)

          return (
            <g key={hr}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isPeak ? dna.foilColor : dna.primaryColor}
                strokeOpacity={isPeak ? '0.95' : (0.3 + norm * 0.55).toFixed(2)}
                strokeWidth={isPeak ? '2.2' : norm > 0.6 ? '1.5' : '1.0'}
                strokeLinecap="round"
              />
              {isPeak && (
                <circle
                  cx={cx + Math.cos(angle) * (rBase + barLen + 2.5)}
                  cy={cy + Math.sin(angle) * (rBase + barLen + 2.5)}
                  r="2"
                  fill={dna.foilColor}
                />
              )}
            </g>
          )
        })}

        {/* 4 Cardinal Hour Markers (00h, 06h, 12h, 18h) */}
        {[
          { deg: -90, label: '00h' },
          { deg: 0, label: '06h' },
          { deg: 90, label: '12h' },
          { deg: 180, label: '18h' },
        ].map((m) => {
          const rad = (m.deg * Math.PI) / 180
          const tx = cx + Math.cos(rad) * (maxR + 13)
          const ty = cy + Math.sin(rad) * (maxR + 13)
          return (
            <text
              key={m.label}
              x={tx}
              y={ty + 2}
              textAnchor="middle"
              fill={dna.mutedTextColor}
              fillOpacity="0.65"
              fontFamily="monospace"
              fontSize="6"
              fontWeight="700"
            >
              {m.label}
            </text>
          )
        })}

        {/* Interlocking Sacred Star Polygrams */}
        <polygon
          points={starPts1}
          fill="none"
          stroke={dna.secondaryColor}
          strokeOpacity="0.38"
          strokeWidth="0.85"
        />
        <polygon
          points={starPts2}
          fill="none"
          stroke={dna.primaryColor}
          strokeOpacity="0.38"
          strokeWidth="0.85"
        />

        {/* Outer Parametric Lotus Petals */}
        <path
          d={outerRosePath}
          fill={`url(#roseFill-${dna.seed})`}
          stroke={dna.primaryColor}
          strokeOpacity="0.72"
          strokeWidth="1.15"
        />

        {/* Inner Parametric Lotus Petals (phase-shifted) */}
        <path
          d={innerRosePath}
          fill={dna.secondaryColor}
          fillOpacity="0.12"
          stroke={dna.tertiaryColor}
          strokeOpacity="0.75"
          strokeWidth="1.05"
        />

        {/* 4 Planetary Axis Orbits & Nodes */}
        {dna.orbitAngles.map((deg, idx) => {
          const rad = 36 + idx * 11
          const a = (deg * Math.PI) / 180
          const nx = cx + Math.cos(a) * rad
          const ny = cy + Math.sin(a) * rad
          return (
            <g key={idx}>
              <circle
                cx={cx}
                cy={cy}
                r={rad}
                fill="none"
                stroke={dna.primaryColor}
                strokeOpacity="0.22"
                strokeWidth="0.7"
              />
              <circle
                cx={nx}
                cy={ny}
                r={2.6}
                fill={dna.foilColor}
                stroke={dna.primaryColor}
                strokeWidth="1"
              />
            </g>
          )
        })}

        {/* Center Portrait Bezel Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={31}
          fill={dna.bgBase}
          stroke={dna.primaryColor}
          strokeWidth="1.8"
        />
        <circle
          cx={cx}
          cy={cy}
          r={27.5}
          fill="none"
          stroke={dna.foilColor}
          strokeOpacity="0.65"
          strokeWidth="0.8"
        />
      </svg>

      {/* Crisp Circular Avatar Medallion + Subtle Crest Badge */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {avatarUrl ? (
          <div className="relative w-[52px] h-[52px] rounded-full flex items-center justify-center">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-[52px] h-[52px] rounded-full object-cover"
            />
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
              style={{
                backgroundColor: dna.bgBase,
                border: `1.2px solid ${dna.primaryColor}`,
              }}
            >
              <span className="text-[11px] leading-none">
                {secondaryIcon || badgeIcon}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-2xl">{badgeIcon}</span>
        )}
      </div>
    </div>
  )
}

/**
 * Full-Bleed Symmetrical Collectible Card Back Artwork
 * Inspired by Clow Cards, Theory11 Foil Playing Cards & Tarot De Marseille.
 * 100% vector sacred geometry uniquely parameterized by the user's DNA.
 */
export const ProceduralLuxuryCardBack: React.FC<{
  dna: GenerativeDNA;
  activeCode: string;
  handle: string;
  slot: 'outer' | 'inner' | 'fusion';
  hourlyDistribution?: number[];
}> = ({ dna, activeCode, handle, slot, hourlyDistribution }) => {
  const w = 380
  const h = 575
  const cx = w / 2
  const cy = h / 2

  const outerRose = buildSacredRosePath(
    cx,
    cy,
    24,
    126 * dna.outerPetalReach,
    dna.symmetryOrder,
    dna.outerPetalSpread,
    0
  )
  const midRose = buildSacredRosePath(
    cx,
    cy,
    20,
    94 * dna.innerPetalReach * 1.25,
    dna.symmetryOrder,
    dna.innerPetalSpread,
    Math.PI / dna.symmetryOrder
  )
  const innerRose = buildSacredRosePath(
    cx,
    cy,
    12,
    54,
    dna.symmetryOrder,
    0.25,
    0
  )

  const starOuter = buildStarPolygramPoints(cx, cy, 118, dna.symmetryOrder, dna.starStep, 0)
  const starCounter = buildStarPolygramPoints(
    cx,
    cy,
    118,
    dna.symmetryOrder,
    dna.starStep,
    Math.PI / dna.symmetryOrder
  )
  const starInner = buildStarPolygramPoints(cx, cy, 68, dna.symmetryOrder, 2, 0)

  const rawDist =
    hourlyDistribution && hourlyDistribution.length === 24
      ? hourlyDistribution
      : Array.from({ length: 24 }, (_, i) => ((i * 7 + dna.seed) % 10) + 3)
  const maxVal = Math.max(...rawDist, 1)

  const uid = `back-${dna.seed}`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      <defs>
        <radialGradient id={`${uid}-centerGlow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={dna.primaryColor} stopOpacity={dna.isLightTheme ? '0.26' : '0.38'} />
          <stop offset="60%" stopColor={dna.secondaryColor} stopOpacity="0.1" />
          <stop offset="100%" stopColor={dna.bgBase} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-foil`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={dna.primaryColor} />
          <stop offset="50%" stopColor={dna.foilColor} />
          <stop offset="100%" stopColor={dna.secondaryColor} />
        </linearGradient>
      </defs>

      {/* Outer Filigree Double Border */}
      <rect
        x="14"
        y="14"
        width={w - 28}
        height={h - 28}
        rx="20"
        fill="none"
        stroke={`url(#${uid}-foil)`}
        strokeOpacity="0.65"
        strokeWidth="1.5"
      />
      <rect
        x="20"
        y="20"
        width={w - 40}
        height={h - 40}
        rx="15"
        fill="none"
        stroke={dna.primaryColor}
        strokeOpacity="0.35"
        strokeWidth="0.9"
      />

      {/* Inner Arched Cathedral / Tarot Sanctuary Frame */}
      <path
        d={`M 28 110 A 162 145 0 0 1 ${w - 28} 110 L ${w - 28} ${h - 110} A 162 145 0 0 1 28 ${h - 110} Z`}
        fill="none"
        stroke={dna.primaryColor}
        strokeOpacity="0.32"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* 4 Symmetrical Corner Celestial Rosettes */}
      {[
        [44, 44],
        [w - 44, 44],
        [44, h - 44],
        [w - 44, h - 44],
      ].map(([kx, ky], idx) => (
        <g key={idx}>
          <circle
            cx={kx}
            cy={ky}
            r="14"
            fill="none"
            stroke={dna.primaryColor}
            strokeOpacity="0.5"
            strokeWidth="0.9"
          />
          <circle
            cx={kx}
            cy={ky}
            r="9"
            fill="none"
            stroke={dna.primaryColor}
            strokeOpacity="0.35"
            strokeWidth="0.7"
            strokeDasharray="2 2"
          />
          <path
            d={`M ${kx - 14} ${ky} L ${kx + 14} ${ky} M ${kx} ${ky - 14} L ${kx} ${ky + 14}`}
            stroke={dna.primaryColor}
            strokeOpacity="0.4"
            strokeWidth="0.8"
          />
          <circle cx={kx} cy={ky} r="2.5" fill={dna.primaryColor} />
        </g>
      ))}

      {/* Top & Bottom Mirrored Celestial Axis Ornaments */}
      {[82, h - 82].map((posY, idx) => {
        const dir = idx === 0 ? 1 : -1
        return (
          <g key={idx}>
            <line
              x1={cx}
              y1={idx === 0 ? 20 : h - 20}
              x2={cx}
              y2={posY + dir * 45}
              stroke={dna.primaryColor}
              strokeOpacity="0.45"
              strokeWidth="1"
            />
            <circle
              cx={cx}
              cy={posY}
              r="18"
              fill="none"
              stroke={`url(#${uid}-foil)`}
              strokeOpacity="0.75"
              strokeWidth="1.2"
            />
            <circle
              cx={cx}
              cy={posY - dir * 5}
              r="14"
              fill={dna.bgBase}
            />
            <circle
              cx={cx}
              cy={posY}
              r="4.5"
              fill={dna.primaryColor}
            />
            <circle cx={cx - 48} cy={posY} r="2" fill={dna.primaryColor} fillOpacity="0.6" />
            <circle cx={cx + 48} cy={posY} r="2" fill={dna.primaryColor} fillOpacity="0.6" />
            <line
              x1={cx - 48}
              y1={posY}
              x2={cx - 22}
              y2={posY}
              stroke={dna.primaryColor}
              strokeOpacity="0.35"
              strokeWidth="0.8"
            />
            <line
              x1={cx + 22}
              y1={posY}
              x2={cx + 48}
              y2={posY}
              stroke={dna.primaryColor}
              strokeOpacity="0.35"
              strokeWidth="0.8"
            />
          </g>
        )
      })}

      {/* Central Mandala Aura */}
      <circle cx={cx} cy={cy} r="145" fill={`url(#${uid}-centerGlow)`} />

      {/* Outer Zodiac / Astrolabe Degree Wheel */}
      <circle
        cx={cx}
        cy={cy}
        r="134"
        fill="none"
        stroke={`url(#${uid}-foil)`}
        strokeOpacity="0.7"
        strokeWidth="1.4"
      />
      <circle
        cx={cx}
        cy={cy}
        r="126"
        fill="none"
        stroke={dna.primaryColor}
        strokeOpacity="0.4"
        strokeWidth="0.8"
      />

      {/* 72 Fine Watchmaker Degree Ticks around the Astrolabe */}
      {Array.from({ length: 72 }).map((_, i) => {
        const a = (i / 72) * Math.PI * 2
        const isMajor = i % 6 === 0
        const r1 = isMajor ? 123 : 127
        const r2 = 133
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * r1}
            y1={cy + Math.sin(a) * r1}
            x2={cx + Math.cos(a) * r2}
            y2={cy + Math.sin(a) * r2}
            stroke={dna.primaryColor}
            strokeOpacity={isMajor ? '0.75' : '0.35'}
            strokeWidth={isMajor ? '1.3' : '0.7'}
          />
        )
      })}

      {/* Symmetrical 24-Spoke Circadian Harmonic Crown */}
      {Array.from({ length: 24 }).map((_, hr) => {
        const a = (hr / 24) * Math.PI * 2 - Math.PI / 2
        const symVal = (rawDist[hr] + rawDist[(hr + 12) % 24]) * 0.5
        const norm = symVal / maxVal
        const rInner = 34
        const rOuter = 82 + norm * 36
        return (
          <g key={hr}>
            <line
              x1={cx + Math.cos(a) * rInner}
              y1={cy + Math.sin(a) * rInner}
              x2={cx + Math.cos(a) * rOuter}
              y2={cy + Math.sin(a) * rOuter}
              stroke={dna.primaryColor}
              strokeOpacity={0.28 + norm * 0.45}
              strokeWidth={hr % 2 === 0 ? '1.2' : '0.75'}
            />
            <circle
              cx={cx + Math.cos(a) * rOuter}
              cy={cy + Math.sin(a) * rOuter}
              r={1.6 + norm * 1.4}
              fill={dna.foilColor}
              fillOpacity="0.85"
            />
          </g>
        )
      })}

      {/* Counter-Rotating Sacred Star Polygrams */}
      <polygon
        points={starOuter}
        fill="none"
        stroke={dna.primaryColor}
        strokeOpacity="0.55"
        strokeWidth="1.1"
      />
      <polygon
        points={starCounter}
        fill="none"
        stroke={dna.secondaryColor}
        strokeOpacity="0.45"
        strokeWidth="1.0"
      />

      {/* Outer Parametric Sacred Rose Petals */}
      <path
        d={outerRose}
        fill={dna.primaryColor}
        fillOpacity={dna.isLightTheme ? '0.08' : '0.12'}
        stroke={`url(#${uid}-foil)`}
        strokeOpacity="0.85"
        strokeWidth="1.3"
      />

      {/* Middle Phase-Shifted Sacred Rose Petals */}
      <path
        d={midRose}
        fill={dna.secondaryColor}
        fillOpacity={dna.isLightTheme ? '0.08' : '0.14'}
        stroke={dna.primaryColor}
        strokeOpacity="0.7"
        strokeWidth="1.1"
      />

      {/* Inner Star Polygram & Core Lotus */}
      <polygon
        points={starInner}
        fill="none"
        stroke={dna.foilColor}
        strokeOpacity="0.65"
        strokeWidth="0.9"
      />
      <path
        d={innerRose}
        fill={dna.primaryColor}
        fillOpacity="0.18"
        stroke={dna.foilColor}
        strokeOpacity="0.9"
        strokeWidth="1.2"
      />

      {/* Central Sacred Seal Medallion */}
      <circle
        cx={cx}
        cy={cy}
        r="24"
        fill={dna.bgBase}
        stroke={`url(#${uid}-foil)`}
        strokeWidth="1.8"
      />
      <circle
        cx={cx}
        cy={cy}
        r="19"
        fill="none"
        stroke={dna.primaryColor}
        strokeOpacity="0.6"
        strokeWidth="0.8"
        strokeDasharray="2 2"
      />

      {/* Central Archetype Code Seal */}
      <text
        x={cx}
        y={cy + 3.5}
        textAnchor="middle"
        fill={dna.primaryColor}
        fontFamily="monospace, sans-serif"
        fontWeight="900"
        fontSize="10"
        letterSpacing="1.5"
      >
        {activeCode.slice(0, 4)}
      </text>

      {/* Subtle Engraved Top & Bottom Micro-Typography */}
      <text
        x={cx}
        y="36"
        textAnchor="middle"
        fill={dna.mutedTextColor}
        fillOpacity="0.75"
        fontFamily="monospace, sans-serif"
        fontSize="7.5"
        letterSpacing="3"
      >
        {slot === 'outer'
          ? 'WORLD I · CYBER PERSONA'
          : slot === 'inner'
          ? 'WORLD II · INNER ARCHETYPE'
          : 'WORLD III · ALCHEMICAL FUSION'}
      </text>
      <text
        x={cx}
        y={h - 28}
        textAnchor="middle"
        fill={dna.mutedTextColor}
        fillOpacity="0.75"
        fontFamily="monospace, sans-serif"
        fontSize="7.5"
        letterSpacing="2.5"
      >
        @{handle.toUpperCase()} · No.{dna.seed.toString(16).slice(0, 6).toUpperCase()}
      </text>
    </svg>
  )
}

/**
 * Clean Architectural Frame Overlay for the Front Face
 */
export const ProceduralFrameOverlay: React.FC<{ dna: GenerativeDNA }> = ({ dna }) => {
  return (
    <svg
      viewBox="0 0 380 575"
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      fill="none"
    >
      {/* Outer Fine Hairline Frame */}
      <rect
        x="10"
        y="10"
        width="360"
        height="555"
        rx="22"
        stroke={dna.primaryColor}
        strokeOpacity="0.38"
        strokeWidth="1"
      />
      {/* 4 Delicate Corner Accents */}
      <path d="M 18 32 L 18 18 L 32 18" stroke={dna.primaryColor} strokeOpacity="0.7" strokeWidth="1.5" />
      <path d="M 362 32 L 362 18 L 348 18" stroke={dna.primaryColor} strokeOpacity="0.7" strokeWidth="1.5" />
      <path d="M 18 543 L 18 557 L 32 557" stroke={dna.primaryColor} strokeOpacity="0.7" strokeWidth="1.5" />
      <path d="M 362 543 L 362 557 L 348 557" stroke={dna.primaryColor} strokeOpacity="0.7" strokeWidth="1.5" />
    </svg>
  )
}
