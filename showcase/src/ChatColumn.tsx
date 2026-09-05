import { Chat, type ChatAdapter } from 'golem-ui'

/** The kit's `Chat`, wired to the showcase's streaming adapter. */
export function ChatColumn({ adapter }: { adapter: ChatAdapter }) {
  return (
    <Chat
      config={{
        placeholder: 'Ask Golem…',
        emptyState: 'Ask about a ticket, a customer or today’s report.',
        agentName: 'Golem',
        userName: 'Nadia',
        showTimestamps: true,
        maxComposerLines: 6,
      }}
      adapters={{ chat: adapter }}
    />
  )
}
