const e={name:"RecordList",slug:"record-list",storybookPath:"components-recordlist",tagline:"Many records of one type: a table at desktop width, cards on a phone, from one config.",purpose:`\`RecordList\` is many records of one type on a screen: a table at desktop width, cards on a phone,
both from the same config. Sorting, filtering, searching and paging are its own; the fields it shows
and the order it opens in are the agent's. It is the workhorse screen of most apps — a job board, an
order list, a roster — and it is what goes in \`Shell\`'s \`canvas\`.

Reach for something else when the screen is one record rather than many (a record form), when the
records are a dated sequence you read downwards (a timeline), or when the point is a total rather
than the rows.`,configNotes:["`fields` is the whole list, in the order it is shown. Each entry is\n`{ key, label, type, format?, primary? }`:",{table:{headings:["`type`","Renders as","`format` means"],rows:[["`text`","The value verbatim","—"],["`number`","Grouped digits, right-shaped","How many decimal places"],["`date`","A UTC calendar date","`short`/`medium`/`long`/`full`"],["`datetime`","The same, plus the time","`short`/`medium`/`long`/`full`"],["`enum`","A coloured chip","—"],["`boolean`","`Yes` or `No`","—"],["`money`","A currency amount","An ISO currency code"],["`user`","The name with an initials badge","—"]]}},"Those eight are the vocabulary. Any other value is a config error, not a fallback.\n\n`scope` and `filters` are different tools. `scope` is a narrowing the reader cannot undo — it is how\n`/today` shows the open tickets and `/jobs` shows all of them from one component. `filters` is a row\nof chips the reader picks from, one chip per value that has arrived."],adapters:[{adapter:"Records",calls:"`list(collection, …)`",why:"Every page. The filter, the sort, the search text and the cursor go with it."},{adapter:"Records",calls:"`subscribe(collection)`",why:"A row written by someone else. The list re-lists; it never polls."}],adapterNotes:"RecordList takes no other adapter. It never fetches, never routes and never reads a clock — a date\nis formatted from the record's own value, in UTC.\n\n**Opening a row is the call site's job.** `rowAction: 'open'` makes each row clickable and focusable\nand calls the `onOpen` prop with the whole record; the route that record leads to is something only\nthe app knows. With no `onOpen` the row is focusable and does nothing.\n\n**Paging is a cursor, not a page number.** `list` returns `{ rows, nextCursor }`, and `nextCursor`\ncomes back as `cursor` on the next call. `null` means that was the last page and the load-more button\ngoes away. There is no infinite scroll: a list you can reach the bottom of is a list you can put a\nfooter under.",example:`import { RecordList, fakeRecords } from 'golem-ui'
import 'golem-ui/styles.css'

;<RecordList
  config={{
    collection: 'tickets',
    fields: [
      { key: 'ticket', label: 'Ticket', type: 'text', primary: true },
      { key: 'customer', label: 'Customer', type: 'text' },
      { key: 'status', label: 'Status', type: 'enum' },
      { key: 'assignee', label: 'Mechanic', type: 'user' },
      { key: 'date', label: 'Booked in', type: 'date', format: 'medium' },
      { key: 'quote', label: 'Quote', type: 'money', format: 'USD' },
    ],
    sort: { field: 'date', direction: 'desc' },
    filters: ['status'],
    search: ['ticket', 'customer', 'bike'],
    pageSize: 25,
    emptyState: 'No tickets on the board.',
    rowAction: 'open',
    density: 'comfortable',
  }}
  adapters={{ records: fakeRecords() }}
  onOpen={(row) => navigation.go(\`/jobs/\${row.id}\`)}
/>`,failureModes:`- **Invalid config.** RecordList renders an error card instead of the list, in dev and in prod,
  naming every field that failed. A \`type\` outside the eight names the offending entry by its
  position — \`fields.2.type\` — and lists the vocabulary. A \`filters\` or \`sort.field\` key that no
  field carries fails the same way, so a typo never becomes a control that does nothing.
- **The adapter rejects.** The list is replaced by the rejection's \`message\`, verbatim. Write those
  messages for the person reading them.
- **A field key no record carries** is not an error: the cell shows an em dash. The config is the
  agent's claim about the shape of a record, and the list will not pretend to know better.
- **Filter chips only know what has arrived.** A value that lives on page four has no chip until
  page four is loaded. Narrow with \`scope\`, or a bigger \`pageSize\`, when the whole vocabulary has to
  be there from the start.
- **The cursor is a position, not a bookmark.** Rows inserted while the reader is on page three shift
  the pages under them, which is why a live update re-lists what is on screen rather than paging on.
- **Below 768px there are no column headings**, and the reader sorts from a select instead. The
  breakpoint is Shell's default, and it is measured on the list's own container — a list in a narrow
  panel draws cards on a wide screen.
- **A wide table scrolls inside its own box**, up to 70% of the viewport height, so the sticky
  heading has something to stick to and the page never scrolls sideways. Fewer columns, or
  \`density: 'compact'\`, is usually the better answer.
- **Dates are UTC**, read straight off the record, so a row reads the same everywhere. For local
  time, put local time in the record.
- **A new adapter object on every render** makes RecordList re-subscribe and re-list on every render.
  Build adapters once, outside render.`};export{e as r};
