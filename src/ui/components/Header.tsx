import React from 'react'
import { Sparkles, RotateCcw, ShieldCheck } from 'lucide-react'
import { usePersonaStore } from '../../store/usePersonaStore'

export const Header: React.FC = () => {
  const { persona, reset, isSharedView } = usePersonaStore()

  return (
    <header className="w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent">
                X Persona
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-800/60 text-purple-300">
                v0.1
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              推文行为人格测试 · 双视角对照
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">零后端 · 数据不出浏览器</span>
            <span className="sm:hidden">纯本地</span>
          </div>

          {(persona || isSharedView) && (
            <button
              onClick={reset}
              className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>测其他人</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
