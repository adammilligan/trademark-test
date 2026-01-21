export type TMessageRole = 'user' | 'assistant'

export type TChatMessage = {
  id: string
  role: TMessageRole
  content: string
  isStreaming: boolean
  createdAt: number
}

