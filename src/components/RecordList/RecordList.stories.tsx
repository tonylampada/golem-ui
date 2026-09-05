import type { Meta, StoryObj } from '@storybook/react-vite'
import { RecordList } from './RecordList'
import * as examples from './RecordList.examples'

const meta = {
  title: 'Components/RecordList',
  component: RecordList,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RecordList>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Every story is one example from `RecordList.examples.tsx` — the same file the tests import —
 * framed at the width that example is meant to be read at, because the width is what picks the
 * layout: a table above 768px, cards below it.
 */
const story = (example: examples.RecordListExample): Story => ({
  name: example.name,
  args: { ...example.props, onOpen: (row) => window.alert(`open ${String(row.ticket)}`) },
  parameters: { docs: { description: { story: example.summary } } },
  decorators: [
    (Story) => (
      <div style={{ width: example.viewportWidth, maxWidth: '100%', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
})

export const Table = story(examples.table)
export const Cards = story(examples.cards)
export const FiltersAndSearch = story(examples.filteredAndSearched)
export const Empty = story(examples.empty)
export const Loading = story(examples.loading)
export const LiveUpdate = story(examples.live)
export const InvalidConfig = story(examples.invalidConfig)
