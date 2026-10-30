import React, { useRef, useState } from 'react'
import { Download, Check, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { toPng } from 'html-to-image'
import { usePersonaStore } from '../../store/usePersonaStore'
import { buildShareUrl, buildTweetIntentUrl } from '../../share/url-state'
import { XIcon } from './XIcon'

// Visual theme configurations per archetype family
const ARCHETYPE_THEMES: Record<string, {
  gradient: string;
  glow: string;
  accent: string;
  border: string;
  rarity: string;
  badgeBg: string;
}> = {
  BEFD: {
    gradient: 'from-violet-950 via-slate-900 to-rose-950',
    glow: 'from-violet-500/20 via-pink-500/20 to-rose-500/20',
    accent: 'text-pink-400',
    border: 'border-pink-500/30',
    rarity: 'SSR · 稀有度 4.2%',
    badgeBg: 'bg-pink-500/10 text-pink-300 border-pink-500/30',
  },
  CSFD: {
    gradient: 'from-cyan-950 via-slate-900 to-purple-950',
    glow: 'from-cyan-500/20 via-blue-500/20 to-purple-500/20',
    accent: 'text-cyan-400',
    border: 'border-cyan-500/30',
    rarity: 'SR · 稀有度 8.6%',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  },
  BEAD: {
    gradient: 'from-indigo-950 via-slate-900 to-emerald-950',
    glow: 'from-indigo-500/20 via-teal-500/20 to-emerald-500/20',
    accent: 'text-emerald-400',
    border: 'border-emerald-500/30',
    rarity: 'SSR · 稀有度 3.1%',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  BEAK: {
    gradient: 'from-slate-950 via-slate-900 to-blue-950',
    glow: 'from-blue-500/20 via-indigo-500/20 to-slate-500/20',
    accent: 'text-blue-400',
    border: 'border-blue-500/30',
    rarity: 'SR · 稀有度 5.4%',
    badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  },
  CSAK: {
    gradient: 'from-amber-950 via-slate-900 to-rose-950',
    glow: 'from-amber-500/20 via-orange-500/20 to-red-500/20',
    accent: 'text-amber-400',
    border: 'border-amber-500/30',
    rarity: 'SSR · 稀有度 2.9%',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  BSAD: {
    gradient: 'from-yellow-950 via-slate-900 to-stone-900',
    glow: 'from-yellow-500/20 via-amber-500/20 to-stone-500/20',
    accent: 'text-amber-300',
    border: 'border-amber-400/30',
    rarity: 'SR · 稀有度 7.8%',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  BSFD: {
    gradient: 'from-fuchsia-950 via-slate-900 to-indigo-950',
    glow: 'from-fuchsia-500/20 via-purple-500/20 to-indigo-500/20',
    accent: 'text-fuchsia-400',
    border: 'border-fuchsia-500/30',
    rarity: 'SSR · 稀有度 3.7%',
    badgeBg: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30',
  },
  CEAD: {
    gradient: 'from-teal-950 via-slate-900 to-indigo-950',
    glow: 'from-teal-500/20 via-cyan-500/20 to-indigo-500/20',
    accent: 'text-teal-400',
    border: 'border-teal-500/30',
    rarity: 'SSR · 稀有度 4.5%',
    badgeBg: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  },
}

export const PersonaCard: React.FC = () => {
  const { profile, persona, features, llmOutput, setActiveTab } = usePersonaStore()
  const cardRef = useRef<HTMLDivElement>(null)

  const [downloading, setDownloading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  if (!persona || !profile) return null

  const { archetype, axes, code } = persona
  const theme = ARCHETYPE_THEMES[code] || {
    gradient: 'from-purple-950 via-slate-900 to-indigo-950',
    glow: 'from-purple-500/20 via-indigo-500/20 to-cyan-500/20',
    accent: 'text-purple-400',
    border: 'border-purple-500/30',
    rarity: 'SR · 稀有度 6.5%',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  }

  // Generate share state & link
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
  const tweetText = `我的 X 推文行为人格是【${archetype.nameZh} · ${code}】：“${llmOutput?.roast || archetype.taglineZh}” 🎴 快来看看你的推特赛博面具：`
  const tweetIntentUrl = buildTweetIntentUrl(tweetText, shareUrl)

  const handleDownloadImage = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      // Small pause to ensure rendering
      await new Promise(r => setTimeout(r, 100))
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // High resolution for crisp export
      })
      const link = document.createElement('a')
      link.download = `X-Persona-${profile.screenName}-${code}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to export image', err)
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

  // Clean tags
  const tags = [
    features ? `夜猫度 ${features.nightOwlIndex}%` : null,
    features ? `回复率 ${features.replyRate}%` : null,
    features && features.avgCharCount > 150 ? '高密度长帖' : '碎碎念直觉流',
    llmOutput?.spiritAnimal?.name ? `灵兽: ${llmOutput.spiritAnimal.name}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 flex flex-col items-center">
      {/* ==================== THE COLLECTIBLE CARD ==================== */}
      <div className="relative group">
        {/* Soft Ambient Aura behind Card */}
        <div
          className={`absolute -inset-1.5 rounded-[36px] bg-gradient-to-r ${theme.glow} blur-2xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200`}
        />

        {/* Card Canvas for Export */}
        <div
          ref={cardRef}
          className={`relative w-[360px] sm:w-[390px] rounded-[32px] bg-gradient-to-b ${theme.gradient} border ${theme.border} p-6 sm:p-7 shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col justify-between`}
          style={{ minHeight: '560px' }}
        >
          {/* Subtle noise/grid texture watermark */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Card Top: Branding & Serial */}
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wider text-slate-300">
                <XIcon className="w-3.5 h-3.5 text-white" />
                <span>PERSONA CARD</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${theme.badgeBg}`}>
                {theme.rarity}
              </span>
            </div>

            {/* Profile Avatar & Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="relative shrink-0">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    crossOrigin="anonymous"
                    className="w-13 h-13 rounded-2xl border border-white/20 object-cover shadow-md"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-md">
                    {profile.name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 text-base drop-shadow-md">
                  {archetype.badgeIcon}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-white text-base truncate">
                    {profile.name}
                  </h3>
                </div>
                <div className="text-xs font-mono text-slate-400">
                  @{profile.screenName}
                </div>
              </div>
            </div>

            {/* Hero Emblem & Archetype Name */}
            <div className="text-center my-4 py-2">
              <div className="text-5xl my-1 select-none filter drop-shadow-lg">
                {archetype.badgeIcon}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
                {archetype.nameZh}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className={`text-xs font-mono font-bold tracking-wider ${theme.accent}`}>
                  [{code}]
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {archetype.nameEn}
                </span>
              </div>
            </div>

            {/* Golden Roast / Signature Quote */}
            <div className="my-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
              <p className="text-xs sm:text-[13px] font-medium text-slate-200 leading-relaxed italic">
                “{llmOutput?.roast || archetype.taglineZh}”
              </p>
            </div>

            {/* Trait Pills */}
            <div className="flex flex-wrap justify-center gap-1.5 mb-5">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-lg bg-white/[0.06] border border-white/10 text-[11px] font-medium text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* 4 Mini Dimension Tracks */}
            <div className="space-y-2 py-3 border-t border-white/10">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className={axes.field < 50 ? 'text-white font-bold' : ''}>广播者 B</span>
                <div className="w-36 h-1.5 bg-white/10 rounded-full overflow-hidden mx-2 relative">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"
                    style={{ width: `${axes.field}%` }}
                  />
                </div>
                <span className={axes.field >= 50 ? 'text-white font-bold' : ''}>C 对话者</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className={axes.density < 50 ? 'text-white font-bold' : ''}>长文家 E</span>
                <div className="w-36 h-1.5 bg-white/10 rounded-full overflow-hidden mx-2 relative">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"
                    style={{ width: `${axes.density}%` }}
                  />
                </div>
                <span className={axes.density >= 50 ? 'text-white font-bold' : ''}>S 碎片派</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className={axes.temperature < 50 ? 'text-white font-bold' : ''}>冷静派 A</span>
                <div className="w-36 h-1.5 bg-white/10 rounded-full overflow-hidden mx-2 relative">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"
                    style={{ width: `${axes.temperature}%` }}
                  />
                </div>
                <span className={axes.temperature >= 50 ? 'text-white font-bold' : ''}>F 情绪派</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className={axes.rhythm < 50 ? 'text-white font-bold' : ''}>规律型 K</span>
                <div className="w-36 h-1.5 bg-white/10 rounded-full overflow-hidden mx-2 relative">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"
                    style={{ width: `${axes.rhythm}%` }}
                  />
                </div>
                <span className={axes.rhythm >= 50 ? 'text-white font-bold' : ''}>D 随性型</span>
              </div>
            </div>
          </div>

          {/* Card Footer: Watermark */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>xpersona.app</span>
            <span>NO. #{code} · 2026</span>
          </div>
        </div>
      </div>

      {/* ==================== ACTION BUTTONS (CLEAN & PROMINENT) ==================== */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 w-full max-w-[390px]">
        <button
          onClick={handleDownloadImage}
          disabled={downloading}
          className="flex-1 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? '生成卡牌中...' : '保存卡牌图片'}</span>
        </button>

        <a
          href={tweetIntentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 font-medium text-xs rounded-2xl flex items-center gap-1.5 transition-colors"
        >
          <XIcon className="w-3.5 h-3.5" />
          <span>晒卡</span>
        </a>

        <button
          onClick={handleCopyLink}
          className="px-3.5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-2xl flex items-center gap-1.5 text-xs transition-colors"
          title="复制链接"
        >
          {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Secondary Actions: Questionnaire & AI Deep Dive */}
      <div className="flex items-center justify-center gap-3 mt-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('oejts')}
          className="text-purple-400 hover:text-purple-300 underline underline-offset-4 cursor-pointer"
        >
          做 32 题自评，解锁双视角对比 →
        </button>
        <span className="text-slate-600">|</span>
        <button
          onClick={() => setActiveTab('llm')}
          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 cursor-pointer"
        >
          {llmOutput ? '查看 AI 毒舌画像' : '生成 AI 毒舌报告'}
        </button>
      </div>

      {/* ==================== COLLAPSIBLE DETAILED STATS DRAWER ==================== */}
      <div className="w-full max-w-[390px] mt-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center justify-between transition-colors"
        >
          <span>查看底层推文数据与特质分析</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="mt-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-4 animate-in fade-in duration-200">
            {/* Quick Stats Grid */}
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

            {/* Strengths & Quirks (Clean bullet points) */}
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
