# showcase

A demo app built only from `golem-ui` components on the kit's fake adapters. No backend, no
network. Published beside the docs at **https://tonylampada.github.io/golem-ui/app/**, phone first.

The domain is **Northgate Cycles**, an invented neighbourhood bike repair shop. It is fiction on
purpose: nothing in this repository refers to a real person, customer or use case.

The showcase is not a separate package. It has no `package.json` and no `node_modules`; it runs on
the root install through `pnpm dev-showcase` and `pnpm build-showcase`, and `showcase/vite.config.ts`
aliases `golem-ui` to `src/index.ts`. A component appears here the moment it lands in `src/`, with
no build and no version bump.

`pnpm build-showcase` writes into `storybook-static/app`, which is why it runs after
`pnpm build-storybook` in CI: one Pages artifact carries Storybook at the root and the showcase
under `/app/`.

## Where each component lands

`Shell`, `Chat`, `Auth`, `RecordList` and `RecordForm` exist today. Every other screen is plain
markup standing in one component's place, so adding that component is a swap of markup for JSX
inside one file, and nothing else moves.

| File                      | Route        | Component that replaces it    | What it stands in for                         |
| ------------------------- | ------------ | ----------------------------- | --------------------------------------------- |
| `src/App.tsx`             | —            | **Shell** (already used)      | The frame: chat column, canvas, top bar, tabs |
| `src/ChatColumn.tsx`      | —            | **Chat** (already used)       | The conversation with the agent               |
| `src/screens/Jobs.tsx`    | `/jobs`      | **RecordList** (already used) | Repair tickets, newest first                  |
| `src/screens/JobForm.tsx` | `/jobs/new`  | **RecordForm** (already used) | A blank ticket, written into the collection   |
| `src/screens/JobForm.tsx` | `/jobs/<id>` | **RecordForm** (already used) | The same form in edit mode, on one ticket     |
| `src/screens/Report.tsx`  | `/report`    | **Report**                    | The daily document, dated and printable       |
| `src/screens/Log.tsx`     | `/log`       | **Timeline**                  | Dated shop entries, filterable                |
| `src/screens/Files.tsx`   | `/files`     | **Upload**                    | Photos and invoices, with a gallery           |
| `src/screens/Dna.tsx`     | `/dna`       | **Editor**                    | The workspace DNA, live-updated by the agent  |
| —                         | `/team`      | **Auth** (already used)       | Members, roles, invite by link                |
| `src/screens/Today.tsx`   | `/today`     | _a composition_               | Report + RecordList + Timeline on one screen  |

`/jobs` and Today's "on the bench" block are the same `RecordList` on the same `jobs` collection,
told apart by config alone: Today adds `scope: { status: ['waiting', 'in progress'] }` and
`pageSize: 3`, `/jobs` adds the filter chips and the search box. A row opens `/jobs/<id>`.

`/jobs/new` and `/jobs/<id>` are the same `RecordForm` in the same way: one field list in
`src/screens/JobForm.tsx`, `mode: 'create'` on one route and `mode: 'edit'` on the other. The ticket
number is required on create and `readOnly` on edit, because the shop writes it once when the bike
comes in. `deleteAllowed` is on only for the owner — the screen reads the signed-in member's roles
and puts the answer in the config, which is why Nadia sees a Delete button and Omar does not.
Saving returns to `/jobs`, where the list shows the change through `subscribe` without a reload.

## Adapters

`src/adapters.ts` wires every one of them, and it is the only file that knows an adapter exists.

`Identity`, `Records`, `Files`, `Clock` and `Chat` are the kit's fakes, seeded from `src/seed.ts` —
`fakeChat` gets the seed conversation plus `cannedReplies`, which it streams back word by word, and
`fakeRecords` gets the shop's tickets, log and files. Writing goes through the `Records` adapter's
own `create`, `update` and `remove`, so the ticket form talks to the same interface a server would
sit behind. One adapter is the app's own, with its reason written above it in that file:
`hashNavigation`, so a screen has a linkable URL that survives a reload under the Pages subpath. It
parses the hash's query string into `Route.params`, which is where `Auth` reads an invite token
from.

## Signing in

The app opens signed out. `fakeIdentity` is seeded with the shop's five accounts and one password
for all of them, and the sign-in screen says which — a demo nobody can get into is a broken demo.
`showcase/src/auth-config.ts` holds the one `Auth` config the front door, the Team screen, the
account menu and the DNA guard all share. Sign in as anyone but Nadia and `/dna` shows the guard
turning you away; sign in as Nadia and it opens.

Invites are the one piece of state that outlives a page load. An invite link is meant to be opened
in another tab, which is a cold start, so `src/adapters.ts` keeps the open tokens in `localStorage`
and spends them on sign-up. Everything else — who is signed in, who has been added — is memory, and
a reload puts the demo back at the sign-in screen.

## Phone first

The captain opens this on a phone. Every change is checked at **390px wide** before it lands:

- The `Shell` breakpoint is 768, so below it chat and canvas are thumb-sized tabs.
- The page never scrolls sideways. Wide things — the screen nav, a `RecordList` table — scroll
  inside their own strip, and below 768 `RecordList` draws cards instead of a table.
- Inputs use `text-base`, so iOS does not zoom on focus.
