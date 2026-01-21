import { useMemo } from 'react'

import { useChatStore } from '@entities/chat/model/chatStore'

const formatProgress = (value: number, target: number): string => {
  if (target === 0) {
    return '0%'
  }
  const percent = Math.min(100, Math.round((value / target) * 100))
  return `${percent}%`
}

export const GenerationPanel = () => {
  const isGenerating = useChatStore((state) => state.isGenerating)
  const generatedWords = useChatStore((state) => state.generatedWords)
  const targetWords = useChatStore((state) => state.targetWords)
  const startGeneration = useChatStore((state) => state.startGeneration)
  const stopGeneration = useChatStore((state) => state.stopGeneration)

  const progressText = useMemo(
    () => formatProgress(generatedWords, targetWords),
    [generatedWords, targetWords],
  )

  return (
    <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 md:grid-cols-2">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-100">Управление генерацией</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startGeneration}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-50"
            disabled={isGenerating}
          >
            Generate
          </button>
          <button
            type="button"
            onClick={stopGeneration}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200 disabled:opacity-50"
            disabled={!isGenerating}
          >
            Stop Generating
          </button>
        </div>
      </div>
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>Прогресс</span>
          <span className="font-semibold text-emerald-300">{progressText}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width]"
            style={{ width: progressText }}
          />
        </div>
      </div>
    </div>
  )
}

