import React from 'react'
import type { AxisScores } from '../../persona/axes'

interface Props {
  axes: AxisScores;
  accentColor?: string;
  size?: number;
}

export const PersonalityConstellation: React.FC<Props> = ({
  axes,
  accentColor = '#c084fc',
  size = 180,
}) => {
  const center = size / 2
  const radius = (size / 2) * 0.75

  // Map 0-100 to coordinates
  // Top: Field (0 = B, 100 = C)
  // Right: Rhythm (0 = K, 100 = D)
  // Bottom: Temperature (0 = A, 100 = F)
  // Left: Density (0 = E, 100 = S)

  const topDist = (axes.field / 100) * radius
  const rightDist = (axes.rhythm / 100) * radius
  const bottomDist = (axes.temperature / 100) * radius
  const leftDist = (axes.density / 100) * radius

  const pTop = `${center},${center - topDist}`
  const pRight = `${center + rightDist},${center}`
  const pBottom = `${center},${center + bottomDist}`
  const pLeft = `${center - leftDist},${center}`

  const polygonPoints = `${pTop} ${pRight} ${pBottom} ${pLeft}`

  return (
    <div className="relative flex flex-col items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.45" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.1" />
          </radialGradient>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
          </filter>
        </defs>

        {/* Outer Background Grid Diamonds */}
        {[0.33, 0.66, 1.0].map((scale, i) => {
          const r = radius * scale
          const points = `${center},${center - r} ${center + r},${center} ${center},${center + r} ${center - r},${center}`
          return (
            <polygon
              key={i}
              points={points}
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeDasharray={scale === 1 ? 'none' : '2 3'}
              strokeWidth="1"
            />
          )
        })}

        {/* Cross Axes */}
        <line
          x1={center}
          y1={center - radius * 1.05}
          x2={center}
          y2={center + radius * 1.05}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1"
        />
        <line
          x1={center - radius * 1.05}
          y1={center}
          x2={center + radius * 1.05}
          y2={center}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1"
        />

        {/* The User's Personality Polygon */}
        <polygon
          points={polygonPoints}
          fill="url(#radarFill)"
          stroke={accentColor}
          strokeWidth="2"
          className="transition-all duration-700 ease-out"
        />

        {/* Glowing Vertex Nodes */}
        <circle cx={center} cy={center - topDist} r="3" fill="#ffffff" filter="url(#nodeGlow)" />
        <circle cx={center} cy={center - topDist} r="2.5" fill={accentColor} />

        <circle cx={center + rightDist} cy={center} r="3" fill="#ffffff" filter="url(#nodeGlow)" />
        <circle cx={center + rightDist} cy={center} r="2.5" fill={accentColor} />

        <circle cx={center} cy={center + bottomDist} r="3" fill="#ffffff" filter="url(#nodeGlow)" />
        <circle cx={center} cy={center + bottomDist} r="2.5" fill={accentColor} />

        <circle cx={center - leftDist} cy={center} r="3" fill="#ffffff" filter="url(#nodeGlow)" />
        <circle cx={center - leftDist} cy={center} r="2.5" fill={accentColor} />
      </svg>

      {/* Axis Labels */}
      <span className="absolute -top-1 font-mono text-[9px] text-slate-300 font-bold tracking-wider">
        场域 (C)
      </span>
      <span className="absolute -bottom-1 font-mono text-[9px] text-slate-300 font-bold tracking-wider">
        温度 (F)
      </span>
      <span className="absolute -left-3 font-mono text-[9px] text-slate-300 font-bold tracking-wider">
        密度 (S)
      </span>
      <span className="absolute -right-3 font-mono text-[9px] text-slate-300 font-bold tracking-wider">
        节律 (D)
      </span>
    </div>
  )
}
