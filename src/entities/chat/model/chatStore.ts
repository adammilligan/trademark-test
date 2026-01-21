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
import {
  createTextChunkGenerator,
  generateTextWithCode,
  TTextChunkGenerator,
} from '@shared/lib/textGenerator'

import { TChatMessage, TMessageRole } from '@entities/message/model/types'

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
  targetWords: number
  streamingMessageId: string | null
  textGenerator: TTextChunkGenerator | null
}

const runtime: TGenerationRuntime = {
  intervalId: null,
  bufferedChunk: '',
  isFlushScheduled: false,
  wordsGenerated: 0,
  targetWords: STREAM_TARGET_WORDS_MAX,
  streamingMessageId: null,
  textGenerator: null,
}

const buildMessage = (
  role: TMessageRole,
  content: string,
  isStreaming: boolean,
): TChatMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  isStreaming,
  createdAt: Date.now(),
})

const buildAssistantMessage = (): TChatMessage => buildMessage('assistant', '', true)

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
  return generateTextWithCode(wordsCount)
}

export const useChatStore = create<TChatState>((set, get) => {
  const logMessages = (action: string, messages: TChatMessage[]) => {
    console.log('[chatStore]', action, { count: messages.length, messages })
  }

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

      logMessages('flushBufferedChunk', nextMessages)

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
    runtime.targetWords = pickTargetWords()
    runtime.streamingMessageId = null
    runtime.textGenerator = null
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

      logMessages('markStreamStopped', nextMessages)

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
    logMessages('clearHistory', [])
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
    messages: [],
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
        messages: [...state.messages, buildMessage('user', trimmed, false)],
      }))
      logMessages('addUserMessage', [...get().messages])
    },
    addUserMessageAndInstantReply: (text: string) => {
      const trimmed = text.trim()

      if (trimmed === '') {
        return
      }

      const instantWords = pickInstantWords()
      const assistantText = buildInstantText(instantWords)

      set((state) => {
        const nextMessages: TChatMessage[] = [
          ...state.messages,
          buildMessage('user', trimmed, false),
          buildMessage('assistant', assistantText, false),
        ]

        logMessages('instantReply', nextMessages)

        return {
          messages: nextMessages,
          isAutoScroll: true,
        }
      })
    },
    startAssistantStream: () => {
      if (get().isGenerating) {
        stopStream()
      }

      resetRuntime()

      const assistantMessage = buildAssistantMessage()
      runtime.streamingMessageId = assistantMessage.id
      runtime.textGenerator = createTextChunkGenerator(runtime.targetWords)

      set((state) => {
        const nextMessages = [...state.messages, assistantMessage]
        logMessages('startAssistantStream', nextMessages)

        return {
          messages: nextMessages,
          isGenerating: true,
          isAutoScroll: true,
          generatedWords: 0,
          targetWords: runtime.targetWords,
        }
      })

      runtime.intervalId = window.setInterval(() => {
        const generator = runtime.textGenerator
        if (!generator) {
          stopStream()
          return
        }

        const next = generator.nextChunk(STREAM_CHUNK_SIZE)
        if (!next) {
          stopStream()
          return
        }

        runtime.wordsGenerated += next.words
        runtime.bufferedChunk = `${runtime.bufferedChunk}${next.text}`
        scheduleFlush()

        if (runtime.wordsGenerated >= runtime.targetWords) {
          stopStream()
        }
      }, STREAM_DELAY_MS)
    },
    stopGeneration: () => {
      stopStream()
      logMessages('stopGeneration', [...get().messages])
    },
    toggleAutoScroll: (value: boolean) => {
      set({ isAutoScroll: value })
      logMessages('toggleAutoScroll', [...get().messages])
    },
    clearHistory: () => {
      clearHistoryInternal()
    },
  }
})

