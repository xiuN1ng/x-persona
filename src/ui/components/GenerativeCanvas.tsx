import React, { useEffect, useRef } from 'react'
import type { AxisScores } from '../../persona/axes'

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

export interface GenerativeDNA {
  seed: number;
  // 12 distinct color worlds (including light/ivory, crimson/ink, glacier, gold/obsidian, aurora, etc.)
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
    border: 'rgba(194, 120, 3, 0.45)',
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
    border: 'rgba(4, 120, 87, 0.4)',
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
    border: 'rgba(109, 40, 217, 0.38)',
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
    border: 'rgba(225, 29, 72, 0.4)',
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
    border: 'rgba(3, 105, 161, 0.4)',
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
    border: 'rgba(244, 63, 94, 0.5)',
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
    border: 'rgba(192, 132, 252, 0.5)',
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
    border: 'rgba(34, 211, 238, 0.5)',
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
    border: 'rgba(251, 191, 36, 0.55)',
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
    border: 'rgba(52, 211, 153, 0.5)',
  },
]

export function computeGenerativeDNA(
  variant: 'outer' | 'inner' | 'fusion',
  code: string,
  axes: AxisScores,
  handle: string,
  extraMetrics?: {
    nightOwl?: number;
    burstiness?: number;
    avgChars?: number;
    consistency?: number;
  }
): GenerativeDNA {
  const rawStr = `${variant}:${code}:${handle.toLowerCase()}:${axes.field}:${axes.density}:${axes.temperature}:${axes.rhythm}:${extraMetrics?.avgChars ?? 100}:${extraMetrics?.burstiness ?? 1}`
  const seed = hashStr(rawStr)
  const rng = createRng(seed)

  // Deterministic Color World selection driven by personality traits (not random):
  // - Night owl index & Rhythm & Variant determine Light vs Dark & Hue family
  let worldIndex = 0
  if (variant === 'fusion') {
    // Fusion uses either Obsidian Gold (8), Astral Amethyst (6), or Iridescent Pearl (2)
    const c = extraMetrics?.consistency ?? 75
    worldIndex = c >= 80 ? 8 : c >= 60 ? 2 : 5
  } else if (variant === 'inner') {
    // Inner Soul cards lean towards fresh, ethereal Tarot aesthetics
    if (code.includes('NF')) worldIndex = axes.temperature >= 55 ? 2 : 6 // Pearl or Amethyst
    else if (code.includes('NT')) worldIndex = axes.field >= 50 ? 4 : 7 // Glacier or Cyber
    else if (code.includes('SJ')) worldIndex = axes.rhythm < 50 ? 1 : 0 // Jade or Solar Gold
    else worldIndex = axes.temperature >= 50 ? 3 : 9 // Sunset Coral or Abyssal
  } else {
    // Outer Card: driven by 4 axes + nightOwl
    const nightOwl = extraMetrics?.nightOwl ?? 15
    if (nightOwl >= 28) {
      // Heavy night owls get deep nocturnal worlds (5, 6, 7, 9)
      worldIndex = 5 + ((axes.field + axes.temperature + seed) % 5)
    } else if (axes.temperature >= 65 && axes.rhythm >= 65) {
      // High passion + high burst -> Cinnabar Ink (5) or Sunset Coral (3)
      worldIndex = axes.field < 50 ? 5 : 3
    } else if (axes.temperature < 45) {
      // Cool Analyst -> Glacier Titanium (4) or Jade Celadon (1)
      worldIndex = axes.density < 50 ? 1 : 4
    } else {
      // Balanced / Sunny -> Solar Alabaster (0), Iridescent Pearl (2), or Sunset Coral (3)
      const lightWorlds = [0, 1, 2, 3, 4]
      worldIndex = lightWorlds[(axes.field + axes.density + seed) % lightWorlds.length]
    }
  }

  const world = COLOR_WORLDS[worldIndex] || COLOR_WORLDS[0]

  // Chladni plate wave numbers (n, m) uniquely derived from exact scores
  const chladniN = 1 + (Math.round(axes.field / 14) % 7) + rng() * 0.4
  const chladniM = 2 + (Math.round(axes.density / 12) % 8) + rng() * 0.4
  const chladniA = ((axes.temperature - 50) / 50) * 1.8 + (rng() - 0.5) * 0.5
  const chladniB = ((axes.rhythm - 50) / 50) * 1.8 + (rng() - 0.5) * 0.5

  // Spirograph / Hypotrochoid parameters for centerpiece sacred geometry
  const symmetryOrder = 3 + ((Math.round(axes.field / 10) + Math.round(axes.rhythm / 15) + (seed % 5)) % 10) // 3 to 12
  const hypotrochoidR = 56
  const hypotrochoidr = (hypotrochoidR / symmetryOrder) * (1 + (seed % 3))
  const hypotrochoidd = 18 + (axes.temperature / 100) * 32

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
      : axes.temperature < 48
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
      : axes.field >= 62
      ? 'constellation'
      : axes.rhythm >= 65
      ? 'flowfield'
      : topologies[seed % topologies.length]

  return {
    seed,
    paletteName: world.name,
    isLightTheme: world.isLight,
    bgBase: world.bgBase,
    bgSecondary: world.bgSecondary,
    primaryColor: world.primary,
    secondaryColor: world.secondary,
    tertiaryColor: world.tertiary,
    textColor: world.text,
    mutedTextColor: world.muted,
    borderColor: world.border,
    chladniN,
    chladniM,
    chladniA,
    chladniB,
    hypotrochoidR,
    hypotrochoidr,
    hypotrochoidd,
    symmetryOrder,
    turbulence: 0.5 + (axes.rhythm / 100) * 2.0,
    frameStyle,
    topologyMode,
  }
}

/**
 * Full-Bleed Procedural Canvas Background Shader
 * Renders mathematical Chladni standing waves, flow-fields, or orbital constellations
 * unique to the user's exact numerical parameters.
 */
export const ProceduralPatternCanvas: React.FC<{
  dna: GenerativeDNA;
  axes: AxisScores;
  isBack?: boolean;
}> = ({ dna, axes, isBack = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const rng = createRng(dna.seed + (isBack ? 9999 : 0))

    // 1. Base Gradient Fill
    const grad = ctx.createLinearGradient(0, 0, w * 0.8, h)
    grad.addColorStop(0, dna.bgBase)
    grad.addColorStop(0.5, dna.bgSecondary)
    grad.addColorStop(1, dna.bgBase)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // 2. Soft Ambient Color Nebulae
    const drawOrb = (x: number, y: number, r: number, color: string, alpha: number) => {
      ctx.save()
      ctx.globalAlpha = alpha
      const radGrad = ctx.createRadialGradient(x, y, 0, x, y, r)
      radGrad.addColorStop(0, color)
      radGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = radGrad
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    drawOrb(
      w * (0.2 + (axes.field / 100) * 0.6),
      h * 0.28,
      w * 0.65,
      dna.primaryColor,
      dna.isLightTheme ? 0.16 : 0.22
    )
    drawOrb(
      w * (0.8 - (axes.density / 100) * 0.5),
      h * 0.72,
      w * 0.6,
      dna.secondaryColor,
      dna.isLightTheme ? 0.14 : 0.18
    )

    // 3. Mathematical Topology Pattern
    ctx.save()
    const n = dna.chladniN
    const m = dna.chladniM
    const a = dna.chladniA
    const b = dna.chladniB

    if (dna.topologyMode === 'chladni' || isBack) {
      // Chladni Resonance Contour Dots
      ctx.fillStyle = dna.primaryColor
      const step = 6
      for (let py = 20; py < h - 20; py += step) {
        for (let px = 20; px < w - 20; px += step) {
          const nx = (px / w) * 2 - 1
          const ny = (py / h) * 2 - 1
          const val =
            a * Math.sin(Math.PI * n * nx) * Math.cos(Math.PI * m * ny) +
            b * Math.sin(Math.PI * m * nx) * Math.cos(Math.PI * n * ny)

          if (Math.abs(val) < 0.16) {
            ctx.globalAlpha = (1 - Math.abs(val) / 0.16) * (dna.isLightTheme ? 0.22 : 0.28)
            ctx.fillRect(px, py, 1.8, 1.8)
          }
        }
      }
    } else if (dna.topologyMode === 'flowfield') {
      // Parametric Harmonic Flow Curves
      ctx.strokeStyle = dna.primaryColor
      ctx.lineWidth = 1
      const numCurves = 28 + Math.floor(axes.rhythm / 4)
      for (let i = 0; i < numCurves; i++) {
        ctx.beginPath()
        let x = rng() * w
        let y = rng() * h
        ctx.moveTo(x, y)
        ctx.globalAlpha = dna.isLightTheme ? 0.14 : 0.18
        for (let stepIdx = 0; stepIdx < 35; stepIdx++) {
          const angle =
            Math.sin((x / w) * Math.PI * n) * Math.cos((y / h) * Math.PI * m) * Math.PI * dna.turbulence
          x += Math.cos(angle) * 8
          y += Math.sin(angle) * 8
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    } else if (dna.topologyMode === 'constellation') {
      // Neural Star Network
      const numNodes = 24 + Math.floor(axes.field / 3)
      const nodes: Array<{ x: number; y: number; r: number }> = []
      for (let i = 0; i < numNodes; i++) {
        nodes.push({
          x: 24 + rng() * (w - 48),
          y: 24 + rng() * (h - 48),
          r: 1.5 + rng() * 2.5,
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
      // Vortex / Alchemical Spiral Rings
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
 * Procedural Centerpiece Spirograph / Sacred Sigil Totem
 * Replaces generic emoji with a mathematically synthesized multi-layer vector sigil
 * where curvature, petals, and rings are 100% controlled by the user's score vector.
 */
export const ProceduralSigilCenterpiece: React.FC<{
  dna: GenerativeDNA;
  axes: AxisScores;
  secondaryAxes?: AxisScores;
  badgeIcon: string;
  secondaryIcon?: string;
}> = ({ dna, axes, secondaryAxes, badgeIcon, secondaryIcon }) => {
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
    // Scale within bounds
    const sx = cx + (x - cx) * 0.72
    const sy = cy + (y - cy) * 0.72
    spiroPoints.push(`${sx.toFixed(1)},${sy.toFixed(1)}`)
  }

  // Generate Sacred Polygon
  const polyPoints: string[] = []
  const order = dna.symmetryOrder
  for (let i = 0; i < order * 2; i++) {
    const rad = i % 2 === 0 ? 64 : 28 + (axes.density / 100) * 18
    const angle = (i * Math.PI) / order - Math.PI / 2
    polyPoints.push(
      `${(cx + Math.cos(angle) * rad).toFixed(1)},${(cy + Math.sin(angle) * rad).toFixed(1)}`
    )
  }

  // Secondary Polygon for Fusion or contrast
  const secAxes = secondaryAxes || axes
  const diamondPoints = [
    `${cx},${(cy - 22 - (secAxes.field / 100) * 42).toFixed(1)}`,
    `${(cx + 22 + (secAxes.rhythm / 100) * 42).toFixed(1)},${cy}`,
    `${cx},${(cy + 22 + (secAxes.temperature / 100) * 42).toFixed(1)}`,
    `${(cx - 22 - (secAxes.density / 100) * 42).toFixed(1)},${cy}`,
  ].join(' ')

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id={`sigilGlow-${dna.seed}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={dna.primaryColor} stopOpacity={dna.isLightTheme ? '0.28' : '0.45'} />
            <stop offset="70%" stopColor={dna.secondaryColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={dna.secondaryColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Core Halo */}
        <circle cx={cx} cy={cy} r={70} fill={`url(#sigilGlow-${dna.seed})`} />

        {/* Outer Degree Ticks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * Math.PI * 2
          const r1 = i % 3 === 0 ? 63 : 66
          const r2 = 69
          return (
            <line
              key={i}
              x1={cx + Math.cos(angle) * r1}
              y1={cy + Math.sin(angle) * r1}
              x2={cx + Math.cos(angle) * r2}
              y2={cy + Math.sin(angle) * r2}
              stroke={dna.primaryColor}
              strokeOpacity="0.5"
              strokeWidth={i % 3 === 0 ? '1.5' : '0.8'}
            />
          )
        })}

        {/* Sacred Symmetry Star */}
        <polygon
          points={polyPoints.join(' ')}
          fill={dna.primaryColor}
          fillOpacity={dna.isLightTheme ? '0.08' : '0.12'}
          stroke={dna.primaryColor}
          strokeOpacity="0.65"
          strokeWidth="1.2"
        />

        {/* Parametric Spirograph / Hypotrochoid Curve */}
        <polyline
          points={spiroPoints.join(' ')}
          fill="none"
          stroke={dna.secondaryColor}
          strokeOpacity="0.7"
          strokeWidth="1.1"
        />

        {/* 4-Axis Vector Diamond */}
        <polygon
          points={diamondPoints}
          fill={dna.tertiaryColor}
          fillOpacity="0.14"
          stroke={dna.primaryColor}
          strokeWidth="1.6"
        />

        {/* Center Medallion Circle */}
        <circle
          cx={cx}
          cy={cy}
          r={22}
          fill={dna.isLightTheme ? 'rgba(255,255,255,0.88)' : 'rgba(10,12,22,0.82)'}
          stroke={dna.primaryColor}
          strokeWidth="1.5"
        />
      </svg>

      {/* Center Emblem */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {secondaryIcon ? (
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
 * Renders 4 distinct procedural border styles: celestial, cyber-hud, tarot-arch, alchemical-seal
 */
export const ProceduralFrameOverlay: React.FC<{ dna: GenerativeDNA }> = ({ dna }) => {
  return (
    <svg
      viewBox="0 0 380 575"
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      fill="none"
    >
      {/* Outer Thin Trim */}
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
          {/* Chamfered HUD brackets */}
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
