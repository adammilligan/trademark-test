import { create } from 'zustand'

import {
  STREAM_CHUNK_WORDS,
  STREAM_DELAY_MS,
  STREAM_TARGET_WORDS_MAX,
  STREAM_TARGET_WORDS_MIN,
  USER_TARGET_WORDS_MAX,
  USER_TARGET_WORDS_MIN,
} from '@shared/config/chatConfig'
import { createTextChunkGenerator, TTextChunkGenerator } from '@shared/lib/textGenerator'

import { TChatMessage, TMessageRole } from '@entities/message/model/types'

type TChatState = {
  messages: TChatMessage[]
  isGenerating: boolean
  isAutoScroll: boolean
  generatedWords: number
  targetWords: number
  addUserMessage: (text: string) => void
  startGeneration: () => void
  stopGeneration: () => void
  toggleAutoScroll: (value: boolean) => void
}

type TGenerationRuntime = {
  intervalId: number | null
  wordsGenerated: number
  targetWords: number
  streamingMessageId: string | null
  textGenerator: TTextChunkGenerator | null
  bufferedChunk: string
  isFlushScheduled: boolean
}

const runtime: TGenerationRuntime = {
  intervalId: null,
  wordsGenerated: 0,
  targetWords: 0,
  streamingMessageId: null,
  textGenerator: null,
  bufferedChunk: '',
  isFlushScheduled: false,
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
        // Важно: чанки уже содержат нужные пробелы/переносы/markdown fences.
        // Нельзя добавлять лишние пробелы или trim(), иначе ломаются code blocks и разметка.
        content: `${message.content}${chunk}`,
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
    runtime.targetWords = 0
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

      return { messages: nextMessages }
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

  const pickTargetWords = (min: number, max: number): number => {
    const range = max - min
    const randomOffset = Math.floor(Math.random() * (range + 1))
    return min + randomOffset
  }

  const startStreamSession = (minWords: number, maxWords: number) => {
    const targetWords = pickTargetWords(minWords, maxWords)
    resetRuntime()
    runtime.targetWords = targetWords
    runtime.textGenerator = createTextChunkGenerator(targetWords)

    set((state) => {
      const assistantMessage = buildAssistantMessage()
      runtime.streamingMessageId = assistantMessage.id
      const nextMessages = [...state.messages, assistantMessage]

      return {
        messages: nextMessages,
        isGenerating: true,
        isAutoScroll: true,
        generatedWords: 0,
        targetWords,
      }
    })

    const pushChunk = () => {
      const generator = runtime.textGenerator
      if (!generator) {
        stopStream()
        return
      }

      const next = generator.nextChunk(STREAM_CHUNK_WORDS)
      if (!next) {
        stopStream()
        return
      }

      runtime.wordsGenerated += next.words
      runtime.bufferedChunk = `${runtime.bufferedChunk}${next.text}`
      scheduleFlush()

      if (runtime.wordsGenerated >= targetWords) {
        stopStream()
      }
    }

    // Первую порцию отдаём сразу, чтобы не было пустого сообщения
    pushChunk()

    runtime.intervalId = window.setInterval(() => {
      pushChunk()
    }, STREAM_DELAY_MS)
  }

  return {
    messages: [],
    isGenerating: false,
    isAutoScroll: true,
    generatedWords: 0,
    targetWords: STREAM_TARGET_WORDS_MAX,
    addUserMessage: (text: string) => {
      const trimmed = text.trim()

      if (trimmed === '') {
        return
      }

      if (get().isGenerating) {
        stopStream()
      }

      set((state) => ({
        messages: [...state.messages, buildMessage('user', trimmed, false)],
      }))

      startStreamSession(USER_TARGET_WORDS_MIN, USER_TARGET_WORDS_MAX)
    },
    startGeneration: () => {
      if (get().isGenerating) {
        return
      }

      startStreamSession(STREAM_TARGET_WORDS_MIN, STREAM_TARGET_WORDS_MAX)
    },
    stopGeneration: () => {
      stopStream()
    },
    toggleAutoScroll: (value: boolean) => set({ isAutoScroll: value }),
  }
})






