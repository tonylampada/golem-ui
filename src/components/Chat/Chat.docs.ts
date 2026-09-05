import type { ComponentDocs } from '../../abi'

export const chatDocs: ComponentDocs = {
  name: 'Chat',
  slug: 'chat',
  storybookPath: 'components-chat',
  tagline:
    'The conversation with the agent: a following message list, a growing composer, replies that stream in.',

  purpose: `\`Chat\` is the conversation between a person and the agent: a message list that follows the newest
message, a composer that grows as you type, markdown in the agent's replies, and a reply that fills
in token by token while you watch. It is the column that goes in \`Shell\`'s \`chat\` slot.

Use it once per conversation. It is the conversation and nothing else: it holds no messages of its
own (the \`Chat\` adapter owns them), it does not know which agent it is talking to, and it does not
route. For a list of past conversations to pick from, that is a different component.`,

  adapters: [
    {
      adapter: 'Chat',
      calls: '`history()`',
      why: 'The conversation as it stands on mount.',
    },
    {
      adapter: 'Chat',
      calls: '`subscribe(listener)`',
      why: 'Every later change: a new message, and each token of a streaming reply.',
    },
    {
      adapter: 'Chat',
      calls: '`send(text, attachments?)`',
      why: 'What the reader typed, with whatever the composer has staged.',
    },
  ],

  adapterNotes: `Chat takes no other adapter. It never fetches, never stores, and never reads a clock — a bubble's
time comes from the message's own \`at\`.

**Streaming is a rule about ids, not a second method.** The adapter re-emits a message with the same
\`id\` and a longer \`text\`, \`streaming: true\` throughout; the emission that drops the flag is \`done\`.
Chat renders that as one bubble that grows with a caret on the end. A \`streaming\` message with no
text yet is the agent thinking, and renders as the thinking row rather than an empty bubble.`,

  slots: [
    {
      slot: 'attach',
      what: 'Replaces the paperclip and the row of staged chips above the composer. It is called with `stage`, which is what the next message is sent with; `Upload.Picker` is what belongs here, so an attachment is a file that really went somewhere. Empty falls back to the built-in paperclip, which stages a name and a size and uploads nothing.',
    },
  ],

  example: `import { Chat, fakeChat } from 'golem-ui'
import 'golem-ui/styles.css'

;<Chat
  config={{
    placeholder: 'Message Golem…',
    emptyState: 'Ask about a ticket, a customer or the day’s report.',
    agentName: 'Golem',
    userName: 'Nadia',
    markdown: true,
    showTimestamps: false,
    maxComposerLines: 6,
  }}
  adapters={{ chat: fakeChat() }}
/>`,

  failureModes: `- **Invalid config.** Chat renders an error card instead of the conversation, in dev and in prod,
  naming every field that failed. An unknown field is a failure too — \`showtimestamps\` does not
  quietly become \`showTimestamps\`.
- **The last message is the reader's.** Chat reads that as a reply the agent owes and shows the
  thinking row until an agent message arrives. A history that *ends* on a user message therefore
  looks like it is still waiting, which is usually true and occasionally a surprise.
- **The reader has scrolled up.** New messages stop moving the list; it follows the newest message
  only while it is already within 48px of the bottom. A stream cannot yank the page out from under
  someone reading.
- **A new adapter object on every render.** Chat re-subscribes when the \`adapters\` prop changes
  identity, which replays \`history()\` and can double a stream. Build adapters once, outside render.
- **Markdown is a subset.** Fenced code, bullet and numbered lists, bold, italic, inline code, and
  \`http(s)\` links. Anything else — tables, images, raw HTML — renders as the characters it is, which
  is also what a half-written token mid-stream does.
- **The built-in paperclip uploads nothing.** It stages a name and a size, which is enough to show
  the chip and enough for an adapter that only wants the metadata. For an attachment that is a real
  file in a real folder, host \`Upload.Picker\` in the \`attach\` slot.
- **Timestamps are UTC**, read straight off the ISO string, so a bubble reads the same everywhere.
  For local time, put local time in \`at\`.`,
}
