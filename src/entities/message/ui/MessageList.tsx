import { useEffect, useRef } from 'react'

import { useVirtualizer } from '@tanstack/react-virtual'

import { AUTO_SCROLL_OFFSET } from '@shared/config/chatConfig'
import { isNearBottom } from '@shared/lib/scroll'

import { useChatStore } from '@entities/chat/model/chatStore'
import { MessageItem } from '@entities/message/ui/MessageItem'

export const MessageList = () => {
  const scrollParentRef = useRef<HTMLDivElement | null>(null)
  const messages = useChatStore((state) => state.messages)
  const isAutoScroll = useChatStore((state) => state.isAutoScroll)
  const toggleAutoScroll = useChatStore((state) => state.toggleAutoScroll)
  const generatedWords = useChatStore((state) => state.generatedWords)

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollParentRef.current,
    getItemKey: (index) => messages[index]?.id ?? index,
    estimateSize: () => 140,
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 6,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  useEffect(() => {
    if (!isAutoScroll) {
      return
    }

    rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
  }, [messages.length, isAutoScroll, rowVirtualizer])

  useEffect(() => {
    if (!isAutoScroll) {
      return
    }

    rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
  }, [generatedWords, isAutoScroll, messages.length, rowVirtualizer])

  useEffect(() => {
    // При добавлении/удалении сообщений заново измеряем элементы и скроллим к низу,
    // чтобы новое сообщение не «прилипало» к верху списка.
    rowVirtualizer.measure()
    if (isAutoScroll) {
      requestAnimationFrame(() => {
        rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
      })
    }
  }, [messages.length, isAutoScroll, rowVirtualizer])

  useEffect(() => {
    // Важно для стриминга: высота последнего сообщения растёт, и виртуализатор
    // должен переизмерять элементы, иначе новые сообщения могут «наезжать».
    rowVirtualizer.measure()
  }, [generatedWords, rowVirtualizer])

  const handleScroll = () => {
    const element = scrollParentRef.current
    if (!element) {
      return
    }

    const isAtBottom = isNearBottom(element, AUTO_SCROLL_OFFSET)
    toggleAutoScroll(isAtBottom)
  }

  const handleScrollToBottom = () => {
    rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
    toggleAutoScroll(true)
  }

  return (
    <div className="relative h-full">
      <div
        ref={scrollParentRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-4 pb-10"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
            width: '100%',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const message = messages[virtualRow.index]

            return (
              <div
                key={message.id}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="absolute left-0 top-0 w-full px-2"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  width: '100%',
                }}
              >
                <MessageItem message={message} />
              </div>
            )
          })}
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

