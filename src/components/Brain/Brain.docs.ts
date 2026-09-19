import type { ComponentDocs } from '../../abi'

export const brainDocs: ComponentDocs = {
  name: 'Brain',
  slug: 'brain',
  storybookPath: 'components-brain',
  tagline:
    'A folder of markdown beside a reader that opens the passage the agent cited, highlighted and in context.',

  purpose: `\`Brain\` shows the app's knowledge folder: a tree of the bundle on the left, the open file rendered
on the right, the root \`index.md\` first. Its one trick is \`openLocation\`: hand it \`path#L6-L8\` and
the reader opens that file, highlights those lines, and scrolls them into view with the rest of the
document around them, so the reader can check what the agent said against where it came from.

Use it with \`Chat\`: an agent message carries \`sources\`, Chat draws a chip per source, and the app
passes the clicked location into this config. For editing the file, that is \`Editor\`; this slice
reads only.`,

  configNotes: [
    `\`openLocation\` is the whole steering wheel. It is a prop the app changes, not something the
component keeps: the same location twice is the same view, and a click in the tree opens another
file without touching it. Omit it and the reader shows the root \`index.md\`.`,
  ],

  adapters: [
    {
      adapter: 'Brain',
      calls: '`list(dir?)`',
      why: 'The tree, one call per directory as it is expanded.',
    },
    {
      adapter: 'Brain',
      calls: '`index()`',
      why: 'The root `index.md`, real or synthesized, shown before anything is opened.',
    },
    {
      adapter: 'Brain',
      calls: '`read(path)`',
      why: 'The open file, front matter and all, so line numbers match the location.',
    },
    {
      adapter: 'Brain',
      calls: '`subscribe(listener)`',
      why: 'Re-reads the open file and re-lists the tree when the bundle changes.',
    },
  ],

  adapterNotes: `Brain calls neither \`search\` nor \`write\` in this slice; both are on the adapter for the toolbar an app
puts in the slot, and for the edit-together step to come.`,

  slots: [
    {
      slot: 'toolbar',
      what: 'The right-hand end of the reader’s header, beside the open path. A search box or an Edit button go here; empty leaves the path alone.',
    },
  ],

  example: `import { Brain, fakeBrain } from 'golem-ui'
import 'golem-ui/styles.css'

;<Brain
  config={{
    title: 'Shop knowledge',
    openLocation: 'workshop/turnaround.md#L6-L8',
  }}
  adapters={{ brain: fakeBrain(files) }}
/>`,

  failureModes: `- **Invalid config.** Brain renders an error card instead of the reader, naming every field that failed.
  A location whose range is not \`#L<start>-L<end>\` fails; an unknown field fails.
- **The file is missing.** \`read\` rejects and the reader shows the adapter's message in place of the
  document; the tree stays usable.
- **The range runs past the file.** The highlight covers what exists and stops at the last line.
- **The range is inside the front matter.** The highlight starts at the first line after it; front
  matter is shown muted and never highlighted.
- **A block spans the range's edge.** The file is rendered in three runs, so a list or table cut by
  the range renders as two. Cite whole blocks and it does not happen.
- **Markdown is the kit's subset.** Headings, fenced code, pipe tables, lists, bold, italic, inline
  code and links. A relative link opens that file in the reader; \`http(s)\` opens a new tab; wiki
  links and images render as the characters they are.
- **A new adapter object on every render** re-subscribes and re-lists the tree. Build it once.`,
}
