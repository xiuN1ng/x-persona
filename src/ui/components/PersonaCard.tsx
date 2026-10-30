import React, { useRef, useState, useCallback } from 'react'
import {
  Download,
  Check,
  Copy,
  Rotate3d,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
  Flame,
  LayoutGrid,
  Square,
  Cpu
} from 'lucide-react'
import { toPng } from 'html-to-image'
import { usePersonaStore, type CardSlot } from '../../store/usePersonaStore'
import { buildShareUrl, buildTweetIntentUrl } from '../../share/url-state'
import { INNER_ARCHETYPES } from '../../persona/inner-archetypes'
import {
  computeProceduralCardStyle,
  ProceduralFrontTotem,
  ProceduralBackTotem
} from './ProceduralArt'
import { XIcon } from './XIcon'
import './HoloCard.css'

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
  } = usePersonaStore()

  const cardContainerRef = useRef<HTMLDivElement>(null)
  const cardElementRef = useRef<HTMLDivElement>(null)

  const [isFlipped, setIsFlipped] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const [styleVars, setStyleVars] = useState<React.CSSProperties>({
    transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg)',
    '--rx': '0deg',
    '--ry': '0deg',
    '--gx': '50%',
    '--gy': '50%',
    '--ha': '115deg',
    '--op': 0,
  } as React.CSSProperties)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !cardContainerRef.current || downloading) return
      const rect = cardContainerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const normX = x / rect.width - 0.5
      const normY = y / rect.height - 0.5

      const rotX = -normY * 22
      const rotY = normX * 22
      const angle = Math.atan2(normY, normX) * (180 / Math.PI) + 180

      setStyleVars({
        transform: `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`,
        '--rx': `${rotX}deg`,
        '--ry': `${rotY}deg`,
        '--gx': `${Math.round((x / rect.width) * 100)}%`,
        '--gy': `${Math.round((y / rect.height) * 100)}%`,
        '--ha': `${Math.round(angle)}deg`,
        '--op': 0.88,
      } as React.CSSProperties)
    },
    [interactive, downloading]
  )

  const handleMouseLeave = useCallback(() => {
    if (!interactive) return
    setStyleVars({
      transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg)',
      '--rx': '0deg',
      '--ry': '0deg',
      '--gx': '50%',
      '--gy': '50%',
      '--ha': '115deg',
      '--op': 0,
    } as React.CSSProperties)
  }, [interactive])

  if (!profile || !persona) return null

  // Resolve card data by slot
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

  // Deterministically compute card shader & palette purely from persona data
  const styleSpec = computeProceduralCardStyle(
    slot,
    activeCode,
    activeAxes,
    profile.screenName
  )

  const handleDownloadImage = async () => {
    if (!cardElementRef.current) return
    setDownloading(true)
    setStyleVars({
      transform: 'none',
      '--op': 0,
    } as React.CSSProperties)

    try {
      await new Promise((r) => setTimeout(r, 120))
      const dataUrl = await toPng(cardElementRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
      })
      const link = document.createElement('a')
      link.download = `X-Persona-${slot.toUpperCase()}-${profile.screenName}-${activeCode}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to export card image', err)
      alert('卡牌图片导出失败，可直接截屏保存')
    } finally {
      setDownloading(false)
    }
  }

  const shareState = {
    version: 1 as const,
    profile: {
      screenName: profile.screenName,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
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
      ? `我在 X 锻造了【表世界·赛博面具卡：${outerArch.nameZh} (${persona.code})】🎴 快来看看你的推文人格卡牌：`
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

  // Card tags by slot
  const cardTags =
    slot === 'outer'
      ? ([
          features ? `夜猫率 ${features.nightOwlIndex}%` : null,
          features ? `回复比 ${features.replyRate}%` : null,
          features && features.avgCharCount > 140 ? '深度长文派' : '高频短刀流',
          llmOutput?.spiritAnimal?.name ? `灵兽:${llmOutput.spiritAnimal.name}` : null,
        ].filter(Boolean) as string[])
      : slot === 'inner'
      ? [
          innerArch.arcanaZh,
          oejtsScores && oejtsScores.ieNormalized > 50 ? '外倾能量源' : '内倾独处源',
          oejtsScores && oejtsScores.snNormalized > 50 ? '直觉构建者' : '实感体验派',
        ]
      : [
          fusionPersona?.alchemyClassZh || '双界同盟',
          `知行同步 ${fusionPersona?.consistencyIndex ?? 80}%`,
          `混沌熵值 ${fusionPersona?.entropyScore ?? 20}`,
        ]

  return (
    <div className="flex flex-col items-center">
      {/* 3D PERSPECTIVE WRAPPER */}
      <div
        ref={cardContainerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onSelect}
        className={`card-perspective-container select-none ${
          interactive ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:scale-[1.02] transition-transform'
        }`}
      >
        <div
          ref={cardElementRef}
          style={styleVars}
          className="card-3d-root relative w-[345px] sm:w-[380px] rounded-[32px] card-metallic-bevel"
        >
          {/* Dynamic Glare & Procedural Holo Layer */}
          <div className="card-glare absolute inset-0 rounded-[32px] z-30 pointer-events-none" />
          <div
            className={`${styleSpec.holoClass} absolute inset-0 rounded-[32px] z-20 pointer-events-none`}
          />

          {/* 3D FLIP CONTAINER */}
          <div className={`card-flip-inner relative w-full ${isFlipped ? 'card-flip-flipped' : ''}`}>
            {/* ==================== CARD FRONT FACE ==================== */}
            <div
              className="card-face-front relative w-full rounded-[32px] p-6 sm:p-7 shadow-2xl overflow-hidden flex flex-col justify-between"
              style={{
                minHeight: '568px',
                background: styleSpec.bgGradientCss,
                border: `1.5px solid ${styleSpec.borderColorCss}`,
              }}
            >
              {/* Procedural geometric lattice watermark */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff0c_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

              {/* TOP BAR: WORLD & PROCEDURAL SEED */}
              <div className="card-layer-content flex items-center justify-between border-b border-white/15 pb-2.5 mb-3">
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-slate-200">
                  <XIcon className="w-3 h-3 text-white" />
                  <span>
                    {slot === 'outer'
                      ? 'CARD I · 表世界赛博卡'
                      : slot === 'inner'
                      ? 'CARD II · 里世界真我卡'
                      : 'CARD III · 双界炼成卡'}
                  </span>
                </div>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: styleSpec.accentColorHex,
                    border: `1px solid ${styleSpec.borderColorCss}`,
                  }}
                >
                  {slot === 'outer'
                    ? 'SSR · 赛博面具'
                    : slot === 'inner'
                    ? 'SSR · 灵魂底色'
                    : fusionPersona?.rarity || 'UR · 炼成神装'}
                </span>
              </div>

              {/* USER MINI HEADER */}
              <div className="card-layer-floating flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      crossOrigin="anonymous"
                      className="w-10 h-10 rounded-xl border border-white/30 object-cover shadow-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-sm font-bold text-white">
                      {profile.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm truncate leading-tight">
                      {profile.name}
                    </h3>
                    <div className="text-[11px] font-mono text-slate-400">
                      @{profile.screenName}
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono text-[9px] text-slate-400">
                  <div>SEED #{styleSpec.patternSeed.toString(16).slice(0, 6).toUpperCase()}</div>
                  <div style={{ color: styleSpec.accentColorHex }}>[{activeCode}]</div>
                </div>
              </div>

              {/* PROCEDURAL SACRED TOTEM & TITLE */}
              <div className="card-layer-emblem flex flex-col items-center text-center my-1">
                <ProceduralFrontTotem
                  variant={slot}
                  axes={activeAxes}
                  secondaryAxes={
                    slot === 'fusion' ? fusionPersona?.innerAxesAsOuterScale : undefined
                  }
                  styleSpec={styleSpec}
                  badgeIcon={slot === 'inner' ? innerIcon : outerArch.badgeIcon}
                  secondaryIcon={slot === 'fusion' ? innerIcon : undefined}
                />

                <h2 className="text-2xl sm:text-[26px] font-black text-white tracking-tight mt-1 drop-shadow-md">
                  {slot === 'outer'
                    ? outerArch.nameZh
                    : slot === 'inner'
                    ? innerArch.nameZh
                    : fusionPersona?.titleZh}
                </h2>
                <div className="text-[11px] font-mono text-slate-300 mt-0.5">
                  {slot === 'outer'
                    ? `${outerArch.nameEn} · [${persona.code}]`
                    : slot === 'inner'
                    ? `${innerArch.nameEn} · [${innerType}]`
                    : `${fusionPersona?.titleEn} · [${activeCode}]`}
                </div>
              </div>

              {/* QUOTE / PASSIVE SKILL BOX */}
              <div className="card-layer-content my-2.5 p-3 rounded-2xl bg-black/35 border border-white/15 text-center backdrop-blur-md">
                {slot === 'fusion' && fusionPersona ? (
                  <div>
                    <div
                      className="text-[11px] font-bold mb-1 font-mono"
                      style={{ color: styleSpec.accentColorHex }}
                    >
                      ⚡ 觉醒被动技 {fusionPersona.passiveNameZh}
                    </div>
                    <p className="text-[11px] text-slate-200 leading-relaxed">
                      {fusionPersona.passiveDescZh}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-slate-100 leading-relaxed italic">
                    “
                    {slot === 'outer'
                      ? llmOutput?.roast || outerArch.taglineZh
                      : innerArch.taglineZh}
                    ”
                  </p>
                )}
              </div>

              {/* TRAIT PILLS */}
              <div className="card-layer-content flex flex-wrap justify-center gap-1.5 mb-2.5">
                {cardTags.map((t, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-white/[0.07] border border-white/15 text-[10px] font-medium text-slate-200"
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* 4 PROCEDURAL AXIS BARS */}
              <div className="card-layer-tracks space-y-1.5 py-2.5 border-t border-white/15 text-[10px] font-mono text-slate-300">
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
                    <span className={row.val < 50 ? 'text-white font-bold' : 'text-slate-400'}>
                      {row.left}
                    </span>
                    <div className="w-36 h-1.5 bg-black/50 rounded-full overflow-hidden mx-2 border border-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${row.val}%`,
                          background: `linear-gradient(90deg, ${styleSpec.secondaryColorHex}, ${styleSpec.accentColorHex})`,
                        }}
                      />
                    </div>
                    <span className={row.val >= 50 ? 'text-white font-bold' : 'text-slate-400'}>
                      {row.right}
                    </span>
                  </div>
                ))}
              </div>

              {/* FOOTER */}
              <div className="card-layer-content pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                <span>xpersona.app</span>
                <span>PROCEDURAL GEN · 1 OF 1</span>
                <span>#{activeCode}</span>
              </div>
            </div>

            {/* ==================== CARD BACK FACE (PROCEDURAL BLUEPRINT) ==================== */}
            <div
              className="card-face-back absolute inset-0 w-full rounded-[32px] p-6 sm:p-7 shadow-2xl overflow-hidden flex flex-col justify-between"
              style={{
                minHeight: '568px',
                background: styleSpec.bgGradientCss,
                border: `1.5px solid ${styleSpec.borderColorCss}`,
              }}
            >
              {/* Back Top Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-2.5">
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-200">
                  <Cpu className="w-3.5 h-3.5" style={{ color: styleSpec.accentColorHex }} />
                  <span>
                    {slot === 'outer'
                      ? '24H CIRCADIAN & RADAR'
                      : slot === 'inner'
                      ? '32-RAY SOUL MANDALA'
                      : 'DUAL-WORLD INTERFERENCE'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  BACKPRINT #{styleSpec.patternSeed.toString(16).slice(0, 4).toUpperCase()}
                </span>
              </div>

              {/* Centerpiece: Procedural Back Blueprint */}
              <div className="my-2 flex flex-col items-center justify-center">
                <ProceduralBackTotem
                  variant={slot}
                  axes={activeAxes}
                  secondaryAxes={
                    slot === 'fusion' ? fusionPersona?.innerAxesAsOuterScale : undefined
                  }
                  hourlyDistribution={features?.hourlyDistribution}
                  oejtsAnswers={oejtsAnswers}
                  styleSpec={styleSpec}
                />
                <div className="text-center mt-3">
                  <div className="font-mono text-xs font-bold text-white">
                    {slot === 'outer'
                      ? '24小时发帖生物钟与四维星轨'
                      : slot === 'inner'
                      ? '32道潜意识答卷光谱与荣格星盘'
                      : '表里双界多边形干涉星盘'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {slot === 'outer'
                      ? '外圈放射线代表你一天24小时的真实活跃度'
                      : slot === 'inner'
                      ? '外圈32道射线由你32题自评答案实时生成'
                      : '实线为表世界推文人格，虚线为里世界潜意识真我'}
                  </div>
                </div>
              </div>

              {/* Back Data Matrix */}
              {slot === 'outer' && features && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-slate-400 text-[10px]">脉冲爆发度 (Fano)</div>
                    <div className="text-sm font-bold font-mono text-white">
                      {features.burstinessFano}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-slate-400 text-[10px]">深夜活跃 (0-6点)</div>
                    <div className="text-sm font-bold font-mono text-white">
                      {features.nightOwlIndex}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-slate-400 text-[10px]">单篇平均字数</div>
                    <div className="text-sm font-bold font-mono text-white">
                      {features.avgCharCount} 字
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-slate-400 text-[10px]">原创 / 回复占比</div>
                    <div className="text-sm font-bold font-mono text-white">
                      {features.originalRate}% / {features.replyRate}%
                    </div>
                  </div>
                </div>
              )}

              {slot === 'inner' && (
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-[10px] font-mono text-purple-300 mb-0.5">
                      ✦ 灵魂核心渴望 (Core Desire)
                    </div>
                    <div className="text-slate-200 text-[11px]">{innerArch.coreDesireZh}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                    <div className="text-[10px] font-mono text-rose-300 mb-0.5">
                      🌑 潜意识暗影 (Shadow Side)
                    </div>
                    <div className="text-slate-200 text-[11px]">{innerArch.shadowZh}</div>
                  </div>
                </div>
              )}

              {slot === 'fusion' && fusionPersona && (
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/15 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-amber-300 font-bold">
                      ⚗️ 炼成公式: [{persona.code}] ⊗ [{innerType}]
                    </span>
                    <span className="text-emerald-300">
                      同步率 {fusionPersona.consistencyIndex}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-200 leading-relaxed">
                    {fusionPersona.loreZh}
                  </p>
                </div>
              )}

              {/* Back Footer */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                <span>UNIQUE PROCEDURAL BACKPRINT</span>
                <span>@{profile.screenName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Card Controls (Only shown in single-card view) */}
      {interactive && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5 w-full max-w-[380px]">
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Rotate3d className="w-4 h-4 text-purple-400" />
            <span>{isFlipped ? '翻回正面' : '翻转看程序化卡背'}</span>
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? '锻造高分图中...' : '保存此卡 (PNG)'}</span>
          </button>

          <a
            href={tweetIntentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors"
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
    <div className="w-full max-w-6xl mx-auto px-4 py-4 flex flex-col items-center">
      {/* ==================== 3-CARD DECK SLOT SELECTOR ==================== */}
      <div className="w-full max-w-2xl mb-6">
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

        {/* Sub-bar: Procedural Engine Notice + Trinity View Toggle */}
        <div className="flex items-center justify-between mt-2.5 px-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>程序化渲染管线：卡面与卡背均由人格特征向量 100% 唯一生成</span>
          </div>

          {hasInnerCard && (
            <button
              onClick={() => setShowTrinityGallery(!showTrinityGallery)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition-colors"
            >
              {showTrinityGallery ? (
                <>
                  <Square className="w-3.5 h-3.5 text-purple-400" />
                  <span>返回单卡3D检视</span>
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

      {/* ==================== FUSION RITUAL ANIMATION OVERLAY ==================== */}
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
            SYNTHESIZING PROCEDURAL TOTEM & ALCHEMICAL MATRIX
          </p>
        </div>
      )}

      {/* ==================== PROMINENT FUSION CALLOUT BANNER ==================== */}
      {canFuse && !isFusingAnimation && (
        <div className="w-full max-w-md mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-950/90 via-amber-950/80 to-cyan-950/90 border border-amber-400/60 shadow-2xl flex items-center justify-between gap-4">
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

      {/* ==================== MAIN DISPLAY: TRINITY GALLERY OR SINGLE 3D CARD ==================== */}
      {showTrinityGallery ? (
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-start justify-items-center py-4">
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
            <div className="w-[345px] min-h-[568px] rounded-[32px] border-2 border-dashed border-amber-500/40 bg-slate-900/40 flex flex-col items-center justify-center p-8 text-center">
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
      <div className="w-full max-w-[380px] mt-6">
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
