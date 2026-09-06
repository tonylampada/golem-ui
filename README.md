# golem-ui

UI components with **one ABI**, built so an agent assembling a screen unattended gets it right the
first time. Part of [Golem](https://github.com/tonylampada/golem-ui). MIT.

**The site: https://tonylampada.github.io/golem-ui/** — the pitch, the quick start, and an index of
everything below it:

- **Showcase** (a demo app, for people, phone first): https://tonylampada.github.io/golem-ui/app/
- **API pages** (the spec, phone first, readable signed out):
  https://tonylampada.github.io/golem-ui/app/#/api
- **Adapter pages** (the contract behind every `adapters` prop):
  https://tonylampada.github.io/golem-ui/app/#/adapters
- **Storybook** (every example as a live story, desktop):
  https://tonylampada.github.io/golem-ui/storybook/

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

## Adapters

The adapters are the interface between a Golem app and the world, and that interface is the
architecture. There are six, each documented as a thing in itself — every method, what an
implementation has to guarantee, what it rejects with, and the in-memory fake — at
[`#/adapters`](https://tonylampada.github.io/golem-ui/app/#/adapters) and under `Adapters/` in
Storybook.

| Adapter      | What it is                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------- |
| `Records`    | Collections of JSON rows, the four writes, and the version check that keeps two writers apart |
| `Files`      | A folder of blobs; refs are plain JSON and carry no bytes                                     |
| `Identity`   | Who is here, how they got here, and who else may come in                                      |
| `Chat`       | The conversation: history, send, and a stream that arrives token by token                     |
| `Clock`      | Now and the zone to read it in, so nothing in the kit calls `new Date()`                      |
| `Navigation` | The current route, `go(path)`, and a listener — no router imported anywhere                   |

**One instance serves every component that takes it.** `Records` handed to a `RecordList` and to a
`RecordForm` is what makes a ticket saved on one screen appear on the other; `subscribe` carries it,
and neither component knows the other is there. The same goes for `Identity` across `Shell`, `Auth`,
`RecordForm` and `Timeline`, and for `Files` across `Upload` and `Timeline`.

## Adding an adapter

1. `src/adapters/<name>.ts` — the interface, one doc comment per method, and any error class it
   throws. Keep it minimal: cut what no component calls.
2. `src/adapters/fake/<name>.ts` — the in-memory fake, real enough to run the failure path.
3. `src/adapters/<name>.docs.ts` — the page's prose as data (`purpose`, every `method` with what it
   guarantees and what it throws, `fake`, `consumers`). Add it to `adapterDocs` in `src/docs.ts`.
4. `src/adapters/<Name>.mdx` — four lines: `<AdapterPage docs={...} links={storybookLinks} />`. The
   showcase's `#/adapters/<name>` needs nothing; it reads the same list.
5. Export the types from `src/adapters/index.ts` and the fake from `src/adapters/fake/index.ts`.

`src/adapters/adapters.docs.test.ts` fails on an adapter with no `.docs.ts`, and on a `consumers`
list that disagrees with what the components say they take.

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

A component that needs something new from the world extends an adapter rather than importing a data
layer — and an adapter that gains a method gains a row on its own page in the same commit.

`pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm build-site && pnpm build-storybook &&
pnpm build-showcase`

## Install

```sh
npm i golem-ui react react-dom
```

React 19 is a peer dependency. Import the stylesheet once, at your app's entry:

```tsx
import { Shell, fakeIdentity, fakeNavigation } from 'golem-ui'
import 'golem-ui/styles.css'

const adapters = {
  identity: fakeIdentity(),
  navigation: fakeNavigation({ path: '/today', params: {} }),
}

export function App() {
  return (
    <Shell
      config={{ title: 'Northgate Cycles' }}
      adapters={adapters}
      chat={<AgentChat />}
      canvas={<TodayScreen />}
    />
  )
}
```

In a TypeScript app, the `.css` import needs the ambient declaration Vite ships: keep
`/// <reference types="vite/client" />` in `src/vite-env.d.ts`, as `npm create vite` writes it.

`scripts/smoke-pack.sh` runs that install end to end — it packs the kit, installs the tarball into a
throwaway Vite app outside the repo, and typechecks and builds it.

## Releasing

Every release after the first ships from GitHub Actions with npm [trusted
publishing](https://docs.npmjs.com/trusted-publishers): the workflow mints its own short-lived
credential from an OIDC token, so there is no `NPM_TOKEN` secret anywhere and the published tarball
carries provenance.

```sh
# bump "version" in package.json and add the entry to CHANGELOG.md, then:
git commit -am "Release 0.1.1"
git tag v0.1.1
git push origin main --tags
```

The tag starts `.github/workflows/release.yml`, which runs lint, typecheck, tests and the build,
checks the tag matches `package.json`, and publishes. A tag whose version disagrees with
`package.json` fails before the publish step.

### The two one-time steps, for the captain

1. **Publish 0.1.0 by hand**, from a shell logged in to npm. Trusted publishing is configured per
   package, and the package has to exist first.

   ```sh
   npm login
   pnpm build && npm publish --provenance --access public
   ```

2. **Turn on trusted publishing** at npmjs.com → the `golem-ui` package → Settings → Trusted
   publishing → GitHub Actions, with organization/user `tonylampada`, repository `golem-ui`,
   workflow `release.yml`, and no environment. From then on the tag is the whole release.
