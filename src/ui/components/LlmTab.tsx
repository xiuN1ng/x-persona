import React, { useState } from 'react'
import { Copy, Check, Sparkles, AlertCircle, ArrowLeft, Bot, Flame, RotateCcw } from 'lucide-react'
import { usePersonaStore } from '../../store/usePersonaStore'
import { buildLlmPrompt } from '../../llm/prompt-builder'
import { parseLlmPastedText } from '../../llm/paste-parser'

export const LlmTab: React.FC = () => {
  const { profile, features, posts, persona, llmOutput, applyLlmOutput, setActiveTab } = usePersonaStore()
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [pasteInput, setPasteInput] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [showInputForm, setShowInputForm] = useState(!llmOutput)

  if (!profile || !features || !persona) return null

  const promptText = buildLlmPrompt({
    profile,
    features,
    posts,
    precalculatedAxes: persona.axes,
    lang: 'zh',
  })

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptText)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  const handleApplyPastedJson = () => {
    setParseError(null)

    const res = parseLlmPastedText(pasteInput)
    if (!res.success || !res.data) {
      setParseError(res.error || '解析失败，请检查 JSON 内容')
      return
    }

    applyLlmOutput(res.data)
    setShowInputForm(false)
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setActiveTab('report')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>返回卡牌</span>
        </button>
        <span className="text-xs font-mono text-purple-400 font-bold">
          AI INSIGHT REPORT
        </span>
      </div>

      {/* Rendered LLM Report Card */}
      {llmOutput && !showInputForm ? (
        <div className="rounded-3xl bg-slate-900/90 border border-purple-500/30 p-6 shadow-2xl backdrop-blur space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="font-bold text-sm text-white">AI 深度心理画像</span>
            </div>
            <span className="text-xs font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/40">
              MBTI推测: {llmOutput.mbtiGuess.type} ({Math.round(llmOutput.mbtiGuess.confidence * 100)}%)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-purple-200 font-medium italic">
            “{llmOutput.roast}”
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {llmOutput.portrait}
          </p>

          {/* Spirit Animal & Best Match */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[10px] mb-0.5">精神动物</div>
              <div className="font-bold text-slate-200">{llmOutput.spiritAnimal.name}</div>
              <div className="text-[10px] text-slate-400 mt-1 leading-tight">{llmOutput.spiritAnimal.reason}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[10px] mb-0.5">最佳天作之合</div>
              <div className="font-bold text-cyan-400 font-mono text-sm">{llmOutput.bestMatch}</div>
              <div className="text-[10px] text-slate-400 mt-1">互补吸引力最高</div>
            </div>
          </div>

          {/* 2027 Prediction */}
          {llmOutput.prediction2027 && (
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-xs text-purple-200">
              <span className="font-bold text-purple-400">🔮 2027 年预言：</span>
              <span>{llmOutput.prediction2027}</span>
            </div>
          )}

          <div className="pt-3 border-t border-white/10 flex justify-end">
            <button
              onClick={() => setShowInputForm(true)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>重新生成 / 粘贴新结果</span>
            </button>
          </div>
        </div>
      ) : (
        /* Prompt Generator & Paste Form */
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-800/60 flex items-center justify-center text-purple-300">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">自备大模型生成毒舌分析</h3>
              <p className="text-[11px] text-slate-400">零 Key 泄露 · 复制提示词到任意大模型粘贴回来</p>
            </div>
          </div>

          {/* Step 1 */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-purple-300 font-semibold">
                第一步：复制推文事实段与提示词
              </span>
              <button
                onClick={handleCopyPrompt}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-medium text-[11px] rounded-lg flex items-center gap-1 cursor-pointer"
              >
                {copiedPrompt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPrompt ? '已复制！' : '一键复制'}</span>
              </button>
            </div>
            <div className="w-full h-24 overflow-y-auto p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-[10px] text-slate-400 select-all leading-relaxed whitespace-pre-wrap">
              {promptText}
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-cyan-300 font-semibold">
                第二步：粘贴大模型返回的 JSON
              </span>
              <button
                onClick={handleApplyPastedJson}
                disabled={!pasteInput.trim()}
                className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 disabled:opacity-50 text-white font-medium text-[11px] rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>渲染报告</span>
              </button>
            </div>

            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder='在此粘贴大模型返回的 JSON'
              rows={5}
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed"
            />

            {parseError && (
              <div className="mt-2 p-2 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                <span>{parseError}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
