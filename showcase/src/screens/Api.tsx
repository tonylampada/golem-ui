import type { ReactNode } from 'react'
import type { NavigationAdapter } from 'golem-ui'
import { configFields, rejectsUnknownFields, STRICT_NOTE } from '../../../docs/config-fields'
import { CodeBlock, DocBlocks, Prose } from '../../../docs/Prose'
import {
  apiComponentFor,
  apiComponents,
  storybookHref,
  STORYBOOK_URL,
  type ApiComponent,
} from '../api-registry'

/**
 * The kit's spec on a phone. Storybook's docs are a desktop site; these pages carry the same five
 * sections in the same fixed order, read out of the same three sources the Storybook page reads —
 * `<X>.docs.ts` for the prose, the Zod schema for the configuration, `<X>.examples.tsx` for what
 * runs. They sit outside `Auth.Guard`, because a spec nobody can read without an account is not a
 * spec.
 */

const APP_URL = '#/today'

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-auto bg-neutral-50 text-neutral-900">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">{children}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-3 border-b border-neutral-200 pb-2 text-base font-semibold tracking-tight">
        {title}
      </h2>
      <div className="space-y-4 text-sm text-neutral-700">{children}</div>
    </section>
  )
}

/** A live example on the fake adapters, framed so a full-height component has a height to fill. */
function Live({ children, height }: { children: ReactNode; height: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
      style={{ height }}
    >
      {children}
    </div>
  )
}

export function ApiIndex({ navigation }: { navigation: NavigationAdapter }) {
  return (
    <Page>
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">golem-ui</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">API</h1>
      <p className="mt-2 text-sm text-neutral-600">
        One page per component: what it is for, its configuration, the adapters it needs, one
        complete example running on the fakes, and how it fails. Generated from the schema, the
        adapter list and the examples file, so it cannot drift from the component.
      </p>

      <ul className="mt-6 space-y-2">
        {apiComponents.map(({ docs }) => (
          <li key={docs.slug}>
            <button
              type="button"
              onClick={() => navigation.go(`/api/${docs.slug}`)}
              className="block w-full rounded-xl border border-neutral-200 bg-white p-4 text-left active:bg-neutral-100"
            >
              <span className="font-mono text-sm font-semibold">{docs.name}</span>
              <span className="mt-1 block text-sm text-neutral-600">{docs.tagline}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href={APP_URL} className="font-medium underline">
          The showcase app
        </a>
        <a href={STORYBOOK_URL} className="font-medium underline">
          Storybook, on a desktop
        </a>
      </div>
    </Page>
  )
}

function ConfigCards({ component }: { component: ApiComponent }) {
  const fields = configFields(component.schema)
  return (
    <>
      {/* One card per field rather than a six-column table: a phone has no room for the table. */}
      <ul className="space-y-3">
        {fields.map((field) => (
          <li key={field.name} className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <code className="font-mono text-sm font-semibold">{field.name}</code>
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-600">
                {field.type}
              </code>
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${
                  field.required ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {field.required ? 'required' : 'optional'}
              </span>
            </div>
            <div className="mt-2">
              <Prose text={field.description} />
            </div>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-neutral-500">
              <dt>Default</dt>
              <dd>
                {field.default === null ? '—' : <code className="font-mono">{field.default}</code>}
              </dd>
              <dt>Rules</dt>
              <dd>{field.rules}</dd>
            </dl>
          </li>
        ))}
      </ul>
      {rejectsUnknownFields(component.schema) && (
        <p className="text-xs text-neutral-500 italic">{STRICT_NOTE}</p>
      )}
      {component.docs.configNotes && <DocBlocks blocks={component.docs.configNotes} />}
    </>
  )
}

export function ApiPage({ slug, navigation }: { slug: string; navigation: NavigationAdapter }) {
  const component = apiComponentFor(slug)

  if (!component) {
    return (
      <Page>
        <h1 className="text-xl font-semibold">No component called “{slug}”</h1>
        <button
          type="button"
          onClick={() => navigation.go('/api')}
          className="mt-3 text-sm font-medium underline"
        >
          Every component that does exist
        </button>
      </Page>
    )
  }

  const { docs } = component

  return (
    <Page>
      <button
        type="button"
        onClick={() => navigation.go('/api')}
        className="text-sm font-medium text-neutral-500 underline"
      >
        ← API
      </button>

      <h1 className="mt-3 font-mono text-2xl font-semibold tracking-tight">{docs.name}</h1>
      <p className="mt-2 text-sm text-neutral-600">{docs.tagline}</p>
      <a
        href={storybookHref(docs)}
        className="mt-3 inline-block text-sm font-medium underline"
        target="_blank"
        rel="noreferrer"
      >
        View in Storybook →
      </a>

      <div className="mt-8">
        <Section title="What it is for">
          <Prose text={docs.purpose} />
        </Section>

        <Section title="Configuration">
          <ConfigCards component={component} />
        </Section>

        <Section title="Adapters">
          {/* A card each rather than a three-column table: the `why` column is a sentence. */}
          <ul className="space-y-3">
            {docs.adapters.map((adapter, index) => (
              <li
                key={`${adapter.adapter}-${index}`}
                className="rounded-xl border border-neutral-200 bg-white p-3"
              >
                <code className="font-mono text-sm font-semibold">{adapter.adapter}</code>
                <div className="mt-1">
                  <Prose text={adapter.calls} />
                </div>
                <div className="mt-1 text-neutral-600">
                  <Prose text={adapter.why} />
                </div>
              </li>
            ))}
          </ul>
          {docs.adapterNotes && <Prose text={docs.adapterNotes} />}
          {docs.slots && (
            <>
              <h3 className="pt-2 text-sm font-semibold">The slots it exposes</h3>
              <ul className="space-y-3">
                {docs.slots.map((slot) => (
                  <li key={slot.slot} className="rounded-xl border border-neutral-200 bg-white p-3">
                    <code className="font-mono text-sm font-semibold">{slot.slot}</code>
                    <div className="mt-1 text-neutral-600">
                      <Prose text={slot.what} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>

        <Section title="One complete example">
          <CodeBlock code={docs.example} />
          <p className="text-xs text-neutral-500">
            The same example, running here on the kit's fake adapters:
          </p>
          <Live height={component.exampleHeight}>{component.example}</Live>
        </Section>

        <Section title="Failure modes">
          <Prose text={docs.failureModes} />
          <p className="text-xs text-neutral-500">A config this component rejects:</p>
          <Live height={320}>
            <div className="h-full overflow-auto">{component.invalid}</div>
          </Live>
        </Section>
      </div>
    </Page>
  )
}
