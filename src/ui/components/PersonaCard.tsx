import React, { useRef, useState, useCallback } from 'react'
import {
  Download,
  Check,
  Copy,
  Rotate3d,
  ChevronDown,
  ChevronUp,
  Compass,
  Palette
} from 'lucide-react'
import { toPng } from 'html-to-image'
import { usePersonaStore } from '../../store/usePersonaStore'
import { buildShareUrl, buildTweetIntentUrl } from '../../share/url-state'
import { PersonalityConstellation } from './PersonalityConstellation'
import { XIcon } from './XIcon'
import './HoloCard.css'

export type HoloSkin = 'aurora' | 'gold' | 'cyber'

// Rich themes per archetype
interface ThemeConfig {
  gradient: string;
  glow: string;
  accent: string;
  border: string;
  rarity: string;
  badgeBg: string;
  elementTitle: string;
  holoStyle: string;
}

const THEME_MAP: Record<string, ThemeConfig> = {
  BEFD: {
    gradient: 'from-violet-950 via-slate-900 to-rose-950',
    glow: 'from-violet-500/30 via-pink-500/30 to-rose-500/30',
    accent: 'text-pink-400',
    border: 'border-pink-500/40',
    rarity: 'SSR · 稀有度 4.2%',
    badgeBg: 'bg-pink-500/10 text-pink-300 border-pink-500/30',
    elementTitle: '「炽烈·突发星火」',
    holoStyle: 'holo-shimmer-aurora',
  },
  CSFD: {
    gradient: 'from-cyan-950 via-slate-900 to-purple-950',
    glow: 'from-cyan-500/30 via-blue-500/30 to-purple-500/30',
    accent: 'text-cyan-400',
    border: 'border-cyan-500/40',
    rarity: 'SR · 稀有度 8.6%',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    elementTitle: '「极光·万象冲浪」',
    holoStyle: 'holo-shimmer-cyber',
  },
  BEAD: {
    gradient: 'from-indigo-950 via-slate-900 to-emerald-950',
    glow: 'from-indigo-500/30 via-teal-500/30 to-emerald-500/30',
    accent: 'text-emerald-400',
    border: 'border-emerald-500/40',
    rarity: 'SSR · 稀有度 3.1%',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    elementTitle: '「深邃·星穹卷轴」',
    holoStyle: 'holo-shimmer-aurora',
  },
  BEAK: {
    gradient: 'from-slate-950 via-slate-900 to-blue-950',
    glow: 'from-blue-500/30 via-indigo-500/30 to-slate-500/30',
    accent: 'text-blue-400',
    border: 'border-blue-500/40',
    rarity: 'SR · 稀有度 5.4%',
    badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    elementTitle: '「精密·永动机序」',
    holoStyle: 'holo-shimmer-cyber',
  },
  CSAK: {
    gradient: 'from-amber-950 via-slate-900 to-rose-950',
    glow: 'from-amber-500/30 via-orange-500/30 to-red-500/30',
    accent: 'text-amber-400',
    border: 'border-amber-500/40',
    rarity: 'SSR · 稀有度 2.9%',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    elementTitle: '「霜刃·精准解构」',
    holoStyle: 'holo-shimmer-gold',
  },
  BSAD: {
    gradient: 'from-yellow-950 via-slate-900 to-stone-900',
    glow: 'from-yellow-500/30 via-amber-500/30 to-stone-500/30',
    accent: 'text-amber-300',
    border: 'border-amber-400/40',
    rarity: 'SR · 稀有度 7.8%',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    elementTitle: '「冷萃·纯金印记」',
    holoStyle: 'holo-shimmer-gold',
  },
  BSFD: {
    gradient: 'from-fuchsia-950 via-slate-900 to-indigo-950',
    glow: 'from-fuchsia-500/30 via-purple-500/30 to-indigo-500/30',
    accent: 'text-fuchsia-400',
    border: 'border-fuchsia-500/40',
    rarity: 'SSR · 稀有度 3.7%',
    badgeBg: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30',
    elementTitle: '「幻月·混沌夜游」',
    holoStyle: 'holo-shimmer-aurora',
  },
  CEAD: {
    gradient: 'from-teal-950 via-slate-900 to-indigo-950',
    glow: 'from-teal-500/30 via-cyan-500/30 to-indigo-500/30',
    accent: 'text-teal-400',
    border: 'border-teal-500/40',
    rarity: 'SSR · 稀有度 4.5%',
    badgeBg: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
    elementTitle: '「辩才·苏格拉底」',
    holoStyle: 'holo-shimmer-cyber',
  },
}

export const PersonaCard: React.FC = () => {
  const { profile, persona, features, llmOutput, setActiveTab } = usePersonaStore()
  const cardContainerRef = useRef<HTMLDivElement>(null)
  const cardElementRef = useRef<HTMLDivElement>(null)

  const [isFlipped, setIsFlipped] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [skin, setSkin] = useState<HoloSkin>('aurora')

  // Mouse tilt variables
  const [styleVars, setStyleVars] = useState<React.CSSProperties>({
    transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg)',
    '--rx': '0deg',
    '--ry': '0deg',
    '--gx': '50%',
    '--gy': '50%',
    '--ha': '115deg',
    '--op': 0,
  } as React.CSSProperties)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardContainerRef.current || downloading) return
    const rect = cardContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const normX = (x / rect.width) - 0.5
    const normY = (y / rect.height) - 0.5

    const rotX = -normY * 22 // -11 to +11 deg
    const rotY = normX * 22  // -11 to +11 deg

    const angle = Math.atan2(normY, normX) * (180 / Math.PI) + 180

    setStyleVars({
      transform: `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`,
      '--rx': `${rotX}deg`,
      '--ry': `${rotY}deg`,
      '--gx': `${Math.round((x / rect.width) * 100)}%`,
      '--gy': `${Math.round((y / rect.height) * 100)}%`,
      '--ha': `${Math.round(angle)}deg`,
      '--op': 0.85,
    } as React.CSSProperties)
  }, [downloading])

  const handleMouseLeave = useCallback(() => {
    setStyleVars({
      transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg)',
      '--rx': '0deg',
      '--ry': '0deg',
      '--gx': '50%',
      '--gy': '50%',
      '--ha': '115deg',
      '--op': 0,
    } as React.CSSProperties)
  }, [])

  if (!persona || !profile) return null

  const { archetype, axes, code } = persona
  const theme = THEME_MAP[code] || {
    gradient: 'from-purple-950 via-slate-900 to-indigo-950',
    glow: 'from-purple-500/30 via-indigo-500/30 to-cyan-500/30',
    accent: 'text-purple-400',
    border: 'border-purple-500/40',
    rarity: 'SR · 稀有度 6.5%',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    elementTitle: '「幻光·灵性之境」',
    holoStyle: 'holo-shimmer-aurora',
  }

  // Active holo class based on skin
  const activeHoloClass = skin === 'gold'
    ? 'holo-shimmer-gold'
    : skin === 'cyber'
    ? 'holo-shimmer-cyber'
    : 'holo-shimmer-aurora'

  const shareState = {
    version: 1 as const,
    profile: {
      screenName: profile.screenName,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      followers: profile.followers,
      statusesCount: profile.statusesCount,
    },
    axes,
    archetypeCode: code,
    llmOutput: llmOutput || undefined,
  }
  const shareUrl = typeof window !== 'undefined' ? buildShareUrl(shareState) : ''
  const tweetText = `我在 X 抽到了【${archetype.nameZh} · ${code}】3D人格卡牌：“${llmOutput?.roast || archetype.taglineZh}” 🎴 快来看看你的赛博人设：`
  const tweetIntentUrl = buildTweetIntentUrl(tweetText, shareUrl)

  const handleDownloadImage = async () => {
    if (!cardElementRef.current) return
    setDownloading(true)
    // Flatten transform for crisp snapshot
    setStyleVars({
      transform: 'none',
      '--op': 0,
    } as React.CSSProperties)

    try {
      await new Promise(r => setTimeout(r, 120))
      const dataUrl = await toPng(cardElementRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
      })
      const link = document.createElement('a')
      link.download = `X-Persona-3D-${profile.screenName}-${code}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to export card image', err)
      alert('卡牌图片导出失败，可直接截屏保存')
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const tags = [
    features ? `夜猫率 ${features.nightOwlIndex}%` : null,
    features ? `回复比 ${features.replyRate}%` : null,
    features && features.avgCharCount > 150 ? '高密长文' : '短刀金句',
    llmOutput?.spiritAnimal?.name ? `灵兽: ${llmOutput.spiritAnimal.name}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 flex flex-col items-center">
      {/* Skin Theme Switcher Pills */}
      <div className="flex items-center gap-1.5 mb-5 p-1 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
        <span className="text-slate-500 pl-2 pr-1 flex items-center gap-1">
          <Palette className="w-3 h-3" />
          <span>材质:</span>
        </span>
        <button
          onClick={() => setSkin('aurora')}
          className={`px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
            skin === 'aurora' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          全息极光
        </button>
        <button
          onClick={() => setSkin('gold')}
          className={`px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
            skin === 'gold' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          暗金黑曜
        </button>
        <button
          onClick={() => setSkin('cyber')}
          className={`px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
            skin === 'cyber' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          赛博电光
        </button>
      </div>

      {/* ==================== 3D INTERACTIVE CARD CONTAINER ==================== */}
      <div
        ref={cardContainerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="card-perspective-container cursor-grab active:cursor-grabbing select-none"
      >
        <div
          ref={cardElementRef}
          style={styleVars}
          className="card-3d-root relative w-[350px] sm:w-[385px] rounded-[32px] card-metallic-bevel"
        >
          {/* Dynamic 3D Glare Spotlight */}
          <div className="card-glare absolute inset-0 rounded-[32px] z-30 pointer-events-none" />

          {/* Dynamic Holographic Foil Shimmer */}
          <div className={`${activeHoloClass} absolute inset-0 rounded-[32px] z-20 pointer-events-none`} />

          {/* FLIP INNER WRAPPER */}
          <div className={`card-flip-inner relative w-full ${isFlipped ? 'card-flip-flipped' : ''}`}>
            
            {/* ==================== FRONT FACE ==================== */}
            <div
              className={`card-face-front relative w-full rounded-[32px] bg-gradient-to-b ${theme.gradient} border ${theme.border} p-6 sm:p-7 shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col justify-between`}
              style={{ minHeight: '560px' }}
            >
              {/* Background texture watermark */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff0d_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

              {/* CARD TOP ROW */}
              <div className="card-layer-content flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-200">
                  <XIcon className="w-3.5 h-3.5 text-white" />
                  <span>X-PERSONA 3D</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400">
                    {theme.elementTitle}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${theme.badgeBg}`}>
                    {theme.rarity}
                  </span>
                </div>
              </div>

              {/* PROFILE MINI HEADER */}
              <div className="card-layer-floating flex items-center gap-3.5 mb-3">
                <div className="relative shrink-0">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      crossOrigin="anonymous"
                      className="w-13 h-13 rounded-2xl border-2 border-white/30 object-cover shadow-xl"
                    />
                  ) : (
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-xl">
                      {profile.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1.5 -right-1.5 text-base drop-shadow-md">
                    {archetype.badgeIcon}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-white text-base truncate drop-shadow-sm">
                      {profile.name}
                    </h3>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    @{profile.screenName}
                  </div>
                </div>
              </div>

              {/* 3D FLOATING EMBLEM & ARCHETYPE TITLE */}
              <div className="card-layer-emblem text-center my-3 py-1">
                <div className="text-5xl sm:text-6xl my-1 select-none filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] transform hover:scale-110 transition-transform">
                  {archetype.badgeIcon}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1.5 drop-shadow-md">
                  {archetype.nameZh}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className={`text-xs font-mono font-bold tracking-wider ${theme.accent}`}>
                    [{code}]
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    {archetype.nameEn}
                  </span>
                </div>
              </div>

              {/* SIGNATURE GOLDEN ROAST */}
              <div className="card-layer-content my-3 p-3.5 rounded-2xl bg-white/[0.05] border border-white/15 text-center shadow-inner">
                <p className="text-xs sm:text-[13px] font-medium text-slate-100 leading-relaxed italic drop-shadow-sm">
                  “{llmOutput?.roast || archetype.taglineZh}”
                </p>
              </div>

              {/* TRAIT PILLS */}
              <div className="card-layer-content flex flex-wrap justify-center gap-1.5 mb-4">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-lg bg-white/[0.08] border border-white/15 text-[11px] font-medium text-slate-200 shadow-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* 4 DUAL-GRADIENT TRACKS */}
              <div className="card-layer-tracks space-y-2 py-3 border-t border-white/10">
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                  <span className={axes.field < 50 ? 'text-white font-bold' : 'text-slate-400'}>广播 B</span>
                  <div className="w-36 h-2 bg-black/40 rounded-full overflow-hidden mx-2 relative border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${axes.field}%` }}
                    />
                  </div>
                  <span className={axes.field >= 50 ? 'text-white font-bold' : 'text-slate-400'}>C 对话</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                  <span className={axes.density < 50 ? 'text-white font-bold' : 'text-slate-400'}>长文 E</span>
                  <div className="w-36 h-2 bg-black/40 rounded-full overflow-hidden mx-2 relative border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${axes.density}%` }}
                    />
                  </div>
                  <span className={axes.density >= 50 ? 'text-white font-bold' : 'text-slate-400'}>S 碎片</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                  <span className={axes.temperature < 50 ? 'text-white font-bold' : 'text-slate-400'}>冷静 A</span>
                  <div className="w-36 h-2 bg-black/40 rounded-full overflow-hidden mx-2 relative border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${axes.temperature}%` }}
                    />
                  </div>
                  <span className={axes.temperature >= 50 ? 'text-white font-bold' : 'text-slate-400'}>F 情绪</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                  <span className={axes.rhythm < 50 ? 'text-white font-bold' : 'text-slate-400'}>规律 K</span>
                  <div className="w-36 h-2 bg-black/40 rounded-full overflow-hidden mx-2 relative border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${axes.rhythm}%` }}
                    />
                  </div>
                  <span className={axes.rhythm >= 50 ? 'text-white font-bold' : 'text-slate-400'}>D 随性</span>
                </div>
              </div>

              {/* CARD FOOTER */}
              <div className="card-layer-content pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>xpersona.app</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <span>✦ 3D TACTILE CARD</span>
                </span>
                <span>NO. #{code}</span>
              </div>
            </div>

            {/* ==================== BACK FACE (CONSTELLATION RADAR) ==================== */}
            <div
              className={`card-face-back absolute inset-0 w-full rounded-[32px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border ${theme.border} p-6 sm:p-7 shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col justify-between`}
              style={{ minHeight: '560px' }}
            >
              {/* Back Card Top */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-300">
                  <Compass className="w-3.5 h-3.5 text-purple-400" />
                  <span>BEHAVIORAL MATRIX</span>
                </div>
                <span className="text-[10px] font-mono text-purple-300">
                  PSYCHOMETRIC 3D
                </span>
              </div>

              {/* Centerpiece: Constellation Radar */}
              <div className="my-2 flex flex-col items-center justify-center">
                <PersonalityConstellation axes={axes} accentColor="#ec4899" size={175} />
                <div className="text-center mt-3">
                  <span className="font-mono text-xs font-bold text-slate-200">
                    四维行为星轨菱形矩阵
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    场域(B/C) · 密度(E/S) · 温度(A/F) · 节律(K/D)
                  </div>
                </div>
              </div>

              {/* Back Stats Quad */}
              {features && (
                <div className="grid grid-cols-2 gap-2 my-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-slate-400 text-[10px]">发帖爆发度 (Fano)</div>
                    <div className="text-sm font-bold font-mono text-purple-300">{features.burstinessFano}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-slate-400 text-[10px]">夜猫深夜指数</div>
                    <div className="text-sm font-bold font-mono text-cyan-300">{features.nightOwlIndex}%</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-slate-400 text-[10px]">平均字数 / 篇</div>
                    <div className="text-sm font-bold font-mono text-amber-300">{features.avgCharCount} 字</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-slate-400 text-[10px]">互动形态 (原/回)</div>
                    <div className="text-sm font-bold font-mono text-emerald-300">{features.originalRate}% / {features.replyRate}%</div>
                  </div>
                </div>
              )}

              {/* Back Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>AUTHENTICATED BY OEJTS</span>
                <span>SEC-HASH: {code}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ==================== CARD CONTROLS & ACTIONS ==================== */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 w-full max-w-[385px]">
        {/* Flip 3D Button */}
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-xs rounded-2xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
        >
          <Rotate3d className="w-4 h-4 text-purple-400" />
          <span>{isFlipped ? '看卡牌正面' : '翻转看星轨'}</span>
        </button>

        {/* Download Button */}
        <button
          onClick={handleDownloadImage}
          disabled={downloading}
          className="flex-1 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? '导出高清卡中...' : '保存卡牌图片'}</span>
        </button>

        {/* Tweet Intent */}
        <a
          href={tweetIntentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 font-medium text-xs rounded-2xl flex items-center gap-1.5 transition-colors"
          title="发推晒卡"
        >
          <XIcon className="w-3.5 h-3.5" />
          <span>晒卡</span>
        </a>

        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="px-3 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-2xl flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
          title="复制分享链接"
        >
          {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Secondary Fast Links */}
      <div className="flex items-center justify-center gap-3 mt-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('oejts')}
          className="text-purple-400 hover:text-purple-300 underline underline-offset-4 cursor-pointer"
        >
          做 32 题问卷，解锁双面镜像卡 →
        </button>
        <span className="text-slate-600">|</span>
        <button
          onClick={() => setActiveTab('llm')}
          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 cursor-pointer"
        >
          {llmOutput ? '查看 AI 深度画像' : '自备 LLM 生成毒舌分析'}
        </button>
      </div>

      {/* ==================== EXPANDABLE RAW STATS ==================== */}
      <div className="w-full max-w-[385px] mt-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center justify-between transition-colors cursor-pointer"
        >
          <span>查看底层推文数据与特质分析</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="mt-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-4 animate-in fade-in duration-200">
            {features && (
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-slate-500 text-[10px]">夜猫发帖率</div>
                  <div className="text-sm font-bold font-mono text-purple-400">{features.nightOwlIndex}%</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-slate-500 text-[10px]">发帖间隔中位数</div>
                  <div className="text-sm font-bold font-mono text-cyan-400">{features.intervalMedianHours} 小时</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-slate-500 text-[10px]">平均字数</div>
                  <div className="text-sm font-bold font-mono text-amber-400">{features.avgCharCount} 字</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-slate-500 text-[10px]">原创 vs 回复</div>
                  <div className="text-sm font-bold font-mono text-emerald-400">{features.originalRate}% / {features.replyRate}%</div>
                </div>
              </div>
            )}

            <div>
              <div className="text-slate-400 font-semibold mb-1 text-[11px]">✨ 人设优势：</div>
              <ul className="text-slate-300 space-y-1 pl-3 list-disc text-[11px]">
                {(llmOutput?.strengths || archetype.strengthsZh).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-slate-400 font-semibold mb-1 text-[11px]">🔥 容易被吐槽的点：</div>
              <ul className="text-slate-300 space-y-1 pl-3 list-disc text-[11px]">
                {(llmOutput?.redFlags || archetype.roastsZh).map((r, i) => (
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
