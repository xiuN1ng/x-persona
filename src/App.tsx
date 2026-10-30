import { useEffect } from 'react'
import { Header } from './ui/components/Header'
import { HandleInput } from './ui/components/HandleInput'
import { PersonaCard } from './ui/components/PersonaCard'
import { LlmTab } from './ui/components/LlmTab'
import { OejtsQuizView } from './ui/components/OejtsQuizView'
import { ComparisonView } from './ui/components/ComparisonView'
import { usePersonaStore } from './store/usePersonaStore'
import { Sparkles, ClipboardList, Scale, CreditCard } from 'lucide-react'

export function App() {
  const { persona, activeTab, setActiveTab, initFromUrlHash, comparison } = usePersonaStore()

  useEffect(() => {
    initFromUrlHash()
  }, [initFromUrlHash])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 flex flex-col justify-center">
        {!persona ? (
          <HandleInput />
        ) : (
          <div className="w-full">
            {/* View Switcher Pill */}
            <div className="flex items-center justify-center gap-1.5 mb-6 overflow-x-auto py-1">
              <button
                onClick={() => setActiveTab('report')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'report'
                    ? 'bg-white text-slate-950 font-bold shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>人格卡</span>
              </button>

              <button
                onClick={() => setActiveTab('llm')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'llm'
                    ? 'bg-white text-slate-950 font-bold shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI 报告</span>
              </button>

              <button
                onClick={() => setActiveTab('oejts')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'oejts'
                    ? 'bg-white text-slate-950 font-bold shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>自评问卷</span>
              </button>

              {comparison && (
                <button
                  onClick={() => setActiveTab('compare')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                    activeTab === 'compare'
                      ? 'bg-white text-slate-950 font-bold shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>双视角 ({comparison.consistencyIndex}%)</span>
                </button>
              )}
            </div>

            {/* Active Content */}
            {activeTab === 'report' && <PersonaCard />}
            {activeTab === 'llm' && <LlmTab />}
            {activeTab === 'oejts' && <OejtsQuizView />}
            {activeTab === 'compare' && <ComparisonView />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 py-6 text-center text-[11px] text-slate-600">
        <div className="max-w-4xl mx-auto px-4 space-y-1">
          <p>
            X Persona · 纯前端赛博人格卡牌 · 娱乐与自我洞察用途
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App


