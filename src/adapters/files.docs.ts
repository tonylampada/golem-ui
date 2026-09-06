import type { AdapterDocs } from '../abi'

export const filesAdapterDocs: AdapterDocs = {
  name: 'Files',
  slug: 'files',
  storybookPath: 'adapters-files',
  tagline:
    'A folder of blobs and the five things you do to one: put it there, open it, caption it, list it, take it away.',

  purpose: `\`Files\` is where bytes live. A component hands it a browser \`File\` and a folder name and gets back a
\`FileRef\` — plain JSON with an id, a name, a MIME type, a size and a timestamp, and no bytes at all.
When something wants to see the file it asks \`url\` for one.

That split is the point: a ref can go on a record, into a chat message or into a config and survive
the round trip, while the bytes stay behind whatever storage the app actually has. Implement it over
S3, a CDN, a form POST, or a \`Map\` of object URLs.`,

  methods: [
    {
      signature: 'upload(file: File, options: UploadOptions): Promise<FileRef>',
      guarantees: `The file lands in \`options.folder\` — the same string \`list\` and \`subscribe\` are given — and the
resolved ref is what everything downstream holds. \`onProgress\` is called as the bytes go up with the
fraction done between 0 and 1; **a store that cannot report progress calls it once with \`1\` rather
than never**, so the caller's bar completes instead of hanging. \`uploadedAt\` is the store's own
stamp, and it is what orders every gallery.`,
      throws:
        'An `Error` whose `message` is shown on that file’s row as written — too large, wrong type, refused. One file failing leaves the rest of the batch alone.',
    },
    {
      signature: 'url(ref: FileHandle, options?: { thumbnail?: boolean }): Promise<string>',
      guarantees: `A URL the browser can open. \`thumbnail: true\` asks for a small one; **a store that keeps no thumbnail
returns the full URL** rather than rejecting, so a caller never has to ask whether it has one. Takes
a whole ref or just an id.`,
    },
    {
      signature: 'remove(ref: FileHandle): Promise<void>',
      guarantees:
        'The file is gone when the promise resolves, and `subscribe` has fired for its folder.',
      throws:
        'An `Error` whose `message` the reader is shown as written — a permission refusal reads as one.',
    },
    {
      signature: 'list(folder: string): Promise<FileRef[]>',
      guarantees:
        'Everything in that folder, **newest first**. Ordering is the store’s job, not the gallery’s. An unknown folder is an empty list, not an error.',
    },
    {
      signature: 'caption(ref: FileHandle, caption: string): Promise<FileRef>',
      guarantees:
        'Writes the line and resolves the whole ref back, so the caller replaces its copy rather than patching it.',
      throws: 'An `Error` whose `message` is shown under the tile as written.',
    },
    {
      signature: 'subscribe(folder: string, listener: () => void): Unsubscribe',
      guarantees:
        'Calls the listener with no argument whenever that folder changed, including changes this caller made. The listener re-lists; it is a nudge, not a payload. Returns the function that detaches it.',
    },
  ],

  notes: `**A \`FileRef\` is plain JSON and carries no bytes**: \`id\`, \`name\`, \`contentType\`, \`size\`, \`folder\`,
\`uploadedAt\`, and \`caption\` once something writes one. \`contentType\` is how a gallery knows it has a
photo rather than an invoice.

**Every method that takes a ref takes an id too.** \`FileHandle\` is \`FileRef | string\`, and \`fileId()\`
narrows it — so a caller that kept only the id, an attachment on a record say, can still open and
delete the file.

**Every rejection's \`message\` reaches a person unedited.** Write them as sentences.

**The folder is the only scope there is.** There are no nested paths, no per-file permissions and no
move: a file is in one folder from upload to removal.`,

  fake: {
    name: 'fakeFiles',
    what: `An in-memory folder map over object URLs. Uploads report ten progress steps over about 600 ms so a
bar is worth looking at, and thumbnails are really drawn — through a canvas, in the page — so the
grid loads small pictures rather than full ones. \`failOn\` rejects one file by name and lets the rest
of the batch through, which is how a story shows a failed row beside successful ones. \`now\` decides
what stamps \`uploadedAt\`, so a demo dated inside its own fiction stays there.

Seeded files carry a \`content\` string instead of bytes, because the kit ships no image files:
\`placeholderImage(label)\` draws one as a few hundred bytes of SVG data URL.`,
    example: `import { Upload, fakeFiles, placeholderImage } from 'golem-ui'

const files = fakeFiles({
  seed: [
    {
      id: 'f-1',
      folder: 'shop',
      name: 'rear-derailleur.jpg',
      contentType: 'image/jpeg',
      content: placeholderImage('rear derailleur'),
      caption: 'Hanger bent inwards.',
    },
  ],
  failOn: 'too-big.mov',
})

;<Upload config={galleryConfig} adapters={{ files }} />`,
  },

  consumers: ['Timeline', 'Upload'],
}
