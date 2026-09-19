import { useEffect, useRef, useState, type ReactNode } from 'react'
import { defineComponent, type GolemProps } from '../../abi'
import { parseLocation, type BrainAdapter, type BrainEntry } from '../../adapters'
import { Markdown } from '../../lib/markdown'
import { brainConfigSchema, type BrainConfig } from './Brain.config'

export interface BrainAdapters {
  brain: BrainAdapter
}

export interface BrainSlots {
  /** Rendered at the right-hand end of the reader's header: a search box, an edit button. */
  toolbar?: ReactNode
}

const name = (path: string) => path.split('/').pop()!

function Tree({
  dir,
  adapter,
  open,
  onOpen,
  version,
}: {
  dir?: string
  adapter: BrainAdapter
  open: string
  onOpen: (path: string) => void
  version: number
}) {
  const [entries, setEntries] = useState<BrainEntry[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let live = true
    void adapter.list(dir).then((next) => live && setEntries(next))
    return () => {
      live = false
    }
  }, [adapter, dir, version])

  return (
    <ul className={dir ? 'ml-3 border-l border-(--chat-line)' : ''}>
      {entries.map((entry) =>
        entry.kind === 'dir' ? (
          <li key={entry.path}>
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [entry.path]: !c[entry.path] }))}
              className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-sm text-(--chat-dim) hover:bg-(--chat-panel2)"
            >
              <span aria-hidden="true" className="w-3 text-[10px]">
                {collapsed[entry.path] ? '▸' : '▾'}
              </span>
              {name(entry.path)}/
            </button>
            {!collapsed[entry.path] && (
              <Tree
                dir={entry.path}
                adapter={adapter}
                open={open}
                onOpen={onOpen}
                version={version}
              />
            )}
          </li>
        ) : (
          <li key={entry.path}>
            <button
              type="button"
              data-golem-brain-file={entry.path}
              aria-current={entry.path === open ? 'page' : undefined}
              onClick={() => onOpen(entry.path)}
              className={`w-full truncate rounded px-1.5 py-1 pl-5 text-left text-sm hover:bg-(--chat-panel2) ${
                entry.path === open
                  ? 'bg-(--chat-panel2) font-medium text-(--chat-text)'
                  : 'text-(--chat-dim)'
              }`}
            >
              {name(entry.path)}
            </button>
          </li>
        ),
      )}
    </ul>
  )
}

/**
 * The file in three runs of markdown — before, the cited range, after — so the range wears a
 * highlight at exactly the lines cited. YAML front matter stays visible, muted, so line numbers in
 * a location still count from line 1 of the file.
 */
const BRAIN_LINK = '#brain:'

/** `../suppliers.md` seen from `workshop/fork-service.md` → `suppliers.md`. */
function resolvePath(from: string, relative: string): string {
  const parts = from.split('/').slice(0, -1)
  for (const part of relative.split('/')) {
    if (part === '..') parts.pop()
    else if (part !== '.' && part) parts.push(part)
  }
  return parts.join('/')
}

function Reader({
  text,
  path,
  start,
  end,
}: {
  text: string
  path: string
  start?: number
  end?: number
}) {
  const marked = useRef<HTMLDivElement>(null)
  // A relative link in the bundle opens that file in this reader; the click handler on the article
  // reads the path back off the href.
  const resolveLink = (href: string) =>
    /^[a-z]+:/i.test(href) ? undefined : BRAIN_LINK + resolvePath(path, href.split('#')[0]!)
  const lines = text.split('\n')
  const fm = lines[0] === '---' ? lines.indexOf('---', 1) + 1 : 0

  // Scrolls the reader's own box, not the page: a docs page hosting this component stays put.
  useEffect(() => {
    const mark = marked.current
    const box = mark?.closest('article')
    if (!mark || !box) return
    const offset = mark.getBoundingClientRect().top - box.getBoundingClientRect().top
    box.scrollTop += offset - box.clientHeight / 2 + mark.clientHeight / 2
  }, [text, start, end])

  const run = (from: number, to: number, key: string) =>
    to > from ? (
      <div key={key}>
        <Markdown
          text={lines.slice(from, to).join('\n')}
          hardWraps={false}
          resolveLink={resolveLink}
        />
      </div>
    ) : null

  if (start === undefined || end === undefined) {
    return (
      <>
        {fm > 0 && <FrontMatter lines={lines.slice(0, fm)} />}
        {run(fm, lines.length, 'all')}
      </>
    )
  }
  const from = Math.max(fm, start - 1)
  const to = Math.min(lines.length, end)
  return (
    <>
      {fm > 0 && <FrontMatter lines={lines.slice(0, fm)} />}
      {run(fm, from, 'before')}
      <div
        ref={marked}
        data-golem-brain-highlight={`L${start}-L${end}`}
        className="-mx-2 my-1 rounded-md border-l-4 border-(--chat-accent) bg-(--chat-accent-soft) px-2 py-1"
      >
        <Markdown
          text={lines.slice(from, to).join('\n')}
          hardWraps={false}
          resolveLink={resolveLink}
        />
      </div>
      {run(to, lines.length, 'after')}
    </>
  )
}

function FrontMatter({ lines }: { lines: string[] }) {
  return (
    <pre className="mb-3 overflow-x-auto rounded-md bg-(--chat-panel2) px-2 py-1 font-mono text-[11px] text-(--chat-faint)">
      {lines.join('\n')}
    </pre>
  )
}

function BrainPanel({
  config,
  adapters,
  toolbar,
}: GolemProps<BrainConfig, BrainAdapters, BrainSlots>) {
  const location = config.openLocation ? parseLocation(config.openLocation) : { path: 'index.md' }
  const [open, setOpen] = useState(location.path)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  // A new location wins over whatever the reader clicked: state adjusted during render, so the
  // reader never paints the old file first.
  const [seenLocation, setSeenLocation] = useState(config.openLocation)
  if (seenLocation !== config.openLocation) {
    setSeenLocation(config.openLocation)
    setOpen(location.path)
  }
  useEffect(() => adapters.brain.subscribe(() => setVersion((v) => v + 1)), [adapters.brain])

  useEffect(() => {
    let live = true
    const load = open === 'index.md' ? adapters.brain.index() : adapters.brain.read(open)
    load
      .then((next) => {
        if (!live) return
        setText(next)
        setError('')
      })
      .catch((cause: unknown) => {
        if (live) setError(cause instanceof Error ? cause.message : `Could not open ${open}.`)
      })
    return () => {
      live = false
    }
  }, [adapters.brain, open, version])

  const range = open === location.path ? location : { start: undefined, end: undefined }

  return (
    <div
      data-golem-component="Brain"
      className="golem-chat flex h-full min-h-0 w-full flex-col bg-(--chat-bg) text-(--chat-text) md:flex-row"
    >
      <nav
        aria-label={config.title}
        className="max-h-[40%] shrink-0 overflow-y-auto border-b border-(--chat-line) px-2 py-2 md:max-h-none md:w-56 md:border-r md:border-b-0"
      >
        <h2 className="px-1.5 pb-1 text-xs font-semibold tracking-wide text-(--chat-faint) uppercase">
          {config.title}
        </h2>
        <Tree adapter={adapters.brain} open={open} onOpen={setOpen} version={version} />
      </nav>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-(--chat-line) px-3 py-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-(--chat-dim)">
            {open}
          </span>
          {toolbar}
        </header>
        <article
          className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[15px] leading-relaxed"
          onClick={(event) => {
            const href = (event.target as HTMLElement).closest('a')?.getAttribute('href') ?? ''
            if (!href.startsWith(BRAIN_LINK)) return
            event.preventDefault()
            setOpen(href.slice(BRAIN_LINK.length))
          }}
        >
          {error ? (
            <p role="alert" className="text-sm text-(--chat-danger)">
              {error}
            </p>
          ) : (
            <Reader key={open} path={open} text={text} start={range.start} end={range.end} />
          )}
        </article>
      </section>
    </div>
  )
}

export const Brain = defineComponent<typeof brainConfigSchema, BrainAdapters, BrainSlots>({
  name: 'Brain',
  schema: brainConfigSchema,
  render: BrainPanel,
})
