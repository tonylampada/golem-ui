# showcase

A demo app built only from `golem-ui` components on the kit's fake adapters. No backend, no
network. Published under the project site at **https://tonylampada.github.io/golem-ui/app/**, phone
first.

It also carries the kit's **API pages** at `#/api` and `#/api/<component>` — Storybook's docs are a
desktop site, these are the same five sections on a phone. They sit outside `Auth.Guard`, so a
reader with no account still gets the spec. `src/screens/Api.tsx` draws them and
`src/api-registry.tsx` is the only place the three sources are named together: `<X>.docs.ts` for the
prose, the Zod schema for the configuration table, `<X>.examples.tsx` for what runs live. Add a
component to that registry and its page exists.

The domain is **Northgate Cycles**, an invented neighbourhood bike repair shop. It is fiction on
purpose: nothing in this repository refers to a real person, customer or use case.

The showcase is not a separate package. It has no `package.json` and no `node_modules`; it runs on
the root install through `pnpm dev-showcase` and `pnpm build-showcase`, and `showcase/vite.config.ts`
aliases `golem-ui` to `src/index.ts`. A component appears here the moment it lands in `src/`, with
no build and no version bump.

`pnpm build-showcase` writes into `dist-site/app`, which is why it runs after `pnpm build-site` in
CI: that build clears `dist-site` and puts the landing page at the root, and Storybook and the
showcase then fill `/storybook/` and `/app/` under it. One Pages artifact carries all three.

## Where each component lands

Every component in the kit is on a screen here, and **no screen is a placeholder any more**: the
markup that stood in for `Editor` on `/dna` was the last of it. What is left of `src/ui.tsx` is the
demo's own page furniture — a screen heading, a panel, a status chip — not a component waiting to be
replaced.

| File                      | Route        | Component            | What the screen is                             |
| ------------------------- | ------------ | -------------------- | ---------------------------------------------- |
| `src/App.tsx`             | —            | **Shell**            | The frame: chat column, canvas, top bar, tabs  |
| `src/ChatColumn.tsx`      | —            | **Chat**             | The conversation with the agent                |
| `src/screens/Jobs.tsx`    | `/jobs`      | **RecordList**       | Repair tickets, newest first                   |
| `src/screens/JobForm.tsx` | `/jobs/new`  | **RecordForm**       | A blank ticket, written into the collection    |
| `src/screens/JobForm.tsx` | `/jobs/<id>` | **RecordForm**       | The same form in edit mode, on one ticket      |
| `src/screens/Report.tsx`  | `/report`    | **Report**           | The daily document, dated and printable        |
| `src/screens/Log.tsx`     | `/log`       | **Timeline**         | Dated shop entries, filterable                 |
| `src/screens/Files.tsx`   | `/files`     | **Upload**           | Photos and invoices, with a gallery            |
| `src/screens/Dna.tsx`     | `/dna`       | **Editor**           | The workspace DNA, written by both writers     |
| —                         | `/team`      | **Auth**             | Members, roles, invite by link                 |
| `src/screens/Today.tsx`   | `/today`     | _a composition_      | Report + RecordList + Timeline on one screen   |
| `src/screens/Api.tsx`     | `/api`       | _the kit's own spec_ | Every component's page, signed out, on a phone |

`/jobs` and Today's "on the bench" block are the same `RecordList` on the same `jobs` collection,
told apart by config alone: Today adds `scope: { status: ['waiting', 'in progress'] }` and
`pageSize: 3`, `/jobs` adds the filter chips and the search box. A row opens `/jobs/<id>`.

`/report` and Today's daily-report card are the same `Report` on the same `reports` collection, told
apart by config alone: `showcase/src/screens/Report.tsx` holds both configs, and the card turns off
`showIndex`, `showNavigation` and `print` because the screen around it already carries all three.
Today's report is seeded as a draft, so it wears the badge until the agent marks it final.

`/log` and Today's "latest on the log" are the same `Timeline` on the same `log` collection, told
apart by config alone: `showcase/src/screens/Log.tsx` holds both configs, and Today's drops the
filter chips, the search box and the composer and cuts `pageSize` to 3, because the block is a
glance at the log rather than the log. The composer on `/log` writes through `Records.create` and
signs the entry with whoever is signed in, so a line added there is on Today the moment you go back.

`/files` is `Upload` on the `shop` folder, and the picker in the chat composer is the same component
on the same folder: `showcase/src/ChatColumn.tsx` hosts `Upload.Picker` in `Chat`'s `attach` slot, so
a chip on a chat message is a file that really went into the shop's folder and is on `/files` the
moment you go there. The seeded files are the ones the shop log already attaches — the same ids —
and every picture in them is drawn by `placeholderImage` when the page loads, a few hundred bytes of
SVG apiece. There are no photographs in this repository.

`/dna` is `Editor` on the `dna` collection, one record, `preview: 'split'` so the rendering sits
beside the source at desktop width and behind a toggle on a phone. **Ask the agent to revise** in
that screen's header is the fake agent: two seconds later it rewrites the Rules section through the
same `Records.update` the person's own saves go through, and the version goes up. Keep typing while
you wait and watch what happens — an edit somewhere else in the document merges in and the agent's
lines wear a coloured gutter for four seconds; an edit on the turnaround rule itself stops the merge
and asks which version stays. The document is seeded at `version: 4` and every save sends the version
it read, so neither writer can flatten the other.

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
`fakeRecords` gets the shop's tickets, reports, log and the one DNA document, and `fakeFiles` gets the shop's folder of
photos and paperwork. Writing goes through the `Records` adapter's
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
- `Upload`'s gallery is two columns on a phone and four on a desktop, and its drop zone carries a
  camera button below 768 because `capture: 'environment'` opens the rear camera on a phone and is
  ignored on a laptop.
- `Editor` puts its toolbar along the bottom below 768 and falls back from `split` to the preview
  toggle, because two panes on a phone are two half-panes.
- `Timeline` scrolls inside its own box, so its day headers stick and the log never pushes the
  screen out sideways; the composer's row folds nothing, so it stays one line on a phone.
- The page never scrolls sideways. Wide things — the screen nav, a `RecordList` table — scroll
  inside their own strip, and below 768 `RecordList` draws cards instead of a table and
  `RecordForm` folds to one column with its submit bar stuck to the bottom.
- Inputs use `text-base`, so iOS does not zoom on focus.
