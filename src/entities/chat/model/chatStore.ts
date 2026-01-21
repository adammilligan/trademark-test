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

/**
 * Состояние чата в Zustand store
 */
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

/**
 * Runtime-состояние для управления потоковой генерацией текста
 * Вынесено за пределы React-состояния для оптимизации производительности
 */
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

/**
 * Создаёт объект сообщения чата
 * @param role - роль отправителя (user или assistant)
 * @param content - текст сообщения
 * @param isStreaming - флаг, что сообщение находится в процессе стриминга
 */
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

/**
 * Создаёт пустое сообщение ассистента для начала стриминга
 */
const buildAssistantMessage = (): TChatMessage => buildMessage('assistant', '', true)

/**
 * Zustand store для управления состоянием чата и потоковой генерацией
 */
export const useChatStore = create<TChatState>((set, get) => {
  /**
   * Записывает накопленный буфер чанков в сообщение ассистента через Zustand
   * Используется для батчинга обновлений и предотвращения лишних ререндеров
   */
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

  /**
   * Планирует запись буфера в store через requestAnimationFrame
   * Гарантирует, что flush выполнится только один раз за кадр анимации
   */
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

  /**
   * Останавливает интервал генерации чанков
   */
  const stopInterval = () => {
    if (runtime.intervalId !== null) {
      clearInterval(runtime.intervalId)
      runtime.intervalId = null
    }
  }

  /**
   * Сбрасывает runtime-состояние генерации в начальное значение
   */
  const resetRuntime = () => {
    runtime.bufferedChunk = ''
    runtime.isFlushScheduled = false
    runtime.wordsGenerated = 0
    runtime.targetWords = 0
    runtime.streamingMessageId = null
    runtime.textGenerator = null
  }

  /**
   * Помечает текущее стримящееся сообщение как завершённое (isStreaming = false)
   */
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

  /**
   * Полностью останавливает потоковую генерацию:
   * - останавливает интервал
   * - записывает последний буфер
   * - помечает сообщение как завершённое
   * - сбрасывает runtime
   * - обновляет состояние store
   */
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

  /**
   * Выбирает случайное целевое количество слов в заданном диапазоне
 * @param min - минимальное количество слов
 * @param max - максимальное количество слов
 */
  const pickTargetWords = (min: number, max: number): number => {
    const range = max - min
    const randomOffset = Math.floor(Math.random() * (range + 1))
    return min + randomOffset
  }

  /**
   * Запускает новую сессию потоковой генерации текста
   * Создаёт новое сообщение ассистента и начинает добавлять в него текст чанками
   * @param minWords - минимальное целевое количество слов
   * @param maxWords - максимальное целевое количество слов
   */
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

    /**
     * Генерирует и добавляет следующий чанк текста в буфер
     * Автоматически останавливает стрим при достижении целевого количества слов
     */
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

    // Запускаем интервал для регулярной генерации чанков

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
    /**
     * Добавляет сообщение пользователя и запускает потоковый ответ ассистента
     * Если во время вызова идёт генерация, она останавливается перед добавлением нового сообщения
     * @param text - текст сообщения пользователя
     */
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
    /**
     * Запускает длинную потоковую генерацию текста (1000-10000 слов)
     * Используется при нажатии кнопки "Generate"
     */
    startGeneration: () => {
      if (get().isGenerating) {
        return
      }

      startStreamSession(STREAM_TARGET_WORDS_MIN, STREAM_TARGET_WORDS_MAX)
    },
    /**
     * Останавливает текущую потоковую генерацию
     */
    stopGeneration: () => {
      stopStream()
    },
    /**
     * Переключает состояние автоскролла чата
     * @param value - новое значение автоскролла
     */
    toggleAutoScroll: (value: boolean) => set({ isAutoScroll: value }),
  }
})











