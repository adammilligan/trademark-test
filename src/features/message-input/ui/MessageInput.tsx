import { FormEvent, useEffect, useRef, useState } from 'react'

import { useChatStore } from '@entities/chat/model/chatStore'

export const MessageInput = () => {
  const [value, setValue] = useState('')
  const mobileTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const addUserMessage = useChatStore((state) => state.addUserMessage)

  useEffect(() => {
    const textarea = mobileTextareaRef.current
    if (!textarea) {
      return
    }

    textarea.style.height = 'auto'
    const scrollHeight = textarea.scrollHeight
    const maxHeight = 120
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
  }, [value])

  const handleMobileTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()

      if (value.trim() === '') {
        return
      }

      addUserMessage(value)
      setValue('')
    }
  }

  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()

      const target = event.currentTarget
      const { selectionStart, selectionEnd } = target
      const currentValue = target.value
      const nextValue =
        currentValue.slice(0, selectionStart) + '\n' + currentValue.slice(selectionEnd)

      setValue(nextValue)

      requestAnimationFrame(() => {
        const cursor = selectionStart + 1
        target.selectionStart = cursor
        target.selectionEnd = cursor
      })

      return
    }

    event.preventDefault()

    if (value.trim() === '') {
      return
    }

    addUserMessage(value)
    setValue('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    addUserMessage(value)
    setValue('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-row items-end gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-2 md:flex-col md:gap-3 md:p-4"
    >
      <label
        className="hidden text-sm font-medium text-slate-200 md:block"
        htmlFor="user-message"
      >
        Ваш запрос
      </label>
      <textarea
        ref={mobileTextareaRef}
        id="user-message-mobile"
        value={value}
        onKeyDown={handleMobileTextareaKeyDown}
        onChange={(event) => setValue(event.target.value)}
        className="min-h-[44px] max-h-[120px] flex-1 resize-none overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-3 text-left placeholder:text-left text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:hidden"
        placeholder="Опишите задачу…"
        rows={1}
      />
      <textarea
        id="user-message"
        value={value}
        onKeyDown={handleTextareaKeyDown}
        onChange={(event) => setValue(event.target.value)}
        className="hidden max-h-[180px] min-h-[72px] w-full resize-none overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 md:block"
        placeholder="Опишите задачу или вставьте длинный текст…"
      />
      <button
        type="submit"
        className="h-[44px] w-11 shrink-0 self-end rounded-full bg-emerald-500 text-lg font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-50 md:h-auto md:w-auto md:rounded-lg md:px-4 md:py-2 md:text-sm"
        disabled={value.trim() === ''}
        aria-label="Отправить сообщение"
      >
        <span className="md:hidden">↑</span>
        <span className="hidden md:inline">Отправить</span>
      </button>
    </form>
  )
}

