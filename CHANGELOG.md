# Changelog

## 0.2.2

- `Chat` — an optional microphone on the composer. Hand it `transcribe?: (audio: Blob) =>
  Promise<string>` and, where the browser has a microphone, the composer grows a mic button: tap to
  record, tap again to stop, Escape discards. The recognized text is appended to the draft and
  nothing is sent by itself. No prop, or no microphone, renders exactly the composer that was there
  before. `micLabel` names the button. golem-ui stays agnostic of any speech service.

## 0.2.1

- `Auth` — a manager resets a member's password instead of removing and re-inviting them: **Reset
  password** next to Remove in the member list mints a link, and a route carrying `reset=` opens the
  sign-in card in choose-a-new-password mode. Two optional `Identity` methods back it,
  `resetPassword(userId)` and `setPassword(token, password)`; an adapter without them is unchanged.

## 0.2.0

- `Brain` — a new component and a new `Brain` adapter: a knowledge map read as passages, master-detail
  on the desktop and a navigation stack on the phone. Relative links open in the reader, `open()`
  reports what the reader opened, and a passage the agent cited can be opened by citation.
- `Shell` — real app chrome: a thin top bar with icon buttons, the chat behind a toggle, a bottom
  menu bar with icon over label at every width, and a fixed frame. The chat column is drag-resizable
  at desktop width, `chat={null}` renders the canvas alone, and crossing into the phone layout puts
  the chat sheet away.
- `Chat` — slash commands from the adapter with a picker, a Stop pill on the thinking row via an
  optional `interrupt` on the adapter, pending messages that stay visible, history load failures
  shown and cleared on recovery, and a restyle.
- `Editor` — a focus slot: open at a source passage, placed by version and passage text. A record's
  draft is parked on a move instead of saved with the next config, and a CRLF record stays CRLF.
- `RecordForm` — versioned saves: a record is saved against the version read and a stale save asks,
  with the fields the reader did not change marked in the conflict list and the form checked again
  before Keep mine.
- Dark theme across `Shell`, `Chat`, `Auth` and `RecordForm` — shared tokens, so popovers, member
  rows and cards invert.

## 0.1.1

First public release.

Nine components, each with the same outer shape — `config` (plain JSON-serializable data, validated
by a `.strict()` Zod schema on mount) and `adapters` (interfaces the app wires; the component never
imports a data layer, a router or a fetch). Invalid config renders a loud error card naming the field
and the rule, in dev and in prod.

- `Auth` — the door and the guest list: sign-in, sign-up, invites, the member list, and a role guard.
- `Chat` — the conversation with the agent: a following message list, a growing composer, replies that stream in.
- `Editor` — one markdown document, edited by a person and by the agent at once, merged line by line.
- `RecordForm` — one record being written: a create form or an edit form, from one field list.
- `RecordList` — many records of one type: a table at desktop width, cards on a phone, from one config.
- `Report` — one dated document, rendered from markdown, printable, with the past ones under it.
- `Shell` — the app frame: a chat column, the canvas beside it, and a top bar — tabs on a phone.
- `Timeline` — dated entries read downwards, newest first: the log of what happened.
- `Upload` — files and photos in, a gallery out — and a picker a composer can host.

Adapters: `Records`, `Files`, `Identity`, `Chat`, `Clock`, `Navigation`. An in-memory fake ships for
each one (`fakeRecords()`, `fakeFiles()`, …), so stories and tests run with no backend and no network.

Peer dependencies: react and react-dom 19. Styles ship as one stylesheet at `golem-ui/styles.css`.
