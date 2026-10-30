import React from 'react'
import type { AxisScores } from '../../persona/axes'

// Deterministic hash from string
export function hashString(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface ProceduralStyleSpec {
  hue1: number;
  hue2: number;
  hue3: number;
  bgGradientCss: string;
  borderColorCss: string;
  accentColorHex: string;
  secondaryColorHex: string;
  holoClass: string;
  patternSeed: number;
}

/**
 * Deterministically computes the card's entire shader & color palette
 * purely from the persona data (no manual user selection).
 */
export function computeProceduralCardStyle(
  variant: 'outer' | 'inner' | 'fusion',
  code: string,
  axes: AxisScores,
  handle: string
): ProceduralStyleSpec {
  const seed = hashString(`${variant}:${code}:${handle}:${axes.field}:${axes.temperature}`)

  if (variant === 'outer') {
    // Driven by X behavioral axes:
    // Temperature controls Warm (290-355) vs Cool (175-235)
    // Field & Rhythm shift secondary hues
    const isWarm = axes.temperature >= 50
    const hue1 = isWarm
      ? 285 + Math.round((axes.temperature - 50) * 1.3) // Violet -> Crimson
      : 180 + Math.round((50 - axes.temperature) * 1.1) // Cyan -> Deep Blue
    const hue2 = (hue1 + 45 + (axes.field % 40)) % 360
    const hue3 = (hue1 + 160 + (axes.rhythm % 50)) % 360

    const holoClass =
      axes.rhythm >= 65
        ? 'holo-shimmer-aurora'
        : axes.temperature < 45
        ? 'holo-shimmer-cyber'
        : 'holo-shimmer-gold'

    return {
      hue1,
      hue2,
      hue3,
      bgGradientCss: `linear-gradient(155deg, hsl(${hue1}, 62%, 11%) 0%, hsl(${(hue1 + 20) % 360}, 45%, 6%) 52%, hsl(${hue2}, 58%, 12%) 100%)`,
      borderColorCss: `hsla(${hue1}, 85%, 65%, 0.42)`,
      accentColorHex: `hsl(${hue1}, 90%, 70%)`,
      secondaryColorHex: `hsl(${hue2}, 85%, 65%)`,
      holoClass,
      patternSeed: seed,
    }
  }

  if (variant === 'inner') {
    // Driven by OEJTS Jungian type (NF, NT, SJ, SP)
    const isIntuitive = code.includes('N')
    const isFeeling = code.includes('F')
    const isPerceiving = code.includes('P')

    let hue1 = 260
    if (isIntuitive && isFeeling) hue1 = 275 + (seed % 35) // NF: Starlight Amethyst / Rose
    else if (isIntuitive && !isFeeling) hue1 = 205 + (seed % 35) // NT: Arcane Indigo / Cyan
    else if (!isIntuitive && !isPerceiving) hue1 = 38 + (seed % 40) // SJ: Sovereign Gold / Jade
    else hue1 = 335 + (seed % 35) // SP: Prismatic Coral / Sunset

    const hue2 = (hue1 + 60) % 360
    const hue3 = (hue1 + 180) % 360

    const holoClass = isIntuitive ? 'holo-shimmer-aurora' : 'holo-shimmer-gold'

    return {
      hue1,
      hue2,
      hue3,
      bgGradientCss: `linear-gradient(165deg, hsl(${hue1}, 55%, 12%) 0%, hsl(${hue2}, 40%, 6%) 55%, hsl(${hue1}, 65%, 10%) 100%)`,
      borderColorCss: `hsla(${hue1}, 80%, 68%, 0.45)`,
      accentColorHex: `hsl(${hue1}, 88%, 72%)`,
      secondaryColorHex: `hsl(${hue3}, 80%, 68%)`,
      holoClass,
      patternSeed: seed,
    }
  }

  // Variant === 'fusion': Mythic Alchemy blending both worlds
  const hue1 = (axes.temperature * 2 + axes.field + (seed % 60)) % 360
  const hue2 = (hue1 + 110) % 360
  const hue3 = 45 // Alchemical Gold accent

  return {
    hue1,
    hue2,
    hue3,
    bgGradientCss: `linear-gradient(145deg, hsl(${hue1}, 68%, 13%) 0%, hsl(265, 55%, 7%) 48%, hsl(${hue2}, 68%, 13%) 100%)`,
    borderColorCss: `hsla(45, 95%, 68%, 0.55)`,
    accentColorHex: `hsl(45, 95%, 72%)`,
    secondaryColorHex: `hsl(${hue1}, 90%, 72%)`,
    holoClass: 'holo-shimmer-aurora',
    patternSeed: seed,
  }
}

/**
 * Procedural Sacred / Cyber Totem for the Card Front Centerpiece
 */
export const ProceduralFrontTotem: React.FC<{
  variant: 'outer' | 'inner' | 'fusion';
  axes: AxisScores;
  secondaryAxes?: AxisScores;
  styleSpec: ProceduralStyleSpec;
  badgeIcon: string;
  secondaryIcon?: string;
}> = ({ variant, axes, secondaryAxes, styleSpec, badgeIcon, secondaryIcon }) => {
  const size = 148
  const cx = size / 2
  const cy = size / 2
  const { accentColorHex, secondaryColorHex, patternSeed } = styleSpec

  // Number of symmetry points driven by axes
  const numSpokes = variant === 'outer'
    ? 4 + Math.floor(axes.field / 16) // 4 to 10 spokes
    : variant === 'inner'
    ? 6 + (patternSeed % 6) // 6 to 11 petals
    : 12 // 12-fold alchemical wheel

  const outerR = 62
  const midR = 28 + Math.round((axes.temperature / 100) * 22)
  const innerR = 16 + Math.round((axes.density / 100) * 12)

  // Generate star/polygon path
  const starPoints: string[] = []
  for (let i = 0; i < numSpokes * 2; i++) {
    const r = i % 2 === 0 ? outerR : midR * 0.65
    const angle = (i * Math.PI) / numSpokes - Math.PI / 2
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    starPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }

  // Generate secondary polygon if fusion or inner
  const secPoints: string[] = []
  const secAxes = secondaryAxes || axes
  const secSpokes = 4
  const radii = [secAxes.field, secAxes.rhythm, secAxes.temperature, secAxes.density]
  for (let i = 0; i < secSpokes; i++) {
    const r = 20 + (radii[i] / 100) * 42
    const angle = (i * Math.PI) / 2 - Math.PI / 4
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    secPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }

  return (
    <div className="relative flex items-center justify-center select-none my-1" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id={`totemGlow-${variant}-${patternSeed}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accentColorHex} stopOpacity="0.42" />
            <stop offset="65%" stopColor={secondaryColorHex} stopOpacity="0.12" />
            <stop offset="100%" stopColor={secondaryColorHex} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Core Halo */}
        <circle cx={cx} cy={cy} r={outerR + 8} fill={`url(#totemGlow-${variant}-${patternSeed})`} />

        {/* Outer Astrolabe Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke={accentColorHex}
          strokeOpacity="0.3"
          strokeWidth="1"
          strokeDasharray={variant === 'outer' ? '4 2' : '1 3'}
        />

        {/* Rhythm Wave Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={midR}
          fill="none"
          stroke={secondaryColorHex}
          strokeOpacity="0.4"
          strokeWidth="1.2"
        />

        {/* Procedural Star / Mandala Geometry */}
        <polygon
          points={starPoints.join(' ')}
          fill={accentColorHex}
          fillOpacity="0.1"
          stroke={accentColorHex}
          strokeOpacity="0.65"
          strokeWidth="1.2"
        />

        {/* Secondary rotated diamond */}
        <polygon
          points={secPoints.join(' ')}
          fill={secondaryColorHex}
          fillOpacity="0.12"
          stroke={secondaryColorHex}
          strokeOpacity="0.75"
          strokeWidth="1.5"
        />

        {/* Orbital Satellite Nodes */}
        {Array.from({ length: numSpokes }).map((_, idx) => {
          const angle = (idx * 2 * Math.PI) / numSpokes + (patternSeed % 10) * 0.1
          const nx = cx + Math.cos(angle) * outerR
          const ny = cy + Math.sin(angle) * outerR
          return (
            <circle
              key={idx}
              cx={nx}
              cy={ny}
              r={idx % 2 === 0 ? 2.5 : 1.5}
              fill={idx % 2 === 0 ? accentColorHex : '#ffffff'}
              fillOpacity="0.85"
            />
          )
        })}

        {/* Inner Sanctum Circle */}
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="rgba(10, 12, 24, 0.75)"
          stroke="#ffffff"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
      </svg>

      {/* Center Emblem Icon(s) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {variant === 'fusion' && secondaryIcon ? (
          <div className="flex items-center -space-x-2 filter drop-shadow-[0_6px_16px_rgba(0,0,0,0.8)]">
            <span className="text-3xl transform -rotate-12">{badgeIcon}</span>
            <span className="text-3xl transform rotate-12">{secondaryIcon}</span>
          </div>
        ) : (
          <span className="text-4xl filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.75)]">
            {badgeIcon}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Procedural Card Back Blueprint:
 * - Outer Card Back: 24-Hour Circadian Star Clock + 4-Axis Diamond
 * - Inner Card Back: 32-Ray OEJTS Answer Mandala + Jungian Seal
 * - Fusion Card Back: Dual-Polygon Interference Astrolabe (Outer vs Inner overlap)
 */
export const ProceduralBackTotem: React.FC<{
  variant: 'outer' | 'inner' | 'fusion';
  axes: AxisScores;
  secondaryAxes?: AxisScores;
  hourlyDistribution?: number[];
  oejtsAnswers?: Record<number, number>;
  styleSpec: ProceduralStyleSpec;
}> = ({ variant, axes, secondaryAxes, hourlyDistribution, oejtsAnswers, styleSpec }) => {
  const size = 200
  const cx = size / 2
  const cy = size / 2
  const maxR = 76
  const { accentColorHex, secondaryColorHex } = styleSpec

  // Helper to convert 4 axes into 4 diamond coordinates
  const toPolygonPoints = (a: AxisScores, scaleRadius: number) => {
    const top = (a.field / 100) * scaleRadius
    const right = (a.rhythm / 100) * scaleRadius
    const bottom = (a.temperature / 100) * scaleRadius
    const left = (a.density / 100) * scaleRadius
    return `${cx},${(cy - top).toFixed(1)} ${(cx + right).toFixed(1)},${cy} ${cx},${(cy + bottom).toFixed(1)} ${(cx - left).toFixed(1)},${cy}`
  }

  const primaryPoly = toPolygonPoints(axes, 54)
  const secondaryPoly = secondaryAxes ? toPolygonPoints(secondaryAxes, 54) : null

  // Max value in 24h distribution for normalization
  const hours = hourlyDistribution && hourlyDistribution.length === 24
    ? hourlyDistribution
    : Array.from({ length: 24 }, (_, i) => ((i * 7 + axes.rhythm) % 10) + 1)
  const maxHourVal = Math.max(...hours, 1)

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Outer Sacred Astrolabe Degree Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={maxR + 8}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1"
        />
        <circle
          cx={cx}
          cy={cy}
          r={maxR}
          fill="rgba(255,255,255,0.02)"
          stroke={accentColorHex}
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* VARIANT 1: 24-Hour Circadian Rhythm Spikes (Outer Card Back) */}
        {variant === 'outer' &&
          hours.map((count, hr) => {
            const angle = (hr / 24) * Math.PI * 2 - Math.PI / 2
            const barLen = 4 + (count / maxHourVal) * 22
            const r1 = 56
            const r2 = r1 + barLen
            const x1 = cx + Math.cos(angle) * r1
            const y1 = cy + Math.sin(angle) * r1
            const x2 = cx + Math.cos(angle) * r2
            const y2 = cy + Math.sin(angle) * r2
            return (
              <line
                key={hr}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={hr >= 0 && hr < 6 ? '#f472b6' : accentColorHex}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeOpacity={0.45 + (count / maxHourVal) * 0.55}
              />
            )
          })}

        {/* VARIANT 2: 32-Question Subconscious Ray Mandala (Inner Card Back) */}
        {variant === 'inner' &&
          Array.from({ length: 32 }, (_, idx) => {
            const qId = idx + 1
            const val = oejtsAnswers?.[qId] || 3 // 1..5
            const angle = (idx / 32) * Math.PI * 2 - Math.PI / 2
            const rayLen = 6 + (val / 5) * 22
            const r1 = 54
            const r2 = r1 + rayLen
            const x1 = cx + Math.cos(angle) * r1
            const y1 = cy + Math.sin(angle) * r1
            const x2 = cx + Math.cos(angle) * r2
            const y2 = cy + Math.sin(angle) * r2
            return (
              <g key={qId}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={val >= 4 ? accentColorHex : val <= 2 ? secondaryColorHex : 'rgba(255,255,255,0.35)'}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <circle cx={x2} cy={y2} r="1.5" fill="#ffffff" fillOpacity="0.7" />
              </g>
            )
          })}

        {/* VARIANT 3: 16-Point Alchemical Interference Rays (Fusion Card Back) */}
        {variant === 'fusion' &&
          Array.from({ length: 16 }, (_, idx) => {
            const angle = (idx / 16) * Math.PI * 2
            const x1 = cx + Math.cos(angle) * 56
            const y1 = cy + Math.sin(angle) * 56
            const x2 = cx + Math.cos(angle) * 78
            const y2 = cy + Math.sin(angle) * 78
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={idx % 2 === 0 ? accentColorHex : secondaryColorHex}
                strokeWidth={idx % 4 === 0 ? '2' : '1'}
                strokeOpacity="0.55"
              />
            )
          })}

        {/* Inner Grid Reference Rings */}
        {[18, 36, 54].map((r) => (
          <circle
            key={r}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.8"
          />
        ))}

        {/* Crosshair Axes */}
        <line x1={cx} y1={cy - 58} x2={cx} y2={cy + 58} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <line x1={cx - 58} y1={cy} x2={cx + 58} y2={cy} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

        {/* Secondary Polygon (for Fusion Dual-World Overlay) */}
        {secondaryPoly && (
          <polygon
            points={secondaryPoly}
            fill={secondaryColorHex}
            fillOpacity="0.22"
            stroke={secondaryColorHex}
            strokeWidth="2"
            strokeDasharray="3 2"
          />
        )}

        {/* Primary Polygon */}
        <polygon
          points={primaryPoly}
          fill={accentColorHex}
          fillOpacity="0.28"
          stroke={accentColorHex}
          strokeWidth="2.2"
        />

        {/* Center Alchemical Core */}
        <circle cx={cx} cy={cy} r="3" fill="#ffffff" />
      </svg>

      {/* Cardinal Labels */}
      <span className="absolute -top-1 font-mono text-[9px] text-slate-300 font-bold">
        {variant === 'inner' ? '外倾 E' : '对话 C'}
      </span>
      <span className="absolute -bottom-1 font-mono text-[9px] text-slate-300 font-bold">
        {variant === 'inner' ? '情感 F' : '情绪 F'}
      </span>
      <span className="absolute -left-2 font-mono text-[9px] text-slate-300 font-bold">
        {variant === 'inner' ? '感觉 S' : '碎片 S'}
      </span>
      <span className="absolute -right-2 font-mono text-[9px] text-slate-300 font-bold">
        {variant === 'inner' ? '知觉 P' : '随性 D'}
      </span>
    </div>
  )
}
