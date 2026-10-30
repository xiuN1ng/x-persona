import React, { useState, useRef } from 'react'
import { Loader2, ArrowRight, Upload, AlertCircle, Sparkles } from 'lucide-react'
import { usePersonaStore } from '../../store/usePersonaStore'
import { parseTweetsJsContent } from '../../providers/archive'

const SAMPLE_HANDLES = [
  { handle: 'coldmountainlab', label: '寒山' },
  { handle: 'elonmusk', label: 'Elon Musk' },
  { handle: 'sama', label: 'Sam Altman' },
  { handle: 'karpathy', label: 'Karpathy' },
]

export const HandleInput: React.FC = () => {
  const [inputVal, setInputVal] = useState('')
  const { fetchPersonaData, importArchivePosts, loading, progress, error } = usePersonaStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputVal.trim() || loading) return
    fetchPersonaData(inputVal)
  }

  const handleSelectSample = (handle: string) => {
    setInputVal(handle)
    fetchPersonaData(handle)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string
        const posts = parseTweetsJsContent(text)
        importArchivePosts(posts, file.name.replace(/\.[^/.]+$/, ''))
      } catch (err: any) {
        alert(err.message || '解析归档文件失败')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="w-full max-w-xl mx-auto py-6 sm:py-10 px-3 sm:px-4 text-center">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/50 text-purple-300 text-xs font-medium mb-5 sm:mb-6">
        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        <span>10 秒抽取你的推特专属赛博人格卡牌</span>
      </div>

      <h1 className="text-2xl sm:text-5xl font-black tracking-tight text-white mb-3">
        你的 X 赛博人格
        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          {' '}卡牌测试
        </span>
      </h1>

      <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-6 sm:mb-8">
        纯前端实测 40 项推文特征 · 16 种独创原型 · 一键生成高清分享卡
      </p>

      {/* Main Search Bar */}
      <form onSubmit={handleSubmit} className="relative max-w-md mx-auto mb-4">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 sm:left-4 text-slate-500 font-mono text-base sm:text-lg font-bold">
            @
          </div>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={loading}
            placeholder="输入 X 用户名 (如 coldmountainlab)"
            className="w-full pl-9 sm:pl-10 pr-24 sm:pr-28 py-3 sm:py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-xs sm:text-sm shadow-xl"
          />
          <button
            type="submit"
            disabled={loading || !inputVal.trim()}
            className="absolute right-1.5 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs rounded-xl flex items-center gap-1 sm:gap-1.5 transition-all shadow-md shadow-purple-600/20 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>分析中</span>
              </>
            ) : (
              <>
                <span>抽取</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Progress Bar when Loading */}
      {loading && (
        <div className="max-w-md mx-auto mb-6 p-3.5 rounded-xl bg-slate-900/90 border border-purple-900/40 text-left">
          <div className="flex items-center justify-between text-xs text-purple-300 mb-1.5 font-mono">
            <span>{progress.message || '正在分析...'}</span>
            <span>{progress.current}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progress.current}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-md mx-auto mb-6 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2 text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Samples */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 mb-8">
        <span className="text-slate-500">试玩:</span>
        {SAMPLE_HANDLES.map((s) => (
          <button
            key={s.handle}
            onClick={() => handleSelectSample(s.handle)}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
          >
            @{s.handle}
          </button>
        ))}
      </div>

      {/* Alternative: Archive file upload */}
      <div className="pt-4 border-t border-slate-900/80 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] text-slate-500">
        <span>想分析私密账号或全量历史？</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
        >
          <Upload className="w-3 h-3" />
          <span>上传数据归档 (tweets.js)</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".js,.json"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  )
}
