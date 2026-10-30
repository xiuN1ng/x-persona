import React, { useRef, useState } from 'react'
import { ArrowLeft, Download, Copy, Check, Scale } from 'lucide-react'
import { toPng } from 'html-to-image'
import { usePersonaStore } from '../../store/usePersonaStore'
import { buildShareUrl, buildTweetIntentUrl } from '../../share/url-state'
import { XIcon } from './XIcon'

export const ComparisonView: React.FC = () => {
  const { profile, persona, oejtsScores, comparison, setActiveTab } = usePersonaStore()
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!profile || !persona || !oejtsScores || !comparison) return null

  // Share state with OEJTS
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
    oejts: {
      type: oejtsScores.type,
      consistencyIndex: comparison.consistencyIndex,
    },
  }
  const shareUrl = typeof window !== 'undefined' ? buildShareUrl(shareState) : ''
  const tweetText = `我的 X 推文人格是【${persona.code}】，真实问卷自评是【${oejtsScores.type}】，知行合一指数 ${comparison.consistencyIndex}%！🎴 快来测测你的双面反差：`
  const tweetIntentUrl = buildTweetIntentUrl(tweetText, shareUrl)

  const handleDownload = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      await new Promise(r => setTimeout(r, 100))
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      })
      const link = document.createElement('a')
      link.download = `X-Persona-Compare-${profile.screenName}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error(err)
      alert('导出失败，可直接截图分享')
    } finally {
      setDownloading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 flex flex-col items-center">
      <div className="w-full max-w-[390px] flex items-center justify-between mb-4">
        <button
          onClick={() => setActiveTab('report')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>返回单张人格卡</span>
        </button>
        <span className="text-xs font-mono text-purple-400 font-bold">
          DUAL-PERSPECTIVE
        </span>
      </div>

      {/* ==================== DUAL SPLIT CARD ==================== */}
      <div className="relative group">
        <div className="absolute -inset-1.5 rounded-[36px] bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 blur-2xl opacity-75" />

        <div
          ref={cardRef}
          className="relative w-[360px] sm:w-[390px] rounded-[32px] bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-purple-500/30 p-6 sm:p-7 shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col justify-between"
          style={{ minHeight: '560px' }}
        >
          {/* Subtle noise watermark */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div>
            {/* Top Brand */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-300">
                <Scale className="w-3.5 h-3.5 text-purple-400" />
                <span>X PERSONA · 双面镜像</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300">
                知行合一 {comparison.consistencyIndex}%
              </span>
            </div>

            {/* User Profile Mini */}
            <div className="flex items-center gap-3 mb-5">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  crossOrigin="anonymous"
                  className="w-10 h-10 rounded-xl border border-white/20 object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-purple-700 flex items-center justify-center font-bold text-white text-sm">
                  {profile.name[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-white text-sm truncate">{profile.name}</div>
                <div className="text-[11px] font-mono text-slate-400">@{profile.screenName}</div>
              </div>
            </div>

            {/* Big Dual-Face Split Display */}
            <div className="grid grid-cols-2 gap-2.5 my-4">
              {/* Left Face: Timeline Persona */}
              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-center">
                <div className="text-[10px] font-mono text-purple-400 mb-1 font-semibold">
                  别人眼里的你 (推文)
                </div>
                <div className="text-3xl my-1">{persona.archetype.badgeIcon}</div>
                <div className="text-xl font-extrabold text-white font-mono">{persona.code}</div>
                <div className="text-xs font-bold text-purple-300 mt-0.5">{persona.archetype.nameZh}</div>
              </div>

              {/* Right Face: Self Quiz Persona */}
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-center">
                <div className="text-[10px] font-mono text-cyan-400 mb-1 font-semibold">
                  你眼里的你 (问卷)
                </div>
                <div className="text-3xl my-1">🧠</div>
                <div className="text-xl font-extrabold text-white font-mono">{oejtsScores.type}</div>
                <div className="text-xs font-bold text-cyan-300 mt-0.5">荣格 16 型人格</div>
              </div>
            </div>

            {/* One-Liner Summary */}
            <div className="my-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
              <p className="text-xs font-medium text-slate-200 leading-relaxed">
                {comparison.summaryZh}
              </p>
            </div>

            {/* 4 Contrast Bars */}
            <div className="space-y-2 py-3 border-t border-white/10 text-[11px] font-mono text-slate-400">
              <div className="flex items-center justify-between">
                <span>社交场域:</span>
                <span className="text-slate-200">
                  推文 {persona.axes.field} vs 自评 {oejtsScores.ieNormalized}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>思维密度:</span>
                <span className="text-slate-200">
                  推文 {persona.axes.density} vs 自评 {100 - oejtsScores.snNormalized}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>情绪温度:</span>
                <span className="text-slate-200">
                  推文 {persona.axes.temperature} vs 自评 {100 - oejtsScores.ftNormalized}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>生活节律:</span>
                <span className="text-slate-200">
                  推文 {persona.axes.rhythm} vs 自评 {oejtsScores.jpNormalized}
                </span>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>xpersona.app</span>
            <span>DUAL PERSPECTIVE · 2026</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 w-full max-w-[390px]">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? '导出中...' : '保存对比卡牌图片'}</span>
        </button>

        <a
          href={tweetIntentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 font-medium text-xs rounded-2xl flex items-center gap-1.5 transition-colors"
        >
          <XIcon className="w-3.5 h-3.5" />
          <span>发推</span>
        </a>

        <button
          onClick={handleCopy}
          className="px-3.5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-2xl flex items-center gap-1.5 text-xs transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
