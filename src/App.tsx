import { useEffect } from 'react'
import { Header } from './ui/components/Header'
import { HandleInput } from './ui/components/HandleInput'
import { PersonaCard } from './ui/components/PersonaCard'
import { LlmTab } from './ui/components/LlmTab'
import { OejtsQuizView } from './ui/components/OejtsQuizView'
import { usePersonaStore } from './store/usePersonaStore'
import { Sparkles, ClipboardList, Layers } from 'lucide-react'

export function App() {
  const { persona, activeTab, setActiveTab, initFromUrlHash, oejtsScores, isFused } = usePersonaStore()

  useEffect(() => {
    initFromUrlHash()
  }, [initFromUrlHash])

  const unlockedCardCount = isFused ? 3 : oejtsScores ? 2 : 1

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-2 sm:px-4 py-3 sm:py-4 flex flex-col justify-center">
        {!persona ? (
          <HandleInput />
        ) : (
          <div className="w-full">
            {/* View Switcher Pill */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 py-1 px-1">
              <button
                onClick={() => setActiveTab('report')}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'report'
                    ? 'bg-white text-slate-950 font-bold shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>三界卡组 ({unlockedCardCount}/3)</span>
              </button>

              <button
                onClick={() => setActiveTab('oejts')}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'oejts'
                    ? 'bg-white text-slate-950 font-bold shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                <span>{oejtsScores ? '重测潜意识问卷' : '测问卷 · 解锁第2张卡'}</span>
              </button>

              <button
                onClick={() => setActiveTab('llm')}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'llm'
                    ? 'bg-white text-slate-950 font-bold shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>AI 毒舌报告</span>
              </button>
            </div>

            {/* Active Content */}
            {activeTab === 'report' && <PersonaCard />}
            {activeTab === 'llm' && <LlmTab />}
            {activeTab === 'oejts' && <OejtsQuizView />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 py-6 text-center text-[11px] text-slate-600">
        <div className="max-w-4xl mx-auto px-4 space-y-1">
          <p>
            X Persona · 程序化双界人格卡牌与炼成系统 · 娱乐与自我洞察用途
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
