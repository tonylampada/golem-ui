# Changelog

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
