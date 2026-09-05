import type { Meta, StoryObj } from '@storybook/react-vite'
import { Timeline } from './Timeline'
import * as examples from './Timeline.examples'

const meta = {
  title: 'Components/Timeline',
  component: Timeline,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Timeline>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Every story is one example from `Timeline.examples.tsx` — the same file the tests import —
 * framed at the width that example is meant to be read at. The clock behind them is frozen, so
 * "14 min ago" says the same thing on every run.
 */
const story = (example: examples.TimelineExample): Story => ({
  name: example.name,
  args: example.props,
  parameters: { docs: { description: { story: example.summary } } },
  decorators: [
    (Story) => (
      <div style={{ width: example.viewportWidth, maxWidth: '100%', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
})

export const ADay = story(examples.aDay)
export const GroupedDays = story(examples.groupedDays)
export const FiltersAndSearch = story(examples.filtered)
export const Composer = story(examples.withComposer)
export const EntryArriving = story(examples.live)
export const Empty = story(examples.empty)
export const InvalidConfig = story(examples.invalidConfig)
