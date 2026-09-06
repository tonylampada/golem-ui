# golem-ui — for the agent working here

You are adding to a component kit whose first reader is another agent. Every choice below exists so
that an agent assembling a screen from these components, unattended, gets it right the first time.

## Read before you write

- `README.md` — the ABI and the eight-step **Adding a component** checklist. That checklist is the
  task; a component is finished when every step is done, and step 8 (a place in the showcase) is the
  one people skip.
- `docs/TEMPLATE.md` — the five fixed sections of a component page. Copy it; fill every section.
- `src/components/Shell/` — the **reference component**. Match its file set, its `.config.ts`
  `.describe()` prose, its examples-as-data file, and its `.mdx` shape. When in doubt, do what Shell does.
- `showcase/README.md` — which screen your component replaces, and how the showcase runs.

## Conventions the files do not confess

- **The config is data.** JSON-serializable, `.strict()`, one `.describe()` per field written as the
  sentence a reader needs to choose a value. The docs table is generated from those sentences; they
  are the documentation.
- **Adapters are interfaces, never imports.** A component calls what it is handed. If it needs
  something new from the world, extend the adapter interface in `src/adapters/`, extend the fake in
  `src/adapters/fake/`, and keep both minimal: cut what your component does not call.
- **Examples are the single source.** `<X>.examples.tsx` feeds both the stories and the tests. Adapters
  in that file are built once at module scope, so props identity is stable across renders.
- **Every doc page ends with the invalid-config story**, so the reader sees the error card.
- **The page's prose is data, in `<X>.docs.ts`.** Two surfaces render it — the Storybook `.mdx` and
  the showcase's `#/api/<x>` page — so a sentence written twice would be a sentence that drifts.
  The generated parts stay generated: the config table from the Zod schema, the worked example from
  `<X>.examples.tsx`. Markdown carries no tables, so a table inside `configNotes` is a `DocBlock`.
- **The showcase is fiction.** Its domain is Northgate Cycles, an invented bike shop, and every name,
  ticket and date in `showcase/src/seed.ts` is invented. New seed data stays inside that fiction.
- **Docs are written with the `writing-for-agents` skill loaded**: README lines, component pages, the
  template, `showcase/README.md`, this file. Load it before writing a sentence of prose.

## The site

One Pages artifact, `dist-site/`, filled by three builds in that order — the first clears it, the
other two write folders into it.

- `/` — the landing page: the pitch, the quick start, the index of everything else. Source `site/`,
  plain HTML and Tailwind, `pnpm build-site`.
- `/app/` — the showcase, and the API pages at `#/api`. Source `showcase/`, `pnpm build-showcase`.
- `/storybook/` — every story. Source `src/**/*.stories.tsx` and `.storybook/`, `pnpm build-storybook`.

## Verification bar

`pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm build-site && pnpm build-storybook &&
pnpm build-showcase`
green locally, then green in CI, then the component **opened on the live docs site**, on its
`#/api/<x>` page, and on the live showcase, at a phone width and a desktop width. A done report
names the URL you opened and what you saw.

## Delivery

Work lands on `main` directly. Rebase on `origin/main` before pushing; a rejected push means rebase
again. The Pages site redeploys from every push to `main`, so what is on `main` is what the world sees.
