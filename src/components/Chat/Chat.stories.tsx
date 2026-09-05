import type { Meta, StoryObj } from '@storybook/react-vite'
import { Chat } from './Chat'
import * as examples from './Chat.examples'

const meta = {
  title: 'Components/Chat',
  component: Chat,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Chat>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Every story is one example from `Chat.examples.tsx` — the same file the tests import — framed at
 * the width of a chat column rather than a page, which is the only width Chat is ever seen at.
 */
const story = (example: examples.ChatExample): Story => ({
  name: example.name,
  args: example.props,
  parameters: { docs: { description: { story: example.summary } } },
  decorators: [
    (Story) => (
      <div
        style={{
          width: example.viewportWidth,
          maxWidth: '100%',
          height: 520,
          border: '1px solid #e5e5e5',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
})

export const Conversation = story(examples.conversationExample)
export const Empty = story(examples.empty)
export const Streaming = story(examples.streaming)
export const WithTimestamps = story(examples.withTimestamps)
export const Live = story(examples.live)
export const InvalidConfig = story(examples.invalidConfig)
