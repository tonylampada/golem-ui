import type { Meta, StoryObj } from '@storybook/react-vite'
import { Shell } from './Shell'
import * as examples from './Shell.examples'

const meta = {
  title: 'Components/Shell',
  component: Shell,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Shell>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Every story is one example from `Shell.examples.tsx` — the same file the tests import — framed at
 * the width the example is meant to be seen at, so the mobile story really is narrower than its
 * breakpoint.
 */
const story = (example: examples.ShellExample): Story => ({
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

export const Desktop = story(examples.desktop)
export const ChatOnRight = story(examples.chatOnRight)
export const Mobile = story(examples.mobile)
export const WithoutTopBar = story(examples.withoutTopBar)
export const InvalidConfig = story(examples.invalidConfig)
