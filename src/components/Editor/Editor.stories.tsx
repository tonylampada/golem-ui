import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
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
/**
 * The host's side of `focus`, as buttons: ask for a passage, ask for the same one again with a new
 * key, ask for another one, or move to another record. Each is a prop change and nothing more. The
 * last button is a second writer, for leaving a record mid-save and coming back to a conflict.
 */
function FocusHost(props: examples.EditorProps) {
  const [focus, setFocus] = useState(props.focus)
  const [id, setId] = useState(props.config.id)
  const [asks, setAsks] = useState(0)
  const ask = (line: number, endLine: number) => {
    setAsks(asks + 1)
    setFocus({ line, endLine, key: String(asks + 1) })
  }
  const brakes = [
    examples.handbookLine('Hydraulic brakes'),
    examples.handbookLine('Pads contaminated'),
  ] as const
  const parts = [
    examples.handbookLine('Parts ordering'),
    examples.handbookLine('A part over $60'),
  ] as const
  /** Another writer rewrites the first brakes line of the bench handbook, straight into the store. */
  const otherWriter = () =>
    void examples.handbookStore.get<examples.DnaDocument>('handbook', 'bench').then((bench) =>
      examples.handbookStore.update('handbook', 'bench', {
        body: bench!.body.replace('- Bleed with', '- Always bleed with'),
        version: bench!.version + 1,
      }),
    )
  const button =
    'rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs font-medium disabled:opacity-40'

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-neutral-200 p-2">
        <button type="button" className={button} onClick={() => ask(...brakes)}>
          Brakes again
        </button>
        <button type="button" className={button} onClick={() => ask(...parts)}>
          Parts ordering
        </button>
        <button type="button" className={button} onClick={() => ask(0, 9999)}>
          Out of range
        </button>
        {['bench', 'counter', 'twin'].map((record) => (
          <button
            key={record}
            type="button"
            className={button}
            disabled={record === id}
            onClick={() => setId(record)}
          >
            Open {record}
          </button>
        ))}
        <button type="button" className={button} onClick={otherWriter}>
          Someone else edits bench
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <Editor {...props} config={{ ...props.config, id }} focus={focus} />
      </div>
    </div>
  )
}

export const FocusPassage: Story = {
  ...story(examples.focusPassage),
  render: (args) => <FocusHost {...args} />,
}
export const InvalidConfig = story(examples.invalidConfig)
