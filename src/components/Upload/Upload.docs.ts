import type { ComponentDocs } from '../../abi'

export const uploadDocs: ComponentDocs = {
  name: 'Upload',
  slug: 'upload',
  storybookPath: 'components-upload',
  tagline: 'Files and photos in, a gallery out — and a picker a composer can host.',

  purpose: `\`Upload\` is how files get into a workspace and how they are looked at afterwards. One config gives
two surfaces: \`<Upload />\` is a drop zone, a camera button on a phone, a queue with progress and
per-file errors, and the gallery the files land in — thumbnails for pictures, tiles for everything
else, a lightbox, an optional caption, and a delete that asks first. \`<Upload.Picker />\` is the same
picking and the same limits with no gallery: a button a composer hosts, handing file refs back to
whatever is about to send them.

Reach for something else when the files are already somewhere and you only need to open one — a
\`Timeline\` attachment chip does that with \`Files.url\` alone — or when what you are collecting is
fields rather than files (\`RecordForm\`).`,

  configNotes: [
    `\`folder\` is the whole of the component's identity: it is what \`upload\`, \`list\` and \`subscribe\` are
given, so two Uploads on the same folder are two views of the same files and a file dropped on one
appears on the other.

The three limits are checked in the browser, in this order, before anything is uploaded:`,
    {
      table: {
        headings: ['Limit', 'What it refuses', 'What the row says'],
        rows: [
          [
            '`accept`',
            'A file whose MIME type no entry matches',
            'The type it is, and the types this upload takes',
          ],
          ['`maxSizeMb`', 'A file bigger than the limit', 'How big it is, and the limit'],
          [
            '`maxFiles`',
            'A file past the last place in the folder',
            'What number it would have been, and how many the folder holds',
          ],
        ],
      },
    },
    `Each refusal is a \`FileRejectedError\` carrying the \`fileName\` and a \`reason\` of \`type\`, \`size\` or
\`count\`. The component catches its own: nothing is thrown at the caller, and the sentence goes on
the file's row, which is where the reader can do something about it. \`upload\` is never called for a
refused file, so an over-size photo does not leave the machine.

\`accept\` is a list of MIME types — \`image/jpeg\`, \`application/pdf\`, or a whole group as
\`image/*\`. It is not a list of extensions: \`jpg\` fails validation and produces the error card,
because a file picker offering \`jpg\` matches nothing.

\`capture\` is the phone camera. \`environment\` is the rear camera, which is what a photo of a bike on
a bench wants; \`user\` is the front one. A desktop browser ignores the attribute and offers its file
picker, so turning it on costs a laptop nothing.

\`layout\` decides how the gallery reads, not what it holds. \`grid\` draws pictures as thumbnails and
everything else as an icon tile; \`list\` draws one row per file whatever it is, which is what a
folder of invoices wants.`,
  ],

  adapters: [
    {
      adapter: 'Files',
      calls: '`upload(file, { folder, onProgress })`',
      why: 'Every accepted file, one call each. `onProgress` moves the bar on that file’s row; the ref it resolves to is what the gallery and the picker then hold.',
    },
    {
      adapter: 'Files',
      calls: '`list(folder)`',
      why: 'The gallery, newest first. Called on mount and again on every change the folder reports.',
    },
    {
      adapter: 'Files',
      calls: '`subscribe(folder)`',
      why: 'A file put there by someone else, or by the other surface. Upload re-lists; it never polls.',
    },
    {
      adapter: 'Files',
      calls: '`url(ref, { thumbnail })`',
      why: 'Twice per file: the small one for the grid, the full one for the lightbox. A store with no thumbnail returns the full URL and the grid still draws.',
    },
    {
      adapter: 'Files',
      calls: '`remove(ref)`',
      why: 'Delete, and only after the reader has confirmed it. With `deleteAllowed: false` it is never called.',
    },
    {
      adapter: 'Files',
      calls: '`caption(ref, text)`',
      why: 'The line under a tile, written when the reader leaves the box. Only called with `captions: true`.',
    },
  ],

  adapterNotes: `Upload takes one adapter and no other. It never fetches, never routes, and never reads the clock —
\`uploadedAt\` is whatever the store stamped, and it is the only thing the gallery's order depends on.

**A \`FileRef\` is plain JSON**: an id, a name, a MIME type, a size, the folder and the instant. No
bytes. Put one on a record, in a chat message or in a config and it survives the round trip; when
you want to see the file, ask \`url\` for a URL. Methods that take a ref take just an id too, so
something holding only the id can still open and delete the file.

**Progress is the adapter's to report.** A store that cannot report it calls \`onProgress\` once with
\`1\`, and the row jumps from 0% to done rather than showing nothing. \`fakeFiles\` reports ten steps
over about 600 ms so the bar is worth looking at.

**The two surfaces share a config and share nothing else.** \`Upload.Picker\` never lists and never
deletes; it uploads into the same folder and hands the refs to \`onPicked\`, which is a per-use prop
of the call site rather than config, because who holds the files is the composer's business.`,

  slots: [
    {
      slot: 'onPicked',
      what: '`Upload.Picker` only. Called with every ref the picker is holding, each time that changes — a file finishing, or a chip taken off. The parent composer keeps the list; the picker only shows it.',
    },
  ],

  example: `import { Upload, fakeFiles } from 'golem-ui'
import 'golem-ui/styles.css'

;<Upload
  config={{
    folder: 'shop',
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    maxFiles: 12,
    maxSizeMb: 8,
    capture: 'environment',
    captions: false,
    layout: 'grid',
    deleteAllowed: true,
    emptyState: 'No photos on this ticket yet.',
  }}
  adapters={{ files }}
/>

// The same config, as the button a composer hosts:
;<Upload.Picker config={config} adapters={{ files }} onPicked={setStaged} />`,

  failureModes: `- **Invalid config.** Upload renders an error card instead of the drop zone, in dev and in prod,
  naming every field that failed. An \`accept\` entry that is not a MIME type is named by its
  position — \`accept.1\` — and told how to write it, because a picker offering \`jpg\` matches
  nothing and would fail silently otherwise.
- **A file over the limits** never reaches the adapter. Its row turns red and says which limit it
  broke, in the file's own numbers; every other file in the same batch still goes up.
- **An upload the store refuses** keeps its row, red, with the store's \`message\` on it verbatim.
  The rest of the batch is unaffected, and the row can be dismissed.
- **\`list\` rejects.** The gallery is replaced by the rejection's \`message\`. The drop zone stays,
  so the reader can still try to add something.
- **\`url\` rejects** for one file and that file draws its icon rather than its picture. One
  unreadable thumbnail does not empty the grid.
- **Delete always asks.** The button turns into *Delete permanently* and *Keep it*; nothing is
  removed until the first is pressed. With \`deleteAllowed: false\` there is no button at all.
- **A picture is whatever \`contentType\` says.** A file uploaded with an empty type — some browsers
  send none for an unusual extension — tiles as a generic file rather than a thumbnail.
- **\`capture\` is a request, not a guarantee.** A desktop browser, and some mobile ones, show the
  ordinary file picker instead. Never make the camera the only way in: the file button is always
  there beside it.
- **A new adapter object on every render** makes Upload re-subscribe and re-list on every render.
  Build adapters once, outside render.`,
}
