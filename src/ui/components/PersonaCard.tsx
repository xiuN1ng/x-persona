import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  Download,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
  Flame,
  LayoutGrid,
  Square,
  Cpu,
  Move3d
} from 'lucide-react'
import { toPng } from 'html-to-image'
import { usePersonaStore, type CardSlot } from '../../store/usePersonaStore'
import { buildShareUrl, buildTweetIntentUrl } from '../../share/url-state'
import { INNER_ARCHETYPES } from '../../persona/inner-archetypes'
import { ProceduralBackTotem } from './ProceduralArt'
import {
  computeGenerativeDNA,
  ProceduralPatternCanvas,
  ProceduralSigilCenterpiece,
  ProceduralFrameOverlay,
  type GenerativeDNA
} from './GenerativeCanvas'
import {
  computeDeterministicAvatarFallback,
  generateProceduralAvatarDataUrl
} from '../../providers/avatar'
import { XIcon } from './XIcon'
import './HoloCard.css'

/**
 * 20px Physical 3D Extruded Metallic Slab Core
 * Uses hollow metallic border rings (background: transparent) + 4 solid 20px perpendicular spines + 4 corner bridges.
 * Returned as a direct Fragment inside .card-3d-root so Chromium's preserve-3d compositor renders true 20px thickness at 90°/270° and never obscures the Front or Back faces.
 */
const CardSlabThickness: React.FC<{
  dna: GenerativeDNA;
  rotY: number;
  activeCode: string;
}> = ({ dna, rotY, activeCode }) => {
  // 21 hollow rim Z-slices spanning -9.2px to +9.2px
  const sliceCount = 21
  const slices = Array.from({ length: sliceCount }, (_, i) => {
    const z = -9.2 + (i / (sliceCount - 1)) * 18.4
    const absZ = Math.abs(z)
    const isOuterRim = absZ >= 6.8
    const isCenterGroove = absZ <= 2.0
    return { z, isOuterRim, isCenterGroove }
  })

  const specShift = Math.round(((Math.sin((rotY * Math.PI) / 180) + 1) / 2) * 100)

  const spineGradient = `linear-gradient(90deg, 
    ${dna.primaryColor} 0%, 
    #f8fafc 16%, 
    ${dna.secondaryColor} 32%, 
    #090d16 44%, 
    ${dna.tertiaryColor} 50%, 
    #090d16 56%, 
    ${dna.secondaryColor} 68%, 
    #f8fafc 84%, 
    ${dna.primaryColor} 100%)`

  return (
    <>
      {/* 21 Z-stacked hollow rounded-[30px] metallic rim rings (background is transparent so center is never blocked) */}
      {slices.map((s, idx) => (
        <div
          key={idx}
          className="card-slab-slice"
          style={{
            transform: `translateZ(${s.z.toFixed(2)}px)`,
            borderWidth: s.isCenterGroove ? '4px' : '5px',
            borderStyle: 'solid',
            borderColor: s.isCenterGroove
              ? '#090d16'
              : s.isOuterRim
              ? dna.primaryColor
              : dna.secondaryColor,
            boxShadow: s.isOuterRim
              ? `0 0 2px ${dna.primaryColor}`
              : undefined,
          }}
        />
      ))}

      {/* Right 20px Solid Metallic Spine (faces camera dead-on at 270°) */}
      <div
        className="card-spine-right flex items-center justify-center rounded-sm"
        style={{
          background: spineGradient,
          borderLeft: `1.5px solid ${dna.primaryColor}`,
          borderRight: `1.5px solid ${dna.primaryColor}`,
        }}
      >
        <span
          className="font-mono text-[7px] font-black tracking-[0.22em] text-white whitespace-nowrap select-none"
          style={{
            writingMode: 'vertical-rl',
            textShadow: '0 1px 2px rgba(0,0,0,0.95)',
          }}
        >
          X·PERSONA // {activeCode} // DNA #{dna.seed.toString(16).slice(0, 6).toUpperCase()}
        </span>
      </div>

      {/* Left 20px Solid Metallic Spine (faces camera dead-on at 90°) */}
      <div
        className="card-spine-left flex items-center justify-center rounded-sm"
        style={{
          background: spineGradient,
          borderLeft: `1.5px solid ${dna.primaryColor}`,
          borderRight: `1.5px solid ${dna.primaryColor}`,
        }}
      >
        <span
          className="font-mono text-[7px] font-black tracking-[0.22em] text-white whitespace-nowrap select-none"
          style={{
            writingMode: 'vertical-rl',
            textShadow: '0 1px 2px rgba(0,0,0,0.95)',
          }}
        >
          1-OF-1 FORGED SLAB // CHLADNI ({dna.chladniN.toFixed(1)},{dna.chladniM.toFixed(1)})
        </span>
      </div>

      {/* Top & Bottom 20px Solid Metallic Spines */}
      <div
        className="card-spine-top rounded-sm"
        style={{
          background: `linear-gradient(${specShift}deg, ${dna.primaryColor} 0%, #f8fafc 22%, #090d16 50%, #f8fafc 78%, ${dna.secondaryColor} 100%)`,
          borderTop: `1px solid ${dna.primaryColor}`,
          borderBottom: `1px solid ${dna.primaryColor}`,
        }}
      />
      <div
        className="card-spine-bottom rounded-sm"
        style={{
          background: `linear-gradient(${specShift}deg, ${dna.primaryColor} 0%, #f8fafc 22%, #090d16 50%, #f8fafc 78%, ${dna.secondaryColor} 100%)`,
          borderTop: `1px solid ${dna.primaryColor}`,
          borderBottom: `1px solid ${dna.primaryColor}`,
        }}
      />

      {/* 4 Rounded Corner Bevel Bridge Plates */}
      <div className="card-corner-tr rounded-sm" style={{ background: spineGradient }} />
      <div className="card-corner-br rounded-sm" style={{ background: spineGradient }} />
      <div className="card-corner-tl rounded-sm" style={{ background: spineGradient }} />
      <div className="card-corner-bl rounded-sm" style={{ background: spineGradient }} />
    </>
  )
}

const INNER_ICONS: Record<string, string> = {
  INTJ: '♟️',
  INTP: '🔮',
  ENTJ: '👑',
  ENTP: '⚡',
  INFJ: '👁️',
  INFP: '🦋',
  ENFJ: '☀️',
  ENFP: '🌈',
  ISTJ: '🏛️',
  ISFJ: '🛡️',
  ESTJ: '⚖️',
  ESFJ: '🌸',
  ISTP: '🔧',
  ISFP: '🎨',
  ESTP: '🏎️',
  ESFP: '🥂',
}

interface SingleCardRendererProps {
  slot: CardSlot;
  interactive?: boolean;
  onSelect?: () => void;
}

export const SingleProceduralCard: React.FC<SingleCardRendererProps> = ({
  slot,
  interactive = true,
  onSelect,
}) => {
  const {
    profile,
    persona,
    features,
    llmOutput,
    oejtsAnswers,
    oejtsScores,
    fusionPersona,
    ensureAvatarResolved,
  } = usePersonaStore()

  useEffect(() => {
    if (profile && (!profile.avatarUrl.startsWith('data:image/') || !profile.avatarFeatures)) {
      ensureAvatarResolved()
    }
  }, [profile, ensureAvatarResolved])

  const cardContainerRef = useRef<HTMLDivElement>(null)
  const cardElementRef = useRef<HTMLDivElement>(null)

  const [downloading, setDownloading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Free 360-degree orbital rotation state
  const [rot, setRot] = useState({ x: 0, y: 0 })
  const [glare, setGlare] = useState({ gx: 50, gy: 50, ha: 115, op: 0 })

  const isDraggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const velocityRef = useRef({ vx: 0, vy: 0 })
  const rotRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)

  // Keep rotRef synced
  useEffect(() => {
    rotRef.current = rot
  }, [rot])

  // Clean up animation frame
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const startInertia = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const step = () => {
      if (isDraggingRef.current) return
      velocityRef.current.vx *= 0.92
      velocityRef.current.vy *= 0.92

      if (
        Math.abs(velocityRef.current.vx) > 0.08 ||
        Math.abs(velocityRef.current.vy) > 0.08
      ) {
        const nextY = rotRef.current.y + velocityRef.current.vx
        const nextX = Math.max(-55, Math.min(55, rotRef.current.x + velocityRef.current.vy))
        rotRef.current = { x: nextX, y: nextY }
        setRot({ x: nextX, y: nextY })
        rafRef.current = requestAnimationFrame(step)
      } else {
        // Gently settle X tilt toward 0 while preserving Y inspect angle
        if (Math.abs(rotRef.current.x) > 0.5) {
          const nextX = rotRef.current.x * 0.9
          rotRef.current = { x: nextX, y: rotRef.current.y }
          setRot({ x: nextX, y: rotRef.current.y })
          rafRef.current = requestAnimationFrame(step)
        }
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || downloading) return
      isDraggingRef.current = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      velocityRef.current = { vx: 0, vy: 0 }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [interactive, downloading]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive || !cardContainerRef.current || downloading) return
      const rect = cardContainerRef.current.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top
      const gx = Math.max(0, Math.min(100, Math.round((localX / rect.width) * 100)))
      const gy = Math.max(0, Math.min(100, Math.round((localY / rect.height) * 100)))

      if (isDraggingRef.current) {
        const dx = e.clientX - lastPointerRef.current.x
        const dy = e.clientY - lastPointerRef.current.y
        lastPointerRef.current = { x: e.clientX, y: e.clientY }

        const deltaY = dx * 0.65
        const deltaX = -dy * 0.5

        velocityRef.current = { vx: deltaY * 0.5, vy: deltaX * 0.5 }

        const nextY = rotRef.current.y + deltaY
        const nextX = Math.max(-60, Math.min(60, rotRef.current.x + deltaX))
        rotRef.current = { x: nextX, y: nextY }
        setRot({ x: nextX, y: nextY })
        setGlare({
          gx,
          gy,
          ha: Math.round(nextY * 2 + 115) % 360,
          op: 0.9,
        })
      } else {
        // Subtle hover light response without overriding user's parked Y rotation
        const angle = Math.atan2(localY - rect.height / 2, localX - rect.width / 2) * (180 / Math.PI) + 180
        setGlare({
          gx,
          gy,
          ha: Math.round(angle),
          op: 0.65,
        })
      }
    },
    [interactive, downloading]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
          // ignore
        }
        startInertia()
      }
    },
    [interactive, startInertia]
  )

  const handlePointerLeave = useCallback(() => {
    if (!interactive) return
    if (!isDraggingRef.current) {
      setGlare((prev) => ({ ...prev, op: 0 }))
    }
  }, [interactive])

  // Double click smoothly snaps between Front (0 deg) and Back (180 deg)
  const handleDoubleClick = useCallback(() => {
    if (!interactive) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const normY = ((rotRef.current.y % 360) + 360) % 360
    const isCurrentlyBack = normY > 90 && normY < 270
    const targetY = isCurrentlyBack ? 0 : 180
    rotRef.current = { x: 0, y: targetY }
    setRot({ x: 0, y: targetY })
  }, [interactive])

  if (!profile || !persona) return null

  const outerArch = persona.archetype
  const innerType = oejtsScores?.type || 'INFP'
  const innerArch = INNER_ARCHETYPES[innerType] || INNER_ARCHETYPES.INFP
  const innerIcon = INNER_ICONS[innerType] || '🦋'

  const activeAxes =
    slot === 'outer'
      ? persona.axes
      : slot === 'inner' && oejtsScores
      ? {
          field: oejtsScores.ieNormalized,
          density: 100 - oejtsScores.snNormalized,
          temperature: 100 - oejtsScores.ftNormalized,
          rhythm: oejtsScores.jpNormalized,
        }
      : fusionPersona
      ? fusionPersona.fusedAxes
      : persona.axes

  const activeCode =
    slot === 'outer'
      ? persona.code
      : slot === 'inner'
      ? innerType
      : fusionPersona?.fusionCode || `${persona.code}×${innerType}`

  const avatarFeatures =
    profile.avatarFeatures || computeDeterministicAvatarFallback(profile.screenName)
  const fallbackSvgAvatar = generateProceduralAvatarDataUrl(profile.screenName, avatarFeatures)
  const resolvedAvatarUrl = profile.avatarUrl || fallbackSvgAvatar

  // Compute full Generative DNA from 70% Persona Axes + 30% Avatar Visual Features
  const dna = computeGenerativeDNA(slot, activeCode, activeAxes, profile.screenName, {
    nightOwl: features?.nightOwlIndex,
    burstiness: features?.burstinessFano,
    avgChars: features?.avgCharCount,
    consistency: fusionPersona?.consistencyIndex,
    avatarFeatures,
  })

  // Determine whether the viewer's current angle faces the front or back of the 3D plane
  const isShowingBack = Math.cos((rot.y * Math.PI) / 180) < 0

  const handleDownloadImage = async () => {
    if (!cardElementRef.current) return
    setDownloading(true)
    const savedRot = { ...rotRef.current }
    // Snap to flat front or flat back depending on whichever side user is currently viewing!
    const snapY = isShowingBack ? 180 : 0
    setRot({ x: 0, y: snapY })
    setGlare((prev) => ({ ...prev, op: 0 }))

    try {
      await new Promise((r) => setTimeout(r, 150))
      const dataUrl = await toPng(cardElementRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
      })
      const link = document.createElement('a')
      const sideLabel = isShowingBack ? 'BACK' : 'FRONT'
      link.download = `X-Persona-${slot.toUpperCase()}-${sideLabel}-${profile.screenName}-${activeCode}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to export card image', err)
      alert('卡牌图片导出失败，可直接截屏保存')
    } finally {
      setRot(savedRot)
      setDownloading(false)
    }
  }

  const shareState = {
    version: 1 as const,
    profile: {
      screenName: profile.screenName,
      name: profile.name,
      avatarUrl: profile.rawAvatarUrl || (profile.avatarUrl.startsWith('http') ? profile.avatarUrl : ''),
      followers: profile.followers,
      statusesCount: profile.statusesCount,
    },
    axes: persona.axes,
    archetypeCode: persona.code,
    llmOutput: llmOutput || undefined,
    oejts: oejtsScores
      ? {
          type: oejtsScores.type,
          consistencyIndex: fusionPersona?.consistencyIndex ?? 80,
          ieNormalized: oejtsScores.ieNormalized,
          snNormalized: oejtsScores.snNormalized,
          ftNormalized: oejtsScores.ftNormalized,
          jpNormalized: oejtsScores.jpNormalized,
        }
      : undefined,
    isFused: Boolean(fusionPersona),
  }
  const shareUrl = typeof window !== 'undefined' ? buildShareUrl(shareState) : ''

  const shareText =
    slot === 'outer'
      ? `我在 X 锻造了独一无二的【表世界·赛博面具卡：${outerArch.nameZh} (${persona.code})】🎴 快来看看你的推文人格卡牌：`
      : slot === 'inner'
      ? `我在 X 觉醒了【里世界·潜意识真我卡：${innerArch.nameZh} (${innerType})】🔮 看看你的内外反差：`
      : `我将表里双界人格融合，炼成了传说级【${fusionPersona?.titleZh} (${activeCode})】✨ 知行同步率 ${fusionPersona?.consistencyIndex}%：`

  const tweetIntentUrl = buildTweetIntentUrl(shareText, shareUrl)

  const handleCopyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const cardTags =
    slot === 'outer'
      ? ([
          features ? `夜猫 ${features.nightOwlIndex}%` : null,
          features ? `回复 ${features.replyRate}%` : null,
          features ? `均字 ${features.avgCharCount}` : null,
          llmOutput?.spiritAnimal?.name ? `${llmOutput.spiritAnimal.name}` : null,
        ].filter(Boolean) as string[])
      : slot === 'inner'
      ? [
          innerArch.arcanaZh,
          oejtsScores && oejtsScores.ieNormalized > 50 ? '外倾共振' : '内倾深潜',
          oejtsScores && oejtsScores.snNormalized > 50 ? '直觉构建' : '实感体验',
        ]
      : [
          fusionPersona?.alchemyClassZh || '双界同盟',
          `同步率 ${fusionPersona?.consistencyIndex ?? 80}%`,
          `混沌熵 ${fusionPersona?.entropyScore ?? 20}`,
        ]

  const isLight = dna.isLightTheme
  const panelBg = isLight ? 'rgba(255, 255, 255, 0.78)' : 'rgba(8, 12, 24, 0.74)'
  const panelBorder = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.16)'
  const cosY = Math.cos((rot.y * Math.PI) / 180)
  const isEdgeOn = Math.abs(cosY) < 0.14

  return (
    <div className="flex flex-col items-center">
      {/* 3D FREE-ORBIT STAGE */}
      <div
        ref={cardContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={handleDoubleClick}
        onClick={onSelect}
        className={`card-perspective-container select-none ${
          interactive ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:scale-[1.02] transition-transform'
        }`}
      >
        <div
          ref={cardElementRef}
          style={
            {
              transform: downloading
                ? 'none'
                : `rotateX(${rot.x.toFixed(2)}deg) rotateY(${rot.y.toFixed(2)}deg)`,
              '--gx': `${glare.gx}%`,
              '--gy': `${glare.gy}%`,
              '--ha': `${glare.ha}deg`,
              '--op': glare.op,
              '--card-glow': dna.borderColor,
            } as React.CSSProperties
          }
          className="card-3d-root relative w-[348px] sm:w-[380px] h-[575px] rounded-[30px]"
        >
          {/* 20px Physical 3D Extruded Metallic Slab Core (Direct fragment children of preserve-3d root) */}
          {!downloading && (
            <CardSlabThickness dna={dna} rotY={rot.y} activeCode={activeCode} />
          )}

          {/* ==================== FRONT FACE (Z = +10px) ==================== */}
          <div
            className="card-face-front absolute inset-0 w-full h-full rounded-[30px] p-6 flex flex-col justify-between overflow-hidden"
            style={{
              border: `2.5px solid ${dna.borderColor}`,
              color: dna.textColor,
              display: downloading && isShowingBack ? 'none' : 'flex',
              transform: downloading ? 'none' : undefined,
            }}
          >
            {/* Full-Bleed Generative Canvas Shader */}
            <ProceduralPatternCanvas dna={dna} axes={activeAxes} isBack={false} />

            {/* Ornamental Architectural SVG Border */}
            <ProceduralFrameOverlay dna={dna} />

            {/* Specular Glare & Iridescent Shimmer inside 2D face */}
            <div className="card-glare absolute inset-0 rounded-[30px] z-30 pointer-events-none" />
            <div className="holo-shimmer-aurora absolute inset-0 rounded-[30px] z-20 pointer-events-none" />

            {/* TOP BAR */}
            <div className="relative z-10 flex items-center justify-between border-b pb-2" style={{ borderColor: panelBorder }}>
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider">
                <XIcon className="w-3 h-3" />
                <span>
                  {slot === 'outer'
                    ? 'WORLD I · 赛博面具'
                    : slot === 'inner'
                    ? 'WORLD II · 潜意识真我'
                    : 'WORLD III · 双界炼成'}
                </span>
              </div>
              <span
                className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold"
                style={{
                  backgroundColor: panelBg,
                  color: dna.primaryColor,
                  border: `1px solid ${dna.borderColor}`,
                }}
              >
                {dna.paletteName.split(' · ')[0]}
              </span>
            </div>

            {/* USER IDENTITY ROW + AVATAR COLOR WEIGHT SWATCHES */}
            <div className="relative z-10 flex items-center justify-between gap-2 my-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={resolvedAvatarUrl}
                    alt={profile.name}
                    onError={(e) => {
                      const target = e.currentTarget
                      if (target.src !== fallbackSvgAvatar) {
                        target.src = fallbackSvgAvatar
                      }
                    }}
                    className="w-11 h-11 rounded-xl object-cover shadow-md"
                    style={{ border: `2px solid ${dna.primaryColor}` }}
                  />
                  {/* Avatar Palette Extraction Dot Ring */}
                  <div className="absolute -bottom-1 -right-1 flex items-center -space-x-1 bg-slate-950/90 px-1 py-0.5 rounded-full border border-white/20 shadow">
                    {dna.avatarSwatches.slice(0, 3).map((hex, idx) => (
                      <span
                        key={idx}
                        className="w-2 h-2 rounded-full border border-black/40"
                        style={{ backgroundColor: hex }}
                        title={`头像提取色权重 #${idx + 1}: ${hex}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm truncate leading-tight">
                    {profile.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: dna.mutedTextColor }}>
                    <span className="truncate">@{profile.screenName}</span>
                    <span
                      className="px-1 py-0.2 rounded text-[8px] font-bold shrink-0"
                      style={{
                        backgroundColor: panelBg,
                        color: dna.primaryColor,
                        border: `1px solid ${panelBorder}`,
                      }}
                      title="头像主色调、明暗度、纹理复杂度已作为 30% 权重注入卡牌生成管线"
                    >
                      头像权重 30%
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-[9px] shrink-0" style={{ color: dna.mutedTextColor }}>
                <div>DNA #{dna.seed.toString(16).slice(0, 6).toUpperCase()}</div>
                <div className="font-bold" style={{ color: dna.primaryColor }}>
                  [{activeCode}]
                </div>
              </div>
            </div>

            {/* GENERATIVE SPIROGRAPH / SACRED SIGIL CENTERPIECE */}
            <div className="relative z-10 flex flex-col items-center text-center my-0.5">
              <ProceduralSigilCenterpiece
                dna={dna}
                axes={activeAxes}
                secondaryAxes={
                  slot === 'fusion' ? fusionPersona?.innerAxesAsOuterScale : undefined
                }
                badgeIcon={slot === 'inner' ? innerIcon : outerArch.badgeIcon}
                secondaryIcon={slot === 'fusion' ? innerIcon : undefined}
                avatarUrl={resolvedAvatarUrl}
              />

              <h2 className="text-2xl font-black tracking-tight mt-0.5">
                {slot === 'outer'
                  ? outerArch.nameZh
                  : slot === 'inner'
                  ? innerArch.nameZh
                  : fusionPersona?.titleZh}
              </h2>
              <div className="text-[10px] font-mono font-semibold" style={{ color: dna.mutedTextColor }}>
                {slot === 'outer'
                  ? `${outerArch.nameEn} · SYM-${dna.symmetryOrder}`
                  : slot === 'inner'
                  ? `${innerArch.nameEn} · ${innerArch.arcanaZh}`
                  : `${fusionPersona?.titleEn} · ${fusionPersona?.rarity}`}
              </div>
            </div>

            {/* SIGNATURE QUOTE OR AWAKENED PASSIVE (no backdrop-filter so preserve-3d never flattens) */}
            <div
              className="relative z-10 my-1.5 p-3 rounded-2xl text-center"
              style={{ backgroundColor: panelBg, border: `1px solid ${panelBorder}` }}
            >
              {slot === 'fusion' && fusionPersona ? (
                <div>
                  <div
                    className="text-[10px] font-bold mb-0.5 font-mono"
                    style={{ color: dna.primaryColor }}
                  >
                    ⚡ 觉醒被动 {fusionPersona.passiveNameZh}
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {fusionPersona.passiveDescZh}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] font-medium leading-relaxed italic">
                  “
                  {slot === 'outer'
                    ? llmOutput?.roast || outerArch.taglineZh
                    : innerArch.taglineZh}
                  ”
                </p>
              )}
            </div>

            {/* TRAIT TAGS */}
            <div className="relative z-10 flex flex-wrap justify-center gap-1.5 my-1">
              {cardTags.map((t, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold"
                  style={{
                    backgroundColor: panelBg,
                    border: `1px solid ${panelBorder}`,
                    color: dna.textColor,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>

            {/* 4 PARAMETERIZED DIMENSION BARS */}
            <div
              className="relative z-10 space-y-1 pt-2 border-t text-[10px] font-mono"
              style={{ borderColor: panelBorder }}
            >
              {[
                {
                  left: slot === 'inner' ? '内倾 I' : '广播 B',
                  right: slot === 'inner' ? 'E 外倾' : 'C 对话',
                  val: activeAxes.field,
                },
                {
                  left: slot === 'inner' ? '直觉 N' : '长文 E',
                  right: slot === 'inner' ? 'S 实感' : 'S 碎片',
                  val: activeAxes.density,
                },
                {
                  left: slot === 'inner' ? '理性 T' : '冷静 A',
                  right: slot === 'inner' ? 'F 情感' : 'F 情绪',
                  val: activeAxes.temperature,
                },
                {
                  left: slot === 'inner' ? '判断 J' : '规律 K',
                  right: slot === 'inner' ? 'P 知觉' : 'D 随性',
                  val: activeAxes.rhythm,
                },
              ].map((row, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span style={{ fontWeight: row.val < 50 ? 800 : 400 }}>{row.left}</span>
                  <div
                    className="w-36 h-1.5 rounded-full overflow-hidden mx-2"
                    style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${row.val}%`,
                        background: `linear-gradient(90deg, ${dna.primaryColor}, ${dna.secondaryColor})`,
                      }}
                    />
                  </div>
                  <span style={{ fontWeight: row.val >= 50 ? 800 : 400 }}>{row.right}</span>
                </div>
              ))}
            </div>

            {/* FOOTER */}
            <div
              className="relative z-10 pt-1.5 border-t flex items-center justify-between text-[9px] font-mono"
              style={{ borderColor: panelBorder, color: dna.mutedTextColor }}
            >
              <span>CHLADNI ({dna.chladniN.toFixed(1)}, {dna.chladniM.toFixed(1)})</span>
              <span>1 OF 1 PROCEDURAL</span>
              <span>#{activeCode}</span>
            </div>
          </div>

          {/* ==================== BACK FACE (Z = -10px, VISIBLE PAST 90 DEG) ==================== */}
          <div
            className="card-face-back absolute inset-0 w-full h-full rounded-[30px] p-6 flex flex-col justify-between overflow-hidden"
            style={{
              border: `2.5px solid ${dna.borderColor}`,
              color: dna.textColor,
              display: downloading && !isShowingBack ? 'none' : 'flex',
              transform: downloading ? 'none' : undefined,
            }}
          >
            {/* Full-Bleed 1-of-1 Generative Card Back Artwork (Chladni Damascus + Guilloché Rosettes + Lissajous + 24h Sunburst) */}
            <ProceduralPatternCanvas
              dna={dna}
              axes={activeAxes}
              isBack={true}
              hourlyDistribution={features?.hourlyDistribution}
            />
            <ProceduralFrameOverlay dna={dna} />

            {/* Specular Glare & Iridescent Shimmer inside 2D back face */}
            <div className="card-glare absolute inset-0 rounded-[30px] z-30 pointer-events-none" />
            <div className="holo-shimmer-aurora absolute inset-0 rounded-[30px] z-20 pointer-events-none" />

            {/* BACK TOP HEADER */}
            <div
              className="relative z-10 flex items-center justify-between border-b pb-2"
              style={{ borderColor: panelBorder }}
            >
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
                <Cpu className="w-3.5 h-3.5" style={{ color: dna.primaryColor }} />
                <span>
                  {slot === 'outer'
                    ? '1-OF-1 CHLADNI & CIRCADIAN TOTEM'
                    : slot === 'inner'
                    ? '1-OF-1 32-RAY SOUL MANDALA'
                    : '1-OF-1 DUAL-WORLD ALCHEMICAL SEAL'}
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold" style={{ color: dna.primaryColor }}>
                SEED #{dna.seed.toString(16).slice(0, 6).toUpperCase()}
              </span>
            </div>

            {/* CENTERPIECE 1-OF-1 PROCEDURAL BACK MANDALA / TOTEM */}
            <div className="relative z-10 my-1 flex flex-col items-center justify-center">
              <div
                className="p-3 rounded-full"
                style={{
                  backgroundColor: isLight ? 'rgba(255, 255, 255, 0.55)' : 'rgba(8, 12, 24, 0.55)',
                  border: `1.5px solid ${dna.borderColor}`,
                }}
              >
                <ProceduralBackTotem
                  variant={slot}
                  axes={activeAxes}
                  secondaryAxes={
                    slot === 'fusion' ? fusionPersona?.innerAxesAsOuterScale : undefined
                  }
                  hourlyDistribution={features?.hourlyDistribution}
                  oejtsAnswers={oejtsAnswers}
                  styleSpec={{
                    hue1: 280,
                    hue2: 190,
                    hue3: 45,
                    bgGradientCss: '',
                    borderColorCss: dna.borderColor,
                    accentColorHex: dna.primaryColor,
                    secondaryColorHex: dna.secondaryColor,
                    holoClass: '',
                    patternSeed: dna.seed,
                  }}
                />
              </div>
              <div className="text-center mt-2">
                <div className="font-mono text-xs font-bold">
                  {slot === 'outer'
                    ? '专属克拉尼驻波 · 24h生物钟星轨图腾'
                    : slot === 'inner'
                    ? '专属旋轮曼陀罗 · 32道潜意识光谱图腾'
                    : '专属双界干涉场 · 炼金合成封印阵'}
                </div>
                <div className="text-[9px] font-mono mt-0.5" style={{ color: dna.mutedTextColor }}>
                  Ψ(x,y) = {dna.chladniA.toFixed(2)}·sin({dna.chladniN.toFixed(1)}πx)sin({dna.chladniM.toFixed(1)}πy) + {dna.chladniB.toFixed(2)}·cos({dna.chladniM.toFixed(1)}πx)cos({dna.chladniN.toFixed(1)}πy)
                </div>
              </div>
            </div>

            {/* ENGRAVED GENERATIVE SIGNATURE & DATA PLAQUE */}
            <div className="relative z-10 space-y-2">
              {/* Mathematical Pattern DNA Bar */}
              <div
                className="px-3 py-2 rounded-xl flex items-center justify-between text-[10px] font-mono"
                style={{ backgroundColor: panelBg, border: `1px solid ${panelBorder}` }}
              >
                <div className="flex items-center gap-1.5">
                  <span style={{ color: dna.mutedTextColor }}>头像色权(30%):</span>
                  <div className="flex items-center gap-1">
                    {dna.avatarSwatches.slice(0, 4).map((hex, i) => (
                      <span
                        key={i}
                        className="w-3 h-3 rounded-full border border-black/30"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
                <span style={{ color: dna.primaryColor }} className="font-bold">
                  SYM-{dna.symmetryOrder} · LISSAJOUS {dna.lissajousKx}:{dna.lissajousKy}
                </span>
              </div>

              {slot === 'outer' && features && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: panelBg, border: `1px solid ${panelBorder}` }}
                  >
                    <div className="text-[10px]" style={{ color: dna.mutedTextColor }}>
                      脉冲爆发度 (Fano)
                    </div>
                    <div className="text-sm font-bold font-mono">{features.burstinessFano}</div>
                  </div>
                  <div
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: panelBg, border: `1px solid ${panelBorder}` }}
                  >
                    <div className="text-[10px]" style={{ color: dna.mutedTextColor }}>
                      深夜活跃 (0-6点)
                    </div>
                    <div className="text-sm font-bold font-mono">{features.nightOwlIndex}%</div>
                  </div>
                  <div
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: panelBg, border: `1px solid ${panelBorder}` }}
                  >
                    <div className="text-[10px]" style={{ color: dna.mutedTextColor }}>
                      单篇平均字数
                    </div>
                    <div className="text-sm font-bold font-mono">{features.avgCharCount} 字</div>
                  </div>
                  <div
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: panelBg, border: `1px solid ${panelBorder}` }}
                  >
                    <div className="text-[10px]" style={{ color: dna.mutedTextColor }}>
                      原创 / 回复占比
                    </div>
                    <div className="text-sm font-bold font-mono">
                      {features.originalRate}% / {features.replyRate}%
                    </div>
                  </div>
                </div>
              )}

              {slot === 'inner' && (
                <div className="space-y-1.5 text-xs">
                  <div
                    className="p-2.5 rounded-xl"
                    style={{ backgroundColor: panelBg, border: `1px solid ${panelBorder}` }}
                  >
                    <div className="text-[10px] font-mono font-bold mb-0.5" style={{ color: dna.primaryColor }}>
                      ✦ 灵魂核心渴望 (Core Desire)
                    </div>
                    <div className="text-[11px]">{innerArch.coreDesireZh}</div>
                  </div>
                  <div
                    className="p-2.5 rounded-xl"
                    style={{ backgroundColor: panelBg, border: `1px solid ${panelBorder}` }}
                  >
                    <div className="text-[10px] font-mono font-bold mb-0.5" style={{ color: dna.secondaryColor }}>
                      🌑 潜意识暗影 (Shadow Side)
                    </div>
                    <div className="text-[11px]">{innerArch.shadowZh}</div>
                  </div>
                </div>
              )}

              {slot === 'fusion' && fusionPersona && (
                <div
                  className="p-3 rounded-2xl space-y-1 text-xs"
                  style={{ backgroundColor: panelBg, border: `1px solid ${panelBorder}` }}
                >
                  <div className="flex items-center justify-between font-mono text-[11px] font-bold">
                    <span style={{ color: dna.primaryColor }}>
                      ⚗️ [{persona.code}] ⊗ [{innerType}]
                    </span>
                    <span style={{ color: dna.secondaryColor }}>
                      同步率 {fusionPersona.consistencyIndex}%
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{fusionPersona.loreZh}</p>
                </div>
              )}
            </div>

            {/* BACK FOOTER */}
            <div
              className="relative z-10 pt-1.5 border-t flex items-center justify-between text-[9px] font-mono"
              style={{ borderColor: panelBorder, color: dna.mutedTextColor }}
            >
              <span>1-OF-1 PROCEDURAL BACKPRINT</span>
              <span>@{profile.screenName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 360 DRAG TELEMETRY & EXPORT CONTROLS */}
      {interactive && (
        <div className="w-full max-w-[380px] mt-4 space-y-3">
          {/* Interactive Drag Telemetry Bar */}
          <div className="px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 text-purple-300">
              <Move3d className="w-3.5 h-3.5" />
              <span>按住卡牌任意拖动 360° 观察正反与侧边</span>
            </span>
            <span className="text-slate-400 font-bold">
              {isEdgeOn ? '侧面 · 20mm金属脊' : isShowingBack ? '背面 · 专属图腾' : '正面 · 角色卡'} ({Math.round(((rot.y % 360) + 360) % 360)}°)
            </span>
          </div>

          {/* Export & Share Buttons */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {downloading
                  ? '正在渲染高清卡牌...'
                  : `保存当前${isShowingBack ? '卡背' : '卡面'} (PNG)`}
              </span>
            </button>

            <a
              href={tweetIntentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <XIcon className="w-3.5 h-3.5" />
              <span>晒卡</span>
            </a>

            <button
              onClick={handleCopyLink}
              className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl flex items-center text-xs transition-colors cursor-pointer"
              title="复制链接"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const PersonaCard: React.FC = () => {
  const {
    profile,
    persona,
    llmOutput,
    oejtsScores,
    fusionPersona,
    selectedCardSlot,
    isFused,
    isFusingAnimation,
    showTrinityGallery,
    setSelectedCardSlot,
    setShowTrinityGallery,
    setActiveTab,
    triggerFusion,
  } = usePersonaStore()

  const [showDetails, setShowDetails] = useState(false)

  if (!persona || !profile) return null

  const hasInnerCard = Boolean(oejtsScores)
  const canFuse = hasInnerCard && !isFused

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-2 flex flex-col items-center">
      {/* ==================== 3-CARD DECK SLOT SELECTOR ==================== */}
      <div className="w-full max-w-2xl mb-5">
        <div className="grid grid-cols-3 gap-2.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          {/* SLOT 1: OUTER CYBER CARD */}
          <button
            onClick={() => setSelectedCardSlot('outer')}
            className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
              selectedCardSlot === 'outer' && !showTrinityGallery
                ? 'bg-purple-950/60 border-purple-500/60 shadow-md'
                : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-purple-400 mb-0.5">
              <span>CARD I · 表世界</span>
              <span>✓ 已解锁</span>
            </div>
            <div className="font-bold text-xs text-white truncate">
              {persona.archetype.badgeIcon} {persona.archetype.nameZh}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              推文人格 [{persona.code}]
            </div>
          </button>

          {/* SLOT 2: INNER SOUL CARD */}
          <button
            onClick={() => {
              if (hasInnerCard) {
                setSelectedCardSlot('inner')
              } else {
                setActiveTab('oejts')
              }
            }}
            className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
              selectedCardSlot === 'inner' && !showTrinityGallery
                ? 'bg-cyan-950/60 border-cyan-500/60 shadow-md'
                : hasInnerCard
                ? 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                : 'bg-slate-950/30 border-dashed border-slate-800 hover:border-purple-500/50'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 mb-0.5">
              <span>CARD II · 里世界</span>
              {hasInnerCard ? (
                <span>✓ 已解锁</span>
              ) : (
                <span className="flex items-center gap-0.5 text-slate-500">
                  <Lock className="w-2.5 h-2.5" /> 待觉醒
                </span>
              )}
            </div>
            {hasInnerCard && oejtsScores ? (
              <>
                <div className="font-bold text-xs text-white truncate">
                  {INNER_ICONS[oejtsScores.type] || '🦋'}{' '}
                  {INNER_ARCHETYPES[oejtsScores.type]?.nameZh || '潜意识真我'}
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  内心自评 [{oejtsScores.type}]
                </div>
              </>
            ) : (
              <>
                <div className="font-bold text-xs text-slate-300 truncate">
                  点击测 32 题自评
                </div>
                <div className="text-[10px] text-purple-400">
                  铸造第 2 张真我卡牌 →
                </div>
              </>
            )}
          </button>

          {/* SLOT 3: ALCHEMICAL FUSION CARD */}
          <button
            onClick={() => {
              if (isFused) {
                setSelectedCardSlot('fusion')
              } else if (canFuse) {
                triggerFusion()
              } else {
                setActiveTab('oejts')
              }
            }}
            className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
              selectedCardSlot === 'fusion' && !showTrinityGallery
                ? 'bg-amber-950/60 border-amber-500/70 shadow-md'
                : isFused
                ? 'bg-slate-950/50 border-amber-500/30 hover:border-amber-400'
                : canFuse
                ? 'bg-gradient-to-r from-purple-950/80 via-amber-950/60 to-cyan-950/80 border-amber-400/80 animate-pulse'
                : 'bg-slate-950/20 border-dashed border-slate-800/60 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 mb-0.5">
              <span>CARD III · 双界融合</span>
              {isFused ? (
                <span>✦ UR神装</span>
              ) : canFuse ? (
                <span className="text-amber-300 font-bold">⚡ 可融合!</span>
              ) : (
                <span className="flex items-center gap-0.5 text-slate-500">
                  <Lock className="w-2.5 h-2.5" /> 锁定
                </span>
              )}
            </div>
            {isFused && fusionPersona ? (
              <>
                <div className="font-bold text-xs text-amber-200 truncate">
                  ⚡ {fusionPersona.titleZh}
                </div>
                <div className="text-[10px] font-mono text-amber-400/90">
                  [{fusionPersona.fusionCode}] · 同步 {fusionPersona.consistencyIndex}%
                </div>
              </>
            ) : canFuse ? (
              <>
                <div className="font-bold text-xs text-amber-200 truncate">
                  点击启动【双界融合】
                </div>
                <div className="text-[10px] text-amber-300/90">
                  表里双卡共鸣合成 →
                </div>
              </>
            ) : (
              <>
                <div className="font-bold text-xs text-slate-400 truncate">
                  未知融合形态
                </div>
                <div className="text-[10px] text-slate-500">
                  集齐表里两张卡后解锁
                </div>
              </>
            )}
          </button>
        </div>

        {/* Sub-bar */}
        <div className="flex items-center justify-between mt-2 px-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>克拉尼驻波(Chladni) + 旋轮线(Hypotrochoid) 实时参数化生成</span>
          </div>

          {hasInnerCard && (
            <button
              onClick={() => setShowTrinityGallery(!showTrinityGallery)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition-colors"
            >
              {showTrinityGallery ? (
                <>
                  <Square className="w-3.5 h-3.5 text-purple-400" />
                  <span>返回单卡360°把玩</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isFused ? '三卡同屏展柜' : '双卡同屏对比'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ==================== FUSION RITUAL OVERLAY ==================== */}
      {isFusingAnimation && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400 animate-spin" />
            <div className="absolute inset-4 rounded-full border-2 border-purple-500 animate-ping opacity-40" />
            <Flame className="w-16 h-16 text-amber-400 animate-bounce" />
          </div>
          <h3 className="text-2xl font-black text-white mt-6 tracking-wider">
            正在融合【表世界·{persona.code}】与【里世界·{oejtsScores?.type}】...
          </h3>
          <p className="text-xs font-mono text-amber-300 mt-2">
            GENERATING CHLADNI INTERFERENCE & SPIROGRAPH TOTEM
          </p>
        </div>
      )}

      {/* ==================== PROMINENT FUSION CALLOUT ==================== */}
      {canFuse && !isFusingAnimation && (
        <div className="w-full max-w-md mb-5 p-4 rounded-2xl bg-gradient-to-r from-purple-950/90 via-amber-950/80 to-cyan-950/90 border border-amber-400/60 shadow-2xl flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>表里双界卡牌已集齐！</span>
            </div>
            <p className="text-[11px] text-slate-200 mt-0.5">
              将你的赛博面具 [{persona.code}] 与真实本心 [{oejtsScores?.type}] 融合，锻造第 3 张专属 UR 卡牌
            </p>
          </div>
          <button
            onClick={triggerFusion}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shrink-0 shadow-lg shadow-amber-500/30 cursor-pointer transition-transform hover:scale-105"
          >
            ⚡ 立即融合
          </button>
        </div>
      )}

      {/* ==================== MAIN DISPLAY ==================== */}
      {showTrinityGallery ? (
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-start justify-items-center py-2">
          <div className="flex flex-col items-center">
            <div className="text-xs font-mono text-purple-400 font-bold mb-2">
              【卡 I · 表世界赛博面具】
            </div>
            <SingleProceduralCard
              slot="outer"
              interactive={false}
              onSelect={() => setSelectedCardSlot('outer')}
            />
          </div>

          {hasInnerCard && (
            <div className="flex flex-col items-center">
              <div className="text-xs font-mono text-cyan-400 font-bold mb-2">
                【卡 II · 里世界潜意识真我】
              </div>
              <SingleProceduralCard
                slot="inner"
                interactive={false}
                onSelect={() => setSelectedCardSlot('inner')}
              />
            </div>
          )}

          {isFused ? (
            <div className="flex flex-col items-center">
              <div className="text-xs font-mono text-amber-400 font-bold mb-2">
                【卡 III · 双界炼成融合卡】
              </div>
              <SingleProceduralCard
                slot="fusion"
                interactive={false}
                onSelect={() => setSelectedCardSlot('fusion')}
              />
            </div>
          ) : (
            <div className="w-[348px] h-[575px] rounded-[30px] border-2 border-dashed border-amber-500/40 bg-slate-900/40 flex flex-col items-center justify-center p-8 text-center">
              <Flame className="w-12 h-12 text-amber-400 mb-3 animate-pulse" />
              <div className="text-base font-bold text-white mb-1">
                第 3 张：双界融合卡待锻造
              </div>
              <p className="text-xs text-slate-400 mb-5">
                融合 [{persona.code}] 与 [{oejtsScores?.type}]，解锁双多边形干涉星盘与觉醒被动技
              </p>
              <button
                onClick={triggerFusion}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer"
              >
                ⚡ 启动双界融合
              </button>
            </div>
          )}
        </div>
      ) : (
        <SingleProceduralCard slot={selectedCardSlot} interactive={true} />
      )}

      {/* ==================== COLLAPSIBLE RAW STATS DRAWER ==================== */}
      <div className="w-full max-w-[380px] mt-5">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center justify-between transition-colors cursor-pointer"
        >
          <span>查看底层推文特征与特质详情</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="mt-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-4">
            <div>
              <div className="text-slate-400 font-semibold mb-1 text-[11px]">✨ 表世界优势：</div>
              <ul className="text-slate-300 space-y-1 pl-3 list-disc text-[11px]">
                {(llmOutput?.strengths || persona.archetype.strengthsZh).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-slate-400 font-semibold mb-1 text-[11px]">🔥 赛博槽点：</div>
              <ul className="text-slate-300 space-y-1 pl-3 list-disc text-[11px]">
                {(llmOutput?.redFlags || persona.archetype.roastsZh).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
