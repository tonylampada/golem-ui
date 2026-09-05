import type { Meta, StoryObj } from '@storybook/react-vite'
import { Report } from './Report'
import * as examples from './Report.examples'

const meta = {
  title: 'Components/Report',
  component: Report,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Report>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Every story is one example from `Report.examples.tsx` — the same file the tests import — framed
 * at the width that example is meant to be read at. `printPreview` wraps it in the class that
 * forces the print stylesheet, so the printed sheet is visible without a print dialog.
 */
const story = (example: examples.ReportExample): Story => ({
  name: example.name,
  args: example.props,
  parameters: { docs: { description: { story: example.summary } } },
  decorators: [
    (Story) => (
      <div
        className={example.printPreview ? 'golem-print-preview bg-white' : undefined}
        style={{ width: example.viewportWidth, maxWidth: '100%', padding: 16 }}
      >
        <Story />
      </div>
    ),
  ],
})

export const Today = story(examples.today)
export const Draft = story(examples.draft)
export const EmptyPeriod = story(examples.emptyPeriod)
export const Month = story(examples.month)
export const LiveUpdate = story(examples.live)
export const PrintPreview = story(examples.printPreview)
export const InvalidConfig = story(examples.invalidConfig)
