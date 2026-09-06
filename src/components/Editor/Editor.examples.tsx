import type { GolemProps } from '../../abi'
import { fakeClock, fakeRecords, type FakeRecords } from '../../adapters/fake'
import type { EditorAdapters, EditorSlots } from './Editor'
import type { EditorConfigInput } from './Editor.config'

export type EditorProps = GolemProps<EditorConfigInput, EditorAdapters, EditorSlots>

export interface EditorExample {
  name: string
  summary: string
  props: EditorProps
  /** The width the example is meant to be read at; the story frames it there. */
  viewportWidth: number
  /** A component that fills its frame needs a height, and the story has to give it one. */
  height: number
}

/**
 * Adapters are built once, at module load, so props identity is stable: a component handed a new
 * adapter on every render would re-subscribe and re-fetch on every render.
 *
 * The document is the workspace DNA of Northgate Cycles, the invented bike shop the showcase is set
 * in — the markdown the agent reads before it changes anything, and the one the person edits back.
 */

export const TODAY = new Date('2026-09-10T13:20:00Z')

/** A type rather than an interface, so it carries the implicit index signature `fakeRecords` takes. */
export type DnaDocument = {
  id: string
  title: string
  body: string
  version: number
}

const RULES = `## Rules

- A ticket is *ready* only when it has been called in to the customer.
- Turnaround target is three days, measured from the ticket date.`

export const dnaBody = `# Northgate Cycles

A neighbourhood bike repair shop. Five people, one bench diary, one counter.

## Records

- **job** — ticket, customer, bike, service, assignee, status, quote, hours, approved, notes
- **log entry** — at, body, kind (note | done | problem | parts), actor
- **attachment** — a photo or an invoice, attached to a job

## Screens

- Today: what is on the bench right now
- Repair jobs: the whole board, newest first
- Daily report: written every morning from yesterday's tickets
- Shop log: what changed, in order
- Photos & invoices
- Team & access

${RULES}
`

export const dna: DnaDocument[] = [{ id: 'dna', title: 'Workspace DNA', body: dnaBody, version: 4 }]

/** What the agent writes into the Rules section when it is asked to revise the document. */
export const revisedRules = `## Rules

- A ticket is *ready* only when it has been called in to the customer.
- Turnaround target is **three days**, measured from the ticket date.
- A quote over $200 needs the owner's sign-off before the work starts.`

const clock = fakeClock(TODAY)

const store = () => fakeRecords({ dna: dna.map((one) => ({ ...one })) })

const quietAdapters: EditorAdapters = { records: store(), clock }
const readOnlyAdapters: EditorAdapters = { records: store(), clock }
const previewAdapters: EditorAdapters = { records: store(), clock }
const splitAdapters: EditorAdapters = { records: store(), clock }

/**
 * A collection the agent is about to write to. `afterMs` after the component subscribes, the Rules
 * section is rewritten and the version goes up — which is the moment the merge happens, whether or
 * not the person is mid-sentence.
 */
function revisingRecords(afterMs: number): FakeRecords {
  const records = store()

  return {
    ...records,
    subscribe(collection, listener) {
      const unsubscribe = records.subscribe(collection, listener)
      const timer = setTimeout(() => {
        void records.update('dna', 'dna', {
          body: dnaBody.replace(RULES, revisedRules),
          version: 5,
        })
      }, afterMs)
      return () => {
        clearTimeout(timer)
        unsubscribe()
      }
    },
  }
}

const agentAdapters: EditorAdapters = { records: revisingRecords(1500), clock }
const conflictAdapters: EditorAdapters = { records: revisingRecords(1500), clock }

/**
 * The person's own edit to the Rules section, unsaved. The agent is about to rewrite the same three
 * lines, which is the one case a merge cannot settle on its own.
 */
const localEdit = dnaBody.replace(
  '- Turnaround target is three days, measured from the ticket date.',
  '- Turnaround target is two days on a tune-up, three on anything with suspension.',
)

/** The config every example starts from: one document, saved a second after typing stops. */
const document: EditorConfigInput = {
  collection: 'dna',
  id: 'dna',
  bodyField: 'body',
  versionField: 'version',
  autosaveMs: 1000,
  preview: 'toggle',
  outline: true,
  readOnly: false,
  placeholder: 'Write the workspace DNA in markdown…',
  highlightMs: 4000,
  locale: 'en-GB',
}

export const editing: EditorExample = {
  name: 'Editing',
  summary:
    'The document as source on a phone: headings, bold and list markers styled where they stand, the toolbar as a bottom strip. Type and the status goes to Unsaved changes, then to Saved a second later.',
  viewportWidth: 390,
  height: 640,
  props: { config: document, adapters: quietAdapters },
}

export const preview: EditorExample = {
  name: 'Preview',
  summary:
    'The same document rendered, through the same markdown the rest of the kit reads. The toggle swaps the pane; the outline still jumps to a heading.',
  viewportWidth: 390,
  height: 640,
  props: { config: { ...document, preview: 'toggle' }, adapters: previewAdapters },
}

export const splitDesktop: EditorExample = {
  name: 'Split, at desktop',
  summary:
    '`preview: split` puts the rendering beside the source. Only above 768px — below it the same config falls back to the toggle, because two panes on a phone are two half-panes.',
  viewportWidth: 900,
  height: 560,
  props: { config: { ...document, preview: 'split' }, adapters: splitAdapters },
}

export const agentEdit: EditorExample = {
  name: 'An agent edit arriving',
  summary:
    'A second and a half after mount the agent rewrites the Rules section. It merges into the draft and the lines it wrote carry a coloured gutter for four seconds — start typing before then and watch it land around you.',
  viewportWidth: 390,
  height: 640,
  props: { config: document, adapters: agentAdapters },
}

export const conflict: EditorExample = {
  name: 'A conflict, with the choice',
  summary:
    'The person has an unsaved edit to the turnaround rule and the agent rewrites the same lines. The merge stops, both versions are shown, and nothing is applied until Keep mine or Take theirs is pressed.',
  viewportWidth: 390,
  height: 640,
  props: { config: document, adapters: conflictAdapters, draft: localEdit },
}

export const readOnly: EditorExample = {
  name: 'Read only',
  summary:
    'The same document with `readOnly` on: source and preview stay, the toolbar loses its actions, and nothing typed into the source reaches the record.',
  viewportWidth: 390,
  height: 640,
  props: { config: { ...document, readOnly: true }, adapters: readOnlyAdapters },
}

export const invalidConfig: EditorExample = {
  name: 'Invalid config',
  summary:
    '`autosaveMs` written as a string, which the schema rejects rather than coercing — a debounce that is not a number is a document that never saves.',
  viewportWidth: 390,
  height: 320,
  props: {
    config: { ...document, autosaveMs: '1000' as unknown as number },
    adapters: quietAdapters,
  },
}

export const editorExamples = [
  editing,
  preview,
  splitDesktop,
  agentEdit,
  conflict,
  readOnly,
  invalidConfig,
]
