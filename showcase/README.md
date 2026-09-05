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

`Shell` and `Chat` exist today. Every other screen is plain markup standing in one component's
place, so adding that component is a swap of markup for JSX inside one file, and nothing else moves.

| File                     | Route       | Component that replaces it | What it stands in for                         |
| ------------------------ | ----------- | -------------------------- | --------------------------------------------- |
| `src/App.tsx`            | —           | **Shell** (already used)   | The frame: chat column, canvas, top bar, tabs |
| `src/ChatColumn.tsx`     | —           | **Chat** (already used)    | The conversation with the agent               |
| `src/screens/Jobs.tsx`   | `/jobs`     | **Record list**            | Repair tickets, newest first                  |
| `src/screens/NewJob.tsx` | `/jobs/new` | **Record form**            | One ticket, config-driven from a field list   |
| `src/screens/Report.tsx` | `/report`   | **Report**                 | The daily document, dated and printable       |
| `src/screens/Log.tsx`    | `/log`      | **Timeline**               | Dated shop entries, filterable                |
| `src/screens/Files.tsx`  | `/files`    | **Upload**                 | Photos and invoices, with a gallery           |
| `src/screens/Dna.tsx`    | `/dna`      | **Editor**                 | The workspace DNA, live-updated by the agent  |
| `src/screens/Team.tsx`   | `/team`     | **Auth**                   | Members, invite by link, sign out             |
| `src/screens/Today.tsx`  | `/today`    | _a composition_            | Report + Record list + Timeline on one screen |

## Adapters

`src/adapters.ts` wires every one of them, and it is the only file that knows an adapter exists.

`Identity`, `Records`, `Files`, `Clock` and `Chat` are the kit's fakes, seeded from `src/seed.ts` —
`fakeChat` gets the seed conversation plus `cannedReplies`, which it streams back word by word. One
adapter is the app's own, with its reason written above it in that file: `hashNavigation`, so a
screen has a linkable URL that survives a reload under the Pages subpath.

## Phone first

The captain opens this on a phone. Every change is checked at **390px wide** before it lands:

- The `Shell` breakpoint is 768, so below it chat and canvas are thumb-sized tabs.
- The page never scrolls sideways. Wide things — the screen nav — scroll inside their own
  `overflow-x-auto` strip.
- Inputs use `text-base`, so iOS does not zoom on focus.
