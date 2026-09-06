import type { AdapterDocs } from '../abi'

export const chatAdapterDocs: AdapterDocs = {
  name: 'Chat',
  slug: 'chat',
  storybookPath: 'adapters-chat',
  tagline:
    'The conversation with the agent: the history, one way to send, and a stream that arrives token by token.',

  purpose: `\`Chat\` is the conversation itself — the transport between the reader and whatever agent is answering.
It is three methods, and the smallest of them carries the most: \`subscribe\` is called with **the
whole conversation** on every change, including each token of a reply being written.

That "whole conversation every time" is the design. The component holds no message state of its own,
so there is no reconciliation to get wrong and nothing to drift. Implement it over SSE, a WebSocket,
a polling loop, or a canned script.`,

  methods: [
    {
      signature: 'history(): Promise<ChatMessage[]>',
      guarantees:
        'The conversation so far, oldest first. Called once on mount; everything after that arrives through `subscribe`. An empty conversation is an empty array, not an error.',
    },
    {
      signature: 'send(text: string, attachments?: ChatAttachment[]): Promise<void>',
      guarantees: `Resolves nothing. **The sent message reaches the component through \`subscribe\`, not through this
promise** — the adapter appends it to the conversation and emits, which is what puts the reader's own
line on screen. \`attachments\` are refs the composer is already holding: a name and a size, never
bytes. Getting the bytes somewhere is the \`Files\` adapter's job, done before \`send\` is called.`,
      throws:
        'An `Error` whose `message` is shown in the composer as written. A send that failed leaves no message in the conversation.',
    },
    {
      signature: 'subscribe(listener: (messages: ChatMessage[]) => void): Unsubscribe',
      guarantees: `Calls the listener with the **entire** conversation on every change: a message sent, a reply starting,
and every token of that reply. Returns the function that detaches it.`,
    },
  ],

  notes: `**Streaming is one message id emitted again and again.** The adapter re-emits the same \`id\` with a
longer \`text\` and \`streaming: true\`; **the last emission of that id drops the flag, and that is
\`done\`.** There is no separate completion event to miss.

- An empty \`text\` with \`streaming: true\` is the agent thinking before its first token — the component
  draws the thinking bubble off exactly that.
- A stream that stops without ever dropping the flag leaves the bubble writing forever. If the
  transport can fail mid-reply, emit the id one last time without the flag.

**A \`ChatMessage\` is \`id\`, \`role\` (\`'user'\` or \`'agent'\`), \`text\`, and \`at\` as an ISO datetime.**
\`text\` is markdown, and the component renders it as such.

**A \`ChatAttachment\` is a name and an optional size, no bytes and no URL.** \`size\` shows on the chip
as \`12 KB\`; leave it off and the chip carries the name alone. Pair this adapter with \`Files\` when the
attachment has to be openable later.`,

  fake: {
    name: 'fakeChat',
    what: `An in-memory conversation that really streams. \`send\` echoes the reader's message, then writes the
next canned reply **word by word under one message id**, thinking bubble first — so a component's
streaming path is exercised with no backend. \`replies\` are answered in order and loop when they run
out; an empty list leaves the agent mute. \`tokenDelayMs\` is the whole difference between a story
worth watching and a test that finishes: stories want ~45 ms, tests want 0.`,
    example: `import { Chat, fakeChat } from 'golem-ui'

const chat = fakeChat(
  [
    { id: 'm-1', role: 'user', text: 'What is on the bench today?', at: '2026-01-01T08:40:00Z' },
    { id: 'm-2', role: 'agent', text: 'Two tickets waiting.', at: '2026-01-01T08:40:06Z' },
  ],
  { replies: ['Noted — writing that down now.'], tokenDelayMs: 45 },
)

;<Chat config={chatConfig} adapters={{ chat }} />`,
  },

  consumers: ['Chat'],
}
