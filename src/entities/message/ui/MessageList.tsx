import { useEffect, useRef } from 'react'

import { AUTO_SCROLL_OFFSET } from '@shared/config/chatConfig'
import { isNearBottom } from '@shared/lib/scroll'

import { useChatStore } from '@entities/chat/model/chatStore'
import { MessageItem } from '@entities/message/ui/MessageItem'

/**
 * Компонент списка сообщений чата с поддержкой автоскролла
 * Автоматически прокручивает к последнему сообщению при генерации текста
 * Показывает кнопку "Вниз" при ручной прокрутке пользователем вверх
 */
export const MessageList = () => {
  const scrollParentRef = useRef<HTMLDivElement | null>(null)
  const messages = useChatStore((state) => state.messages)
  const isAutoScroll = useChatStore((state) => state.isAutoScroll)
  const toggleAutoScroll = useChatStore((state) => state.toggleAutoScroll)
  const generatedWords = useChatStore((state) => state.generatedWords)

  useEffect(() => {
    if (!isAutoScroll) {
      return
    }

    const element = scrollParentRef.current
    if (!element) {
      return
    }

    requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight
    })
  }, [messages.length, isAutoScroll])

  useEffect(() => {
    if (!isAutoScroll) {
      return
    }

    const element = scrollParentRef.current
    if (!element) {
      return
    }

    requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight
    })
  }, [generatedWords, isAutoScroll])

  /**
   * Обработчик прокрутки списка сообщений
   * Определяет, находится ли пользователь внизу списка, и управляет автоскроллом
   */
  const handleScroll = () => {
    const element = scrollParentRef.current
    if (!element) {
      return
    }

    const isAtBottom = isNearBottom(element, AUTO_SCROLL_OFFSET)
    toggleAutoScroll(isAtBottom)
  }

  /**
   * Прокручивает список сообщений в самый низ и включает автоскролл
   */
  const handleScrollToBottom = () => {
    const element = scrollParentRef.current
    if (element) {
      element.scrollTop = element.scrollHeight
    }
    toggleAutoScroll(true)
  }

  return (
    <div className="relative h-full">
      <div
        ref={scrollParentRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-4 pb-10"
      >
        <div className="flex flex-col gap-3 px-2">
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
        </div>
      </div>

      {!isAutoScroll ? (
        <button
          type="button"
          onClick={handleScrollToBottom}
          className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
        >
          ↓ Вниз
        </button>
      ) : null}
    </div>
  )
}

