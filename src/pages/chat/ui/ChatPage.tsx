import { ChatWidget } from '@widgets/chat/ui/ChatWidget'

export const ChatPage = () => (
  <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 px-4 py-6">
    <header className="shrink-0 space-y-2">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">
        Потоковый чат
      </p>
      <h1 className="text-3xl font-semibold text-slate-50">AI Chat</h1>
    </header>
    <div className="min-h-0 flex-1">
      <ChatWidget />
    </div>
  </div>
)

