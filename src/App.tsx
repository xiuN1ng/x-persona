import { useEffect } from 'react'
import { Header } from './ui/components/Header'
import { HandleInput } from './ui/components/HandleInput'
import { StatPersonaCard } from './ui/components/StatPersonaCard'
import { LlmTab } from './ui/components/LlmTab'
import { OejtsQuizView } from './ui/components/OejtsQuizView'
import { ComparisonView } from './ui/components/ComparisonView'
import { usePersonaStore } from './store/usePersonaStore'
import { User, Sparkles, ClipboardList, Scale } from 'lucide-react'

export function App() {
  const { persona, activeTab, setActiveTab, initFromUrlHash, comparison } = usePersonaStore()

  useEffect(() => {
    initFromUrlHash()
  }, [initFromUrlHash])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {!persona ? (
          <HandleInput />
        ) : (
          <div>
            {/* View Switcher Tabs */}
            <div className="flex items-center justify-center gap-2 mb-6 border-b border-slate-800 pb-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('report')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'report'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>X 人格卡</span>
              </button>

              <button
                onClick={() => setActiveTab('llm')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'llm'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>LLM 毒舌报告</span>
              </button>

              <button
                onClick={() => setActiveTab('oejts')}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'oejts'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>OEJTS 问卷自评</span>
              </button>

              {comparison && (
                <button
                  onClick={() => setActiveTab('compare')}
                  className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                    activeTab === 'compare'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-bold'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>双视角对照 ({comparison.consistencyIndex}%)</span>
                </button>
              )}
            </div>

            {/* Active Content */}
            {activeTab === 'report' && <StatPersonaCard />}
            {activeTab === 'llm' && <LlmTab />}
            {activeTab === 'oejts' && <OejtsQuizView />}
            {activeTab === 'compare' && <ComparisonView />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-600">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p>
            X Persona · 纯前端推特赛博人格测试开源项目 · 娱乐与自我洞察用途，非心理临床诊断
          </p>
          <p className="text-[11px] text-slate-700">
            代码许可：PolyForm Noncommercial 1.0.0 · 内容/问卷许可：CC BY-NC-SA 4.0 · 题库来源：OEJTS 1.2 © OpenPsychometrics
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App

