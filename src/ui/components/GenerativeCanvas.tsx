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
  if (clean.length !== 6) return [168, 85, 247]
  const n = parseInt(clean, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Blends two hex colors by weightB (0..1) in RGB space
 */
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
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;

  // Avatar contribution telemetry (30% style weight)
  avatarWeightPercent: number;
  avatarSwatches: string[];
  avatarDominantHue: number;

  // Mathematical wave & geometry parameters
  chladniN: number;
  chladniM: number;
  chladniA: number;
  chladniB: number;
  hypotrochoidR: number;
  hypotrochoidr: number;
  hypotrochoidd: number;
  lissajousKx: number;
  lissajousKy: number;
  symmetryOrder: number;
  turbulence: number;
  frameStyle: 'celestial' | 'cyber-hud' | 'tarot-arch' | 'alchemical-seal';
  topologyMode: 'chladni' | 'flowfield' | 'constellation' | 'vortex';
}

interface ColorWorld {
  name: string;
  isLight: boolean;
  bgBase: string;
  bgSecondary: string;
  primary: string;
  secondary: string;
  tertiary: string;
  text: string;
  muted: string;
  border: string;
}

const COLOR_WORLDS: ColorWorld[] = [
  // 0: 极昼流金 (Solar Alabaster - Fresh Light & Gold)
  {
    name: '极昼流金 · Solar Alabaster',
    isLight: true,
    bgBase: '#faf6f0',
    bgSecondary: '#ede4d3',
    primary: '#b45309',
    secondary: '#9a3412',
    tertiary: '#d97706',
    text: '#1c1917',
    muted: '#57534e',
    border: 'rgba(180, 83, 9, 0.55)',
  },
  // 1: 苍翠青瓷 (Jade Celadon - Fresh Light Mint & Emerald)
  {
    name: '苍翠青瓷 · Jade Celadon',
    isLight: true,
    bgBase: '#f0f7f4',
    bgSecondary: '#d8ece3',
    primary: '#047857',
    secondary: '#0f766e',
    tertiary: '#059669',
    text: '#064e3b',
    muted: '#3f6259',
    border: 'rgba(4, 120, 87, 0.52)',
  },
  // 2: 幻彩珍珠 (Iridescent Pearl - Fresh Pastel Lavender & Sky)
  {
    name: '幻彩珍珠 · Iridescent Pearl',
    isLight: true,
    bgBase: '#f8f5ff',
    bgSecondary: '#e9e0ff',
    primary: '#6d28d9',
    secondary: '#db2777',
    tertiary: '#0284c7',
    text: '#1e1b4b',
    muted: '#4c1d95',
    border: 'rgba(109, 40, 217, 0.5)',
  },
  // 3: 落日流霞 (Sunset Coral - Warm Light Cream & Rose)
  {
    name: '落日流霞 · Sunset Coral',
    isLight: true,
    bgBase: '#fff5f5',
    bgSecondary: '#ffe0e3',
    primary: '#e11d48',
    secondary: '#ea580c',
    tertiary: '#9333ea',
    text: '#3b0712',
    muted: '#7f1d1d',
    border: 'rgba(225, 29, 72, 0.5)',
  },
  // 4: 冰川银钛 (Glacier Titanium - Crisp Ice Blue & Slate)
  {
    name: '冰川银钛 · Glacier Titanium',
    isLight: true,
    bgBase: '#f0f7ff',
    bgSecondary: '#dceafe',
    primary: '#0369a1',
    secondary: '#1d4ed8',
    tertiary: '#0891b2',
    text: '#0c2747',
    muted: '#334e68',
    border: 'rgba(3, 105, 161, 0.5)',
  },
  // 5: 朱砂玄墨 (Cinnabar Ink - Wuxia Crimson & Deep Ink)
  {
    name: '朱砂玄墨 · Cinnabar Ink',
    isLight: false,
    bgBase: '#11080c',
    bgSecondary: '#260d17',
    primary: '#fb7185',
    secondary: '#fb923c',
    tertiary: '#fde047',
    text: '#fff1f2',
    muted: '#fda4af',
    border: 'rgba(251, 113, 133, 0.65)',
  },
  // 6: 紫微星渊 (Astral Amethyst - Deep Cosmic Violet & Gold)
  {
    name: '紫微星渊 · Astral Amethyst',
    isLight: false,
    bgBase: '#0b061a',
    bgSecondary: '#1c0f38',
    primary: '#c084fc',
    secondary: '#f472b6',
    tertiary: '#fbbf24',
    text: '#faf5ff',
    muted: '#d8b4fe',
    border: 'rgba(192, 132, 252, 0.65)',
  },
  // 7: 赛博霓虹 (Cyber Neon - Matrix Cyan & Electric Magenta)
  {
    name: '赛博霓虹 · Cyber Neon',
    isLight: false,
    bgBase: '#040b17',
    bgSecondary: '#0a1e38',
    primary: '#22d3ee',
    secondary: '#e879f9',
    tertiary: '#38bdf8',
    text: '#ecfeff',
    muted: '#67e8f9',
    border: 'rgba(34, 211, 238, 0.65)',
  },
  // 8: 黑曜熔金 (Obsidian Gold - Royal Black & Liquid Gold)
  {
    name: '黑曜熔金 · Obsidian Gold',
    isLight: false,
    bgBase: '#0a0805',
    bgSecondary: '#1f180c',
    primary: '#fbbf24',
    secondary: '#f59e0b',
    tertiary: '#fef08a',
    text: '#fefce8',
    muted: '#fde68a',
    border: 'rgba(251, 191, 36, 0.68)',
  },
  // 9: 深海幽萤 (Bioluminescent Abyss - Emerald & Teal Glow)
  {
    name: '深海幽萤 · Abyssal Emerald',
    isLight: false,
    bgBase: '#03110f',
    bgSecondary: '#072b26',
    primary: '#34d399',
    secondary: '#2dd4bf',
    tertiary: '#a7f3d0',
    text: '#ecfdf5',
    muted: '#6ee7b7',
    border: 'rgba(52, 211, 153, 0.65)',
  },
]

export interface ExtraGenerativeMetrics {
  nightOwl?: number;
  burstiness?: number;
  avgChars?: number;
  consistency?: number;
  avatarFeatures?: AvatarVisualFeatures;
}

/**
 * Deterministically synthesizes the card's Generative DNA by combining:
 * - 70% Weight: Persona Axes (X Behavioral Axes for Card I, OEJTS Jungian Axes for Card II, Alchemical Synthesis for Card III)
 * - 30% Weight: User Avatar Visual Features (Dominant Hue, Luminance, Saturation, Warmth, Edge Detail Density, Perceptual Hash)
 */
export function computeGenerativeDNA(
  variant: 'outer' | 'inner' | 'fusion',
  code: string,
  axes: AxisScores,
  handle: string,
  extraMetrics?: ExtraGenerativeMetrics | number[]
): GenerativeDNA {
  const extra: ExtraGenerativeMetrics = Array.isArray(extraMetrics) ? {} : extraMetrics || {}
  const avatar = extra.avatarFeatures

  const AVATAR_WEIGHT = 0.30
  const PERSONA_WEIGHT = 0.70

  const avatarSeedPart = avatar
    ? `${avatar.perceptualHash}:${avatar.dominantHue}:${avatar.luminance}:${avatar.detailDensity}`
    : 'no-avatar'

  const rawStr = `${variant}:${code}:${handle.toLowerCase()}:${axes.field}:${axes.density}:${axes.temperature}:${axes.rhythm}:${extra.avgChars ?? 100}:${extra.burstiness ?? 1}:${avatarSeedPart}`
  const seed = hashStr(rawStr)
  const rng = createRng(seed)

  // Weighted composite metrics blending 70% Persona + 30% Avatar Visual DNA
  const weightedWarmth = avatar
    ? axes.temperature * PERSONA_WEIGHT + avatar.warmth * AVATAR_WEIGHT
    : axes.temperature
  const weightedDetail = avatar
    ? axes.density * PERSONA_WEIGHT + avatar.detailDensity * AVATAR_WEIGHT
    : axes.density
  const weightedEnergy = avatar
    ? axes.rhythm * PERSONA_WEIGHT + avatar.saturation * AVATAR_WEIGHT
    : axes.rhythm
  const weightedField = avatar
    ? axes.field * PERSONA_WEIGHT + avatar.contrast * AVATAR_WEIGHT
    : axes.field
  const avatarLum = avatar ? avatar.luminance : 55

  // Deterministic Color World selection driven by 70% personality traits + 30% avatar luminance/hue/warmth
  let worldIndex = 0
  if (variant === 'fusion') {
    const c = extra.consistency ?? 75
    if (c >= 78) worldIndex = avatarLum > 72 ? 0 : 8
    else if (c >= 58) worldIndex = avatarLum > 55 ? 2 : 6
    else worldIndex = weightedWarmth >= 52 ? 5 : 7
  } else if (variant === 'inner') {
    const preferLight = avatarLum >= 46
    if (code.includes('NF')) worldIndex = preferLight ? 2 : 6
    else if (code.includes('NT')) worldIndex = preferLight ? 4 : 7
    else if (code.includes('SJ')) worldIndex = weightedWarmth < 50 ? 1 : 0
    else worldIndex = preferLight ? 3 : 9
  } else {
    const nightOwl = extra.nightOwl ?? 15
    const nocturnalScore = nightOwl * 2.2 * PERSONA_WEIGHT + (100 - avatarLum) * AVATAR_WEIGHT
    if (nocturnalScore >= 52) {
      const darkWorlds = [5, 6, 7, 8, 9]
      const hueOffset = avatar ? Math.floor(avatar.dominantHue / 72) : 0
      worldIndex = darkWorlds[(Math.round(weightedField) + hueOffset + seed) % darkWorlds.length]
    } else if (weightedWarmth >= 62 && weightedEnergy >= 60) {
      worldIndex = avatarLum < 42 ? 5 : 3
    } else if (weightedWarmth < 46) {
      worldIndex = weightedDetail < 50 ? 1 : 4
    } else {
      const lightWorlds = [0, 1, 2, 3, 4]
      const hueOffset = avatar ? Math.floor(avatar.dominantHue / 72) : 0
      worldIndex = lightWorlds[(Math.round(weightedField + weightedDetail) + hueOffset + seed) % lightWorlds.length]
    }
  }

  const world = COLOR_WORLDS[worldIndex] || COLOR_WORLDS[0]

  // Blend the world's base palette with the user's extracted Avatar colors (34%-42% chromatic infusion)
  const primaryColor = avatar
    ? blendHexColors(world.primary, avatar.dominantColorHex, 0.34)
    : world.primary
  const secondaryColor = avatar
    ? blendHexColors(world.secondary, avatar.secondaryColorHex, 0.34)
    : world.secondary
  const tertiaryColor = avatar
    ? blendHexColors(world.tertiary, avatar.accentColorHex, 0.42)
    : world.tertiary

  const [pr, pg, pb] = parseHexToRgb(primaryColor)
  const borderColor = `rgba(${pr}, ${pg}, ${pb}, ${world.isLight ? 0.55 : 0.68})`

  // Chladni plate wave numbers (n, m) derived from 70% Persona + 30% Avatar detail/contrast
  const chladniN = 1.5 + (Math.round(weightedField / 12) % 6) + rng() * 0.65
  const chladniM = 2.2 + (Math.round(weightedDetail / 10) % 7) + rng() * 0.65
  const chladniA = ((weightedWarmth - 50) / 45) * 1.9 + (rng() - 0.5) * 0.6
  const chladniB = ((weightedEnergy - 50) / 45) * 1.9 + (rng() - 0.5) * 0.6

  // Spirograph / Hypotrochoid & Lissajous parameters
  const hueStep = avatar ? Math.floor(avatar.dominantHue / 45) : 0
  const symmetryOrder =
    4 + ((Math.round(weightedField / 9) + Math.round(weightedEnergy / 13) + hueStep + (seed % 7)) % 11) // 4 to 14
  const hypotrochoidR = 60
  const hypotrochoidr = (hypotrochoidR / symmetryOrder) * (1 + (seed % 3))
  const hypotrochoidd = 20 + (weightedWarmth / 100) * 34

  const lissajousKx = 2 + ((Math.round(weightedField / 15) + (seed % 5)) % 7)
  const lissajousKy = 3 + ((Math.round(weightedDetail / 14) + ((seed >>> 4) % 5)) % 8)

  const frameStyles: GenerativeDNA['frameStyle'][] = [
    'celestial',
    'cyber-hud',
    'tarot-arch',
    'alchemical-seal',
  ]
  const frameStyle =
    variant === 'fusion'
      ? 'alchemical-seal'
      : variant === 'inner'
      ? 'tarot-arch'
      : weightedWarmth < 48
      ? 'cyber-hud'
      : frameStyles[seed % frameStyles.length]

  const topologies: GenerativeDNA['topologyMode'][] = [
    'chladni',
    'flowfield',
    'constellation',
    'vortex',
  ]
  const topologyMode =
    variant === 'fusion'
      ? 'vortex'
      : weightedField >= 62
      ? 'constellation'
      : weightedEnergy >= 65
      ? 'flowfield'
      : topologies[seed % topologies.length]

  return {
    seed,
    paletteName: world.name,
    isLightTheme: world.isLight,
    bgBase: world.bgBase,
    bgSecondary: world.bgSecondary,
    primaryColor,
    secondaryColor,
    tertiaryColor,
    textColor: world.text,
    mutedTextColor: world.muted,
    borderColor,
    avatarWeightPercent: 30,
    avatarSwatches: avatar?.paletteSwatches || [primaryColor, secondaryColor, tertiaryColor],
    avatarDominantHue: avatar?.dominantHue ?? (seed % 360),
    chladniN,
    chladniM,
    chladniA,
    chladniB,
    hypotrochoidR,
    hypotrochoidr,
    hypotrochoidd,
    lissajousKx,
    lissajousKy,
    symmetryOrder,
    turbulence: 0.5 + (weightedEnergy / 100) * 1.8,
    frameStyle,
    topologyMode,
  }
}

/**
 * Full-bleed HTML5 Canvas Generative Artwork Shader
 * Renders high-contrast, unmistakable 1-of-1 procedural patterns:
 * - Multi-band Chladni standing-wave Damascus contours
 * - Guilloché epitrochoid / hypotrochoid currency-grade rosettes
 * - Lissajous harmonic webs & radial circadian starbursts (especially prominent on the Card Back)
 */
export const ProceduralPatternCanvas: React.FC<{
  dna: GenerativeDNA;
  axes: AxisScores;
  isBack?: boolean;
  hourlyDistribution?: number[];
}> = ({ dna, axes, isBack = false, hourlyDistribution }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // 1. Deep Base Gradient Fill
    const bgGrad = ctx.createLinearGradient(0, 0, w, h)
    bgGrad.addColorStop(0, dna.bgBase)
    bgGrad.addColorStop(0.5, dna.bgSecondary)
    bgGrad.addColorStop(1, dna.bgBase)
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)

    // 2. Ambient Radial Aura (stronger on Card Back for Tarot/Mandala focal glow)
    const focalY = isBack ? h * 0.43 : h * 0.35
    const aura = ctx.createRadialGradient(w * 0.5, focalY, 8, w * 0.5, focalY, w * 0.72)
    aura.addColorStop(0, `${dna.primaryColor}${dna.isLightTheme ? '38' : '55'}`)
    aura.addColorStop(0.5, `${dna.secondaryColor}${dna.isLightTheme ? '22' : '32'}`)
    aura.addColorStop(1, 'transparent')
    ctx.fillStyle = aura
    ctx.fillRect(0, 0, w, h)

    // 3. Multi-Band Chladni Standing-Wave Damascus Iso-Contours
    // Equation: a * sin(pi * n * x) * sin(pi * m * y) + b * cos(pi * m * x) * cos(pi * n * y) = c
    const n = isBack ? dna.chladniM * 1.15 : dna.chladniN
    const m = isBack ? dna.chladniN * 1.15 : dna.chladniM
    const a = dna.chladniA
    const b = dna.chladniB
    const phase = (dna.seed % 100) * 0.03

    ctx.save()
    const step = 4
    for (let py = 14; py < h - 14; py += step) {
      for (let px = 14; px < w - 14; px += step) {
        const nx = (px / w) * 2 - 1
        const ny = (py / h) * 2 - 1
        const rDist = Math.hypot(nx, ny * 1.2)

        const val =
          a * Math.sin(Math.PI * n * nx + phase) * Math.sin(Math.PI * m * ny) +
          b * Math.cos(Math.PI * m * nx) * Math.cos(Math.PI * n * ny - phase) +
          0.25 * Math.sin(rDist * Math.PI * (dna.symmetryOrder * 0.5))

        const absVal = Math.abs(val)

        // Band 1: Primary nodal zero-crossing ridge (bold & crisp)
        if (absVal < 0.085) {
          const intensity = 1 - absVal / 0.085
          ctx.fillStyle = dna.primaryColor
          ctx.globalAlpha = intensity * (isBack ? (dna.isLightTheme ? 0.48 : 0.62) : (dna.isLightTheme ? 0.34 : 0.44))
          ctx.fillRect(px - 1, py - 1, 2.4, 2.4)
        }
        // Band 2: Secondary harmonic contour ring
        else if (absVal > 0.36 && absVal < 0.42) {
          ctx.fillStyle = dna.secondaryColor
          ctx.globalAlpha = isBack ? (dna.isLightTheme ? 0.32 : 0.42) : (dna.isLightTheme ? 0.2 : 0.28)
          ctx.fillRect(px, py, 1.8, 1.8)
        }
        // Band 3: Tertiary outer resonance contour
        else if (absVal > 0.72 && absVal < 0.77) {
          ctx.fillStyle = dna.tertiaryColor
          ctx.globalAlpha = isBack ? 0.3 : 0.18
          ctx.fillRect(px, py, 1.5, 1.5)
        }
      }
    }
    ctx.restore()

    // 4. Full-Card Parametric Guilloché Spirograph Rosette (uniquely shaped for every user)
    ctx.save()
    const cx = w / 2
    const cy = focalY
    const guillocheRings = isBack ? 3 : 2

    for (let ring = 0; ring < guillocheRings; ring++) {
      const baseR = (isBack ? 148 : 132) - ring * 34
      const order = dna.symmetryOrder + ring * 2
      const rMod = baseR / order
      const dMod = dna.hypotrochoidd * (0.85 + ring * 0.25)

      ctx.beginPath()
      const totalSteps = 540
      for (let i = 0; i <= totalSteps; i++) {
        const t = (i / totalSteps) * Math.PI * 2 * (order % 2 === 0 ? 3 : 4)
        const gx =
          cx +
          (baseR - rMod) * Math.cos(t) +
          dMod * Math.cos(((baseR - rMod) / rMod) * t + ring * 0.8)
        const gy =
          cy +
          (baseR - rMod) * Math.sin(t) -
          dMod * Math.sin(((baseR - rMod) / rMod) * t + ring * 0.8)
        if (i === 0) ctx.moveTo(gx, gy)
        else ctx.lineTo(gx, gy)
      }
      ctx.strokeStyle =
        ring === 0 ? dna.primaryColor : ring === 1 ? dna.secondaryColor : dna.tertiaryColor
      ctx.lineWidth = isBack ? 1.35 : 0.95
      ctx.globalAlpha = isBack
        ? dna.isLightTheme
          ? 0.52
          : 0.68
        : dna.isLightTheme
        ? 0.24
        : 0.32
      ctx.stroke()
    }
    ctx.restore()

    // 5. Card Back Exclusive: 1-of-1 Sacred Astrolabe, Lissajous Web & 4-Corner Rosettes
    if (isBack) {
      ctx.save()
      // 5a. 4 Corner Guilloché Knots
      const corners = [
        [46, 52],
        [w - 46, 52],
        [46, h - 52],
        [w - 46, h - 52],
      ]
      for (const [kx, ky] of corners) {
        ctx.beginPath()
        for (let i = 0; i <= 120; i++) {
          const t = (i / 120) * Math.PI * 2
          const r = 18 + 8 * Math.cos(dna.symmetryOrder * t)
          const px = kx + Math.cos(t) * r
          const py = ky + Math.sin(t) * r
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.strokeStyle = dna.primaryColor
        ctx.globalAlpha = 0.55
        ctx.lineWidth = 1.1
        ctx.stroke()
      }

      // 5b. Lissajous Harmonic Resonance Web across the center
      ctx.beginPath()
      for (let i = 0; i <= 420; i++) {
        const t = (i / 420) * Math.PI * 2
        const lx = cx + Math.sin(dna.lissajousKx * t + phase) * 135
        const ly = cy + Math.sin(dna.lissajousKy * t) * 165
        if (i === 0) ctx.moveTo(lx, ly)
        else ctx.lineTo(lx, ly)
      }
      ctx.strokeStyle = dna.tertiaryColor
      ctx.globalAlpha = dna.isLightTheme ? 0.32 : 0.42
      ctx.lineWidth = 1
      ctx.stroke()

      // 5c. 24-Hour Circadian Sunburst Rays radiating from focal center
      const dist = hourlyDistribution && hourlyDistribution.length === 24
        ? hourlyDistribution
        : Array.from({ length: 24 }, (_, i) => ((i * dna.seed) % 10) + 2)
      const maxH = Math.max(...dist, 0.01)

      for (let hr = 0; hr < 24; hr++) {
        const angle = (hr / 24) * Math.PI * 2 - Math.PI / 2
        const norm = dist[hr] / maxH
        const innerR = 72
        const outerR = 96 + norm * 78

        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR)
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR)
        ctx.strokeStyle = hr % 2 === 0 ? dna.primaryColor : dna.secondaryColor
        ctx.globalAlpha = 0.35 + norm * 0.55
        ctx.lineWidth = 1.2 + norm * 2
        ctx.stroke()

        // Star jewel at the tip of each circadian ray
        ctx.beginPath()
        ctx.arc(
          cx + Math.cos(angle) * outerR,
          cy + Math.sin(angle) * outerR,
          1.8 + norm * 2.2,
          0,
          Math.PI * 2
        )
        ctx.fillStyle = dna.tertiaryColor
        ctx.globalAlpha = 0.75
        ctx.fill()
      }
      ctx.restore()
    } else {
      // 6. Front Secondary Topology Layer (Flowfield / Constellation / Vortex)
      const rng = createRng(dna.seed)
      ctx.save()
      if (dna.topologyMode === 'constellation') {
        const nodes: Array<{ x: number; y: number; r: number }> = []
        const count = 26 + Math.round(axes.field / 4)
        for (let i = 0; i < count; i++) {
          nodes.push({
            x: 24 + rng() * (w - 48),
            y: 24 + rng() * (h - 48),
            r: 1.5 + rng() * 2.2,
          })
        }
        ctx.strokeStyle = dna.primaryColor
        ctx.lineWidth = 0.9
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
            if (d < 90) {
              ctx.globalAlpha = (1 - d / 90) * (dna.isLightTheme ? 0.25 : 0.34)
              ctx.beginPath()
              ctx.moveTo(nodes[i].x, nodes[i].y)
              ctx.lineTo(nodes[j].x, nodes[j].y)
              ctx.stroke()
            }
          }
        }
      }
      ctx.restore()
    }
  }, [dna, axes, isBack, hourlyDistribution])

  return (
    <canvas
      ref={canvasRef}
      width={380}
      height={575}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-[28px]"
    />
  )
}

/**
 * Procedural Centerpiece Spirograph / Sacred Sigil Totem with Embedded Avatar Medallion
 */
export const ProceduralSigilCenterpiece: React.FC<{
  dna: GenerativeDNA;
  axes: AxisScores;
  secondaryAxes?: AxisScores;
  badgeIcon: string;
  secondaryIcon?: string;
  avatarUrl?: string;
}> = ({ dna, axes, secondaryAxes, badgeIcon, secondaryIcon, avatarUrl }) => {
  const size = 154
  const cx = size / 2
  const cy = size / 2

  // Generate Hypotrochoid / Spirograph curve path
  const R = dna.hypotrochoidR
  const r = dna.hypotrochoidr
  const d = dna.hypotrochoidd
  const spiroPoints: string[] = []
  const steps = 260
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * (dna.symmetryOrder % 2 === 0 ? 2 : 3)
    const x = cx + (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t)
    const y = cy + (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t)
    const sx = cx + (x - cx) * 0.72
    const sy = cy + (y - cy) * 0.72
    spiroPoints.push(`${sx.toFixed(1)},${sy.toFixed(1)}`)
  }

  // Generate Sacred Polygon
  const polyPoints: string[] = []
  const order = dna.symmetryOrder
  for (let i = 0; i < order * 2; i++) {
    const rad = i % 2 === 0 ? 67 : 30 + (axes.density / 100) * 18
    const angle = (i * Math.PI) / order - Math.PI / 2
    polyPoints.push(
      `${(cx + Math.cos(angle) * rad).toFixed(1)},${(cy + Math.sin(angle) * rad).toFixed(1)}`
    )
  }

  // Secondary Polygon for Fusion or contrast
  const secAxes = secondaryAxes || axes
  const diamondPoints = [
    `${cx},${(cy - 24 - (secAxes.field / 100) * 42).toFixed(1)}`,
    `${(cx + 24 + (secAxes.rhythm / 100) * 42).toFixed(1)},${cy}`,
    `${cx},${(cy + 24 + (secAxes.temperature / 100) * 42).toFixed(1)}`,
    `${(cx - 24 - (secAxes.density / 100) * 42).toFixed(1)},${cy}`,
  ].join(' ')

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id={`sigilGlow-${dna.seed}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={dna.primaryColor} stopOpacity={dna.isLightTheme ? '0.35' : '0.52'} />
            <stop offset="70%" stopColor={dna.secondaryColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={dna.secondaryColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Core Halo */}
        <circle cx={cx} cy={cy} r={73} fill={`url(#sigilGlow-${dna.seed})`} />

        {/* Outer Degree Ticks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * Math.PI * 2
          const r1 = i % 3 === 0 ? 64 : 67
          const r2 = 71
          return (
            <line
              key={i}
              x1={cx + Math.cos(angle) * r1}
              y1={cy + Math.sin(angle) * r1}
              x2={cx + Math.cos(angle) * r2}
              y2={cy + Math.sin(angle) * r2}
              stroke={dna.primaryColor}
              strokeOpacity="0.65"
              strokeWidth={i % 3 === 0 ? '1.6' : '0.9'}
            />
          )
        })}

        {/* Sacred Symmetry Star */}
        <polygon
          points={polyPoints.join(' ')}
          fill={dna.primaryColor}
          fillOpacity={dna.isLightTheme ? '0.11' : '0.16'}
          stroke={dna.primaryColor}
          strokeOpacity="0.78"
          strokeWidth="1.3"
        />

        {/* Parametric Spirograph / Hypotrochoid Curve */}
        <polyline
          points={spiroPoints.join(' ')}
          fill="none"
          stroke={dna.secondaryColor}
          strokeOpacity="0.82"
          strokeWidth="1.25"
        />

        {/* 4-Axis Vector Diamond */}
        <polygon
          points={diamondPoints}
          fill={dna.tertiaryColor}
          fillOpacity="0.18"
          stroke={dna.primaryColor}
          strokeWidth="1.7"
        />

        {/* Center Medallion Outer Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={27}
          fill={dna.isLightTheme ? 'rgba(255,255,255,0.94)' : 'rgba(10,12,22,0.9)'}
          stroke={dna.primaryColor}
          strokeWidth="2"
        />
        <circle
          cx={cx}
          cy={cy}
          r={24}
          fill="none"
          stroke={dna.tertiaryColor}
          strokeOpacity="0.65"
          strokeWidth="0.9"
          strokeDasharray="3 2"
        />
      </svg>

      {/* Center Portrait Medallion + Archetype Crest Seal */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {avatarUrl ? (
          <div className="relative w-12 h-12 rounded-full flex items-center justify-center">
            <img
              src={avatarUrl}
              alt="Avatar Medallion"
              className="w-11 h-11 rounded-full object-cover shadow-inner"
              style={{ border: `1.5px solid ${dna.primaryColor}` }}
            />
            <div
              className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-xs flex items-center justify-center shadow-md"
              style={{
                backgroundColor: dna.isLightTheme ? '#ffffff' : '#0f172a',
                border: `1.5px solid ${dna.primaryColor}`,
              }}
            >
              {secondaryIcon ? (
                <span className="flex items-center -space-x-1 text-[11px]">
                  <span>{badgeIcon}</span>
                  <span>{secondaryIcon}</span>
                </span>
              ) : (
                <span className="text-[12px] leading-none">{badgeIcon}</span>
              )}
            </div>
          </div>
        ) : secondaryIcon ? (
          <div className="flex items-center -space-x-1.5">
            <span className="text-2xl transform -rotate-12">{badgeIcon}</span>
            <span className="text-2xl transform rotate-12">{secondaryIcon}</span>
          </div>
        ) : (
          <span className="text-2xl">{badgeIcon}</span>
        )}
      </div>
    </div>
  )
}

/**
 * Ornamental SVG Card Frame Overlay
 */
export const ProceduralFrameOverlay: React.FC<{ dna: GenerativeDNA }> = ({ dna }) => {
  return (
    <svg
      viewBox="0 0 380 575"
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      fill="none"
    >
      <rect
        x="8"
        y="8"
        width="364"
        height="559"
        rx="24"
        stroke={dna.primaryColor}
        strokeOpacity="0.32"
        strokeWidth="1.5"
      />
      <rect
        x="11"
        y="11"
        width="358"
        height="553"
        rx="21"
        stroke={dna.primaryColor}
        strokeOpacity="0.5"
        strokeWidth="1"
      />

      {dna.frameStyle === 'tarot-arch' && (
        <>
          <path
            d="M 22 90 A 168 150 0 0 1 358 90"
            stroke={dna.primaryColor}
            strokeOpacity="0.5"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
          <circle cx="190" cy="18" r="4" fill={dna.primaryColor} fillOpacity="0.75" />
        </>
      )}

      {dna.frameStyle === 'cyber-hud' && (
        <>
          <path d="M 16 42 L 16 20 L 38 20" stroke={dna.primaryColor} strokeWidth="2.2" />
          <path d="M 364 42 L 364 20 L 342 20" stroke={dna.primaryColor} strokeWidth="2.2" />
          <path d="M 16 533 L 16 555 L 38 555" stroke={dna.primaryColor} strokeWidth="2.2" />
          <path d="M 364 533 L 364 555 L 342 555" stroke={dna.primaryColor} strokeWidth="2.2" />
        </>
      )}

      {dna.frameStyle === 'alchemical-seal' && (
        <>
          <rect
            x="15"
            y="15"
            width="350"
            height="545"
            rx="18"
            stroke={dna.secondaryColor}
            strokeOpacity="0.4"
            strokeWidth="1"
            strokeDasharray="6 3"
          />
          <circle cx="24" cy="24" r="3.5" fill={dna.primaryColor} />
          <circle cx="356" cy="24" r="3.5" fill={dna.primaryColor} />
          <circle cx="24" cy="551" r="3.5" fill={dna.primaryColor} />
          <circle cx="356" cy="551" r="3.5" fill={dna.primaryColor} />
        </>
      )}
    </svg>
  )
}
