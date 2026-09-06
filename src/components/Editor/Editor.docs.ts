import type { ComponentDocs } from '../../abi'

export const editorDocs: ComponentDocs = {
  name: 'Editor',
  slug: 'editor',
  storybookPath: 'components-editor',
  tagline:
    'One markdown document, edited by a person and by the agent at once, merged line by line.',

  purpose: `\`Editor\` is the document both writers share. One record is one document — a markdown body and a
version number — and the component shows it as editable source with the markdown styled where it
stands, a preview of the rendering, and an outline of its headings. While the person types, the
component is subscribed to the record: a version the agent writes arrives, is merged into the draft
line by line, and the lines it wrote carry a coloured gutter for a few seconds so the person can see
what just changed under them. Neither writer overwrites the other, because neither write is a
whole-document write.

Reach for something else when the document is only to be read (\`Report\`), when the record is a set of
named fields rather than one body of prose (\`RecordForm\`), or when the writing is a message rather
than a document (\`Chat\`).`,

  configNotes: [
    `\`collection\` and \`id\` name one record. An editor edits a document, not a collection: two documents
are two editors.

\`bodyField\` and \`versionField\` are how the component reads a record it did not design. The version
is the whole safety story — read on load, sent back on every save as \`expectedVersion\`, and bumped
by one — so it has to be a number the store keeps honest.`,
    {
      table: {
        headings: ['`preview`', 'On a phone', 'At 768px and wider'],
        rows: [
          ['`toggle`', 'One pane, swapped by a button', 'One pane, swapped by a button'],
          ['`split`', 'Falls back to `toggle`', 'Source and rendering side by side'],
          ['`off`', 'Source only, no button', 'Source only, no button'],
        ],
      },
    },
    `\`autosaveMs\` is how long typing has to stop before the draft goes. Short is what a shared document
wants: the longer a draft sits unsent, the more of it a merge has to reconcile later. \`0\` saves on
every keystroke.

\`highlightMs\` is how long the agent's lines stay marked. \`0\` marks nothing, which is what a document
with no second writer wants.`,
  ],

  adapters: [
    {
      adapter: 'Records',
      calls: '`get(collection, id)`',
      why: 'The document, on mount and again whenever the collection changes.',
    },
    {
      adapter: 'Records',
      calls: '`update(collection, id, patch, { expectedVersion, versionField })`',
      why: 'The save. The version it read goes out with the write, so a write that arrived second is refused rather than winning.',
    },
    {
      adapter: 'Records',
      calls: '`subscribe(collection)`',
      why: 'The agent writing to the document. Its version arrives and is merged; nothing polls.',
    },
    {
      adapter: 'Clock',
      calls: '`now()`, `timeZone()`',
      why: 'The time in the status line — “Saved 13:20” — in the reader’s own zone.',
    },
  ],

  adapterNotes: `Editor takes no other adapter. It never fetches, never routes, and never uploads.

**The store has to enforce the version.** \`update\` is called with \`{ expectedVersion, versionField }\`,
and a store that ignores it turns every concurrent write into a silent overwrite. A store that
honours it rejects with a \`VersionConflictError\` carrying the record as it now stands, and the
component merges against that record instead of showing an error. \`fakeRecords\` enforces it, so a
story and a test run the same path a server would.

**The merge is a three-way merge over lines**, in \`src/lib/diff3.ts\` and tested on its own. The base
is the version the person and the agent last agreed on, *mine* is the local draft, *theirs* is what
arrived. Edits in different places are both kept. Edits that overlap are a conflict, and a conflict
is the one thing the component will not decide: it shows both versions and waits.

**Lines, not characters.** A merge that resolves inside a sentence produces text neither writer
wrote. A line is the smallest unit a person can look at and say "that one, not that one".

**A new adapter object on every render** makes Editor re-subscribe and re-fetch on every render.
Build adapters once, outside render.`,

  slots: [
    {
      slot: 'draft',
      what: 'Unsaved work from a previous session — a local draft store, say. The editor opens on it instead of the record’s body, dirty against the record’s version, so the next thing the agent writes is merged rather than dropped on top of it.',
    },
  ],

  example: `import { Editor, fakeClock, fakeRecords } from 'golem-ui'
import 'golem-ui/styles.css'

;<Editor
  config={{
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
  }}
  adapters={{ records: fakeRecords({ dna }), clock: fakeClock() }}
/>`,

  failureModes: `- **Invalid config.** Editor renders an error card instead of the document, in dev and in prod,
  naming every field that failed. \`autosaveMs\` and \`highlightMs\` are numbers and are not coerced: a
  debounce written as \`'1000'\` is named rather than guessed at.
- **No such record.** \`get\` resolving \`null\` is not an empty document — the status line says which
  collection and which id came back with nothing, so a typo in \`id\` is visible instead of silently
  editing thin air.
- **The adapter rejects a save** for its own reasons. The rejection's \`message\` is shown in the status
  line, verbatim, and the draft is kept: the person's text is never thrown away to report an error.
- **A version mismatch is not an error.** A \`VersionConflictError\` from \`update\` triggers the merge and
  the save is retried against the version that came back. A store that rejects a stale write with a
  plain \`Error\` instead gets the plain-error path, and the two writers drift.
- **A conflict stops the merge, not the editor.** Both versions of the disagreeing lines are shown
  with *Keep mine* and *Take theirs*, and nothing is applied until every one of them has been chosen.
  A version arriving while a conflict is open is held and applied once it is settled.
- **The mark is drawn on line numbers, not on the text.** The gutter is placed when the merge lands;
  typing above those lines while the mark is still up shifts the text under it. It fades within
  \`highlightMs\`, which is why the drift is measured in seconds.
- **The source is styled, not rendered.** \`##\` stays \`##\`, and the styling is weight, colour and
  background only — a heading drawn larger would slide the text out from under the caret. The
  preview is where the document is rendered, through the same markdown \`Report\` and \`Chat\` use.
- **Tab only indents a list line.** Everywhere else it moves focus on, because a textarea a keyboard
  reader cannot leave is a trap. Cmd/Ctrl+S saves now, Cmd/Ctrl+B and Cmd/Ctrl+I wrap the selection,
  and Cmd/Ctrl+Z steps the editor's own undo — the browser's native textarea history has no entry
  for a line the agent wrote.
- **\`readOnly\` blocks the writing, not the reading.** The source and the preview stay, the toolbar
  loses its actions, the autosave never runs, and nothing typed into the source reaches the record.
- **A new adapter object on every render** makes Editor re-subscribe and re-fetch on every render.
  Build adapters once, outside render.`,
}
