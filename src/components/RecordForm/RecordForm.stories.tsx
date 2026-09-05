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
export const InvalidConfig = story(examples.invalidConfig)
