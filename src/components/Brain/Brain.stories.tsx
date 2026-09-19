import type { Meta, StoryObj } from '@storybook/react-vite'
import { Brain } from './Brain'
import * as examples from './Brain.examples'

const meta = {
  title: 'Components/Brain',
  component: Brain,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Brain>

export default meta
type Story = StoryObj<typeof meta>

const frame = (width: number, theme: 'light' | 'dark', children: React.ReactNode) => (
  <div
    data-golem-theme={theme}
    style={{
      width,
      maxWidth: '100%',
      height: 560,
      border: '1px solid #e5e5e5',
      borderRadius: 8,
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
)

const story = (example: examples.BrainExample, theme: 'light' | 'dark' = 'light'): Story => ({
  name: theme === 'dark' ? `${example.name} (dark)` : example.name,
  args: example.props,
  parameters: { docs: { description: { story: example.summary } } },
  decorators: [(Story) => frame(example.viewportWidth, theme, <Story />)],
})

export const RootIndex = story(examples.rootIndex)
export const CitedPassage = story(examples.openLocation)
export const CitedPassageDark = story(examples.openLocation, 'dark')
export const Phone = story(examples.phone)
export const InvalidConfig = story(examples.invalidConfig)

/** Chat beside Brain: click the chip under the agent's reply and the reader opens on the lines it cited. */
export const AnswerWithASource: Story = {
  name: 'Answer with a source',
  args: examples.openLocation.props,
  render: () => <examples.AnswerWithASource />,
  decorators: [(Story) => frame(1100, 'light', <Story />)],
}

export const AnswerWithASourceDark: Story = {
  ...AnswerWithASource,
  name: 'Answer with a source (dark)',
  decorators: [(Story) => frame(1100, 'dark', <Story />)],
}
