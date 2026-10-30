import React, { useState } from 'react'
import { Copy, Check, Sparkles, AlertCircle, ArrowLeft, Bot } from 'lucide-react'
import { usePersonaStore } from '../../store/usePersonaStore'
import { buildLlmPrompt } from '../../llm/prompt-builder'
import { parseLlmPastedText } from '../../llm/paste-parser'

export const LlmTab: React.FC = () => {
  const { profile, features, posts, persona, applyLlmOutput, setActiveTab } = usePersonaStore()
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [pasteInput, setPasteInput] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [fixSuggestion, setFixSuggestion] = useState<string | null>(null)

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
    setFixSuggestion(null)

    const res = parseLlmPastedText(pasteInput)
    if (!res.success || !res.data) {
      setParseError(res.error || '解析失败，请检查 JSON 内容')
      setFixSuggestion(res.fixSuggestion || null)
      return
    }

    applyLlmOutput(res.data)
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
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-300">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              使用你喜爱的 LLM 生成深度毒舌报告
            </h2>
            <p className="text-xs text-slate-400">
              零 Key 泄露风险 · 复制提示词到任意大模型 (ChatGPT / Claude / DeepSeek / 豆包) 粘贴回结果
            </p>
          </div>
        </div>

        {/* Step 1: Copy Prompt */}
        <div className="my-6 p-5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-purple-300">
              第一步：复制专属定制提示词（含行为特征与抽样推文）
            </span>
            <button
              onClick={handleCopyPrompt}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-purple-600/20"
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPrompt ? '已复制到剪贴板！' : '一键复制完整提示词'}</span>
            </button>
          </div>
          <div className="w-full h-40 overflow-y-auto p-3 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-xs text-slate-400 select-all leading-relaxed whitespace-pre-wrap">
            {promptText}
          </div>
        </div>

        {/* Step 2: Paste back JSON */}
        <div className="my-6 p-5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-cyan-300">
              第二步：把大模型返回的 JSON 结果粘贴在下方
            </span>
            <button
              onClick={handleApplyPastedJson}
              disabled={!pasteInput.trim()}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>解析并渲染报告</span>
            </button>
          </div>

          <textarea
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            placeholder='在此粘贴大模型返回的 JSON 内容，如：{ "archetype": "CSFD", "roast": "...", ... }'
            rows={8}
            className="w-full p-4 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 leading-relaxed"
          />

          {parseError && (
            <div className="mt-3 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{parseError}</span>
              </div>
              {fixSuggestion && (
                <p className="text-slate-400 text-[11px] pl-6">{fixSuggestion}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
