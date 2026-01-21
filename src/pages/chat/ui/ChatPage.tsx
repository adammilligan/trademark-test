import { ChatWidget } from '@widgets/chat/ui/ChatWidget'

/**
 * Страница чата с потоковой генерацией текста
 * Отображает заголовок и основной виджет чата
 */
export const ChatPage = () => (
  <div className="mx-auto flex h-full max-w-6xl flex-col gap-4 px-3 py-3 md:gap-6 md:px-4 md:py-6">
    <header className="shrink-0 space-y-1 md:space-y-2">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">
        Потоковый чат
      </p>
      <h1 className="text-2xl font-semibold text-slate-50 md:text-3xl">AI Chat</h1>
    </header>
    <div className="min-h-0 flex-1">
      <ChatWidget />
    </div>
  </div>
)

