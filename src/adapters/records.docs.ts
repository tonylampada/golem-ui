import type { AdapterDocs } from '../abi'

export const recordsAdapterDocs: AdapterDocs = {
  name: 'Records',
  slug: 'records',
  storybookPath: 'adapters-records',
  tagline:
    'A collection of rows, the four writes that change one, and the version check that keeps two writers apart.',

  purpose: `\`Records\` is the store, as far as a component is concerned: named collections of JSON rows, each with an
\`id\`, and the reads and writes that move them. Filtering, sorting, searching and paging are the
store's work and not the component's — a component hands over a \`RecordQuery\` and draws whatever
comes back.

It is the most widely taken adapter in the kit and the one with the most to get right, because it is
where two writers meet. Implement it over anything: a REST API, a database client, a document store,
an array in memory.`,

  methods: [
    {
      signature: 'list<T>(collection: string, query?: RecordQuery): Promise<RecordPage<T>>',
      guarantees: `Honours the whole query, not the parts that are convenient: \`filter\` is field-by-field equality and an
array value means "any of these"; \`search\` is a case-insensitive substring over the named fields
only; \`sort\` orders before paging, so page two of a sorted list follows page one. Returns
\`nextCursor\` for the next page, or \`null\` when this was the last one — a caller pages until it sees
that \`null\` and never guesses from a short page.`,
    },
    {
      signature: 'get<T>(collection: string, id: string): Promise<T | null>',
      guarantees:
        'Resolves the row, or `null` when the collection has no such row. A missing row is not an error: the component draws an empty state, not a failure.',
    },
    {
      signature: 'create<T>(collection: string, data: Record<string, unknown>): Promise<T>',
      guarantees:
        'Resolves the stored row, including whatever `id` the store minted. Callers hold the returned row rather than the data they sent, so server-side defaults arrive.',
      throws:
        'A `RecordRefusedError` when a business rule or a uniqueness check refused it, carrying the fields it names. Anything else rejects with a plain `Error` whose `message` the reader is shown as written.',
    },
    {
      signature: 'update<T>(collection, id, patch, options?: UpdateOptions): Promise<T>',
      guarantees: `Merges the patch into the stored row — a key absent from the patch keeps its stored value — and resolves
the whole row back. With \`options\`, the write is conditional: compare \`expectedVersion\` against the
row's \`versionField\` (\`version\` by default) and apply the write only if they match. A store that
ignores \`options\` turns every concurrent write into a silent overwrite, which is the one failure
this interface exists to prevent.`,
      throws:
        'A `VersionConflictError` carrying the row **as it now stands** when `expectedVersion` is stale, so the caller merges against it without a second round trip. A `RecordRefusedError` for a refused field. A plain `Error` for a row that is not there.',
    },
    {
      signature: 'remove(collection: string, id: string): Promise<void>',
      guarantees: 'The row is gone when the promise resolves, and `subscribe` has fired.',
      throws: 'A plain `Error` when there is no such row.',
    },
    {
      signature: 'subscribe(collection: string, listener: () => void): Unsubscribe',
      guarantees: `Calls the listener with no argument whenever anything in that collection changed, including changes
this same caller made. The listener re-lists; it is a nudge, not a payload. Returns the function that
detaches it, and calling that function twice is safe.`,
    },
  ],

  notes: `**Two error types, and both are read by shape.** \`refusedFields(error)\` and
\`conflictingRecord(error)\` look at \`fields\` and \`name\` on whatever was thrown rather than at its
class, so an adapter that crossed a bundle boundary — or never imported this module — still gets its
refusal honoured. That is what lets an app throw its own error object and have \`RecordForm\` put the
sentence under the right control.

- \`RecordRefusedError(message, fields)\` — a write the store refused for reasons only it knows. Each
  entry in \`fields\` is a \`field\` key as the component's config spells it and a \`message\` written for
  a person: *"A quote over $500 needs the owner's sign-off."* A refusal that names no field shows as
  one line at the top of the form instead.
- \`VersionConflictError(message, current)\` — an \`update\` that arrived too late. \`current\` is the row
  as it now stands, and \`Editor\` merges its draft against that record rather than showing an error.

**Every rejection's \`message\` reaches a person unedited.** Write them as sentences, not as codes.

**Paging is a cursor, not an offset the caller computes.** \`nextCursor\` is opaque; hand it straight
back as \`cursor\`. A cursor over a collection that is being written to may shift rows under the
reader, which is why a live update re-lists from the start rather than paging on.`,

  fake: {
    name: 'fakeRecords',
    what: `An in-memory store seeded per collection. It really filters, searches, sorts and pages, and it really
enforces \`expectedVersion\` — so a story and a test run the same code path a server would, including
the conflict path. \`refuse\` makes every write reject with a \`RecordRefusedError\` naming one field,
which is how a story shows a refusal landing under a control. \`insert\` is the fake's own extra: the
synchronous way to put a row in without going through \`create\`.

Its cursor is an offset into the matching rows, which is honest about paging and honest about its
limit — a row inserted while the reader is on page three shifts the pages under them.`,
    example: `import { RecordList, fakeRecords } from 'golem-ui'

const records = fakeRecords({
  jobs: [
    { id: 'j-1', ticket: 'NG-118', bike: 'Trek FX 2', status: 'waiting', version: 1 },
    { id: 'j-2', ticket: 'NG-119', bike: 'Brompton C Line', status: 'in progress', version: 3 },
  ],
})

;<RecordList config={jobsConfig} adapters={{ records }} />

// The refusal path, for the story that shows it:
const refusing = fakeRecords({ jobs: [] }, {
  refuse: { field: 'ticket', message: 'That ticket number is already on the board.' },
})`,
  },

  consumers: ['RecordList', 'RecordForm', 'Report', 'Editor', 'Timeline'],
}
