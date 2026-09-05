# golem-ui

UI components with **one ABI**, built so an agent assembling a screen unattended gets it right the
first time. Part of [Golem](https://github.com/tonylampada/golem-ui). MIT.

**Docs site (the spec, for the agent): https://tonylampada.github.io/golem-ui/**

**Showcase (a demo app, for people, phone first): https://tonylampada.github.io/golem-ui/app/**

**API pages (the same spec, phone first, readable signed out):
https://tonylampada.github.io/golem-ui/app/#/api**

## The ABI

```tsx
<Shell
  config={{ title: 'Northgate Cycles', chatSide: 'left', breakpoint: 768, showTopBar: true }}
  adapters={{ identity, navigation }}
  chat={<AgentChat />}
  canvas={<TodayScreen />}
/>
```

- Every component has the same outer shape: `config` and `adapters`. No exceptions.
- `config` is plain JSON-serializable data — what the component _is_. A Zod schema validates it on
  mount; unknown fields are rejected.
- Invalid config renders a **loud error card** naming the field and the rule, in dev and in prod.
- `adapters` are how the component _talks to the world_: `Records`, `Files`, `Identity`, `Chat`,
  `Clock`, `Navigation`. A component never imports a data layer, a router or a fetch.
- `golem-ui` ships an in-memory fake of every adapter (`fakeIdentity()`, `fakeRecords()`, …). Stories
  and tests run on the fakes; no backend, no network.
- Config is **generated** by the agent, adapters are **wired** by the app. Two failure modes, kept
  apart.
- Docs are generated from the schema, so they cannot drift from the validator.

## Adding a component

1. `src/components/<X>/<X>.config.ts` — the Zod schema, one `.describe()` per field, `.strict()`.
2. `src/components/<X>/<X>.tsx` — a capitalised render function wrapped in `defineComponent`.
   Adapters and slots go in interfaces beside it.
3. `src/components/<X>/<X>.examples.tsx` — every example as data, adapters built once at module
   scope. This file is the single source: stories and tests both import it.
4. `src/components/<X>/<X>.stories.tsx` — one story per example, including an invalid-config one.
5. `src/components/<X>/<X>.test.tsx` — renders every example, plus the seams worth holding.
6. `src/components/<X>/<X>.docs.ts` — the page's prose as data (`tagline`, `purpose`, `adapters`,
   `failureModes`, the example), and `<X>.mdx` reading it. Both the Storybook page and the API page
   at `#/api/<x>` render that one object, so a sentence lives in one place. Copy `docs/TEMPLATE.md`
   for the section order: it is fixed and no section is optional. Add the docs object to
   `src/docs.ts`, and the component to `showcase/src/api-registry.tsx`.
7. Export it from `src/index.ts`.
8. Give it a place in the showcase: `showcase/README.md` names the screen it replaces, and that
   screen is plain markup waiting for it. A component nobody can see working is not finished.

`pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm build-storybook && pnpm build-showcase`

## Install

```sh
pnpm add golem-ui
```

```tsx
import { Shell } from 'golem-ui'
import 'golem-ui/styles.css'
```
