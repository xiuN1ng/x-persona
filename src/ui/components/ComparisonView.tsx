import React, { useState } from 'react'
import { ArrowLeft, Share2, Check, Scale, Eye, FileText } from 'lucide-react'
import { XIcon } from './XIcon'
import { usePersonaStore } from '../../store/usePersonaStore'
import { buildShareUrl, buildTweetIntentUrl } from '../../share/url-state'

export const ComparisonView: React.FC = () => {
  const { profile, persona, oejtsScores, comparison, setActiveTab } = usePersonaStore()
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
  const tweetText = `我的 X 推文推断人格是【${persona.code}】，自评人格是【${oejtsScores.type}】，人格知行合一指数为 ${comparison.consistencyIndex}%！看看你的网络人设反差多大：`
  const tweetIntentUrl = buildTweetIntentUrl(tweetText, shareUrl)

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => setActiveTab('report')}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>返回我的 X 人格卡</span>
      </button>

      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-10 shadow-2xl backdrop-blur">
        {/* Header */}
        <div className="text-center pb-8 border-b border-slate-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/50 text-purple-300 font-mono text-xs font-semibold mb-3">
            <Scale className="w-3.5 h-3.5 text-purple-400" />
            <span>双视角对照报告</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            推文推断人格 vs 问卷自评人格
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            别人眼里的你（推文大数据）与 你眼里的你（OEJTS 自评）到底差多远？
          </p>
        </div>

        {/* Consistency Score Badge */}
        <div className="my-8 p-6 rounded-3xl bg-gradient-to-tr from-purple-950/60 via-slate-900 to-cyan-950/60 border border-purple-800/40 text-center">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">
            人格一致性指数 (Consistency Index)
          </div>
          <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent my-2">
            {comparison.consistencyIndex}%
          </div>
          <p className="text-sm font-medium text-slate-200 max-w-xl mx-auto mt-3">
            {comparison.summaryZh}
          </p>
        </div>

        {/* Dual Type Confrontation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
          {/* Side A: Timeline Inferred */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-purple-800/40">
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400 mb-2 font-bold">
              <Eye className="w-4 h-4" />
              <span>推特推文推断人格</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {persona.code}
            </div>
            <div className="text-sm font-bold text-purple-300 mt-0.5">
              {persona.archetype.nameZh}
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              基于你近期的真实原创、回复互动、情绪波动与发帖作息算法推导。
            </p>
          </div>

          {/* Side B: Self-assessed */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-800/40">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-2 font-bold">
              <FileText className="w-4 h-4" />
              <span>问卷自评人格 (OEJTS)</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {oejtsScores.type}
            </div>
            <div className="text-sm font-bold text-cyan-300 mt-0.5">
              荣格 16 型人格自评
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              基于你对 32 道两极情境题目的直觉主观评分与标准计分公式得出。
            </p>
          </div>
        </div>

        {/* Dimensional Deltas Breakdown */}
        <div className="my-8 space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold mb-3">
            四维偏差对比详情
          </h3>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>场域表达: 广播/对话 vs 内倾/外倾</span>
              <span className="font-mono text-purple-400">
                推文: {persona.axes.field} | 自评: {oejtsScores.ieNormalized}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {comparison.fieldDiff > 10 ? '👉 你在推特上比自评更外向主动，互动更频繁！' : comparison.fieldDiff < -10 ? '👉 你在推特上比自评更克制独立，习惯单向广播。' : '👉 两者在社交维度高度吻合。'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>思维密度: 长文/碎片 vs 直觉/感觉</span>
              <span className="font-mono text-cyan-400">
                推文: {persona.axes.density} | 自评: {100 - oejtsScores.snNormalized}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {comparison.densityDiff > 10 ? '👉 你在推特上倾向于短平快高频输出。' : comparison.densityDiff < -10 ? '👉 你在推特上展现了比平时更强的长文思辨深度。' : '👉 思维与行文密度高度吻合。'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>情绪温度: 冷静/情绪 vs 理性/情感</span>
              <span className="font-mono text-pink-400">
                推文: {persona.axes.temperature} | 自评: {100 - oejtsScores.ftNormalized}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {comparison.tempDiff > 10 ? '👉 推特是你的情绪释放阀，情感流露更浓烈。' : comparison.tempDiff < -10 ? '👉 你在推特上戴上了严谨理智的专业面具。' : '👉 情绪表达与自评高度吻合。'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>生活节律: 规律/随性 vs 判断/知觉</span>
              <span className="font-mono text-emerald-400">
                推文: {persona.axes.rhythm} | 自评: {oejtsScores.jpNormalized}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {comparison.rhythmDiff > 10 ? '👉 推特作息随性混沌，深夜脉冲式发帖明显。' : comparison.rhythmDiff < -10 ? '👉 发帖节律严谨克制，像定时时钟一样稳定。' : '👉 节律与生活习惯高度吻合。'}
            </div>
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-800">
          <a
            href={tweetIntentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-sky-500/20"
          >
            <XIcon className="w-3.5 h-3.5" />
            <span>发推晒双视角对比</span>
          </a>

          <button
            onClick={handleCopy}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? '已复制对比卡链接' : '复制对比卡链接'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
