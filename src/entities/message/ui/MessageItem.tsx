import { memo, useDeferredValue } from 'react'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { TChatMessage } from '@entities/message/model/types'

/**
 * Пропсы компонента отдельного сообщения чата
 */
type TMessageItemProps = {
  message: TChatMessage
}

const ROLE_LABEL: Record<TChatMessage['role'], string> = {
  user: 'Вы',
  assistant: 'Помощник',
}

const ROLE_COLORS: Record<TChatMessage['role'], string> = {
  user: 'bg-red-500/80 text-white',
  assistant: 'bg-blue-500/80 text-white',
}

const BUBBLE_COLORS: Record<TChatMessage['role'], string> = {
  user: 'bg-slate-800/90 border-slate-700',
  assistant: 'bg-slate-900/80 border-slate-800',
}

/**
 * Компонент отображения отдельного сообщения в чате
 * Поддерживает гибридный рендеринг: plain text во время стриминга, Markdown после завершения
 * @param message - объект сообщения для отображения
 */
export const MessageItem = memo(({ message }: TMessageItemProps) => {
  const deferredContent = useDeferredValue(message.content)
  const contentToRender = message.isStreaming ? message.content : deferredContent

  return (
    <article
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
      aria-busy={message.isStreaming}
    >
      <div
        className={`max-w-[80%] overflow-hidden rounded-2xl border p-4 shadow-sm ${BUBBLE_COLORS[message.role]}`}
      >
        <header className="mb-2 flex items-center gap-3 text-sm text-slate-400">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold uppercase ${ROLE_COLORS[message.role]}`}
          >
            {message.role === 'user' ? 'В' : 'П'}
          </span>
          <div>
            <p className="font-semibold text-slate-200">{ROLE_LABEL[message.role]}</p>
            <p className="text-xs text-slate-500">
              {new Date(message.createdAt).toLocaleTimeString()}
            </p>
          </div>
          <span className="ml-auto text-xs text-slate-500">
            {message.role === 'assistant' ? 'Ответ' : 'Сообщение'}
          </span>
        </header>
        {message.isStreaming ? (
          <pre className="max-w-full whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-100">
            {contentToRender}
          </pre>
        ) : (
          <div className="prose prose-invert max-w-none break-words text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentToRender}</ReactMarkdown>
          </div>
        )}
      </div>
    </article>
  )
})

MessageItem.displayName = 'MessageItem'

