import { create } from 'zustand'

import {
  INSTANT_TARGET_WORDS_MAX,
  INSTANT_TARGET_WORDS_MIN,
  MAX_HISTORY_ITEMS,
  STREAM_CHUNK_SIZE,
  STREAM_DELAY_MS,
  STREAM_TARGET_WORDS_MAX,
  STREAM_TARGET_WORDS_MIN,
} from '@shared/config/chatConfig'
import { buildWordChunk, seedHistorySamples } from '@shared/lib/loremGenerator'

import { TChatMessage } from '@entities/message/model/types'

type TChatState = {
  messages: TChatMessage[]
  isGenerating: boolean
  isAutoScroll: boolean
  generatedWords: number
  targetWords: number
  addUserMessage: (text: string) => void
  addUserMessageAndInstantReply: (text: string) => void
  startAssistantStream: () => void
  stopGeneration: () => void
  toggleAutoScroll: (value: boolean) => void
  clearHistory: () => void
}

type TGenerationRuntime = {
  intervalId: number | null
  bufferedChunk: string
  isFlushScheduled: boolean
  wordsGenerated: number
  nextWordIndex: number
  targetWords: number
  streamingMessageId: string | null
}

const runtime: TGenerationRuntime = {
  intervalId: null,
  bufferedChunk: '',
  isFlushScheduled: false,
  wordsGenerated: 0,
  nextWordIndex: 0,
  targetWords: STREAM_TARGET_WORDS_MAX,
  streamingMessageId: null,
}

const createInitialMessages = (): TChatMessage[] => {
  const samples = seedHistorySamples(MAX_HISTORY_ITEMS)

  return samples.map((content, index) => ({
    id: crypto.randomUUID(),
    role: index % 2 === 0 ? 'user' : 'assistant',
    content,
    isStreaming: false,
    createdAt: Date.now() - (samples.length - index) * 60_000,
  }))
}

const buildAssistantMessage = (): TChatMessage => ({
  id: crypto.randomUUID(),
  role: 'assistant',
  content: '',
  isStreaming: true,
  createdAt: Date.now(),
})

const pickTargetWords = (): number => {
  const range = STREAM_TARGET_WORDS_MAX - STREAM_TARGET_WORDS_MIN
  const randomOffset = Math.floor(Math.random() * (range + 1))
  return STREAM_TARGET_WORDS_MIN + randomOffset
}

const pickInstantWords = (): number => {
  const range = INSTANT_TARGET_WORDS_MAX - INSTANT_TARGET_WORDS_MIN
  const randomOffset = Math.floor(Math.random() * (range + 1))
  return INSTANT_TARGET_WORDS_MIN + randomOffset
}

const buildInstantText = (wordsCount: number): string => {
  const chunks: string[] = []
  let nextIndex = 0

  for (let remaining = wordsCount; remaining > 0; remaining -= 1) {
    const word = buildWordChunk(1, nextIndex)
    nextIndex += 1
    chunks.push(word)
  }

  return chunks.join(' ')
}

export const useChatStore = create<TChatState>((set, get) => {
  const flushBufferedChunk = () => {
    if (runtime.bufferedChunk === '') {
      return
    }

    const chunk = runtime.bufferedChunk
    runtime.bufferedChunk = ''

    set((state) => {
      if (state.messages.length === 0) {
        return state
      }

      const streamingMessageId = runtime.streamingMessageId
      if (!streamingMessageId) {
        return state
      }

      const nextMessages = [...state.messages]
      const messageIndex = nextMessages.findIndex(
        (message) => message.id === streamingMessageId,
      )

      if (messageIndex === -1) {
        return state
      }

      const message = nextMessages[messageIndex]

      if (message.role !== 'assistant') {
        return state
      }

      const updatedMessage: TChatMessage = {
        ...message,
        content: `${message.content} ${chunk}`.trim(),
      }

      nextMessages[messageIndex] = updatedMessage

      return {
        messages: nextMessages,
        generatedWords: runtime.wordsGenerated,
      }
    })
  }

  const scheduleFlush = () => {
    if (runtime.isFlushScheduled) {
      return
    }

    runtime.isFlushScheduled = true

    requestAnimationFrame(() => {
      runtime.isFlushScheduled = false
      flushBufferedChunk()
    })
  }

  const stopInterval = () => {
    if (runtime.intervalId !== null) {
      clearInterval(runtime.intervalId)
      runtime.intervalId = null
    }
  }

  const resetRuntime = () => {
    runtime.bufferedChunk = ''
    runtime.isFlushScheduled = false
    runtime.wordsGenerated = 0
    runtime.nextWordIndex = 0
    runtime.targetWords = pickTargetWords()
    runtime.streamingMessageId = null
  }

  const markStreamStopped = () => {
    set((state) => {
      if (state.messages.length === 0) {
        return state
      }

      const streamingMessageId = runtime.streamingMessageId
      if (!streamingMessageId) {
        return state
      }

      const nextMessages = [...state.messages]
      const messageIndex = nextMessages.findIndex(
        (message) => message.id === streamingMessageId,
      )

      if (messageIndex === -1) {
        return state
      }

      const message = nextMessages[messageIndex]

      if (!message.isStreaming) {
        return state
      }

      nextMessages[messageIndex] = { ...message, isStreaming: false }

      return { messages: nextMessages }
    })
  }

  const clearHistoryInternal = () => {
    stopInterval()
    resetRuntime()
    set({
      messages: [],
      isGenerating: false,
      generatedWords: 0,
      targetWords: runtime.targetWords,
    })
  }

  const stopStream = () => {
    const finishedWords = runtime.wordsGenerated
    const finishedTarget = runtime.targetWords

    stopInterval()
    flushBufferedChunk()
    markStreamStopped()
    resetRuntime()

    set({
      isGenerating: false,
      targetWords: finishedTarget,
      generatedWords: finishedWords,
    })
  }

  return {
    messages: createInitialMessages(),
    isGenerating: false,
    isAutoScroll: true,
    generatedWords: 0,
    targetWords: runtime.targetWords,
    addUserMessage: (text: string) => {
      const trimmed = text.trim()

      if (trimmed === '') {
        return
      }

      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: trimmed,
            isStreaming: false,
            createdAt: Date.now(),
          },
        ],
      }))
    },
    addUserMessageAndInstantReply: (text: string) => {
      const trimmed = text.trim()

      if (trimmed === '') {
        return
      }

      const instantWords = pickInstantWords()
      const assistantText = buildInstantText(instantWords)

      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: trimmed,
            isStreaming: false,
            createdAt: Date.now(),
          },
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: assistantText,
            isStreaming: false,
            createdAt: Date.now(),
          },
        ],
        isAutoScroll: true,
      }))
    },
    startAssistantStream: () => {
      if (get().isGenerating) {
        stopStream()
      }

      resetRuntime()

      const assistantMessage = buildAssistantMessage()
      runtime.streamingMessageId = assistantMessage.id

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isGenerating: true,
        isAutoScroll: true,
        generatedWords: 0,
        targetWords: runtime.targetWords,
      }))

      runtime.intervalId = window.setInterval(() => {
        const chunk = buildWordChunk(STREAM_CHUNK_SIZE, runtime.nextWordIndex)
        runtime.nextWordIndex += STREAM_CHUNK_SIZE
        runtime.wordsGenerated += STREAM_CHUNK_SIZE

        runtime.bufferedChunk = `${runtime.bufferedChunk} ${chunk}`.trim()
        scheduleFlush()

        if (runtime.wordsGenerated >= runtime.targetWords) {
          stopStream()
        }
      }, STREAM_DELAY_MS)
    },
    stopGeneration: () => {
      stopStream()
    },
    toggleAutoScroll: (value: boolean) => set({ isAutoScroll: value }),
    clearHistory: () => {
      clearHistoryInternal()
    },
  }
})

