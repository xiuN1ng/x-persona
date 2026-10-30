import React, { useState, useRef } from 'react'
import { Loader2, ArrowRight, Upload, AlertCircle } from 'lucide-react'
import { usePersonaStore } from '../../store/usePersonaStore'
import { parseTweetsJsContent } from '../../providers/archive'

const SAMPLE_HANDLES = [
  { handle: 'coldmountainlab', label: '寒山 (AI Games)' },
  { handle: 'elonmusk', label: 'Elon Musk' },
  { handle: 'sama', label: 'Sam Altman' },
  { handle: 'karpathy', label: 'Andrej Karpathy' },
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
    <div className="w-full max-w-2xl mx-auto py-12 px-4 text-center">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/40 border border-purple-800/40 text-purple-300 text-xs font-medium mb-6">
        <span>✨ 输入 X 用户名，10 秒内生成专属人格卡</span>
      </div>

      <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
        揭示你在推特上的
        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          {' '}真实赛博人格
        </span>
      </h1>

      <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto mb-8">
        纯前端实测 40 项发帖特征与 16 种 X 原型体系。对比“推文里的你”与“自评里的你”，测测你的人格一致性指数。
      </p>

      {/* Main Search Bar */}
      <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto mb-4">
        <div className="relative flex items-center">
          <div className="absolute left-4 text-slate-500 font-mono text-lg font-bold">
            @
          </div>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={loading}
            placeholder="输入你的 X 用户名 (如 coldmountainlab)"
            className="w-full pl-10 pr-32 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-base shadow-xl"
          />
          <button
            type="submit"
            disabled={loading || !inputVal.trim()}
            className="absolute right-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>分析中</span>
              </>
            ) : (
              <>
                <span>测测看</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Progress Bar when Loading */}
      {loading && (
        <div className="max-w-xl mx-auto mb-6 p-4 rounded-xl bg-slate-900/90 border border-purple-900/40 text-left">
          <div className="flex items-center justify-between text-xs text-purple-300 mb-2 font-mono">
            <span>{progress.message || '正在分析...'}</span>
            <span>{progress.current}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progress.current}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-xl mx-auto mb-6 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2 text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Samples */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 mb-8">
        <span className="text-slate-500">快速试玩:</span>
        {SAMPLE_HANDLES.map((s) => (
          <button
            key={s.handle}
            onClick={() => handleSelectSample(s.handle)}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            @{s.handle} <span className="text-slate-500">({s.label})</span>
          </button>
        ))}
      </div>

      {/* Alternative: Archive file upload */}
      <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-slate-500">
        <span>私密账号或想分析全量历史？</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>上传 X 归档数据 (tweets.js)</span>
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
