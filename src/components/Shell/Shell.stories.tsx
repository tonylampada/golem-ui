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
 * the width the example is meant to be seen at, so the phone story really is narrower than its
 * breakpoint. An example with `press` has that bar button pressed after the first paint.
 */
const story = (example: examples.ShellExample, theme: 'light' | 'dark' = 'light'): Story => ({
  name: theme === 'dark' ? `${example.name} (dark)` : example.name,
  args: example.props,
  parameters: { docs: { description: { story: example.summary } } },
  play: example.press
    ? async ({ canvasElement }) => {
        canvasElement.querySelector<HTMLButtonElement>(`[aria-label="${example.press}"]`)?.click()
      }
    : undefined,
  decorators: [
    (Story) => (
      <div
        data-golem-theme={theme}
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
export const DesktopChatClosed = story(examples.desktopChatClosed)
export const ChatOnRight = story(examples.chatOnRight)
export const SettingsOpen = story(examples.settingsOpen)
export const Phone = story(examples.phone)
export const PhoneChatOpen = story(examples.phoneChatOpen)
export const WithoutTopBar = story(examples.withoutTopBar)
export const DesktopDark = story(examples.desktop, 'dark')
export const PhoneChatOpenDark = story(examples.phoneChatOpen, 'dark')
export const InvalidConfig = story(examples.invalidConfig)
