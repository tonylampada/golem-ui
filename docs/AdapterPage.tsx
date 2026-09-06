import type { ReactNode } from 'react'
import type { AdapterDocs, ComponentDocs } from '../src/abi'
import { adapterDocs, componentsUsing } from '../src/docs'
import { CodeBlock, Prose } from './Prose'

/**
 * The adapter pages, drawn once for both surfaces: the Storybook `Adapters/*` pages and the
 * showcase's phone-first `#/adapters` routes. The component pages have two renderers because their
 * config table wants a table on a desktop and cards on a phone; an adapter page has no table, so
 * one renderer serves both and there is nothing to keep in step.
 *
 * The two surfaces differ only in where a link points, which is what `links` carries. So an
 * adapter's `.mdx` is four imports and one `<AdapterPage>`: every sentence on the page is in
 * `<name>.docs.ts`, and there is nothing in the `.mdx` to keep in step with the showcase.
 */

export interface DocLinks {
  /** Where an adapter's name goes on the surface doing the rendering. */
  adapter: (docs: AdapterDocs) => string
  /** Where a component's name goes. */
  component: (docs: ComponentDocs) => string
  /** `_top` inside Storybook, where a docs page renders in an iframe. */
  target?: string
}

/**
 * Storybook's docs stylesheet puts a disc and a 30px indent on every `ul`, and an underline on
 * every `a`. The showcase's Tailwind reset does neither, so the card lists say so themselves and
 * both surfaces draw the same page.
 */
const PLAIN_LIST = 'list-none! pl-0!'
const PLAIN_LINK = 'no-underline!'

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-neutral-200 bg-white p-3">{children}</div>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 border-b border-neutral-200 pb-2 text-base font-semibold tracking-tight">
        {title}
      </h2>
      <div className="space-y-3 text-sm text-neutral-700">{children}</div>
    </section>
  )
}

/** A row of links to other pages — the consumers of an adapter, the adapters of a component. */
function Links({
  items,
  target,
}: {
  items: { key: string; label: string; href: string }[]
  target?: string
}) {
  return (
    <ul className={`flex flex-wrap gap-2 ${PLAIN_LIST}`}>
      {items.map((item) => (
        <li key={item.key}>
          <a
            href={item.href}
            target={target}
            className="inline-block rounded-lg border border-neutral-300 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-neutral-900! underline decoration-neutral-400 underline-offset-2"
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  )
}

/** Every adapter, one line each. The `Adapters/Overview` page and `#/adapters` are both this. */
export function AdapterList({ links }: { links: DocLinks }) {
  return (
    <ul className={`space-y-2 ${PLAIN_LIST}`}>
      {adapterDocs.map((docs) => (
        <li key={docs.slug}>
          <a
            href={links.adapter(docs)}
            target={links.target}
            className={`block rounded-xl border border-neutral-200 bg-white p-4 active:bg-neutral-100 ${PLAIN_LINK}`}
          >
            <span className="font-mono! text-sm! font-semibold text-neutral-900">{docs.name}</span>
            <span className="mt-1 block text-sm! text-neutral-600">{docs.tagline}</span>
            <span className="mt-2 block text-xs! text-neutral-500">
              Taken by {consumerSentence(docs)}
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

/** “`Report`, `Editor` and `Timeline`”, or the one name when there is one. */
function consumerSentence(docs: AdapterDocs): string {
  const names = componentsUsing(docs.name).map((component) => component.name)
  if (names.length === 0) return 'nothing in the kit yet'
  if (names.length === 1) return names[0]!
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function AdapterPage({ docs, links }: { docs: AdapterDocs; links: DocLinks }) {
  const consumers = componentsUsing(docs.name)

  return (
    <div>
      <h1 className="font-mono text-2xl font-semibold tracking-tight">{docs.name}</h1>
      <p className="mt-2 text-sm text-neutral-600">{docs.tagline}</p>

      <Section title="What it is for">
        <Prose text={docs.purpose} />
      </Section>

      <Section title="The contract">
        <p className="text-neutral-600">
          Every method on the interface. An implementation is done when all of them are true; there
          is nothing else a component calls.
        </p>
        <ul className={`space-y-3 ${PLAIN_LIST}`}>
          {docs.methods.map((method) => (
            <li key={method.signature}>
              <Card>
                <code className="block font-mono text-xs leading-relaxed font-semibold break-words">
                  {method.signature}
                </code>
                <div className="mt-2 text-neutral-700">
                  <Prose text={method.guarantees} />
                </div>
                {method.throws && (
                  <div className="mt-2 border-t border-neutral-200 pt-2">
                    <span className="text-xs font-semibold tracking-wide text-amber-700 uppercase">
                      Rejects with
                    </span>
                    <div className="mt-1 text-neutral-700">
                      <Prose text={method.throws} />
                    </div>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
        {docs.notes && <Prose text={docs.notes} />}
      </Section>

      <Section title="The fake, for stories and tests">
        <p>
          <code className="font-mono text-sm font-semibold">{docs.fake.name}()</code> — shipped from{' '}
          <code className="font-mono">golem-ui</code>, in memory, no backend and no network.
        </p>
        <Prose text={docs.fake.what} />
        <CodeBlock code={docs.fake.example} />
      </Section>

      <Section title="The components that take it">
        {consumers.length === 0 ? (
          <p>Nothing in the kit takes this adapter yet.</p>
        ) : (
          <>
            <Links
              target={links.target}
              items={consumers.map((component) => ({
                key: component.slug,
                label: component.name,
                href: links.component(component),
              }))}
            />
            <p className="text-neutral-600">
              One instance serves all of them. Two components handed the same adapter are two views
              of the same data, which is why a row written on one screen shows up on the other
              without either component knowing the other exists.
            </p>
          </>
        )}
      </Section>
    </div>
  )
}
