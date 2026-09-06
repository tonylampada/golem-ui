import type { Meta, StoryObj } from '@storybook/react-vite'
import { Editor } from './Editor'
import * as examples from './Editor.examples'

const meta = {
  title: 'Components/Editor',
  component: Editor,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Editor>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Every story is one example from `Editor.examples.tsx` — the same file the tests import — framed at
 * the width and height that example is meant to be read at. The editor fills its frame, so the
 * frame is what decides whether it draws the phone layout or the desktop one.
 */
const story = (example: examples.EditorExample): Story => ({
  name: example.name,
  args: example.props,
  parameters: { docs: { description: { story: example.summary } } },
  decorators: [
    (Story) => (
      <div
        style={{ width: example.viewportWidth, maxWidth: '100%', height: example.height }}
        className="overflow-hidden rounded-xl border border-neutral-200"
      >
        <Story />
      </div>
    ),
  ],
})

export const Editing = story(examples.editing)
export const Preview = story(examples.preview)
export const SplitDesktop = story(examples.splitDesktop)
export const AgentEdit = story(examples.agentEdit)
export const Conflict = story(examples.conflict)
export const ReadOnly = story(examples.readOnly)
export const InvalidConfig = story(examples.invalidConfig)
