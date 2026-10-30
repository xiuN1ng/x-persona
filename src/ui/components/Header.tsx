import React from 'react'
import { Sparkles, RotateCcw, ShieldCheck } from 'lucide-react'
import { usePersonaStore } from '../../store/usePersonaStore'

export const Header: React.FC = () => {
  const { persona, reset, isSharedView } = usePersonaStore()

  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-50 shrink-0">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 h-11 sm:h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer min-w-0" onClick={reset}>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent truncate">
                X Persona
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-950/80 border border-purple-800/60 text-purple-300 shrink-0">
                v0.1
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-400 bg-slate-900 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-slate-800">
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">零后端 · 数据不出浏览器</span>
            <span className="sm:hidden">纯本地</span>
          </div>

          {(persona || isSharedView) && (
            <button
              onClick={reset}
              className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>测其他人</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
