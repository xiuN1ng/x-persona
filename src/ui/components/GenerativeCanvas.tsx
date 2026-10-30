import React from 'react'
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
  orbitAngles: [number, number, number, number]; // Planetary node angles in degrees
  rayCount: number;           // 16 .. 36
  rayModulation: number;      // Harmonic modulation depth
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

/**
 * Curated High-Fashion / Collector-Grade Palettes
 * Inspired by Theory11 foil playing cards, Clow/Tarot cards, and luxury watch dials.
 */
const LUXURY_WORLDS: LuxuryColorWorld[] = [
  // 0: 曜石鎏金 (Obsidian & Champagne Gold)
  {
    name: '曜石鎏金',
    isLight: false,
    bgBase: '#0b0c10',
    bgSecondary: '#141722',
    surfaceBg: 'rgba(18, 21, 32, 0.88)',
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
    surfaceBg: 'rgba(255, 253, 249, 0.92)',
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
    surfaceBg: 'rgba(13, 23, 44, 0.88)',
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
    surfaceBg: 'rgba(249, 253, 251, 0.92)',
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
    surfaceBg: 'rgba(32, 13, 23, 0.88)',
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
    surfaceBg: 'rgba(253, 252, 255, 0.92)',
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
    surfaceBg: 'rgba(22, 14, 40, 0.88)',
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
    surfaceBg: 'rgba(10, 30, 24, 0.88)',
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
  avatarFeatures?: AvatarVisualFeatures;
}

export function computeGenerativeDNA(
  variant: 'outer' | 'inner' | 'fusion',
  code: string,
  axes: AxisScores,
  handle: string,
  extraMetrics?: ExtraGenerativeMetrics | number[]
): GenerativeDNA {
  const extra: ExtraGenerativeMetrics = Array.isArray(extraMetrics) ? {} : extraMetrics || {}
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
  const avatarLum = avatar ? avatar.luminance : 52

  // Select Luxury Color World
  let worldIdx = 0
  if (variant === 'fusion') {
    const c = extra.consistency ?? 75
    worldIdx = c >= 75 ? 0 : c >= 55 ? 6 : 4
  } else if (variant === 'inner') {
    if (code.includes('NF')) worldIdx = avatarLum >= 48 ? 5 : 6
    else if (code.includes('NT')) worldIdx = avatarLum >= 52 ? 1 : 2
    else if (code.includes('SJ')) worldIdx = 3
    else worldIdx = avatarLum >= 50 ? 1 : 7
  } else {
    const nightOwl = extra.nightOwl ?? 15
    const darkAffinity = nightOwl * 2.0 * PERSONA_W + (100 - avatarLum) * AVATAR_W
    if (darkAffinity >= 48) {
      const darkPool = [0, 2, 4, 6, 7]
      const hOff = avatar ? Math.floor(avatar.dominantHue / 72) : 0
      worldIdx = darkPool[(Math.round(wField + wTemp) + hOff + (seed % 7)) % darkPool.length]
    } else {
      const lightPool = [1, 3, 5, 0, 2]
      const hOff = avatar ? Math.floor(avatar.dominantHue / 72) : 0
      worldIdx = lightPool[(Math.round(wDensity + wRhythm) + hOff + (seed % 5)) % lightPool.length]
    }
  }

  const world = LUXURY_WORLDS[worldIdx] || LUXURY_WORLDS[0]

  // Subtle harmonic infusion of avatar's hue (25% blend so palette stays cohesive and high-fashion)
  const primaryColor = avatar
    ? blendHexColors(world.primary, avatar.dominantColorHex, 0.25)
    : world.primary
  const secondaryColor = avatar
    ? blendHexColors(world.secondary, avatar.secondaryColorHex, 0.25)
    : world.secondary
  const tertiaryColor = avatar
    ? blendHexColors(world.tertiary, avatar.accentColorHex, 0.28)
    : world.tertiary

  const [pr, pg, pb] = parseHexToRgb(primaryColor)
  const borderColor = `rgba(${pr}, ${pg}, ${pb}, ${world.isLight ? 0.42 : 0.52})`

  // Sacred Geometry Parameters (guaranteed symmetrical, smooth, and unique per user)
  const symmetryChoices = [6, 8, 10, 12, 14, 16]
  const symIdx =
    (Math.round(wField / 12) + Math.round(wRhythm / 14) + (seed % 6)) % symmetryChoices.length
  const symmetryOrder = symmetryChoices[symIdx]

  // Star polygram step k such that {N/k} creates a sharp geometric star
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
    turbulence: 0.5 + (wRhythm / 100) * 1.5,
    frameStyle: variant === 'fusion' ? 'alchemical-seal' : variant === 'inner' ? 'tarot-arch' : 'celestial',
    topologyMode: 'chladni',
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
 * Subtle Luxury Background Texture & Ambient Glow (Front Face)
 */
export const ProceduralPatternCanvas: React.FC<{
  dna: GenerativeDNA;
  axes: AxisScores;
  isBack?: boolean;
  hourlyDistribution?: number[];
}> = ({ dna, isBack = false }) => {
  const uid = `bg-${dna.seed}-${isBack ? 'b' : 'f'}`
  return (
    <svg
      viewBox="0 0 380 575"
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`${uid}-base`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={dna.bgBase} />
          <stop offset="50%" stopColor={dna.bgSecondary} />
          <stop offset="100%" stopColor={dna.bgBase} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy={isBack ? '50%' : '32%'} r="62%">
          <stop
            offset="0%"
            stopColor={dna.primaryColor}
            stopOpacity={dna.isLightTheme ? '0.18' : '0.24'}
          />
          <stop
            offset="55%"
            stopColor={dna.secondaryColor}
            stopOpacity={dna.isLightTheme ? '0.06' : '0.1'}
          />
          <stop offset="100%" stopColor={dna.bgBase} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="380" height="575" fill={`url(#${uid}-base)`} />
      <rect width="380" height="575" fill={`url(#${uid}-glow)`} />
    </svg>
  )
}

/**
 * Front Centerpiece: Museum-Grade Parametric Sacred Rose & Planetary Astrolabe
 */
export const ProceduralSigilCenterpiece: React.FC<{
  dna: GenerativeDNA;
  axes: AxisScores;
  secondaryAxes?: AxisScores;
  badgeIcon: string;
  secondaryIcon?: string;
  avatarUrl?: string;
}> = ({ dna, badgeIcon, secondaryIcon, avatarUrl }) => {
  const size = 196
  const cx = size / 2
  const cy = size / 2
  const maxR = 88

  const outerRosePath = buildSacredRosePath(
    cx,
    cy,
    22,
    maxR * dna.outerPetalReach,
    dna.symmetryOrder,
    dna.outerPetalSpread,
    0
  )
  const innerRosePath = buildSacredRosePath(
    cx,
    cy,
    18,
    maxR * dna.innerPetalReach,
    dna.symmetryOrder,
    dna.innerPetalSpread,
    Math.PI / dna.symmetryOrder
  )
  const starPts1 = buildStarPolygramPoints(cx, cy, maxR * 0.82, dna.symmetryOrder, dna.starStep, 0)
  const starPts2 = buildStarPolygramPoints(
    cx,
    cy,
    maxR * 0.82,
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

        {/* Outer Fine Astrolabe Ring & Degree Ticks */}
        <circle
          cx={cx}
          cy={cy}
          r={maxR + 4}
          fill="none"
          stroke={dna.primaryColor}
          strokeOpacity="0.28"
          strokeWidth="0.8"
        />
        <circle
          cx={cx}
          cy={cy}
          r={maxR}
          fill="none"
          stroke={dna.primaryColor}
          strokeOpacity="0.45"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {/* Symmetrical Radial Sunburst Rays */}
        {Array.from({ length: dna.rayCount }).map((_, i) => {
          const angle = (i / dna.rayCount) * Math.PI * 2 - Math.PI / 2
          const isMajor = i % 2 === 0
          const r1 = isMajor ? 28 : 44
          const r2 = isMajor ? maxR + 2 : maxR - 10
          return (
            <line
              key={i}
              x1={cx + Math.cos(angle) * r1}
              y1={cy + Math.sin(angle) * r1}
              x2={cx + Math.cos(angle) * r2}
              y2={cy + Math.sin(angle) * r2}
              stroke={dna.primaryColor}
              strokeOpacity={isMajor ? '0.32' : '0.16'}
              strokeWidth={isMajor ? '0.9' : '0.6'}
            />
          )
        })}

        {/* Interlocking Sacred Star Polygrams */}
        <polygon
          points={starPts1}
          fill="none"
          stroke={dna.secondaryColor}
          strokeOpacity="0.4"
          strokeWidth="0.9"
        />
        <polygon
          points={starPts2}
          fill="none"
          stroke={dna.primaryColor}
          strokeOpacity="0.4"
          strokeWidth="0.9"
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
          const rad = 38 + idx * 13
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
                r={2.8}
                fill={dna.foilColor}
                stroke={dna.primaryColor}
                strokeWidth="1"
              />
            </g>
          )
        })}

        {/* 4 Cardinal Compass Diamonds */}
        {[0, 90, 180, 270].map((deg) => {
          const a = (deg * Math.PI) / 180
          const px = cx + Math.cos(a) * (maxR + 4)
          const py = cy + Math.sin(a) * (maxR + 4)
          return (
            <circle
              key={deg}
              cx={px}
              cy={py}
              r={2.5}
              fill={dna.primaryColor}
            />
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
 * 100% vector sacred geometry uniquely parameterized by the user's DNA—zero clutter or stat boxes.
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

  // Symmetrical 24-ray harmonic crown (averaged with opposite hour so card back is 100% radially symmetrical!)
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

      {/* Top & Bottom Mirrored Celestial Axis Ornaments (True Tarot / Playing Card Symmetry) */}
      {[82, h - 82].map((posY, idx) => {
        const dir = idx === 0 ? 1 : -1
        return (
          <g key={idx}>
            {/* Vertical Meridian Line */}
            <line
              x1={cx}
              y1={idx === 0 ? 20 : h - 20}
              x2={cx}
              y2={posY + dir * 45}
              stroke={dna.primaryColor}
              strokeOpacity="0.45"
              strokeWidth="1"
            />
            {/* Crescent Moon & Sunburst */}
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
            {/* Flanking Star Nodes */}
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

      {/* Symmetrical 24-Spoke Circadian Harmonic Crown (strictly bounded inside the astrolabe ring!) */}
      {Array.from({ length: 24 }).map((_, hr) => {
        const a = (hr / 24) * Math.PI * 2 - Math.PI / 2
        // Mirror opposite hour (hr and hr+12) so the card back is 100% point-symmetrical!
        const symVal = (rawDist[hr] + rawDist[(hr + 12) % 24]) * 0.5
        const norm = symVal / maxVal
        const rInner = 34
        const rOuter = 82 + norm * 36 // bounded strictly within 82..118px!
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

      {/* Subtle Engraved Top & Bottom Micro-Typography (Like a Luxury Playing Card) */}
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
