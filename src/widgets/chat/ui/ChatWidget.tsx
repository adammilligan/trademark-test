import { MessageList } from '@entities/message/ui/MessageList'

import { GenerationPanel } from '@features/generation/ui/GenerationPanel'
import { MessageInput } from '@features/message-input/ui/MessageInput'

export const ChatWidget = () => (
  <div className="flex h-full flex-col gap-3 md:gap-4">
    <GenerationPanel />
    <div className="min-h-0 flex-1">
      <MessageList />
    </div>
    <MessageInput />
  </div>
)

