import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ChatAdapter, ChatMessage } from '../../adapters'
import { fakeChat } from '../../adapters/fake'
import { Chat } from './Chat'
import * as examples from './Chat.examples'

/** An adapter the test drives by hand, so a "new message" is one explicit call. */
function scriptedChat(initial: ChatMessage[] = []) {
  const messages = [...initial]
  const listeners = new Set<(messages: ChatMessage[]) => void>()
  const sent: { text: string; attachments?: unknown }[] = []

  const adapter: ChatAdapter = {
    async history() {
      return [...messages]
    },
    async send(text, attachments) {
      sent.push({ text, attachments })
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }

  return {
    adapter,
    sent,
    push(message: ChatMessage) {
      messages.push(message)
      act(() => {
        for (const listener of listeners) listener([...messages])
      })
    },
  }
}

/** jsdom lays nothing out, so the feed is given the geometry the pinning rule reads. */
function measureFeed(scrollHeight: number, clientHeight: number) {
  const feed = screen.getByRole('log')
  Object.defineProperty(feed, 'scrollHeight', { value: scrollHeight, configurable: true })
  Object.defineProperty(feed, 'clientHeight', { value: clientHeight, configurable: true })
  return feed
}

/** Lets the adapter's `history()` promise land, so no state update escapes `act`. */
const flush = () => act(async () => {})

const agentMessage = (id: string, text: string): ChatMessage => ({
  id,
  role: 'agent',
  text,
  at: '2026-09-10T09:30:00Z',
})

describe('Chat', () => {
  it('renders every documented example without crashing', async () => {
    for (const example of examples.chatExamples) {
      const { unmount } = render(<Chat {...example.props} />)
      await flush()
      unmount()
    }
  })

  it('sends the draft on Enter and clears the composer', async () => {
    const script = scriptedChat()
    render(<Chat config={{}} adapters={{ chat: script.adapter }} />)

    const composer = screen.getByRole('textbox')
    await userEvent.type(composer, 'is the Kona wheel done?{Enter}')

    expect(script.sent).toEqual([{ text: 'is the Kona wheel done?', attachments: undefined }])
    expect(composer).toHaveValue('')
  })

  it('breaks the line on Shift+Enter instead of sending', async () => {
    const script = scriptedChat()
    render(<Chat config={{}} adapters={{ chat: script.adapter }} />)

    const composer = screen.getByRole('textbox')
    await userEvent.type(composer, 'first line{Shift>}{Enter}{/Shift}second line')

    expect(script.sent).toEqual([])
    expect(composer).toHaveValue('first line\nsecond line')
  })

  it('follows a new message while the reader is at the bottom', async () => {
    const script = scriptedChat([agentMessage('m-1', 'Morning.')])
    render(<Chat config={{}} adapters={{ chat: script.adapter }} />)
    await flush()

    const feed = measureFeed(500, 100)
    script.push(agentMessage('m-2', 'Ticket #4185 is waiting on seals.'))

    expect(feed.scrollTop).toBe(500)
  })

  it('leaves the scroll alone once the reader has scrolled up', async () => {
    const script = scriptedChat([agentMessage('m-1', 'Morning.')])
    render(<Chat config={{}} adapters={{ chat: script.adapter }} />)
    await flush()

    const feed = measureFeed(500, 100)
    feed.scrollTop = 40
    act(() => {
      feed.dispatchEvent(new Event('scroll', { bubbles: true }))
    })

    script.push(agentMessage('m-2', 'Ticket #4185 is waiting on seals.'))

    expect(feed.scrollTop).toBe(40)
  })

  it('shows the agent thinking once it has taken the turn but written nothing', async () => {
    const script = scriptedChat([agentMessage('m-1', 'Morning.')])
    render(<Chat config={{ agentName: 'Golem' }} adapters={{ chat: script.adapter }} />)
    await flush()

    expect(screen.queryByText('Golem is thinking…')).not.toBeInTheDocument()

    script.push({ id: 'm-2', role: 'agent', text: '', at: '2026-09-10T09:31:00Z', streaming: true })

    expect(screen.getByText('Golem is thinking…')).toBeInTheDocument()
  })

  it('streams a reply into one bubble that grows', async () => {
    const reply = 'Rebuilt the wheel and put it back on the rack.'
    const adapter = fakeChat([], { replies: [reply], tokenDelayMs: 50 })
    render(<Chat config={{ agentName: 'Golem' }} adapters={{ chat: adapter }} />)

    await userEvent.type(screen.getByRole('textbox'), 'wheel?{Enter}')

    // Caught mid-flight: one agent bubble, still marked streaming, already carrying part of the text.
    await waitFor(() => {
      const mid = document.querySelectorAll('[data-golem-chat-message="agent"][data-streaming]')
      expect(mid).toHaveLength(1)
      expect(mid[0]!.textContent).not.toBe('')
    })

    await waitFor(() => {
      const bubbles = document.querySelectorAll('[data-golem-chat-message="agent"]')
      expect(bubbles).toHaveLength(1)
      expect(bubbles[0]).toHaveTextContent(reply)
      expect(bubbles[0]).not.toHaveAttribute('data-streaming')
    })
  })

  it('sends what a hosted attach slot staged, and takes the paperclip away', async () => {
    const { adapter, sent } = scriptedChat()
    render(
      <Chat
        config={{ placeholder: 'Ask Golem…' }}
        adapters={{ chat: adapter }}
        attach={(stage) => (
          <button
            type="button"
            onClick={() => stage([{ id: 'f-3', name: 'fork-seals.jpg', size: 2048 }])}
          >
            Pick a file
          </button>
        )}
      />,
    )
    await act(async () => {})

    // The slot replaces the built-in paperclip rather than sitting beside it.
    expect(screen.queryByRole('button', { name: 'Attach a file' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Pick a file' }))
    await userEvent.type(screen.getByLabelText('Ask Golem…'), 'here are the fork photos')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(sent).toHaveLength(1)
    expect(sent[0]!.attachments).toEqual([{ id: 'f-3', name: 'fork-seals.jpg', size: 2048 }])
  })

  it('renders an error card naming every invalid field instead of the conversation', () => {
    render(<Chat {...examples.invalidConfig.props} />)

    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('placeholder')
    expect(card).toHaveTextContent('maxComposerLines')
    expect(screen.queryByRole('log')).not.toBeInTheDocument()
  })

  it('rejects unknown config fields, so a misspelt option is never silently ignored', () => {
    render(<Chat {...examples.empty.props} config={{ showtimestamps: true } as never} />)
    expect(screen.getByRole('alert')).toHaveTextContent('showtimestamps')
  })
})
