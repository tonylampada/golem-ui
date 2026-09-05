import type { ComponentDocs } from '../../abi'

export const timelineDocs: ComponentDocs = {
  name: 'Timeline',
  slug: 'timeline',
  storybookPath: 'components-timeline',
  tagline: 'Dated entries read downwards, newest first: the log of what happened.',

  purpose: `\`Timeline\` is the log of what happened: dated entries read downwards, newest first, cut into days
under sticky headers. An entry is a short piece of markdown with an instant on it, and optionally a
kind, a person and a file or two. Times inside today are how long ago they were — "14 min ago" —
and every older entry carries its clock time.

Reach for something else when the records are a set rather than a sequence (\`RecordList\`), when the
point is one document rather than many entries (\`Report\`), or when the reader is talking to
something that answers back (\`Chat\`).`,

  configNotes: [
    `\`kindField\` and \`kinds\` go together: the field says which kind an entry is, and \`kinds\` is the
vocabulary it is read against. A kind's \`tone\` — never a colour — picks its mark:`,
    {
      table: {
        headings: ['`tone`', 'Mark', 'For'],
        rows: [
          ['`neutral`', 'A grey dot', 'What was said or noticed'],
          ['`good`', 'A green tick', 'What finished'],
          ['`warn`', 'An amber triangle', 'What is waiting or at risk'],
          ['`bad`', 'A red cross', 'What went wrong'],
        ],
      },
    },
    `Four tones and no palette, so the same kind of thing is the same colour on every screen the agent
builds.

\`filters\` and \`search\` are different tools. \`filters\` is a row of chips: \`kind\` offers the whole
configured vocabulary, \`actor\` offers every person whose entries have arrived. \`search\` is a box
matching a substring against the field keys it lists — usually just the body field.

\`composer\` is the one config that writes. On, a one-line box sits above the log; what it writes is
the body the reader typed, the clock's current instant in \`dateField\`, the signed-in member's name
in \`actorField\`, and — when \`kindField\` is set — the kind picked from a select beside the box.`,
  ],

  adapters: [
    {
      adapter: 'Records',
      calls: '`list(collection, …)`',
      why: 'Every page, sorted by `dateField` descending. The chosen filters, the search text and the cursor go with it.',
    },
    {
      adapter: 'Records',
      calls: '`subscribe(collection)`',
      why: 'An entry written by someone else. The timeline re-lists; it never polls.',
    },
    {
      adapter: 'Records',
      calls: '`create(collection, data)`',
      why: 'The composer, and only the composer. Absent `composer: true` the timeline never writes.',
    },
    {
      adapter: 'Clock',
      calls: '`now()`, `timeZone()`',
      why: 'What "Today" and "14 min ago" are measured against, and which zone the days are cut in.',
    },
    {
      adapter: 'Identity',
      calls: '`currentUser()`',
      why: 'Who a composed entry is by. Only called with `composer: true`.',
    },
    {
      adapter: 'Files',
      calls: '`url(id)`',
      why: 'Turns an attachment chip into something to open. Only called when `attachmentsField` is set.',
    },
  ],

  adapterNotes: `Timeline takes no other adapter. It never fetches, never routes, and never reads the machine's
clock — the time on screen is the \`Clock\` adapter's, which is why a frozen clock makes every
example read the same on every run.

**\`identity\` and \`files\` are required by the config, not by the interface.** Turn \`composer\` on
without an \`identity\` and entries are written unsigned; set \`attachmentsField\` without a \`files\`
adapter and a chip says so when it is clicked, rather than failing silently.

**Paging is a cursor, not a page number.** \`list\` returns \`{ rows, nextCursor }\`, and \`nextCursor\`
comes back as \`cursor\` on the next call. Load-more fetches *older* entries and appends them under
what is already read; new entries only ever arrive at the top, through \`subscribe\`.`,

  example: `import { Timeline, fakeClock, fakeIdentity, fakeRecords } from 'golem-ui'
import 'golem-ui/styles.css'

;<Timeline
  config={{
    collection: 'log',
    dateField: 'at',
    bodyField: 'body',
    kindField: 'kind',
    kinds: [
      { id: 'note', label: 'Note', tone: 'neutral' },
      { id: 'done', label: 'Done', tone: 'good' },
      { id: 'parts', label: 'Parts', tone: 'warn' },
      { id: 'problem', label: 'Problem', tone: 'bad' },
    ],
    actorField: 'actor',
    attachmentsField: 'files',
    filters: ['kind', 'actor'],
    search: ['body'],
    pageSize: 25,
    composer: true,
    emptyState: 'Nothing on the log yet.',
    locale: 'en-GB',
  }}
  adapters={{ records, clock, identity, files }}
/>`,

  failureModes: `- **Invalid config.** Timeline renders an error card instead of the log, in dev and in prod, naming
  every field that failed. A \`tone\` outside the four names the kind by its position —
  \`kinds.1.tone\` — and lists them. \`kindField\` without \`kinds\`, \`kinds\` without \`kindField\`, two
  kinds sharing an \`id\`, and a \`filters\` entry whose field is not set all fail the same way, so a
  chip row is never empty by surprise.
- **The adapter rejects.** The entries are replaced by the rejection's \`message\`, verbatim. A
  composer write that is refused puts the message under the box and keeps what was typed.
- **A kind the config has no word for** is not an error: the entry wears the raw value as a grey
  chip and a neutral dot. The record said something; the log will not hide it.
- **An unreadable date** joins the day above it and shows an em dash instead of a time. Write
  \`dateField\` as a full ISO instant; a bare calendar date has no time to show.
- **Days are cut in the \`Clock\` adapter's zone**, so "Today" means today where the reader is. A
  zone the platform does not know falls back to UTC rather than throwing mid-render.
- **The actor chips only offer actors held as a name.** The chip's value is what \`list\` is asked to
  match, and an actor held as a record is not an equality an adapter can answer — it still shows on
  the entry, it just gets no chip.
- **The pill counts arrivals, it does not hold them back.** A new entry is always on screen; the
  pill is only how the reader learns about it when they have scrolled away from the top.
- **The log scrolls inside its own box**, up to 70% of the viewport height, so the day headers have
  something to stick to and the page never scrolls sideways. A shorter \`pageSize\` is the answer for
  a timeline sitting inside a wider screen.
- **A new adapter object on every render** makes Timeline re-subscribe and re-list on every render.
  Build adapters once, outside render.`,
}
