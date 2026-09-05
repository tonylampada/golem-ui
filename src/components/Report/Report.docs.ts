import type { ComponentDocs } from '../../abi'

export const reportDocs: ComponentDocs = {
  name: 'Report',
  slug: 'report',
  storybookPath: 'components-report',
  tagline: 'One dated document, rendered from markdown, printable, with the past ones under it.',

  purpose: `\`Report\` is the document an agent writes for people to read: a daily stand-up, a weekly summary, a
monthly pack. One record is one report — a title, a date, a markdown body — and the component
renders the latest one for the period it is sitting in, steps to the period before or after it, and
prints on its own sheet. It is what goes on a \`/report\` route, and the same component with
\`showIndex\` and \`showNavigation\` off is the report card on a dashboard.

Reach for something else when the records are rows to compare rather than prose to read
(\`RecordList\`), when the reader is writing rather than reading (\`RecordForm\`), or when the point is
a dated sequence of short entries rather than one document.`,

  configNotes: [
    `\`period\` does three jobs at once: how much one report covers, what the arrows step by, and how
wide the query is. It is the only field that changes what arrives.`,
    {
      table: {
        headings: ['`period`', 'The query asks for', 'The heading reads'],
        rows: [
          ['`day`', 'One ISO day', 'Thursday, 10 September 2026'],
          ['`week`', 'The seven days from Monday', '7 – 13 September 2026'],
          ['`month`', 'Every day in the calendar month', 'September 2026'],
        ],
      },
    },
    `The field names — \`dateField\`, \`titleField\`, \`bodyField\`, \`statusField\`, \`authorField\` — are how
one component reads a collection it did not design. Only \`statusField\` is optional, and leaving it
out is what says these reports have no draft state.

\`showIndex\`, \`showNavigation\` and \`print\` are the three pieces of chrome, and they come off
independently. A report on its own route wants all three; a report card inside a wider screen wants
none of them, because the screen already carries the navigation and the reader prints from the
route.`,
  ],

  adapters: [
    {
      adapter: 'Records',
      calls: '`list(collection, …)`',
      why: 'The latest report in the period, and the index of past ones.',
    },
    {
      adapter: 'Records',
      calls: '`get(collection, id)`',
      why: 'One report by id — the `id` prop, or a line the reader picked out of the index.',
    },
    {
      adapter: 'Records',
      calls: '`subscribe(collection)`',
      why: 'The agent regenerating the report. The document replaces itself; it never polls.',
    },
    {
      adapter: 'Clock',
      calls: '`now()`',
      why: 'Which period is the current one: where the component opens, and how far forward the arrows go.',
    },
  ],

  adapterNotes: `Report takes no other adapter. It never fetches, never routes, and never writes — the agent writes
the report through \`Records\` and this component reads it.

**A period is an \`any of\`, not a range.** \`list\` is asked for
\`filter: { date: ['2026-09-07', …, '2026-09-13'] }\` — every ISO day the period covers, spelled out.
That is why \`Records\` needs no range query and why \`dateField\` must hold an ISO calendar day
(\`2026-09-10\`), not a timestamp. A month asks for up to 31 values in one call.

**The latest report wins.** The query is sorted on \`dateField\` descending with a limit of one, so a
period holding several reports shows the newest and the index is how the reader reaches the others.

**The index is its own list, not a \`RecordList\`.** It is one \`list\` call of the twelve newest
reports, drawn as titles and dates. \`RecordList\` would bring filters, chips, paging and a table
layout to a control that is a table of contents, and it would need a second config for a list the
reader never sorts.

**Every date is UTC**, read off the record and formatted with \`locale\`, so a report covers the same
day in every timezone. \`Clock\` supplies only *now*.

**A new adapter object on every render** makes Report re-subscribe and re-fetch on every render.
Build adapters once, outside render.`,

  slots: [
    {
      slot: 'id',
      what: 'One report by id instead of the latest of the period. The component opens on that report’s own period, so the arrows and the index carry on from where it sits.',
    },
  ],

  example: `import { Report, fakeClock, fakeRecords } from 'golem-ui'
import 'golem-ui/styles.css'

;<Report
  config={{
    collection: 'reports',
    period: 'day',
    dateField: 'date',
    titleField: 'title',
    bodyField: 'body',
    statusField: 'status',
    authorField: 'author',
    showAuthor: true,
    showIndex: true,
    showNavigation: true,
    print: true,
    emptyState: 'No report for this day.',
    locale: 'en-GB',
  }}
  adapters={{ records: fakeRecords({ reports }), clock: fakeClock() }}
/>`,

  failureModes: `- **Invalid config.** Report renders an error card instead of the document, in dev and in prod,
  naming every field that failed. A \`locale\` no platform can format — \`en_GB\`, \`english\` — is named
  at \`locale\` with the shape of a tag that works, rather than throwing inside \`Intl\` at render time.
- **The adapter rejects.** The document is replaced by the rejection's \`message\`, verbatim. Write
  those messages for the person reading them. A rejection on the *index* is swallowed: an aside that
  failed must not take down a document that arrived.
- **A period with no report** is not an error: the \`emptyState\` line stands in, and the arrows stay,
  because stepping back to a period that has one is the way out.
- **A \`dateField\` that is not an ISO day** matches nothing. The filter is an equality list of
  \`YYYY-MM-DD\` strings, so a timestamp in that field silently returns no report — put the calendar
  day in the record and the timestamp somewhere else.
- **The next arrow stops at the current period.** \`Clock\` says which one that is; there is no report
  from next week, so the arrow is disabled rather than showing an empty period.
- **The body is the markdown this kit renders**: headings, pipe tables, bullet and numbered lists,
  fenced code, inline code, bold, italic and http(s) links. Anything else falls through as the
  characters it is, which is what keeps a half-written document readable while the agent writes it.
- **\`sections\` is optional metadata**, an array of strings or of \`{ title }\` objects. When a report
  carries it, a Contents list opens the document and scrolls to the matching heading in the body. A
  title with no matching heading scrolls nowhere.
- **Printing needs \`print: true\`**, which brings both the action and the stylesheet. The chrome
  comes off the sheet, the card border goes, and headings, list items, code blocks and tables are
  kept off page breaks. With \`print: false\` a browser print takes the whole screen as it stands.
- **A new adapter object on every render** makes Report re-subscribe and re-fetch on every render.
  Build adapters once, outside render.`,
}
