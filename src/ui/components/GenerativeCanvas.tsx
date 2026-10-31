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
 * Bounded Hue & Saturation Perturbation within Aesthetic Safe Zone (±32° max hue shift)
 */
export function perturbHexBounded(hex: string, hueDeltaDeg: number, satDeltaPct = 0, lightDeltaPct = 0): string {
  const [r, g, b] = parseHexToRgb(hex)
  const [h, s, l] = rgbToHsl(r, g, b)
  const clampedHueDelta = Math.max(-32, Math.min(32, hueDeltaDeg))
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

/**
 * 6 Radically Different Hero Totem & Card-Back Geometric Engines
 * Ensures two different people's cards have completely different silhouettes at first glance!
 */
export type SigilArchitecture =
  | 'chrono-astrolabe'      // Mechanical gear dial + vernier caliper arcs + 4-point compass needle
  | 'cyber-polygon'         // Isometric nested hexagons/octagons + laser crosshairs + prism vertices
  | 'sacred-lotus'          // Parametric Bezier lotus rose + interlocking star polygrams
  | 'orbital-constellation' // 3D tilted elliptical planetary rings (atomic orrery) + constellation map
  | 'harmonic-spirograph'   // True mathematical Hypotrochoid / Epitrochoid spirograph loops
  | 'eclipse-monolith'      // Off-center lunar/solar eclipse crescent + dramatic flare corona + diamond monolith

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
  sigilArchitecture: SigilArchitecture;
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

  // Sacred Geometry & Parametric parameters (uniquely derived per user)
  symmetryOrder: number;      // e.g. 5, 6, 7, 8, 9, 10, 12, 14, 16
  starStep: number;           // Polygram step {N/k}
  outerPetalReach: number;    // 0.65 .. 0.98
  outerPetalSpread: number;   // 0.18 .. 0.52
  innerPetalReach: number;    // 0.38 .. 0.68
  innerPetalSpread: number;   // 0.15 .. 0.45
  orbitRadii: [number, number, number, number];
  orbitAngles: [number, number, number, number];
  rayCount: number;           // 16 .. 36
  rayModulation: number;
  ringStyle: 'astrolabe' | 'solstice' | 'chronos' | 'alchemical';

  // Mathematical Spirograph & Chladni parameters
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
  sigilArch: SigilArchitecture;
  frameStyle: GenerativeDNA['frameStyle'];
  hueBias: number;
}

/**
 * 16 Outer Archetypes + 16 Inner MBTI Types mapped across 12 Luxury Color Worlds,
 * 6 Distinct Sigil Geometries, 4 Flow Families, and 4 Frame Architectures
 */
const ARCHETYPE_SPECS: Record<string, ArchetypeVisualSpec> = {
  // Broadcast + Essay (Deep Thinkers / Columnists)
  BEAK: { worldIdx: 2, flowFamily: 'laminar-grid', sigilArch: 'chrono-astrolabe', frameStyle: 'cyber-hud', hueBias: -8 },
  BEAD: { worldIdx: 0, flowFamily: 'vortex-spiral', sigilArch: 'eclipse-monolith', frameStyle: 'alchemical-seal', hueBias: 6 },
  BEFK: { worldIdx: 1, flowFamily: 'laminar-grid', sigilArch: 'sacred-lotus', frameStyle: 'tarot-arch', hueBias: 0 },
  BEFD: { worldIdx: 6, flowFamily: 'vortex-spiral', sigilArch: 'eclipse-monolith', frameStyle: 'celestial', hueBias: 10 },
  // Broadcast + Spark (Broadcasters / Shitposters / Pulse)
  BSAK: { worldIdx: 8, flowFamily: 'laminar-grid', sigilArch: 'cyber-polygon', frameStyle: 'cyber-hud', hueBias: -6 },
  BSAD: { worldIdx: 7, flowFamily: 'quantum-pulse', sigilArch: 'harmonic-spirograph', frameStyle: 'alchemical-seal', hueBias: 8 },
  BSFK: { worldIdx: 9, flowFamily: 'quantum-pulse', sigilArch: 'orbital-constellation', frameStyle: 'celestial', hueBias: -6 },
  BSFD: { worldIdx: 4, flowFamily: 'quantum-pulse', sigilArch: 'harmonic-spirograph', frameStyle: 'tarot-arch', hueBias: 12 },
  // Conversation + Essay (Debaters / Mentors / Salon Hosts)
  CEAK: { worldIdx: 10, flowFamily: 'laminar-grid', sigilArch: 'cyber-polygon', frameStyle: 'cyber-hud', hueBias: 6 },
  CEAD: { worldIdx: 11, flowFamily: 'neural-constellation', sigilArch: 'harmonic-spirograph', frameStyle: 'alchemical-seal', hueBias: -10 },
  CEFK: { worldIdx: 3, flowFamily: 'neural-constellation', sigilArch: 'sacred-lotus', frameStyle: 'tarot-arch', hueBias: 6 },
  CEFD: { worldIdx: 4, flowFamily: 'neural-constellation', sigilArch: 'orbital-constellation', frameStyle: 'celestial', hueBias: -6 },
  // Conversation + Spark (Vibers / Connectors / Night Owls)
  CSAK: { worldIdx: 1, flowFamily: 'neural-constellation', sigilArch: 'chrono-astrolabe', frameStyle: 'cyber-hud', hueBias: 5 },
  CSAD: { worldIdx: 8, flowFamily: 'quantum-pulse', sigilArch: 'eclipse-monolith', frameStyle: 'alchemical-seal', hueBias: -10 },
  CSFK: { worldIdx: 5, flowFamily: 'neural-constellation', sigilArch: 'orbital-constellation', frameStyle: 'tarot-arch', hueBias: 8 },
  CSFD: { worldIdx: 6, flowFamily: 'neural-constellation', sigilArch: 'harmonic-spirograph', frameStyle: 'celestial', hueBias: -8 },
}

const MBTI_SPECS: Record<string, ArchetypeVisualSpec> = {
  INTJ: { worldIdx: 0, flowFamily: 'laminar-grid', sigilArch: 'eclipse-monolith', frameStyle: 'alchemical-seal', hueBias: -4 },
  INTP: { worldIdx: 10, flowFamily: 'vortex-spiral', sigilArch: 'cyber-polygon', frameStyle: 'cyber-hud', hueBias: 6 },
  ENTJ: { worldIdx: 8, flowFamily: 'laminar-grid', sigilArch: 'chrono-astrolabe', frameStyle: 'alchemical-seal', hueBias: 8 },
  ENTP: { worldIdx: 7, flowFamily: 'quantum-pulse', sigilArch: 'harmonic-spirograph', frameStyle: 'cyber-hud', hueBias: -6 },
  INFJ: { worldIdx: 6, flowFamily: 'vortex-spiral', sigilArch: 'sacred-lotus', frameStyle: 'tarot-arch', hueBias: -5 },
  INFP: { worldIdx: 5, flowFamily: 'vortex-spiral', sigilArch: 'sacred-lotus', frameStyle: 'tarot-arch', hueBias: 6 },
  ENFJ: { worldIdx: 4, flowFamily: 'neural-constellation', sigilArch: 'orbital-constellation', frameStyle: 'celestial', hueBias: -4 },
  ENFP: { worldIdx: 9, flowFamily: 'neural-constellation', sigilArch: 'orbital-constellation', frameStyle: 'celestial', hueBias: 10 },
  ISTJ: { worldIdx: 2, flowFamily: 'laminar-grid', sigilArch: 'chrono-astrolabe', frameStyle: 'cyber-hud', hueBias: 0 },
  ISFJ: { worldIdx: 3, flowFamily: 'laminar-grid', sigilArch: 'sacred-lotus', frameStyle: 'tarot-arch', hueBias: 4 },
  ESTJ: { worldIdx: 1, flowFamily: 'laminar-grid', sigilArch: 'chrono-astrolabe', frameStyle: 'cyber-hud', hueBias: -4 },
  ESFJ: { worldIdx: 9, flowFamily: 'neural-constellation', sigilArch: 'orbital-constellation', frameStyle: 'tarot-arch', hueBias: 4 },
  ISTP: { worldIdx: 7, flowFamily: 'quantum-pulse', sigilArch: 'cyber-polygon', frameStyle: 'cyber-hud', hueBias: -8 },
  ISFP: { worldIdx: 3, flowFamily: 'vortex-spiral', sigilArch: 'harmonic-spirograph', frameStyle: 'tarot-arch', hueBias: 8 },
  ESTP: { worldIdx: 8, flowFamily: 'quantum-pulse', sigilArch: 'eclipse-monolith', frameStyle: 'alchemical-seal', hueBias: -8 },
  ESFP: { worldIdx: 4, flowFamily: 'neural-constellation', sigilArch: 'harmonic-spirograph', frameStyle: 'celestial', hueBias: 8 },
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
    bgBase: '#0b0c12',
    bgSecondary: '#181b28',
    surfaceBg: 'rgba(18, 21, 32, 0.84)',
    primary: '#e5c158',
    secondary: '#c59b27',
    tertiary: '#f7e5a9',
    foil: '#fff3c4',
    text: '#f8fafc',
    muted: '#94a3b8',
  },
  // 1: 象牙金箔 (Alabaster Ivory & Warm Gold - Light)
  {
    name: '象牙金箔',
    isLight: true,
    bgBase: '#fbf9f4',
    bgSecondary: '#f0e7d8',
    surfaceBg: 'rgba(255, 253, 248, 0.88)',
    primary: '#b47b1c',
    secondary: '#8c5210',
    tertiary: '#d99b26',
    foil: '#9a6b1f',
    text: '#1c1917',
    muted: '#78716c',
  },
  // 2: 苍穹星银 (Midnight Sapphire & Cyan Silver)
  {
    name: '苍穹星银',
    isLight: false,
    bgBase: '#071022',
    bgSecondary: '#11264a',
    surfaceBg: 'rgba(11, 24, 48, 0.84)',
    primary: '#38bdf8',
    secondary: '#818cf8',
    tertiary: '#bae6fd',
    foil: '#e0f2fe',
    text: '#f0f9ff',
    muted: '#93c5fd',
  },
  // 3: 秘境青瓷 (Celadon Jade & Botanical Gold - Light)
  {
    name: '秘境青瓷',
    isLight: true,
    bgBase: '#f2f9f5',
    bgSecondary: '#dcf0e6',
    surfaceBg: 'rgba(247, 253, 250, 0.88)',
    primary: '#0f766e',
    secondary: '#b47b1c',
    tertiary: '#14b8a6',
    foil: '#0d9488',
    text: '#0f2922',
    muted: '#4d7c6f',
  },
  // 4: 绯红天鹅绒 (Imperial Crimson & Rose Gold)
  {
    name: '绯红天鹅绒',
    isLight: false,
    bgBase: '#1d0812',
    bgSecondary: '#381022',
    surfaceBg: 'rgba(38, 12, 24, 0.84)',
    primary: '#fb7185',
    secondary: '#f59e0b',
    tertiary: '#fecdd3',
    foil: '#ffe4e6',
    text: '#fff1f2',
    muted: '#fda4af',
  },
  // 5: 晨曦珍珠 (Iridescent Pearl & Violet - Light)
  {
    name: '晨曦珍珠',
    isLight: true,
    bgBase: '#f9f6ff',
    bgSecondary: '#ede4ff',
    surfaceBg: 'rgba(252, 250, 255, 0.88)',
    primary: '#6d28d9',
    secondary: '#db2777',
    tertiary: '#8b5cf6',
    foil: '#7c3aed',
    text: '#1e1b4b',
    muted: '#6b7280',
  },
  // 6: 紫微星轨 (Astral Velvet & Electric Violet)
  {
    name: '紫微星轨',
    isLight: false,
    bgBase: '#120824',
    bgSecondary: '#261247',
    surfaceBg: 'rgba(26, 13, 48, 0.84)',
    primary: '#c084fc',
    secondary: '#facc15',
    tertiary: '#e9d5ff',
    foil: '#fef08a',
    text: '#faf5ff',
    muted: '#c4b5fd',
  },
  // 7: 深林鎏翠 (Emerald Noir & Cyber Mint)
  {
    name: '深林鎏翠',
    isLight: false,
    bgBase: '#051914',
    bgSecondary: '#0c3328',
    surfaceBg: 'rgba(8, 32, 25, 0.84)',
    primary: '#34d399',
    secondary: '#f59e0b',
    tertiary: '#a7f3d0',
    foil: '#fde68a',
    text: '#ecfdf5',
    muted: '#6ee7b7',
  },
  // 8: 熔金赤铜 (Molten Amber & Volcanic Copper)
  {
    name: '熔金赤铜',
    isLight: false,
    bgBase: '#1a0d06',
    bgSecondary: '#361a0c',
    surfaceBg: 'rgba(34, 17, 9, 0.84)',
    primary: '#fb923c',
    secondary: '#facc15',
    tertiary: '#fed7aa',
    foil: '#fef08a',
    text: '#fff7ed',
    muted: '#fdba74',
  },
  // 9: 樱霞琉璃 (Sakura Rose & Coral - Light)
  {
    name: '樱霞琉璃',
    isLight: true,
    bgBase: '#fff6f8',
    bgSecondary: '#fce4ec',
    surfaceBg: 'rgba(255, 250, 252, 0.88)',
    primary: '#be185d',
    secondary: '#d97706',
    tertiary: '#f43f5e',
    foil: '#e11d48',
    text: '#3b071e',
    muted: '#9d174d',
  },
  // 10: 赛博霓虹 (Cyber Ultramarine & Magenta)
  {
    name: '赛博霓虹',
    isLight: false,
    bgBase: '#090920',
    bgSecondary: '#171542',
    surfaceBg: 'rgba(15, 14, 42, 0.84)',
    primary: '#22d3ee',
    secondary: '#f472b6',
    tertiary: '#a5f3fc',
    foil: '#f9a8d4',
    text: '#ecfeff',
    muted: '#67e8f9',
  },
  // 11: 古卷青铜 (burnished Bronze & Deep Teal)
  {
    name: '古卷青铜',
    isLight: false,
    bgBase: '#0b1618',
    bgSecondary: '#162c30',
    surfaceBg: 'rgba(14, 27, 30, 0.84)',
    primary: '#eab308',
    secondary: '#2dd4bf',
    tertiary: '#fef08a',
    foil: '#99f6e4',
    text: '#f0fdfa',
    muted: '#5eead4',
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

const ALL_SIGIL_ARCHS: SigilArchitecture[] = [
  'chrono-astrolabe',
  'cyber-polygon',
  'sacred-lotus',
  'orbital-constellation',
  'harmonic-spirograph',
  'eclipse-monolith',
]

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

  // Look up Archetype Base Spec + Personal Seed Offset so even two users with the same 4-letter code
  // can diverge into distinct color worlds and sigil geometries based on their extreme axis & avatar!
  const cleanCode = code.slice(0, 4).toUpperCase()
  const baseSpec: ArchetypeVisualSpec =
    variant === 'inner'
      ? MBTI_SPECS[cleanCode] || {
          worldIdx: 5,
          flowFamily: 'vortex-spiral',
          sigilArch: 'sacred-lotus',
          frameStyle: 'tarot-arch',
          hueBias: 0,
        }
      : variant === 'fusion'
      ? {
          worldIdx: ((extra.consistency ?? 75) >= 75 ? 0 : 6 + (seed % 4)) % LUXURY_WORLDS.length,
          flowFamily: wField >= 50 ? 'neural-constellation' : 'vortex-spiral',
          sigilArch: ALL_SIGIL_ARCHS[(seed >>> 3) % ALL_SIGIL_ARCHS.length],
          frameStyle: 'alchemical-seal',
          hueBias: 0,
        }
      : ARCHETYPE_SPECS[cleanCode] || {
          worldIdx: seed % LUXURY_WORLDS.length,
          flowFamily: wField >= 50 ? 'neural-constellation' : 'laminar-grid',
          sigilArch: ALL_SIGIL_ARCHS[seed % ALL_SIGIL_ARCHS.length],
          frameStyle: 'celestial',
          hueBias: 0,
        }

  // Personal divergence: if user's avatar or personal seed has strong character, shift color world & sigil!
  const personalWorldShift =
    variant === 'outer' && avatar
      ? Math.floor(avatar.dominantHue / 60) % 2 === 1
        ? (baseSpec.worldIdx + Math.floor(seed % 3) * 2) % LUXURY_WORLDS.length
        : baseSpec.worldIdx
      : baseSpec.worldIdx

  const world = LUXURY_WORLDS[personalWorldShift] || LUXURY_WORLDS[0]

  // Select Sigil Architecture: 60% archetype native, 40% driven by user's extreme axis / seed so same-archetype users still get distinct totems
  const sigilArchitecture: SigilArchitecture =
    (seed % 10) < 6
      ? baseSpec.sigilArch
      : ALL_SIGIL_ARCHS[(seed + Math.round(wField + wRhythm)) % ALL_SIGIL_ARCHS.length]

  // Bounded Perturbation within ±32° Aesthetic Safe Zone + Strong 35% Avatar Color Infusion
  const personalHueDelta =
    baseSpec.hueBias + ((wTemp - 50) / 50) * 18 + ((wField - 50) / 50) * 10 + ((seed % 17) - 8)
  const satDelta = ((wTemp - 50) / 50) * 12

  const perturbedPrimary = perturbHexBounded(world.primary, personalHueDelta, satDelta, 0)
  const perturbedSecondary = perturbHexBounded(world.secondary, -personalHueDelta * 0.85, satDelta, 0)
  const perturbedTertiary = perturbHexBounded(world.tertiary, personalHueDelta * 0.6, satDelta * 0.6, 0)

  // Infuse 35% of the user's real Avatar Dominant/Secondary/Accent colors into the card's palette
  // AND 20% into the background gradient so each user's avatar visibly colors their card atmosphere!
  const primaryColor = avatar
    ? blendHexColors(perturbedPrimary, avatar.dominantColorHex, 0.35)
    : perturbedPrimary
  const secondaryColor = avatar
    ? blendHexColors(perturbedSecondary, avatar.secondaryColorHex, 0.35)
    : perturbedSecondary
  const tertiaryColor = avatar
    ? blendHexColors(perturbedTertiary, avatar.accentColorHex, 0.35)
    : perturbedTertiary

  const bgBase = avatar
    ? blendHexColors(world.bgBase, avatar.dominantColorHex, world.isLight ? 0.10 : 0.18)
    : perturbHexBounded(world.bgBase, personalHueDelta * 0.7, 0, 0)
  const bgSecondary = avatar
    ? blendHexColors(world.bgSecondary, avatar.secondaryColorHex, world.isLight ? 0.14 : 0.24)
    : perturbHexBounded(world.bgSecondary, personalHueDelta * 0.9, 4, 0)

  const [pr, pg, pb] = parseHexToRgb(primaryColor)
  const borderColor = `rgba(${pr}, ${pg}, ${pb}, ${world.isLight ? 0.46 : 0.58})`

  // Layer 1 Flow Field Parameters
  const flowFrequency = 0.005 + (wDensity / 100) * 0.009
  const flowTurbulence = 0.28 + (wTemp / 100) * 1.45
  const flowLineCount = Math.round(42 + ((100 - wDensity) / 100) * 32)
  const networkNodeCount = wField >= 45 ? Math.round(8 + (wField / 100) * 14) : Math.round((wField / 100) * 6)
  const gridDensity = wRhythm < 55 ? Math.round(6 + ((100 - wRhythm) / 100) * 8) : 4
  const particleCount = Math.round(14 + (wRhythm / 100) * 28)

  // Dominant circadian peak hour (0..23)
  let peakHour = seed % 24
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

  // Sacred Geometry & Spirograph Parameters
  const symmetryChoices = [5, 6, 7, 8, 9, 10, 12, 14, 16]
  const symIdx =
    (Math.round(wField / 10) + Math.round(wRhythm / 11) + (seed % 9)) % symmetryChoices.length
  const symmetryOrder = symmetryChoices[symIdx]
  const starStep = symmetryOrder >= 11 ? 4 : symmetryOrder >= 7 ? 3 : 2

  const outerPetalReach = 0.72 + (wRhythm / 100) * 0.24
  const outerPetalSpread = 0.20 + (wTemp / 100) * 0.30
  const innerPetalReach = 0.42 + (wDensity / 100) * 0.24
  const innerPetalSpread = 0.16 + (wField / 100) * 0.28

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

  const chladniN = 1.5 + (Math.round(wField / 12) % 6) + rng() * 0.65
  const chladniM = 2.2 + (Math.round(wDensity / 10) % 7) + rng() * 0.65
  const chladniA = ((wTemp - 50) / 45) * 1.9 + (rng() - 0.5) * 0.6
  const chladniB = ((wRhythm - 50) / 45) * 1.9 + (rng() - 0.5) * 0.6
  const hypotrochoidR = 64
  const hypotrochoidr =
    (hypotrochoidR / symmetryOrder) * (1 + (seed % 3)) +
    (wDensity * 0.041 + wTemp * 0.023)
  const hypotrochoidd = 22 + (wTemp / 100) * 36

  return {
    seed,
    paletteName: world.name,
    isLightTheme: world.isLight,
    bgBase,
    bgSecondary,
    surfaceBg: world.surfaceBg,
    primaryColor,
    secondaryColor,
    tertiaryColor,
    foilColor: world.foil,
    textColor: world.text,
    mutedTextColor: world.muted,
    borderColor,
    flowFamily: baseSpec.flowFamily,
    sigilArchitecture,
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
    lissajousKx: 2 + (seed % 5),
    lissajousKy: 3 + ((seed >>> 3) % 5),
    turbulence: flowTurbulence,
    frameStyle: baseSpec.frameStyle,
    topologyMode:
      baseSpec.flowFamily === 'neural-constellation'
        ? 'constellation'
        : baseSpec.flowFamily === 'vortex-spiral'
        ? 'vortex'
        : 'flowfield',
  }
}

/**
 * Helper: Builds a smooth N-fold symmetrical Lotus / Rose Window SVG path
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
 * Helper: Builds a true mathematical Hypotrochoid Spirograph SVG path
 */
function buildHypotrochoidPath(
  cx: number,
  cy: number,
  maxRadius: number,
  R: number,
  r: number,
  d: number,
  petals: number
): string {
  const steps = 220
  const maxTheoretical = Math.abs(R - r) + d || 1
  const scale = maxRadius / maxTheoretical
  const loops = Math.max(2, Math.min(7, Math.round(r / 4) || 3))
  const maxT = Math.PI * 2 * loops
  const pts: string[] = []

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * maxT
    const k = petals
    const x = cx + ((R - r) * Math.cos(t) + d * Math.cos(((k - 1) * t) / loops)) * scale
    const y = cy + ((R - r) * Math.sin(t) - d * Math.sin(((k - 1) * t) / loops)) * scale
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  pts.push('Z')
  return pts.join(' ')
}

/**
 * Helper: Builds a Personal 4-Axis Radar Polygon path from user's exact [field, density, temperature, rhythm] scores
 */
function buildPersonalRadarPoints(
  cx: number,
  cy: number,
  minR: number,
  maxR: number,
  axes: AxisScores,
  rotOffsetDeg = 0
): string {
  const vals = [axes.field, axes.density, axes.temperature, axes.rhythm]
  // 8-vertex star-radar (4 primary cardinal axes + 4diagonal harmonic interpolations)
  const pts: string[] = []
  for (let i = 0; i < 8; i++) {
    const deg = i * 45 - 90 + rotOffsetDeg
    const rad = (deg * Math.PI) / 180
    let norm = 0.5
    if (i % 2 === 0) {
      norm = vals[i / 2] / 100
    } else {
      const v1 = vals[Math.floor(i / 2)]
      const v2 = vals[(Math.floor(i / 2) + 1) % 4]
      norm = ((v1 + v2) / 200) * 0.72
    }
    const r = minR + norm * (maxR - minR)
    pts.push(`${(cx + Math.cos(rad) * r).toFixed(2)},${(cy + Math.sin(rad) * r).toFixed(2)}`)
  }
  return pts.join(' ')
}

/**
 * LAYER 1 (BOTTOM): fxhash-Style Seeded Generative Flow Field & Archetype Texture Canvas
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

    // 1. Pre-render static high-detail luxury gradient & curl-noise silk streamlines onto an offscreen canvas
    const offscreen = document.createElement('canvas')
    offscreen.width = W * dpr
    offscreen.height = H * dpr
    const sCtx = offscreen.getContext('2d')
    if (!sCtx) return
    sCtx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const angleRad = ((dna.seed % 180) * Math.PI) / 180
    const gx1 = W * 0.5 - Math.cos(angleRad) * W * 0.5
    const gy1 = H * 0.5 - Math.sin(angleRad) * H * 0.5
    const gx2 = W * 0.5 + Math.cos(angleRad) * W * 0.5
    const gy2 = H * 0.5 + Math.sin(angleRad) * H * 0.5

    const baseGrad = sCtx.createLinearGradient(gx1, gy1, gx2, gy2)
    baseGrad.addColorStop(0, dna.bgBase)
    baseGrad.addColorStop(0.52, dna.bgSecondary)
    baseGrad.addColorStop(1, dna.bgBase)
    sCtx.fillStyle = baseGrad
    sCtx.fillRect(0, 0, W, H)

    const glowY = isBack ? H * 0.5 : H * 0.29
    const [pr, pg, pb] = parseHexToRgb(dna.primaryColor)
    const [sr, sg, sb] = parseHexToRgb(dna.secondaryColor)
    const [tr, tg, tb] = parseHexToRgb(dna.tertiaryColor)

    const cornerX = (dna.peakHour % 2 === 0 ? 0.2 : 0.8) * W
    const cornerY = (dna.peakHour < 12 ? 0.18 : 0.82) * H
    const radGrad2 = sCtx.createRadialGradient(cornerX, cornerY, 5, cornerX, cornerY, 190)
    radGrad2.addColorStop(0, `rgba(${tr}, ${tg}, ${tb}, ${dna.isLightTheme ? 0.14 : 0.18})`)
    radGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)')
    sCtx.fillStyle = radGrad2
    sCtx.fillRect(0, 0, W, H)

    if (dna.flowFamily === 'laminar-grid') {
      sCtx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, ${dna.isLightTheme ? 0.09 : 0.11})`
      sCtx.lineWidth = 0.6
      const step = Math.round(W / dna.gridDensity)
      for (let x = step; x < W; x += step) {
        sCtx.beginPath()
        sCtx.moveTo(x, 18)
        sCtx.lineTo(x, H - 18)
        sCtx.stroke()
      }
      for (let y = step; y < H; y += step) {
        sCtx.beginPath()
        sCtx.moveTo(18, y)
        sCtx.lineTo(W - 18, y)
        sCtx.stroke()
      }
    }

    const lineCount = isBack ? Math.round(dna.flowLineCount * 0.75) : dna.flowLineCount
    const freq = dna.flowFrequency
    const turb = dna.flowTurbulence

    for (let i = 0; i < lineCount; i++) {
      let x = rng() * W
      let y = rng() * H
      const steps = 44 + Math.floor(rng() * 36)
      const stepLen = 3.8

      sCtx.beginPath()
      sCtx.moveTo(x, y)

      for (let s = 0; s < steps; s++) {
        let angle = 0
        if (dna.flowFamily === 'laminar-grid') {
          const n = noise2D(x * freq * 0.7, y * freq * 0.7)
          angle = Math.PI * 0.18 + n * turb * 0.55
        } else if (dna.flowFamily === 'vortex-spiral') {
          const dx = x - W * 0.5
          const dy = y - glowY
          const baseAngle = Math.atan2(dy, dx) + Math.PI * 0.52
          const n = noise2D(x * freq, y * freq)
          angle = baseAngle + n * turb * 0.45
        } else if (dna.flowFamily === 'quantum-pulse') {
          const n = noise2D(x * freq * 1.35, y * freq * 1.35)
          angle = Math.sin(y * 0.025) * 1.1 + n * turb * 1.25
        } else {
          const n = noise2D(x * freq, y * freq)
          angle = n * Math.PI * turb * 1.4
        }

        x += Math.cos(angle) * stepLen
        y += Math.sin(angle) * stepLen
        sCtx.lineTo(x, y)

        if (x < -10 || x > W + 10 || y < -10 || y > H + 10) break
      }

      const colorChoice = i % 3
      const alpha = dna.isLightTheme
        ? 0.08 + (i % 5) * 0.018
        : 0.09 + (i % 5) * 0.024
      sCtx.strokeStyle =
        colorChoice === 0
          ? `rgba(${pr}, ${pg}, ${pb}, ${alpha})`
          : colorChoice === 1
          ? `rgba(${sr}, ${sg}, ${sb}, ${alpha})`
          : `rgba(${tr}, ${tg}, ${tb}, ${alpha})`
      sCtx.lineWidth = i % 6 === 0 ? 1.2 : 0.7
      sCtx.stroke()
    }

    // 2. Pre-generate animated Constellation Nodes & Drifting Stardust Motes
    const nodes: Array<{
      baseX: number;
      baseY: number;
      r: number;
      phase: number;
      speed: number;
    }> = []
    if (dna.networkNodeCount > 0 && !isBack) {
      for (let i = 0; i < dna.networkNodeCount; i++) {
        nodes.push({
          baseX: 28 + rng() * (W - 56),
          baseY: 36 + rng() * (H - 72),
          r: 1.3 + rng() * 1.9,
          phase: rng() * Math.PI * 2,
          speed: 0.8 + rng() * 1.2,
        })
      }
    }

    const pCount = isBack ? Math.max(20, Math.round(dna.particleCount * 0.7)) : Math.max(24, dna.particleCount)
    const motes = Array.from({ length: pCount }, () => ({
      x: 20 + rng() * (W - 40),
      y: 20 + rng() * (H - 40),
      r: 0.8 + rng() * 1.6,
      baseAlpha: dna.isLightTheme ? 0.18 + rng() * 0.24 : 0.24 + rng() * 0.38,
      vy: 0.18 + rng() * 0.35,
      ampX: 6 + rng() * 10,
      phase: rng() * Math.PI * 2,
      colorType: Math.floor(rng() * 3),
    }))

    let animId: number | null = null
    const startTime = performance.now()

    const renderAnimatedFrame = (now: number) => {
      const t = (now - startTime) * 0.001 // seconds

      // Blit cached static streamline canvas
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, W * dpr, H * dpr)
      ctx.drawImage(offscreen, 0, 0)
      ctx.restore()

      // Breathing Core Radial Aura
      const breathe = 0.5 + 0.5 * Math.sin(t * 2.1)
      const auraRadius = 215 + breathe * 42
      const radGrad1 = ctx.createRadialGradient(W * 0.5, glowY, 6, W * 0.5, glowY, auraRadius)
      const coreAlpha = (dna.isLightTheme ? 0.18 : 0.26) + breathe * 0.10
      radGrad1.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, ${coreAlpha.toFixed(3)})`)
      radGrad1.addColorStop(0.55, `rgba(${sr}, ${sg}, ${sb}, ${(coreAlpha * 0.42).toFixed(3)})`)
      radGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = radGrad1
      ctx.fillRect(0, 0, W, H)

      // On Card Back: Rotating Celestial Astrolabe Light Beams
      if (isBack) {
        ctx.save()
        ctx.translate(W * 0.5, H * 0.5)
        ctx.rotate(t * 0.38)
        const beamGrad = ctx.createLinearGradient(-160, 0, 160, 0)
        beamGrad.addColorStop(0, 'rgba(0,0,0,0)')
        beamGrad.addColorStop(0.5, `rgba(${pr}, ${pg}, ${pb}, ${dna.isLightTheme ? 0.10 : 0.16})`)
        beamGrad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = beamGrad
        ctx.fillRect(-160, -18, 320, 36)
        ctx.rotate(Math.PI * 0.5)
        ctx.fillRect(-160, -14, 320, 28)
        ctx.restore()
      }

      // Animated Social Network Constellation + Traveling Data Packets (Front Face)
      if (nodes.length > 0 && !isBack) {
        const liveNodes = nodes.map((nd) => ({
          x: nd.baseX + Math.cos(t * nd.speed + nd.phase) * 5.5,
          y: nd.baseY + Math.sin(t * nd.speed + nd.phase) * 5.5,
          r: nd.r,
          phase: nd.phase,
        }))

        ctx.lineWidth = 0.7
        for (let i = 0; i < liveNodes.length; i++) {
          for (let j = i + 1; j < liveNodes.length; j++) {
            const n1 = liveNodes[i]
            const n2 = liveNodes[j]
            const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y)
            if (dist < 112) {
              const linkAlpha = (1 - dist / 112) * (dna.isLightTheme ? 0.17 : 0.24)
              ctx.strokeStyle = `rgba(${tr}, ${tg}, ${tb}, ${linkAlpha.toFixed(3)})`
              ctx.beginPath()
              ctx.moveTo(n1.x, n1.y)
              ctx.lineTo(n2.x, n2.y)
              ctx.stroke()

              // Traveling energy pulse packet along selected constellation edges
              if ((i + j) % 3 === 0) {
                const prog = ((t * 0.55 + (i * 0.27)) % 1 + 1) % 1
                const px = n1.x + (n2.x - n1.x) * prog
                const py = n1.y + (n2.y - n1.y) * prog
                ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${(linkAlpha * 2.8).toFixed(3)})`
                ctx.beginPath()
                ctx.arc(px, py, 1.5, 0, Math.PI * 2)
                ctx.fill()
              }
            }
          }
        }

        for (const nd of liveNodes) {
          const pulse = 0.7 + 0.3 * Math.sin(t * 3 + nd.phase)
          ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${((dna.isLightTheme ? 0.30 : 0.42) * pulse).toFixed(3)})`
          ctx.beginPath()
          ctx.arc(nd.x, nd.y, nd.r * (0.85 + 0.25 * pulse), 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Drifting & Twinkling Luminous Stardust Motes
      for (const m of motes) {
        const curY = 20 + ((((m.y - 20 - t * m.vy * 22) % (H - 40)) + (H - 40)) % (H - 40))
        const curX = m.x + Math.sin(t * 1.4 + m.phase) * m.ampX
        const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.8 + m.phase))
        const alpha = (m.baseAlpha * twinkle).toFixed(3)

        ctx.fillStyle =
          m.colorType === 0
            ? `rgba(${pr}, ${pg}, ${pb}, ${alpha})`
            : m.colorType === 1
            ? `rgba(${sr}, ${sg}, ${sb}, ${alpha})`
            : `rgba(${tr}, ${tg}, ${tb}, ${alpha})`
        ctx.beginPath()
        ctx.arc(curX, curY, m.r * (0.8 + 0.35 * twinkle), 0, Math.PI * 2)
        ctx.fill()
      }

      animId = requestAnimationFrame(renderAnimatedFrame)
    }

    // Render initial frame synchronously, then continue smooth 60fps loop
    renderAnimatedFrame(startTime)

    return () => {
      if (animId !== null) cancelAnimationFrame(animId)
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
 * Renders the 6 Distinct Geometric Centerpiece Engines inside SVG
 */
function renderSigilGeometryByArchitecture(
  arch: SigilArchitecture,
  cx: number,
  cy: number,
  maxR: number,
  dna: GenerativeDNA,
  axes: AxisScores,
  secondaryAxes?: AxisScores
) {
  const radarPts = buildPersonalRadarPoints(cx, cy, 34, maxR - 6, axes, 0)
  const secondaryRadarPts = secondaryAxes
    ? buildPersonalRadarPoints(cx, cy, 34, maxR - 6, secondaryAxes, 22.5)
    : null

  switch (arch) {
    case 'chrono-astrolabe': {
      // Eccentric Mechanical Gear Rings + Vernier Caliper Arcs + 4-Point Compass Star
      const teeth = dna.symmetryOrder * 2
      return (
        <g>
          {/* Counter-Rotating Eccentric Off-Center Sub-Dial Rings */}
          <g className="sigil-orbit-ccw-slow">
            <circle
              cx={cx - 8}
              cy={cy - 6}
              r={maxR * 0.72}
              fill="none"
              stroke={dna.secondaryColor}
              strokeOpacity="0.52"
              strokeWidth="1.15"
              strokeDasharray="8 4 2 4"
            />
            <circle
              cx={cx + 8}
              cy={cy + 6}
              r={maxR * 0.68}
              fill="none"
              stroke={dna.primaryColor}
              strokeOpacity="0.52"
              strokeWidth="1.15"
              strokeDasharray="12 3 3 3"
            />
          </g>
          {/* Rotating Mechanical Gear Teeth Ring */}
          <g className="sigil-orbit-cw-med">
            {Array.from({ length: teeth }).map((_, i) => {
              const a = (i / teeth) * Math.PI * 2
              const r1 = maxR * 0.56
              const r2 = i % 2 === 0 ? maxR * 0.64 : maxR * 0.59
              return (
                <line
                  key={i}
                  x1={cx + Math.cos(a) * r1}
                  y1={cy + Math.sin(a) * r1}
                  x2={cx + Math.cos(a) * r2}
                  y2={cy + Math.sin(a) * r2}
                  stroke={dna.primaryColor}
                  strokeOpacity="0.72"
                  strokeWidth="1.8"
                />
              )
            })}
          </g>
          {/* 4-Point Sharp Astrolabe Compass Blades */}
          <g className="sigil-breathe">
            {[0, 90, 180, 270].map((deg) => {
              const rad = ((deg + (dna.seed % 30)) * Math.PI) / 180
              const tipX = cx + Math.cos(rad) * (maxR - 4)
              const tipY = cy + Math.sin(rad) * (maxR - 4)
              const leftX = cx + Math.cos(rad - 0.18) * 38
              const leftY = cy + Math.sin(rad - 0.18) * 38
              const rightX = cx + Math.cos(rad + 0.18) * 38
              const rightY = cy + Math.sin(rad + 0.18) * 38
              return (
                <polygon
                  key={deg}
                  points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`}
                  fill={dna.primaryColor}
                  fillOpacity="0.22"
                  stroke={dna.foilColor}
                  strokeWidth="1"
                />
              )
            })}
          </g>
          {/* Personal 4-Axis Radar Fingerprint with Animated Energy Flow */}
          <polygon
            points={radarPts}
            fill={dna.primaryColor}
            fillOpacity="0.14"
            stroke={dna.foilColor}
            strokeOpacity="0.45"
            strokeWidth="1.1"
          />
          <polygon
            points={radarPts}
            fill="none"
            stroke={dna.foilColor}
            strokeWidth="1.5"
            className="sigil-energy-flow"
          />
        </g>
      )
    }

    case 'cyber-polygon': {
      // Nested Isometric Hexagons/Octagons + Laser Crosshairs + Circuit Nodes
      const nSides = dna.symmetryOrder >= 8 ? 8 : 6
      const polyOuter = buildStarPolygramPoints(cx, cy, maxR * 0.84, nSides, 1, 0)
      const polyMid = buildStarPolygramPoints(cx, cy, maxR * 0.68, nSides, 1, Math.PI / nSides)
      return (
        <g>
          {/* Pulsing Laser Crosshairs */}
          <line x1={cx - maxR} y1={cy} x2={cx + maxR} y2={cy} stroke={dna.primaryColor} strokeOpacity="0.42" strokeWidth="0.9" className="sigil-energy-flow" />
          <line x1={cx} y1={cy - maxR} x2={cx} y2={cy + maxR} stroke={dna.primaryColor} strokeOpacity="0.42" strokeWidth="0.9" className="sigil-energy-flow" />
          {/* Counter-Rotating Nested Isometric Polygons */}
          <g className="sigil-orbit-cw-slow">
            <polygon points={polyOuter} fill={dna.secondaryColor} fillOpacity="0.10" stroke={dna.primaryColor} strokeWidth="1.4" />
          </g>
          <g className="sigil-orbit-ccw-med">
            <polygon points={polyMid} fill="none" stroke={dna.tertiaryColor} strokeOpacity="0.78" strokeWidth="1.15" strokeDasharray="6 2" />
          </g>
          {/* Personal 4-Axis Radar Fingerprint */}
          <polygon
            points={radarPts}
            fill={`url(#roseFill-${dna.seed})`}
            stroke={dna.foilColor}
            strokeOpacity="0.48"
            strokeWidth="1.2"
          />
          <polygon
            points={radarPts}
            fill="none"
            stroke={dna.foilColor}
            strokeWidth="1.65"
            className="sigil-energy-flow"
          />
          {secondaryRadarPts && (
            <polygon
              points={secondaryRadarPts}
              fill={dna.secondaryColor}
              fillOpacity="0.16"
              stroke={dna.secondaryColor}
              strokeWidth="1.2"
              strokeDasharray="3 2"
            />
          )}
        </g>
      )
    }

    case 'orbital-constellation': {
      // 3 Tilted 3D Elliptical Planetary Orbits (Atomic Orrery) + Actively Orbiting Star Nodes
      const tiltBase = (dna.seed % 60) - 30
      return (
        <g>
          {[0, 60, 120].map((rot, idx) => {
            const rx = maxR * 0.88
            const ry = maxR * (0.34 + idx * 0.08)
            const orbitPath = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`
            return (
              <g key={rot} transform={`rotate(${rot + tiltBase} ${cx} ${cy})`}>
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={rx}
                  ry={ry}
                  fill="none"
                  stroke={idx === 0 ? dna.foilColor : idx === 1 ? dna.primaryColor : dna.secondaryColor}
                  strokeOpacity="0.72"
                  strokeWidth={idx === 0 ? '1.35' : '1.0'}
                />
                {/* Actively Orbiting Planetary Satellite Node */}
                <circle
                  r="3.4"
                  fill={dna.foilColor}
                  stroke={dna.primaryColor}
                  strokeWidth="1.1"
                >
                  <animateMotion
                    dur={`${7 + idx * 2.5}s`}
                    repeatCount="indefinite"
                    path={orbitPath}
                  />
                </circle>
              </g>
            )
          })}
          {/* Personal 4-Axis Radar Fingerprint */}
          <polygon
            points={radarPts}
            fill={dna.primaryColor}
            fillOpacity="0.15"
            stroke={dna.tertiaryColor}
            strokeWidth="1.3"
            className="sigil-energy-flow"
          />
        </g>
      )
    }

    case 'harmonic-spirograph': {
      // True Mathematical Hypotrochoid Spirograph Curve + Radar Core
      const spiroPath = buildHypotrochoidPath(
        cx,
        cy,
        maxR * 0.86,
        dna.hypotrochoidR,
        dna.hypotrochoidr,
        dna.hypotrochoidd,
        dna.symmetryOrder
      )
      return (
        <g>
          <g className="sigil-orbit-cw-slow">
            <path
              d={spiroPath}
              fill={`url(#roseFill-${dna.seed})`}
              stroke={dna.primaryColor}
              strokeOpacity="0.82"
              strokeWidth="1.15"
            />
          </g>
          <polygon
            points={radarPts}
            fill="none"
            stroke={dna.foilColor}
            strokeOpacity="0.9"
            strokeWidth="1.45"
            className="sigil-energy-flow"
          />
        </g>
      )
    }

    case 'eclipse-monolith': {
      // Dramatic Solar/Lunar Eclipse Corona + Monolith Diamond + Flare Spikes
      const flareCount = dna.symmetryOrder * 3
      const diamondPts = `${cx},${cy - maxR * 0.88} ${cx + maxR * 0.72},${cy} ${cx},${cy + maxR * 0.88} ${cx - maxR * 0.72},${cy}`
      return (
        <g>
          {/* Rotating Asymmetric Corona Burst Rays */}
          <g className="sigil-orbit-cw-slow">
            {Array.from({ length: flareCount }).map((_, i) => {
              const a = (i / flareCount) * Math.PI * 2
              const r1 = 34
              const r2 =
                i % 3 === 0
                  ? maxR * 0.88
                  : i % 2 === 0
                  ? maxR * 0.68
                  : maxR * 0.52
              return (
                <line
                  key={i}
                  x1={cx + Math.cos(a) * r1}
                  y1={cy + Math.sin(a) * r1}
                  x2={cx + Math.cos(a) * r2}
                  y2={cy + Math.sin(a) * r2}
                  stroke={i % 3 === 0 ? dna.foilColor : dna.primaryColor}
                  strokeOpacity={i % 3 === 0 ? '0.68' : '0.32'}
                  strokeWidth={i % 3 === 0 ? '1.3' : '0.75'}
                />
              )
            })}
          </g>
          {/* Breathing Eclipse Crescent Halo */}
          <g className="sigil-breathe">
            <circle cx={cx} cy={cy} r={maxR * 0.66} fill={dna.primaryColor} fillOpacity="0.22" stroke={dna.foilColor} strokeWidth="1.4" />
            <circle cx={cx + 7} cy={cy - 6} r={maxR * 0.58} fill={dna.bgBase} fillOpacity="0.82" />
          </g>
          {/* Monolith Diamond Frame */}
          <polygon points={diamondPts} fill="none" stroke={dna.primaryColor} strokeWidth="1.3" />
          {/* Personal Radar */}
          <polygon points={radarPts} fill={dna.secondaryColor} fillOpacity="0.16" stroke={dna.foilColor} strokeWidth="1.35" className="sigil-energy-flow" />
        </g>
      )
    }

    case 'sacred-lotus':
    default: {
      const outerRosePath = buildSacredRosePath(
        cx,
        cy,
        24,
        maxR * dna.outerPetalReach * 0.88,
        dna.symmetryOrder,
        dna.outerPetalSpread,
        0
      )
      const innerRosePath = buildSacredRosePath(
        cx,
        cy,
        20,
        maxR * dna.innerPetalReach * 0.9,
        dna.symmetryOrder,
        dna.innerPetalSpread,
        Math.PI / dna.symmetryOrder
      )
      const starPts1 = buildStarPolygramPoints(cx, cy, maxR * 0.78, dna.symmetryOrder, dna.starStep, 0)
      return (
        <g>
          <g className="sigil-orbit-ccw-slow">
            <polygon points={starPts1} fill="none" stroke={dna.secondaryColor} strokeOpacity="0.52" strokeWidth="0.95" />
          </g>
          <g className="sigil-orbit-cw-slow">
            <path d={outerRosePath} fill={`url(#roseFill-${dna.seed})`} stroke={dna.primaryColor} strokeOpacity="0.8" strokeWidth="1.2" />
          </g>
          <g className="sigil-orbit-ccw-med">
            <path d={innerRosePath} fill={dna.secondaryColor} fillOpacity="0.14" stroke={dna.tertiaryColor} strokeOpacity="0.82" strokeWidth="1.05" />
          </g>
          <polygon points={radarPts} fill="none" stroke={dna.foilColor} strokeOpacity="0.85" strokeWidth="1.35" className="sigil-energy-flow" />
        </g>
      )
    }
  }
}

/**
 * LAYER 2 (MIDDLE): Crisp Vector SVG Data Graphics + 24-Hour Circadian Ring Histogram + 66px Avatar Medallion
 */
export const ProceduralSigilCenterpiece: React.FC<{
  dna: GenerativeDNA;
  axes: AxisScores;
  secondaryAxes?: AxisScores;
  badgeIcon: string;
  secondaryIcon?: string;
  avatarUrl?: string;
  hourlyDistribution?: number[];
}> = ({ dna, axes, secondaryAxes, badgeIcon, secondaryIcon, avatarUrl, hourlyDistribution }) => {
  const size = 186
  const cx = size / 2
  const cy = size / 2
  const maxR = 82

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

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs>
          <radialGradient id={`roseFill-${dna.seed}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={dna.primaryColor} stopOpacity="0.32" />
            <stop offset="70%" stopColor={dna.secondaryColor} stopOpacity="0.10" />
            <stop offset="100%" stopColor={dna.primaryColor} stopOpacity="0.02" />
          </radialGradient>
        </defs>

        {/* Counter-Rotating Outer & Inner Fine Astrolabe Rings */}
        <circle
          cx={cx}
          cy={cy}
          r={maxR + 7}
          fill="none"
          stroke={dna.primaryColor}
          strokeOpacity="0.35"
          strokeWidth="0.85"
          strokeDasharray="16 6 2 6"
          className="sigil-orbit-cw-slow"
        />
        <circle
          cx={cx}
          cy={cy}
          r={maxR - 8}
          fill="none"
          stroke={dna.primaryColor}
          strokeOpacity="0.48"
          strokeWidth="0.95"
          strokeDasharray="2 3"
          className="sigil-orbit-ccw-slow"
        />

        {/* TRUE 24-HOUR CIRCADIAN RING HISTOGRAM (00:00 Top, 06:00 Right, 12:00 Bottom, 18:00 Left) */}
        {rawHourly.map((val, hr) => {
          const angle = (hr / 24) * Math.PI * 2 - Math.PI / 2
          const norm = val / maxHourVal
          const isPeak = hr === dna.peakHour && val > 0
          const rBase = maxR - 8
          const barLen = 2.5 + norm * 14
          const x1 = cx + Math.cos(angle) * rBase
          const y1 = cy + Math.sin(angle) * rBase
          const x2 = cx + Math.cos(angle) * (rBase + barLen)
          const y2 = cy + Math.sin(angle) * (rBase + barLen)
          const tipX = cx + Math.cos(angle) * (rBase + barLen + 2.5)
          const tipY = cy + Math.sin(angle) * (rBase + barLen + 2.5)

          return (
            <g key={hr}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isPeak ? dna.foilColor : dna.primaryColor}
                strokeOpacity={isPeak ? '0.98' : (0.32 + norm * 0.55).toFixed(2)}
                strokeWidth={isPeak ? '2.4' : norm > 0.6 ? '1.5' : '1.0'}
                strokeLinecap="round"
              />
              {isPeak && (
                <>
                  <circle
                    cx={tipX}
                    cy={tipY}
                    r="2.4"
                    fill={dna.foilColor}
                  />
                  <circle
                    cx={tipX}
                    cy={tipY}
                    r="4.5"
                    fill="none"
                    stroke={dna.foilColor}
                    strokeWidth="1"
                  >
                    <animate
                      attributeName="r"
                      values="2.5;6.5;2.5"
                      dur="2.2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.9;0.1;0.9"
                      dur="2.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </>
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
          const tx = cx + Math.cos(rad) * (maxR + 12)
          const ty = cy + Math.sin(rad) * (maxR + 12)
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

        {/* User-Specific Geometric Engine (1 of 6 Distinct Architectures + Personal 4-Axis Radar) */}
        {renderSigilGeometryByArchitecture(
          dna.sigilArchitecture,
          cx,
          cy,
          maxR,
          dna,
          axes,
          secondaryAxes
        )}

        {/* Prominent 66px Center Portrait Medallion Bezel Ring + Rotating Filigree */}
        <circle
          cx={cx}
          cy={cy}
          r={36}
          fill={dna.bgBase}
          stroke={dna.primaryColor}
          strokeWidth="2.2"
        />
        <circle
          cx={cx}
          cy={cy}
          r={38.5}
          fill="none"
          stroke={dna.foilColor}
          strokeOpacity="0.65"
          strokeWidth="1.0"
          strokeDasharray="6 4 2 4"
          className="sigil-orbit-cw-med"
        />
        <circle
          cx={cx}
          cy={cy}
          r={33}
          fill="none"
          stroke={dna.foilColor}
          strokeOpacity="0.75"
          strokeWidth="0.9"
        />
      </svg>

      {/* Commanding 64px Circular Avatar Medallion + Archetype Crest Badge */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {avatarUrl ? (
          <div className="relative w-[64px] h-[64px] rounded-full flex items-center justify-center">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-[64px] h-[64px] rounded-full object-cover shadow-inner"
            />
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
              style={{
                backgroundColor: dna.bgBase,
                border: `1.5px solid ${dna.primaryColor}`,
              }}
            >
              <span className="text-[12px] leading-none">
                {secondaryIcon || badgeIcon}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-3xl">{badgeIcon}</span>
        )}
      </div>
    </div>
  )
}

/**
 * Full-Bleed Symmetrical Collectible Card Back Artwork
 * Uniquely shaped by the user's `sigilArchitecture`, `frameStyle`, and `hourlyDistribution`.
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

  const dummyAxes: AxisScores = {
    field: Math.round((dna.orbitRadii[0] - 36) * 10),
    density: Math.round((dna.orbitRadii[1] - 52) * 10),
    temperature: Math.round((dna.orbitRadii[2] - 68) * 10),
    rhythm: Math.round((dna.orbitRadii[3] - 84) * 10),
  }

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
          <stop offset="0%" stopColor={dna.primaryColor} stopOpacity={dna.isLightTheme ? '0.28' : '0.42'} />
          <stop offset="60%" stopColor={dna.secondaryColor} stopOpacity="0.12" />
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
        strokeOpacity="0.68"
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

      {/* Architecture-Specific Inner Sanctuary Frame */}
      {dna.frameStyle === 'cyber-hud' ? (
        <polygon
          points={`44,28 ${w - 44},28 ${w - 28},44 ${w - 28},${h - 44} ${w - 44},${h - 28} 44,${h - 28} 28,${h - 44} 28,44`}
          fill="none"
          stroke={dna.primaryColor}
          strokeOpacity="0.45"
          strokeWidth="1.15"
          className="sigil-energy-flow"
        />
      ) : dna.frameStyle === 'alchemical-seal' ? (
        <polygon
          points={`${cx},28 ${w - 26},${cy} ${cx},${h - 28} 26,${cy}`}
          fill="none"
          stroke={dna.primaryColor}
          strokeOpacity="0.42"
          strokeWidth="1.15"
          className="sigil-energy-flow"
        />
      ) : (
        <path
          d={`M 28 110 A 162 145 0 0 1 ${w - 28} 110 L ${w - 28} ${h - 110} A 162 145 0 0 1 28 ${h - 110} Z`}
          fill="none"
          stroke={dna.primaryColor}
          strokeOpacity="0.38"
          strokeWidth="1.05"
          className="sigil-energy-flow"
        />
      )}

      {/* 4 Symmetrical Spinning Corner Celestial Rosettes */}
      {[
        [44, 44],
        [w - 44, 44],
        [44, h - 44],
        [w - 44, h - 44],
      ].map(([kx, ky], idx) => (
        <g key={idx}>
          <g className={idx % 2 === 0 ? 'sigil-rosette-spin' : 'sigil-rosette-spin-rev'}>
            <circle cx={kx} cy={ky} r="13" fill="none" stroke={dna.primaryColor} strokeOpacity="0.55" strokeWidth="0.95" strokeDasharray="4 2" />
            <path d={`M ${kx - 13} ${ky} L ${kx + 13} ${ky} M ${kx} ${ky - 13} L ${kx} ${ky + 13}`} stroke={dna.primaryColor} strokeOpacity="0.48" strokeWidth="0.85" />
          </g>
          <circle cx={kx} cy={ky} r="2.5" fill={dna.foilColor} />
        </g>
      ))}

      {/* Top & Bottom Mirrored Celestial Axis Ornaments with Pulsing Halo */}
      {[82, h - 82].map((posY, idx) => {
        const dir = idx === 0 ? 1 : -1
        return (
          <g key={idx}>
            <line x1={cx} y1={idx === 0 ? 20 : h - 20} x2={cx} y2={posY + dir * 45} stroke={dna.primaryColor} strokeOpacity="0.45" strokeWidth="1" />
            <circle cx={cx} cy={posY} r="18" fill="none" stroke={`url(#${uid}-foil)`} strokeOpacity="0.75" strokeWidth="1.2" />
            <circle cx={cx} cy={posY - dir * 5} r="14" fill={dna.bgBase} />
            <circle cx={cx} cy={posY} r="4.5" fill={dna.primaryColor} />
            <circle cx={cx} cy={posY} r="9" fill="none" stroke={dna.foilColor} strokeWidth="0.9">
              <animate attributeName="r" values="6;22;6" dur="3.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.75;0.05;0.75" dur="3.4s" repeatCount="indefinite" />
            </circle>
          </g>
        )
      })}

      {/* Breathing Central Mandala Aura */}
      <circle cx={cx} cy={cy} r="148" fill={`url(#${uid}-centerGlow)`} className="sigil-breathe" />

      {/* Counter-Rotating Outer Zodiac / Astrolabe Degree Wheels */}
      <circle
        cx={cx}
        cy={cy}
        r="134"
        fill="none"
        stroke={`url(#${uid}-foil)`}
        strokeOpacity="0.75"
        strokeWidth="1.4"
        strokeDasharray="18 4 3 4"
        className="sigil-orbit-cw-slow"
      />
      <circle
        cx={cx}
        cy={cy}
        r="126"
        fill="none"
        stroke={dna.primaryColor}
        strokeOpacity="0.48"
        strokeWidth="0.95"
        strokeDasharray="4 4"
        className="sigil-orbit-ccw-slow"
      />

      {/* Symmetrical 24-Spoke Circadian Harmonic Crown */}
      <g className="sigil-breathe">
        {Array.from({ length: 24 }).map((_, hr) => {
          const a = (hr / 24) * Math.PI * 2 - Math.PI / 2
          const symVal = (rawDist[hr] + rawDist[(hr + 12) % 24]) * 0.5
          const norm = symVal / maxVal
          const rInner = 40
          const rOuter = 88 + norm * 34
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
                fillOpacity="0.88"
              />
            </g>
          )
        })}
      </g>

      {/* User-Specific Geometric Engine Scaled to 122px on Card Back */}
      {renderSigilGeometryByArchitecture(
        dna.sigilArchitecture,
        cx,
        cy,
        122,
        dna,
        dummyAxes
      )}

      {/* Central Sacred Seal Medallion with Rotating Rune Ring */}
      <circle
        cx={cx}
        cy={cy}
        r="26"
        fill={dna.bgBase}
        stroke={`url(#${uid}-foil)`}
        strokeWidth="1.8"
      />
      <circle
        cx={cx}
        cy={cy}
        r="21"
        fill="none"
        stroke={dna.primaryColor}
        strokeOpacity="0.7"
        strokeWidth="0.95"
        strokeDasharray="3 2"
        className="sigil-orbit-cw-med"
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
        letterSpacing="2.5"
      >
        {slot === 'outer'
          ? `WORLD I · ${dna.sigilArchitecture.toUpperCase()}`
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
        @{handle.toUpperCase()} · PEAK {String(dna.peakHour).padStart(2, '0')}:00 · #{dna.seed.toString(16).slice(0, 6).toUpperCase()}
      </text>
    </svg>
  )
}

/**
 * 4 Distinct Architectural Frame Overlays for the Front Face
 */
export const ProceduralFrameOverlay: React.FC<{ dna: GenerativeDNA }> = ({ dna }) => {
  return (
    <svg
      viewBox="0 0 380 575"
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      fill="none"
    >
      {dna.frameStyle === 'cyber-hud' ? (
        <>
          <polygon
            points="24,10 356,10 370,24 370,551 356,565 24,565 10,551 10,24"
            stroke={dna.primaryColor}
            strokeOpacity="0.45"
            strokeWidth="1.2"
          />
          <path d="M 16 42 L 16 20 L 38 20" stroke={dna.foilColor} strokeOpacity="0.85" strokeWidth="1.8" />
          <path d="M 364 42 L 364 20 L 342 20" stroke={dna.foilColor} strokeOpacity="0.85" strokeWidth="1.8" />
          <path d="M 16 533 L 16 555 L 38 555" stroke={dna.foilColor} strokeOpacity="0.85" strokeWidth="1.8" />
          <path d="M 364 533 L 364 555 L 342 555" stroke={dna.foilColor} strokeOpacity="0.85" strokeWidth="1.8" />
        </>
      ) : dna.frameStyle === 'tarot-arch' ? (
        <>
          <rect x="10" y="10" width="360" height="555" rx="22" stroke={dna.primaryColor} strokeOpacity="0.38" strokeWidth="1" />
          <path
            d="M 18 76 A 172 68 0 0 1 362 76"
            stroke={dna.primaryColor}
            strokeOpacity="0.35"
            strokeWidth="0.9"
            strokeDasharray="3 3"
          />
          <circle cx="24" cy="24" r="3" fill={dna.primaryColor} fillOpacity="0.65" />
          <circle cx="356" cy="24" r="3" fill={dna.primaryColor} fillOpacity="0.65" />
          <circle cx="24" cy="551" r="3" fill={dna.primaryColor} fillOpacity="0.65" />
          <circle cx="356" cy="551" r="3" fill={dna.primaryColor} fillOpacity="0.65" />
        </>
      ) : dna.frameStyle === 'alchemical-seal' ? (
        <>
          <rect x="10" y="10" width="360" height="555" rx="22" stroke={dna.primaryColor} strokeOpacity="0.42" strokeWidth="1.1" />
          <rect x="15" y="15" width="350" height="545" rx="18" stroke={dna.secondaryColor} strokeOpacity="0.25" strokeWidth="0.7" strokeDasharray="4 4" />
          <path d="M 18 32 L 18 18 L 32 18" stroke={dna.foilColor} strokeOpacity="0.8" strokeWidth="1.6" />
          <path d="M 362 32 L 362 18 L 348 18" stroke={dna.foilColor} strokeOpacity="0.8" strokeWidth="1.6" />
          <path d="M 18 543 L 18 557 L 32 557" stroke={dna.foilColor} strokeOpacity="0.8" strokeWidth="1.6" />
          <path d="M 362 543 L 362 557 L 348 557" stroke={dna.foilColor} strokeOpacity="0.8" strokeWidth="1.6" />
        </>
      ) : (
        <>
          <rect x="10" y="10" width="360" height="555" rx="22" stroke={dna.primaryColor} strokeOpacity="0.38" strokeWidth="1" />
          <path d="M 18 32 L 18 18 L 32 18" stroke={dna.primaryColor} strokeOpacity="0.7" strokeWidth="1.5" />
          <path d="M 362 32 L 362 18 L 348 18" stroke={dna.primaryColor} strokeOpacity="0.7" strokeWidth="1.5" />
          <path d="M 18 543 L 18 557 L 32 557" stroke={dna.primaryColor} strokeOpacity="0.7" strokeWidth="1.5" />
          <path d="M 362 543 L 362 557 L 348 557" stroke={dna.primaryColor} strokeOpacity="0.7" strokeWidth="1.5" />
        </>
      )}
    </svg>
  )
}
