import type { Meta, StoryObj } from '@storybook/react-vite'
import { RecordForm } from './RecordForm'
import * as examples from './RecordForm.examples'

const meta = {
  title: 'Components/RecordForm',
  component: RecordForm,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RecordForm>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Every story is one example from `RecordForm.examples.tsx` — the same file the tests import —
 * framed at the width that example is meant to be read at, because the width is what picks the
 * layout: the configured one above 768px, one column below it.
 */
const story = (example: examples.RecordFormExample): Story => ({
  name: example.name,
  args: {
    ...example.props,
    onDone: (row) => window.alert(row ? `saved ${String(row.id)}` : 'deleted'),
    onCancel: () => window.alert('cancelled'),
  },
  parameters: { docs: { description: { story: example.summary } } },
  decorators: [
    (Story) => (
      <div style={{ width: example.viewportWidth, maxWidth: '100%', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
})

export const CreateOnAPhone = story(examples.createPhone)
export const CreateTwoColumn = story(examples.createDesktop)
export const Edit = story(examples.edit)
export const AdapterRefuses = story(examples.refused)
export const ReadOnlyFields = story(examples.readOnlyFields)
export const DeleteWithConfirm = story(examples.deletable)
/** The same example twice over one store, so the second save meets the first one's version. */
const twoWriters = story(examples.staleSave)
export const TwoPeopleSaveOneTicket: Story = {
  ...twoWriters,
  // Saving is the point of this story, so a save does not stop it with an alert.
  args: { ...twoWriters.args, onDone: undefined },
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {['Counter', 'Workshop'].map((who) => (
        <section key={who} aria-label={who} style={{ flex: '1 1 320px', minWidth: 0 }}>
          <h2 style={{ fontWeight: 600, marginBottom: 8 }}>{who}</h2>
          <RecordForm {...args} />
        </section>
      ))}
    </div>
  ),
}
export const InvalidConfig = story(examples.invalidConfig)
