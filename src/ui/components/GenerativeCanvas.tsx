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
    primary: '#c27803',
    secondary: '#9a3412',
    tertiary: '#d97706',
    text: '#1c1917',
    muted: '#57534e',
    border: 'rgba(194, 120, 3, 0.48)',
  },
  // 1: 苍翠青瓷 (Jade Celadon - Fresh Light Mint & Emerald)
  {
    name: '苍翠青瓷 · Jade Celadon',
    isLight: true,
    bgBase: '#f0f7f4',
    bgSecondary: '#d8ece3',
    primary: '#047857',
    secondary: '#0f766e',
    tertiary: '#10b981',
    text: '#064e3b',
    muted: '#3f6259',
    border: 'rgba(4, 120, 87, 0.45)',
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
    border: 'rgba(109, 40, 217, 0.42)',
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
    border: 'rgba(225, 29, 72, 0.42)',
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
    border: 'rgba(3, 105, 161, 0.42)',
  },
  // 5: 朱砂玄墨 (Cinnabar Ink - Wuxia Crimson & Deep Ink)
  {
    name: '朱砂玄墨 · Cinnabar Ink',
    isLight: false,
    bgBase: '#11090c',
    bgSecondary: '#230d15',
    primary: '#f43f5e',
    secondary: '#fb923c',
    tertiary: '#fde047',
    text: '#fff1f2',
    muted: '#fda4af',
    border: 'rgba(244, 63, 94, 0.55)',
  },
  // 6: 紫微星渊 (Astral Amethyst - Deep Cosmic Violet & Gold)
  {
    name: '紫微星渊 · Astral Amethyst',
    isLight: false,
    bgBase: '#0d071c',
    bgSecondary: '#1c0f38',
    primary: '#c084fc',
    secondary: '#f472b6',
    tertiary: '#fbbf24',
    text: '#faf5ff',
    muted: '#d8b4fe',
    border: 'rgba(192, 132, 252, 0.55)',
  },
  // 7: 赛博霓虹 (Cyber Neon - Matrix Cyan & Electric Magenta)
  {
    name: '赛博霓虹 · Cyber Neon',
    isLight: false,
    bgBase: '#050d1a',
    bgSecondary: '#0a1e36',
    primary: '#22d3ee',
    secondary: '#e879f9',
    tertiary: '#38bdf8',
    text: '#ecfeff',
    muted: '#67e8f9',
    border: 'rgba(34, 211, 238, 0.55)',
  },
  // 8: 黑曜熔金 (Obsidian Gold - Royal Black & Liquid Gold)
  {
    name: '黑曜熔金 · Obsidian Gold',
    isLight: false,
    bgBase: '#0c0a06',
    bgSecondary: '#1e180d',
    primary: '#fbbf24',
    secondary: '#f59e0b',
    tertiary: '#fef08a',
    text: '#fefce8',
    muted: '#fde68a',
    border: 'rgba(251, 191, 36, 0.6)',
  },
  // 9: 深海幽萤 (Bioluminescent Abyss - Emerald & Teal Glow)
  {
    name: '深海幽萤 · Abyssal Emerald',
    isLight: false,
    bgBase: '#041311',
    bgSecondary: '#072924',
    primary: '#34d399',
    secondary: '#2dd4bf',
    tertiary: '#a7f3d0',
    text: '#ecfdf5',
    muted: '#6ee7b7',
    border: 'rgba(52, 211, 153, 0.55)',
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

  // Avatar Style Weight = 30% (0.30), Persona Weight = 70% (0.70)
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
    if (c >= 78) worldIndex = avatarLum > 72 ? 0 : 8 // Solar Alabaster or Obsidian Gold
    else if (c >= 58) worldIndex = avatarLum > 55 ? 2 : 6 // Iridescent Pearl or Astral Amethyst
    else worldIndex = weightedWarmth >= 52 ? 5 : 7 // Cinnabar Ink or Cyber Neon
  } else if (variant === 'inner') {
    const preferLight = avatarLum >= 46
    if (code.includes('NF')) worldIndex = preferLight ? 2 : 6
    else if (code.includes('NT')) worldIndex = preferLight ? 4 : 7
    else if (code.includes('SJ')) worldIndex = weightedWarmth < 50 ? 1 : 0
    else worldIndex = preferLight ? 3 : 9
  } else {
    const nightOwl = extra.nightOwl ?? 15
    // Combine nocturnal posting behavior (70%) with dark avatar luminance (30%)
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

  // Blend the world's base palette with the user's extracted Avatar colors (30%-35% chromatic infusion)
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
  const borderColor = `rgba(${pr}, ${pg}, ${pb}, ${world.isLight ? 0.48 : 0.58})`

  // Chladni plate wave numbers (n, m) derived from 70% Persona + 30% Avatar detail/contrast
  const chladniN = 1 + (Math.round(weightedField / 13) % 7) + rng() * 0.45
  const chladniM = 2 + (Math.round(weightedDetail / 11) % 8) + rng() * 0.45
  const chladniA = ((weightedWarmth - 50) / 50) * 1.8 + (rng() - 0.5) * 0.5
  const chladniB = ((weightedEnergy - 50) / 50) * 1.8 + (rng() - 0.5) * 0.5

  // Spirograph / Hypotrochoid parameters for centerpiece sacred geometry
  const hueStep = avatar ? Math.floor(avatar.dominantHue / 45) : 0
  const symmetryOrder =
    3 + ((Math.round(weightedField / 10) + Math.round(weightedEnergy / 15) + hueStep + (seed % 5)) % 10)
  const hypotrochoidR = 58
  const hypotrochoidr = (hypotrochoidR / symmetryOrder) * (1 + (seed % 3))
  const hypotrochoidd = 18 + (weightedWarmth / 100) * 32

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
    symmetryOrder,
    turbulence: 0.4 + (weightedEnergy / 100) * 1.6,
    frameStyle,
    topologyMode,
  }
}

/**
 * Full-bleed HTML5 Canvas Generative Shader
 * Renders Chladni acoustic standing waves, flow fields, and constellation interference patterns
 */
export const ProceduralPatternCanvas: React.FC<{
  dna: GenerativeDNA;
  axes: AxisScores;
  isBack?: boolean;
}> = ({ dna, axes, isBack = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // 1. Base Gradient Fill
    const bgGrad = ctx.createLinearGradient(0, 0, w, h)
    bgGrad.addColorStop(0, dna.bgBase)
    bgGrad.addColorStop(0.55, dna.bgSecondary)
    bgGrad.addColorStop(1, dna.bgBase)
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)

    // 2. Soft Ambient Radial Aura (infused with Avatar + Persona blended colors)
    const aura = ctx.createRadialGradient(
      w * 0.5,
      isBack ? h * 0.42 : h * 0.36,
      10,
      w * 0.5,
      h * 0.45,
      w * 0.78
    )
    aura.addColorStop(0, `${dna.primaryColor}${dna.isLightTheme ? '26' : '38'}`)
    aura.addColorStop(0.55, `${dna.secondaryColor}${dna.isLightTheme ? '16' : '22'}`)
    aura.addColorStop(1, 'transparent')
    ctx.fillStyle = aura
    ctx.fillRect(0, 0, w, h)

    // 3. Chladni Standing Wave Resonance Field:
    // Equation: a * sin(pi * n * x) * sin(pi * m * y) + b * cos(pi * m * x) * cos(pi * n * y) = 0
    const n = isBack ? dna.chladniM : dna.chladniN
    const m = isBack ? dna.chladniN : dna.chladniM
    const a = dna.chladniA
    const b = dna.chladniB

    ctx.save()
    const step = 6
    for (let py = 18; py < h - 18; py += step) {
      for (let px = 18; px < w - 18; px += step) {
        const nx = (px / w) * 2 - 1
        const ny = (py / h) * 2 - 1
        const val =
          a * Math.sin(Math.PI * n * nx) * Math.sin(Math.PI * m * ny) +
          b * Math.cos(Math.PI * m * nx) * Math.cos(Math.PI * n * ny)

        const absVal = Math.abs(val)
        if (absVal < 0.16) {
          const alpha = (1 - absVal / 0.16) * (dna.isLightTheme ? 0.24 : 0.3)
          ctx.fillStyle = absVal < 0.06 ? dna.primaryColor : dna.secondaryColor
          ctx.globalAlpha = alpha
          ctx.beginPath()
          ctx.arc(px, py, absVal < 0.05 ? 1.5 : 0.9, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    ctx.restore()

    // 4. Secondary Topology Layer (Flowfield / Constellation / Vortex)
    const rng = createRng(dna.seed + (isBack ? 777 : 0))
    ctx.save()

    if (dna.topologyMode === 'flowfield' || dna.topologyMode === 'chladni') {
      const curveCount = 26 + Math.round(axes.rhythm / 4)
      ctx.lineWidth = 1
      for (let i = 0; i < curveCount; i++) {
        let cx = rng() * w
        let cy = rng() * h
        ctx.strokeStyle = i % 3 === 0 ? dna.tertiaryColor : i % 2 === 0 ? dna.primaryColor : dna.secondaryColor
        ctx.globalAlpha = dna.isLightTheme ? 0.15 : 0.2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        for (let s = 0; s < 28; s++) {
          const angle =
            Math.sin((cx / w) * Math.PI * dna.chladniN) *
              Math.cos((cy / h) * Math.PI * dna.chladniM) *
              Math.PI *
              dna.turbulence
          cx += Math.cos(angle) * 7
          cy += Math.sin(angle) * 7
          ctx.lineTo(cx, cy)
        }
        ctx.stroke()
      }
    } else if (dna.topologyMode === 'constellation') {
      const nodes: Array<{ x: number; y: number; r: number }> = []
      const count = 28 + Math.round(axes.field / 4)
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: 24 + rng() * (w - 48),
          y: 24 + rng() * (h - 48),
          r: 1.2 + rng() * 2.2,
        })
      }
      ctx.strokeStyle = dna.primaryColor
      ctx.lineWidth = 0.8
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
          if (dist < 85) {
            ctx.globalAlpha = (1 - dist / 85) * (dna.isLightTheme ? 0.22 : 0.28)
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }
      ctx.fillStyle = dna.secondaryColor
      for (const node of nodes) {
        ctx.globalAlpha = dna.isLightTheme ? 0.45 : 0.65
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      ctx.strokeStyle = dna.primaryColor
      const cx = w / 2
      const cy = h * 0.42
      for (let r = 24; r < w * 0.65; r += 14) {
        ctx.globalAlpha = dna.isLightTheme ? 0.15 : 0.2
        ctx.lineWidth = r % 28 === 0 ? 1.4 : 0.7
        ctx.beginPath()
        for (let aIdx = 0; aIdx <= 120; aIdx++) {
          const theta = (aIdx / 120) * Math.PI * 2
          const wave = Math.sin(theta * dna.symmetryOrder + r * 0.05) * (axes.temperature / 12)
          const px = cx + Math.cos(theta) * (r + wave)
          const py = cy + Math.sin(theta) * (r + wave)
          if (aIdx === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.stroke()
      }
    }
    ctx.restore()
  }, [dna, axes, isBack])

  return (
    <canvas
      ref={canvasRef}
      width={380}
      height={575}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-[30px]"
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
  const size = 152
  const cx = size / 2
  const cy = size / 2

  // Generate Hypotrochoid / Spirograph curve path
  const R = dna.hypotrochoidR
  const r = dna.hypotrochoidr
  const d = dna.hypotrochoidd
  const spiroPoints: string[] = []
  const steps = 240
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
    const rad = i % 2 === 0 ? 66 : 30 + (axes.density / 100) * 18
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
            <stop offset="0%" stopColor={dna.primaryColor} stopOpacity={dna.isLightTheme ? '0.32' : '0.48'} />
            <stop offset="70%" stopColor={dna.secondaryColor} stopOpacity="0.1" />
            <stop offset="100%" stopColor={dna.secondaryColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Core Halo */}
        <circle cx={cx} cy={cy} r={72} fill={`url(#sigilGlow-${dna.seed})`} />

        {/* Outer Degree Ticks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * Math.PI * 2
          const r1 = i % 3 === 0 ? 64 : 67
          const r2 = 70
          return (
            <line
              key={i}
              x1={cx + Math.cos(angle) * r1}
              y1={cy + Math.sin(angle) * r1}
              x2={cx + Math.cos(angle) * r2}
              y2={cy + Math.sin(angle) * r2}
              stroke={dna.primaryColor}
              strokeOpacity="0.55"
              strokeWidth={i % 3 === 0 ? '1.5' : '0.8'}
            />
          )
        })}

        {/* Sacred Symmetry Star */}
        <polygon
          points={polyPoints.join(' ')}
          fill={dna.primaryColor}
          fillOpacity={dna.isLightTheme ? '0.09' : '0.14'}
          stroke={dna.primaryColor}
          strokeOpacity="0.7"
          strokeWidth="1.2"
        />

        {/* Parametric Spirograph / Hypotrochoid Curve */}
        <polyline
          points={spiroPoints.join(' ')}
          fill="none"
          stroke={dna.secondaryColor}
          strokeOpacity="0.75"
          strokeWidth="1.15"
        />

        {/* 4-Axis Vector Diamond */}
        <polygon
          points={diamondPoints}
          fill={dna.tertiaryColor}
          fillOpacity="0.15"
          stroke={dna.primaryColor}
          strokeWidth="1.6"
        />

        {/* Center Medallion Outer Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={27}
          fill={dna.isLightTheme ? 'rgba(255,255,255,0.92)' : 'rgba(10,12,22,0.88)'}
          stroke={dna.primaryColor}
          strokeWidth="2"
        />
        <circle
          cx={cx}
          cy={cy}
          r={24}
          fill="none"
          stroke={dna.tertiaryColor}
          strokeOpacity="0.6"
          strokeWidth="0.8"
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
            {/* Floating Archetype Crest Badge on bottom-right of medallion */}
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
          <div className="flex items-center -space-x-1.5 filter drop-shadow-md">
            <span className="text-2xl transform -rotate-12">{badgeIcon}</span>
            <span className="text-2xl transform rotate-12">{secondaryIcon}</span>
          </div>
        ) : (
          <span className="text-2xl filter drop-shadow-md">{badgeIcon}</span>
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
      {/* Outer Recessed Groove Bevel */}
      <rect
        x="8"
        y="8"
        width="364"
        height="559"
        rx="24"
        stroke={dna.primaryColor}
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />
      <rect
        x="11"
        y="11"
        width="358"
        height="553"
        rx="21"
        stroke={dna.primaryColor}
        strokeOpacity="0.45"
        strokeWidth="1"
      />

      {dna.frameStyle === 'tarot-arch' && (
        <>
          <path
            d="M 22 90 A 168 150 0 0 1 358 90"
            stroke={dna.primaryColor}
            strokeOpacity="0.45"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
          <circle cx="190" cy="18" r="4" fill={dna.primaryColor} fillOpacity="0.7" />
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
            strokeOpacity="0.35"
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
