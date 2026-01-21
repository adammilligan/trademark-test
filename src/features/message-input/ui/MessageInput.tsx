import { FormEvent, useState } from 'react'

import { useChatStore } from '@entities/chat/model/chatStore'

export const MessageInput = () => {
  const [value, setValue] = useState('')
  const addUserMessageAndInstantReply = useChatStore(
    (state) => state.addUserMessageAndInstantReply,
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

    addUserMessageAndInstantReply(value)
    setValue('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    addUserMessageAndInstantReply(value)
    setValue('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4"
    >
      <label className="text-sm font-medium text-slate-200" htmlFor="user-message">
        Ваш запрос
      </label>
      <textarea
        id="user-message"
        value={value}
        onKeyDown={handleKeyDown}
        onChange={(event) => setValue(event.target.value)}
        className="max-h-[180px] min-h-[72px] w-full resize-none overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        placeholder="Опишите задачу или вставьте длинный текст…"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Отправка запускает потоковый ответ ассистента автоматически.
        </p>
        <button
          type="submit"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:opacity-50"
          disabled={value.trim() === ''}
        >
          Отправить
        </button>
      </div>
    </form>
  )
}

