import type { AdapterDocs } from '../abi'

export const brainAdapterDocs: AdapterDocs = {
  name: 'Brain',
  slug: 'brain',
  storybookPath: 'adapters-brain',
  tagline:
    'A folder of markdown the agent reads and cites: list it, read it, search it, hear when it changes.',

  purpose: `\`Brain\` is the app's unstructured knowledge as a folder of markdown, in the
[Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md)
(v0.2): concept documents with YAML front matter (\`type\` required, \`description\` used in listings),
an optional \`index.md\` in any directory, an optional \`log.md\` at the root. \`index.md\` and \`log.md\`
are reserved names, never concepts. The root \`index.md\` is where an agent starts reading.

The adapter is the folder, reduced to what the reader needs: a listing, a file, a search, and a
listener. It knows nothing about markdown beyond front matter. Implement it over a directory on
disk, a git tree, or an object store.

**A source location is \`path#L<start>-L<end>\`**, 1-based and inclusive, relative to the bundle root.
It is what the agent puts in a \`ChatMessage\`'s \`sources\` and what \`Brain\`'s \`openLocation\` opens.
\`parseLocation\` splits one.`,

  methods: [
    {
      signature: 'index(dir?: string): Promise<string>',
      guarantees: `The markdown of that directory's \`index.md\`, the root's when \`dir\` is omitted. When the directory has
none, a synthesized one: a heading and one \`* [name](path) - description\` bullet per entry, the
description read from each concept's front matter, as the spec allows.`,
    },
    {
      signature: "list(dir?: string): Promise<Array<{ path: string; kind: 'file' | 'dir' }>>",
      guarantees:
        'The direct children of a directory, directories first, each `path` relative to the bundle root. The root when `dir` is omitted. An empty directory is an empty array.',
    },
    {
      signature: 'read(path: string): Promise<string>',
      guarantees:
        'The whole file, front matter included, so line numbers in a location count from line 1 of the file.',
      throws: 'An `Error` whose `message` is shown in the reader when there is no file at `path`.',
    },
    {
      signature:
        'search(query: string): Promise<Array<{ path: string; line: number; excerpt: string }>>',
      guarantees:
        'Every line containing the query, case-insensitive, with its 1-based `line`. An empty query is an empty result.',
    },
    {
      signature: 'subscribe(listener: () => void): Unsubscribe',
      guarantees:
        'Calls the listener after any file in the bundle changes, with no payload: the component re-reads what it has open. Returns the function that detaches it.',
    },
    {
      signature: 'open?(location: string): void',
      guarantees:
        'Optional. `Brain` calls it with `path#L<start>-L<end>` (or a bare path) every time the reader opens a document on its own: a tree tap, a link, a search hit, back. Never for a location the app passed in through `openLocation`. Write it into the URL so a reload lands on the same document.',
    },
    {
      signature: 'write?(path: string, text: string): Promise<void>',
      guarantees:
        'Optional. Replaces the file at `path` (creating it) and fires `subscribe`. Omit it for a brain the app keeps read-only; `Brain` calls it in no slice yet.',
    },
  ],

  notes: `**Paths are \`/\`-separated, relative to the bundle root, no leading slash.** \`notes/tyres.md\`, not
\`/notes/tyres.md\`. A directory path carries no trailing slash.

**The reader does not validate the bundle.** A file without front matter is read and shown as it is;
\`index\` only needs front matter when it synthesizes.`,

  fake: {
    name: 'fakeBrain',
    what: `A map of path to markdown, kept in memory. \`list\`, \`index\` and \`search\` are derived from it on every
call; \`write\` replaces an entry and fires \`subscribe\`. Nothing is persisted.`,
    example: `import { Brain, fakeBrain } from 'golem-ui'

const brain = fakeBrain({
  'index.md': '---\\nokf_version: 0.2\\n---\\n# Shop knowledge\\n\\n* [tyres.md](tyres.md) - what we stock',
  'tyres.md': '---\\ntype: concept\\ndescription: what we stock\\n---\\n# Tyres\\n\\nWe stock 700c and 27.5.',
})

;<Brain config={{ openLocation: 'tyres.md#L6-L6' }} adapters={{ brain }} />`,
  },

  consumers: ['Brain'],
}
