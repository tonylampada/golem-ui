import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { defineComponent, type GolemProps } from '../../abi'
import { parseLocation, type BrainAdapter, type BrainEntry, type BrainHit } from '../../adapters'
import { Markdown } from '../../lib/markdown'
import { useContainerWidth } from '../../lib/use-container-width'
import { brainConfigSchema, type BrainConfig } from './Brain.config'

export interface BrainAdapters {
  brain: BrainAdapter
}

export interface BrainSlots {
  /** Rendered at the right-hand end of the document header: an Edit button, a share button. */
  toolbar?: ReactNode
}

/** Below this container width the reader is one screen at a time: the list, then the document. */
const PHONE = 768
const BRAIN_LINK = '#brain:'
const ROOT = 'index.md'

/** One open document on the stack. A range comes from a citation or a search hit. */
interface Frame {
  path: string
  start?: number
  end?: number
}

const same = (a: Frame | undefined, b: Frame) =>
  a?.path === b.path && a.start === b.start && a.end === b.end
const locationOf = (f: Frame) =>
  f.start === undefined ? f.path : `${f.path}#L${f.start}-L${f.end ?? f.start}`

const name = (path: string) => path.split('/').pop()!.replace(/\.md$/, '')

/** `../suppliers.md` seen from `workshop/fork-service.md` → `suppliers.md`. */
function resolvePath(from: string, relative: string): string {
  const parts = from.split('/').slice(0, -1)
  for (const part of relative.split('/')) {
    if (part === '..') parts.pop()
    else if (part !== '.' && part) parts.push(part)
  }
  return parts.join('/')
}

/** The `key: value` lines of the front matter, and the line the body starts on. */
function frontMatter(lines: string[]): { meta: Record<string, string>; body: number } {
  if (lines[0] !== '---') return { meta: {}, body: 0 }
  const close = lines.indexOf('---', 1)
  if (close < 0) return { meta: {}, body: 0 }
  const meta: Record<string, string> = {}
  for (const line of lines.slice(1, close)) {
    const m = /^(\w[\w-]*):\s*(.*)$/.exec(line)
    if (m) meta[m[1]!] = m[2]!.replace(/^["']|["']$/g, '')
  }
  return { meta, body: close + 1 }
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden="true" className="space-y-2 py-1">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-3 animate-pulse rounded bg-(--chat-panel2)"
          style={{ width: `${[85, 60, 72, 45][i % 4]}%` }}
        />
      ))}
    </div>
  )
}

function Tree({
  dir,
  adapter,
  open,
  onOpen,
  version,
}: {
  dir?: string
  adapter: BrainAdapter
  open?: string
  onOpen: (path: string) => void
  version: number
}) {
  const [entries, setEntries] = useState<BrainEntry[] | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let live = true
    void adapter.list(dir).then((next) => live && setEntries(next))
    return () => {
      live = false
    }
  }, [adapter, dir, version])

  if (!entries) return dir ? null : <Skeleton rows={4} />
  if (!entries.length && !dir)
    return <p className="px-2 py-3 text-sm text-(--chat-faint)">Nothing written here yet.</p>

  return (
    <ul className={dir ? 'ml-2.5 border-l border-(--chat-line) pl-1' : ''}>
      {entries.map((entry) =>
        entry.kind === 'dir' ? (
          <li key={entry.path}>
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [entry.path]: !c[entry.path] }))}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-(--chat-dim) hover:bg-(--chat-panel2)"
            >
              <span aria-hidden="true" className="w-3 text-center text-[10px] text-(--chat-faint)">
                {collapsed[entry.path] ? '▸' : '▾'}
              </span>
              <span className="truncate">{name(entry.path)}</span>
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
              className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-(--chat-panel2) ${
                entry.path === open
                  ? 'bg-(--chat-panel2) font-medium text-(--chat-text)'
                  : 'text-(--chat-dim)'
              }`}
            >
              <span aria-hidden="true" className="w-3 text-center text-[10px] text-(--chat-faint)">
                {entry.path === open ? '●' : '·'}
              </span>
              <span className="truncate">{name(entry.path)}</span>
            </button>
          </li>
        ),
      )}
    </ul>
  )
}

function Hits({
  query,
  adapter,
  onOpen,
}: {
  query: string
  adapter: BrainAdapter
  onOpen: (frame: Frame) => void
}) {
  // Hits are kept with the query they answer, so a new query shows the skeleton, not stale hits.
  const [found, setFound] = useState<{ query: string; hits: BrainHit[] }>()
  const hits = found?.query === query ? found.hits : null
  useEffect(() => {
    let live = true
    const timer = setTimeout(
      () => void adapter.search(query).then((hits) => live && setFound({ query, hits })),
      150,
    )
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [adapter, query])

  if (!hits) return <Skeleton rows={3} />
  if (!hits.length)
    return (
      <p className="px-2 py-3 text-sm text-(--chat-faint)">No line mentions “{query}”.</p>
    )
  return (
    <ul role="list" data-golem-brain-hits="">
      {hits.map((hit) => (
        <li key={`${hit.path}:${hit.line}`}>
          <button
            type="button"
            onClick={() => onOpen({ path: hit.path, start: hit.line, end: hit.line })}
            className="w-full rounded-md px-2 py-1.5 text-left hover:bg-(--chat-panel2)"
          >
            <span className="block truncate text-sm text-(--chat-text)">{hit.excerpt}</span>
            <span className="block truncate font-mono text-[11px] text-(--chat-faint)">
              {hit.path}:{hit.line}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * The file in three runs of markdown — before, the cited range, after — so the range wears a
 * highlight at exactly the lines cited. Line numbers count from line 1 of the file, front matter
 * included, which the reader shows as a chip and a subtitle rather than as YAML.
 */
function Reader({ text, frame }: { text: string; frame: Frame }) {
  const marked = useRef<HTMLDivElement>(null)
  const { path, start, end } = frame
  // A relative link in the bundle opens that file in this reader; the click handler on the article
  // reads the path back off the href.
  const resolveLink = (href: string) =>
    /^[a-z]+:/i.test(href) ? undefined : BRAIN_LINK + resolvePath(path, href.split('#')[0]!)
  const lines = text.split('\n')
  const { meta, body } = frontMatter(lines)

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

  const head = (meta.type || meta.description) && (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {meta.type && (
        <span
          data-golem-brain-type={meta.type}
          className="rounded-full border border-(--chat-line2) bg-(--chat-panel2) px-2 py-0.5 font-mono text-[11px] text-(--chat-dim)"
        >
          {meta.type}
        </span>
      )}
      {meta.description && <span className="text-sm text-(--chat-dim)">{meta.description}</span>}
    </div>
  )

  if (start === undefined || end === undefined)
    return (
      <>
        {head}
        {run(body, lines.length, 'all')}
      </>
    )
  const from = Math.max(body, start - 1)
  const to = Math.min(lines.length, end)
  return (
    <>
      {head}
      {run(body, from, 'before')}
      <div
        ref={marked}
        data-golem-brain-highlight={`L${start}-L${end}`}
        className="-mx-3 my-1 rounded-md border-l-4 border-(--chat-accent) bg-(--chat-accent-soft) px-3 py-1"
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

const BackIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

const SearchIcon = () => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-(--chat-faint)"
  >
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

function BrainPanel({
  config,
  adapters,
  toolbar,
}: GolemProps<BrainConfig, BrainAdapters, BrainSlots>) {
  const root = useRef<HTMLDivElement>(null)
  const article = useRef<HTMLElement>(null)
  const phone = useContainerWidth(root) < PHONE

  // The documents opened so far, newest last. Empty on a phone is the list screen; on a desktop
  // it is the root index. Scroll offsets are kept beside it so back lands where the reader was.
  const [stack, setStack] = useState<Frame[]>(() =>
    config.openLocation ? [parseLocation(config.openLocation)] : [],
  )
  const scrolls = useRef<number[]>([])
  const [version, setVersion] = useState(0)
  // The loaded document is kept with what it answers, so a new path shows the skeleton first.
  const [doc, setDoc] = useState<{ key: string; text?: string; error?: string }>()
  const [query, setQuery] = useState('')

  // A new location wins over whatever the reader opened: state adjusted during render, so the
  // reader never paints the old file first.
  const [seenLocation, setSeenLocation] = useState(config.openLocation)
  if (seenLocation !== config.openLocation) {
    setSeenLocation(config.openLocation)
    // The app echoing back what `open` just reported is the frame already on top: no push.
    const next = config.openLocation && parseLocation(config.openLocation)
    if (next && !same(stack[stack.length - 1], next)) setStack((s) => [...s, next])
  }

  const frame: Frame | undefined = stack[stack.length - 1] ?? (phone ? undefined : { path: ROOT })
  const open = frame?.path

  const push = (next: Frame) => {
    scrolls.current[stack.length] = article.current?.scrollTop ?? 0
    setStack((s) => [...s, next])
    adapters.brain.open?.(locationOf(next))
  }
  const back = () => {
    setStack((s) => s.slice(0, -1))
    adapters.brain.open?.(locationOf(stack[stack.length - 2] ?? { path: ROOT }))
  }

  useEffect(() => adapters.brain.subscribe(() => setVersion((v) => v + 1)), [adapters.brain])

  const key = `${open}@${version}`
  const { text, error } = doc?.key === key ? doc : {}
  useEffect(() => {
    if (!open) return
    let live = true
    const load = open === ROOT ? adapters.brain.index() : adapters.brain.read(open)
    load
      .then((text) => live && setDoc({ key, text }))
      .catch((cause: unknown) => {
        if (live)
          setDoc({
            key,
            error: cause instanceof Error ? cause.message : `Could not open ${open}.`,
          })
      })
    return () => {
      live = false
    }
  }, [adapters.brain, open, key])

  // Back restores the offset saved on push; a range does its own scrolling in Reader.
  const depth = stack.length
  useLayoutEffect(() => {
    if (text !== undefined && article.current && frame?.start === undefined)
      article.current.scrollTop = scrolls.current[depth] ?? 0
  }, [text, depth, frame?.start])

  const onArticleClick = (event: React.MouseEvent) => {
    const href = (event.target as HTMLElement).closest('a')?.getAttribute('href') ?? ''
    if (!href.startsWith(BRAIN_LINK)) return
    event.preventDefault()
    push({ path: href.slice(BRAIN_LINK.length) })
  }

  const list = (
    <nav
      aria-label={config.title}
      data-golem-brain-list=""
      className={`flex min-h-0 flex-col bg-(--chat-panel) ${
        phone ? 'h-full w-full' : 'w-64 shrink-0 border-r border-(--chat-line)'
      }`}
    >
      <header className="shrink-0 space-y-2 border-b border-(--chat-line) px-3 py-2.5">
        <h2 className="truncate text-sm font-semibold text-(--chat-text)">{config.title}</h2>
        <div className="relative">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && setQuery('')}
            placeholder="Search"
            aria-label="Search"
            className="w-full rounded-lg border border-(--chat-line2) bg-(--chat-bg) py-1.5 pr-2 pl-8 text-sm text-(--chat-text) placeholder:text-(--chat-faint) focus:border-(--chat-accent) focus:outline-none"
          />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
        {query.trim() ? (
          <Hits query={query.trim()} adapter={adapters.brain} onOpen={push} />
        ) : (
          <Tree
            adapter={adapters.brain}
            open={open}
            onOpen={(path) => push({ path })}
            version={version}
          />
        )}
      </div>
    </nav>
  )

  const document = frame && (
    <section
      data-golem-brain-document={frame.path}
      className={`flex min-h-0 min-w-0 flex-col bg-(--chat-bg) ${
        phone ? 'absolute inset-0 animate-[golem-chat-in_160ms_ease-out]' : 'flex-1'
      }`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-(--chat-line) bg-(--chat-panel) px-2 py-2">
        {phone ? (
          <button
            type="button"
            onClick={back}
            aria-label="Back"
            className="flex shrink-0 items-center gap-0.5 rounded-md py-1 pr-2 pl-1 text-sm text-(--chat-accent) hover:bg-(--chat-panel2)"
          >
            <BackIcon />
            {depth > 1 ? name(stack[depth - 2]!.path) : config.title}
          </button>
        ) : null}
        <span className="min-w-0 flex-1 truncate px-1 font-mono text-xs text-(--chat-dim)">
          {frame.path}
        </span>
        {toolbar}
      </header>
      <article
        ref={article}
        className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-[15px] leading-7 md:px-8 md:py-6"
        onClick={onArticleClick}
      >
        <div className="mx-auto max-w-[70ch]">
          {error ? (
            <p role="alert" className="text-sm text-(--chat-danger)">
              {error}
            </p>
          ) : text === undefined ? (
            <Skeleton rows={6} />
          ) : (
            <Reader key={`${depth}:${frame.path}`} text={text} frame={frame} />
          )}
        </div>
      </article>
    </section>
  )

  return (
    <div
      ref={root}
      data-golem-component="Brain"
      data-golem-brain-layout={phone ? 'phone' : 'desktop'}
      className="golem-chat relative flex h-full min-h-0 w-full overflow-hidden bg-(--chat-bg) text-(--chat-text)"
    >
      {list}
      {document}
    </div>
  )
}

export const Brain = defineComponent<typeof brainConfigSchema, BrainAdapters, BrainSlots>({
  name: 'Brain',
  schema: brainConfigSchema,
  render: BrainPanel,
})
