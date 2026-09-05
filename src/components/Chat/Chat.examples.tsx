import type { GolemProps } from '../../abi'
import { fakeChat } from '../../adapters/fake'
import type { ChatAdapter, ChatMessage } from '../../adapters'
import type { ChatAdapters } from './Chat'
import type { ChatConfigInput } from './Chat.config'

export type ChatProps = GolemProps<ChatConfigInput, ChatAdapters>

export interface ChatExample {
  name: string
  summary: string
  props: ChatProps
  /** Width the example is meant to be seen at; the column is narrow wherever it is used. */
  viewportWidth: number
}

/**
 * Adapters are built once, at module load, so the props identity is stable: a component handed a
 * new adapter on every render would re-subscribe — and re-play the stream — on every render.
 */

/** A conversation frozen at one instant: history and nothing after it. Stories need a still frame. */
function frozenChat(messages: ChatMessage[]): ChatAdapter {
  return {
    async history() {
      return messages
    },
    async send() {},
    subscribe: () => () => {},
  }
}

const conversation: ChatMessage[] = [
  {
    id: 'm-1',
    role: 'user',
    text: 'the Rockhopper fork is still waiting on seals — what do I tell the customer?',
    at: '2026-09-10T09:12:00Z',
  },
  {
    id: 'm-2',
    role: 'agent',
    text: 'The **SKF kit** is quoted for Thursday. I would say:\n\n- parts land Thursday\n- bench time Friday morning\n- ready for collection Friday afternoon\n\nWant me to text that to her?',
    at: '2026-09-10T09:13:00Z',
  },
  {
    id: 'm-3',
    role: 'user',
    text: 'yes, and put the photos on the ticket',
    at: '2026-09-10T09:14:00Z',
    attachments: [
      { id: 'a-1', name: 'rockhopper-fork-seals.jpg', size: 2_202_009 },
      { id: 'a-2', name: 'supplier-quote-2211.pdf', size: 327_680 },
    ],
  },
  {
    id: 'm-4',
    role: 'agent',
    text: 'Sent, and both files are on ticket #4185.',
    at: '2026-09-10T09:14:00Z',
  },
]

const emptyAdapters: ChatAdapters = { chat: frozenChat([]) }
const conversationAdapters: ChatAdapters = { chat: frozenChat(conversation) }
const streamingAdapters: ChatAdapters = {
  chat: frozenChat([
    ...conversation,
    {
      id: 'm-5',
      role: 'user',
      text: 'and what is left on the bench today?',
      at: '2026-09-10T09:20:00Z',
    },
    {
      id: 'm-6',
      role: 'agent',
      text: 'Two jobs. The Kona rear wheel is on the stand and the',
      at: '2026-09-10T09:20:00Z',
      streaming: true,
    },
  ]),
}

/** The one adapter that really runs: it echoes, then streams its reply word by word. */
const liveAdapters: ChatAdapters = {
  chat: fakeChat(conversation.slice(0, 2), {
    replies: ['Texted her, and the ticket now says Friday afternoon.'],
    tokenDelayMs: 40,
  }),
}

export const conversationExample: ChatExample = {
  name: 'A conversation',
  summary: 'Markdown in the agent’s reply, attachments as chips on the reader’s.',
  viewportWidth: 380,
  props: { config: { agentName: 'Golem', userName: 'Nadia' }, adapters: conversationAdapters },
}

export const empty: ChatExample = {
  name: 'Empty',
  summary: 'Before the first message: the empty-state line and a composer.',
  viewportWidth: 380,
  props: {
    config: {
      emptyState: 'Ask about a ticket, a customer or the day’s report.',
      placeholder: 'Message Golem…',
    },
    adapters: emptyAdapters,
  },
}

export const streaming: ChatExample = {
  name: 'Streaming',
  summary: 'A reply half written: one bubble whose text is still growing, with a caret.',
  viewportWidth: 380,
  props: { config: { agentName: 'Golem', userName: 'Nadia' }, adapters: streamingAdapters },
}

export const withTimestamps: ChatExample = {
  name: 'With timestamps',
  summary: 'Every bubble labelled with who said it and when, in UTC.',
  viewportWidth: 380,
  props: {
    config: { agentName: 'Golem', userName: 'Nadia', showTimestamps: true },
    adapters: conversationAdapters,
  },
}

export const live: ChatExample = {
  name: 'Live',
  summary: 'On the fake adapter: send something and the answer streams in word by word.',
  viewportWidth: 380,
  props: {
    config: { agentName: 'Golem', userName: 'Nadia', placeholder: 'Message Golem…' },
    adapters: liveAdapters,
  },
}

export const invalidConfig: ChatExample = {
  name: 'Invalid config',
  summary: 'An empty placeholder and a composer taller than the maximum: both fields are named.',
  viewportWidth: 380,
  props: {
    config: { placeholder: '', maxComposerLines: 40 } as unknown as ChatConfigInput,
    adapters: conversationAdapters,
  },
}

export const chatExamples = [
  conversationExample,
  empty,
  streaming,
  withTimestamps,
  live,
  invalidConfig,
]
