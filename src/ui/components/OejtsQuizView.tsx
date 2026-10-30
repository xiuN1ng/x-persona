import React from 'react'
import { ArrowLeft, Sparkles, Send } from 'lucide-react'
import { usePersonaStore } from '../../store/usePersonaStore'
import { OEJTS_ITEMS } from '../../oejts/items'

export const OejtsQuizView: React.FC = () => {
  const { oejtsAnswers, setOejtsAnswer, applyPrefillOejts, finishOejts, setActiveTab } = usePersonaStore()

  const answeredCount = Object.keys(oejtsAnswers).length
  const totalCount = OEJTS_ITEMS.length
  const progressPercent = Math.round((answeredCount / totalCount) * 100)

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 font-mono text-[10px] uppercase tracking-wider mb-1.5">
              OEJTS 1.2 开源人格量表
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              5 分钟自评：真实的你 vs 推特上的你
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              32 题两极自评问卷（CC BY-NC-SA 4.0 许可），用于计算与你推文人格的“知行合一指数”
            </p>
          </div>

          <button
            onClick={applyPrefillOejts}
            className="px-3.5 py-2 bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-800/60 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>智能应用推文预填</span>
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="my-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <span>答题进度: {answeredCount} / {totalCount}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6 my-8">
          {OEJTS_ITEMS.map((item) => {
            const currentVal = oejtsAnswers[item.id] || 3

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-purple-400 font-bold">
                    Q{item.id} · [{item.dimension}]
                  </span>
                  {item.xContextZh && (
                    <span className="text-[11px] text-cyan-400/90 font-medium">
                      💡 X视界：{item.xContextZh}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-300 mb-4">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-500 mr-1.5 font-bold">1:</span>
                    <span>{item.leftZh}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-right sm:text-left">
                    <span className="text-slate-500 mr-1.5 font-bold">5:</span>
                    <span>{item.rightZh}</span>
                  </div>
                </div>

                {/* 1-5 Radio Pills */}
                <div className="flex items-center justify-between gap-2 max-w-md mx-auto pt-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      onClick={() => setOejtsAnswer(item.id, val)}
                      className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                        currentVal === val
                          ? 'bg-gradient-to-tr from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-600/30 scale-105'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {val === 1 && '极左'}
                      {val === 2 && '偏左'}
                      {val === 3 && '中立'}
                      {val === 4 && '偏右'}
                      {val === 5 && '极右'}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Submit Button */}
        <div className="pt-6 border-t border-slate-800 flex justify-end">
          <button
            onClick={finishOejts}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-xl shadow-purple-600/25 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>提交并查看双视角对照报告</span>
          </button>
        </div>
      </div>
    </div>
  )
}
