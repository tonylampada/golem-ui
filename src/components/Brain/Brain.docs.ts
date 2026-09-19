import type { ComponentDocs } from '../../abi'

export const brainDocs: ComponentDocs = {
  name: 'Brain',
  slug: 'brain',
  storybookPath: 'components-brain',
  tagline:
    'A folder of markdown with a reader that opens the passage the agent cited, highlighted and in context.',

  purpose: `\`Brain\` shows the app's knowledge folder. At desktop width it is master–detail: a list column with
the tree and a search box, and a reading column with the open file at a reading measure, its front
matter as a chip. Below 768px it is one screen at a time: the list, then the document over it with a
back button; a link inside a document pushes the next one, and back returns to where the reader was,
scroll and all. \`log.md\` is one entry in the tree, read like any other file.

Its one trick is \`openLocation\`: hand it \`path#L6-L8\` and the reader opens that file, highlights
those lines, and scrolls them into view with the rest of the document around them, so the reader can
check what the agent said against where it came from.

Use it with \`Chat\`: an agent message carries \`sources\`, Chat draws a chip per source, and the app
passes the clicked location into this config. For editing the file, that is \`Editor\`; this slice
reads only.`,

  configNotes: [
    `\`openLocation\` is what the app tells the reader to show. The reader keeps its own stack of what it
opened since: a tap in the tree, a link, a search hit, back. Each of those is reported through the
adapter's \`open\`, so an app that writes it into the URL comes back to the same document after a
reload, and the location it passes back in is not pushed twice. Omit it and the desktop shows the
root \`index.md\`; the phone shows the list.`,
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
      calls: '`search(query)`',
      why: 'The hits shown in the list column while the search box has text; a hit opens its line highlighted.',
    },
    {
      adapter: 'Brain',
      calls: '`subscribe(listener)`',
      why: 'Re-reads the open file and re-lists the tree when the bundle changes.',
    },
    {
      adapter: 'Brain',
      calls: '`open(location)`',
      why: 'Optional. Told every location the reader opened on its own, so the app can keep it in the URL.',
    },
  ],

  adapterNotes: `Brain never calls \`write\`; it is on the adapter for the edit-together step to come.`,

  slots: [
    {
      slot: 'toolbar',
      what: 'The right-hand end of the document header, beside the open path. An Edit button goes here; empty leaves the path alone.',
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
  matter is shown as a \`type\` chip and the description, never as YAML and never highlighted.
- **A block spans the range's edge.** The file is rendered in three runs, so a list or table cut by
  the range renders as two. Cite whole blocks and it does not happen.
- **Markdown is the kit's subset.** Headings, fenced code, pipe tables, lists, bold, italic, inline
  code and links. A relative link opens that file in the reader; \`http(s)\` opens a new tab; wiki
  links and images render as the characters they are.
- **A new adapter object on every render** re-subscribes and re-lists the tree. Build it once.`,
}
