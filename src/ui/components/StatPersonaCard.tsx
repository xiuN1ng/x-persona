import React, { useState } from 'react'
import {
  Share2,
  Sparkles,
  ClipboardList,
  Check,
  Flame,
  ArrowRight,
  Zap,
  Moon,
  MessageSquare,
  FileText
} from 'lucide-react'
import { XIcon } from './XIcon'
import { usePersonaStore } from '../../store/usePersonaStore'
import { buildShareUrl, buildTweetIntentUrl } from '../../share/url-state'

export const StatPersonaCard: React.FC = () => {
  const { profile, persona, features, llmOutput, setActiveTab } = usePersonaStore()
  const [copied, setCopied] = useState(false)

  if (!persona || !profile) return null

  const { archetype, axes, code } = persona

  // Generate share URL
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

  const tweetText = `我的 X 推文行为人格是【${archetype.nameZh} · ${code}】：“${archetype.taglineZh}” 🚀 快来看看你的推特赛博面具长什么样：`
  const tweetIntentUrl = buildTweetIntentUrl(tweetText, shareUrl)

  const handleCopyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Main Persona Card */}
      <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-10 shadow-2xl overflow-hidden backdrop-blur">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header: Profile Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-8 border-b border-slate-800/80">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="relative">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-purple-500/40 object-cover shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {profile.name[0]?.toUpperCase() || '@'}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 text-2xl">
                {archetype.badgeIcon}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {profile.name}
                </h2>
                <span className="text-xs font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/50">
                  @{profile.screenName}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md line-clamp-2">
                {profile.description || '一位充满神秘感的 X 探索者'}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 mt-2 font-mono">
                <span>{profile.followers.toLocaleString()} 关注者</span>
                <span>•</span>
                <span>{features?.totalSampleCount || profile.statusesCount} 条推文样本</span>
              </div>
            </div>
          </div>

          {/* Archetype Code & Title Pill */}
          <div className="text-center sm:text-right shrink-0">
            <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 text-purple-300 font-mono text-xs font-semibold mb-2">
              X-ARCHETYPE
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center justify-center sm:justify-end gap-2 font-mono">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                {code}
              </span>
            </div>
            <div className="text-lg font-bold text-slate-200 mt-1">
              {archetype.nameZh}
            </div>
          </div>
        </div>

        {/* Tagline / One-liner */}
        <div className="my-6 p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-slate-900/60 border border-purple-800/30 text-center">
          <p className="text-base sm:text-lg font-medium text-purple-200">
            “{llmOutput?.roast || archetype.taglineZh}”
          </p>
        </div>

        {/* 4-Axes Sliders */}
        <div className="space-y-4 my-8">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold mb-3">
            四维行为图谱 (BEAK vs CSFD)
          </h3>

          {/* Axis 1: Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className={axes.field < 50 ? 'font-bold text-purple-400' : 'text-slate-400'}>
                广播者 Broadcaster [B]
              </span>
              <span className="font-mono text-purple-300">{axes.field} / 100</span>
              <span className={axes.field >= 50 ? 'font-bold text-cyan-400' : 'text-slate-400'}>
                对话者 Conversationalist [C]
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${axes.field}%` }}
              />
            </div>
          </div>

          {/* Axis 2: Density */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className={axes.density < 50 ? 'font-bold text-purple-400' : 'text-slate-400'}>
                长文家 Essayist [E]
              </span>
              <span className="font-mono text-purple-300">{axes.density} / 100</span>
              <span className={axes.density >= 50 ? 'font-bold text-cyan-400' : 'text-slate-400'}>
                碎片派 Sniper [S]
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${axes.density}%` }}
              />
            </div>
          </div>

          {/* Axis 3: Temperature */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className={axes.temperature < 50 ? 'font-bold text-purple-400' : 'text-slate-400'}>
                冷静派 Analyst [A]
              </span>
              <span className="font-mono text-purple-300">{axes.temperature} / 100</span>
              <span className={axes.temperature >= 50 ? 'font-bold text-cyan-400' : 'text-slate-400'}>
                情绪派 Feeler [F]
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${axes.temperature}%` }}
              />
            </div>
          </div>

          {/* Axis 4: Rhythm */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className={axes.rhythm < 50 ? 'font-bold text-purple-400' : 'text-slate-400'}>
                规律型 Clock [K]
              </span>
              <span className="font-mono text-purple-300">{axes.rhythm} / 100</span>
              <span className={axes.rhythm >= 50 ? 'font-bold text-cyan-400' : 'text-slate-400'}>
                随性型 Drifter [D]
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${axes.rhythm}%` }}
              />
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        {features && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 pt-6 border-t border-slate-800">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>夜猫指数</span>
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {features.nightOwlIndex}%
              </div>
              <span className="text-[10px] text-slate-500">00:00 - 06:00 发帖</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span>回复占比</span>
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {features.replyRate}%
              </div>
              <span className="text-[10px] text-slate-500">原创 {features.originalRate}%</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>平均字数</span>
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {features.avgCharCount} 字
              </div>
              <span className="text-[10px] text-slate-500">长文率 {features.longPostRate}%</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>脉冲爆发度</span>
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {features.burstinessFano}
              </div>
              <span className="text-[10px] text-slate-500">Fano 因子</span>
            </div>
          </div>
        )}

        {/* Strengths & Roasts Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/30">
            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>✨ 闪光点与特质</span>
            </h4>
            <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300">
              {(llmOutput?.strengths || archetype.strengthsZh).map((s, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/30">
            <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>🔥 被吐槽点 / 雷点</span>
            </h4>
            <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300">
              {(llmOutput?.redFlags || archetype.roastsZh).map((r, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-rose-400">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* LLM Portrait (if available) */}
        {llmOutput && (
          <div className="my-6 p-5 rounded-2xl bg-purple-950/30 border border-purple-800/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>AI 深度心理画像</span>
              </span>
              <span className="text-xs text-purple-400 font-mono">
                MBTI推测: {llmOutput.mbtiGuess.type} ({Math.round(llmOutput.mbtiGuess.confidence * 100)}% 置信度)
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {llmOutput.portrait}
            </p>
            {llmOutput.prediction2027 && (
              <div className="mt-3 pt-3 border-t border-purple-900/40 text-xs text-purple-300">
                <span className="font-bold">🔮 2027年预言：</span>
                <span>{llmOutput.prediction2027}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <a
              href={tweetIntentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-sky-500/20"
            >
              <XIcon className="w-3.5 h-3.5" />
              <span>一键发推晒卡</span>
            </a>

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制链接' : '复制分享卡'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('llm')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{llmOutput ? '更新 LLM 报告' : '生成 LLM 毒舌报告'}</span>
            </button>

            <button
              onClick={() => setActiveTab('oejts')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-purple-800/40"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>做问卷看双面反差</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
