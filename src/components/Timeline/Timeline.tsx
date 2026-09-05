import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { defineComponent, type GolemProps } from '../../abi'
import type {
  ClockAdapter,
  FilesAdapter,
  FilterValue,
  IdentityAdapter,
  RecordsAdapter,
} from '../../adapters'
import { initials, userName } from '../../lib/format'
import { formattableZone } from '../../lib/locale'
import { Markdown } from '../../lib/markdown'
import { timelineConfigSchema, type TimelineConfig, type Tone } from './Timeline.config'

export interface TimelineAdapters {
  records: RecordsAdapter
  clock: ClockAdapter
  /** Only read with `composer: true`, to stamp a new entry with whoever is signed in. */
  identity?: IdentityAdapter
  /** Only read when `attachmentsField` is set, to turn a file reference into a URL to open. */
  files?: FilesAdapter
}

/** One entry, as the component reads it: every field on it is named by the config. */
export type TimelineEntry = Record<string, unknown> & { id: string }

/**
 * How close to the top still counts as "reading the newest entry". Chat pins to the bottom of its
 * feed for the same reason; a timeline reads downwards from the newest, so it pins to the top.
 */
const TOP_SLACK = 48

/** A tone's mark and its colours. Four tones, so a column of marks is scannable. */
const MARKS: Record<Tone, { glyph: string; dot: string; chip: string }> = {
  neutral: { glyph: '●', dot: 'text-neutral-400', chip: 'bg-neutral-100 text-neutral-600' },
  good: { glyph: '✓', dot: 'text-emerald-600', chip: 'bg-emerald-100 text-emerald-800' },
  warn: { glyph: '▲', dot: 'text-amber-600', chip: 'bg-amber-100 text-amber-800' },
  bad: { glyph: '✕', dot: 'text-rose-600', chip: 'bg-rose-100 text-rose-800' },
}

const message = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause))

/** The calendar day an instant falls on, in the reader's zone. This is what groups the entries. */
function dayKeyOf(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((one) => one.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

/**
 * What heads a day: the two days a person names rather than dates, then the date itself. The key
 * is already the reader's calendar day, so it is formatted as a plain date in UTC — reading it
 * back through a zone would shift it a day either way.
 */
function dayLabel(key: string, today: string, yesterday: string, locale: string): string {
  if (key === today) return 'Today'
  if (key === yesterday) return 'Yesterday'
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: key.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric',
  }).format(new Date(`${key}T12:00:00Z`))
}

/**
 * How long ago, for an entry from today; the clock time for one from any other day. A log read
 * during the day is a log of minutes, and a log read later is a log of days.
 */
function timeLabel(
  at: Date | null,
  now: Date,
  today: boolean,
  locale: string,
  timeZone: string,
): string {
  if (at === null) return '—'
  if (today) {
    const minutes = Math.floor((now.getTime() - at.getTime()) / 60_000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  return new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit' }).format(
    at,
  )
}

/** A file reference as the entry holds it: an id on its own, or an id with a name beside it. */
interface EntryFile {
  id: string
  name: string
}

function filesOf(value: unknown): EntryFile[] {
  if (!Array.isArray(value)) return []
  const found: EntryFile[] = []
  for (const one of value) {
    if (typeof one === 'string') found.push({ id: one, name: one })
    else if (one && typeof one === 'object') {
      const ref = one as { id?: unknown; name?: unknown }
      if (typeof ref.id === 'string') {
        found.push({ id: ref.id, name: typeof ref.name === 'string' ? ref.name : ref.id })
      }
    }
  }
  return found
}

interface Result {
  /** The query these entries answer. A result whose key is not the current one is stale. */
  key: string
  entries: TimelineEntry[]
  nextCursor: string | null
  error: string | null
}

type Chosen = { kind?: string; actor?: string }

/**
 * Pages of entries, newest first, and the live updates that put a new one on top. Everything that
 * arrives from the adapter is here; nothing polls.
 */
function useEntries(
  records: RecordsAdapter,
  config: TimelineConfig,
  chosen: Chosen,
  search: string,
) {
  const [result, setResult] = useState<Result | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [actors, setActors] = useState<string[]>([])

  // How deep the reader has paged, so a live update re-lists what they can see rather than
  // snapping them back to the newest page.
  const loaded = useRef(0)

  const query = useMemo(() => {
    const filter: Record<string, FilterValue> = {}
    if (config.kindField && chosen.kind !== undefined) filter[config.kindField] = chosen.kind
    if (config.actorField && chosen.actor !== undefined) filter[config.actorField] = chosen.actor
    const text = search.trim()
    return {
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sort: { field: config.dateField, direction: 'desc' as const },
      search: text !== '' && config.search.length > 0 ? { text, fields: config.search } : undefined,
    }
  }, [config.kindField, config.actorField, config.dateField, config.search, chosen, search])

  const key = useMemo(
    () => JSON.stringify([config.collection, query, config.pageSize]),
    [config.collection, query, config.pageSize],
  )

  // The actor chips offer everyone whose entries have arrived, and keep offering them once a
  // filter narrows the list; otherwise picking a person would erase everyone else from the row.
  const wantsActors = config.filters.includes('actor')
  const absorb = useCallback(
    (entries: TimelineEntry[]) => {
      if (!wantsActors || !config.actorField) return
      const field = config.actorField
      setActors((prev) => {
        const seen = new Set(prev)
        let changed = false
        for (const entry of entries) {
          const value = entry[field]
          // Only an actor held as a name can be filtered on: the chip's value is what `list` is
          // asked to match, and a record is not an equality the adapter can answer.
          if (typeof value === 'string' && value !== '' && !seen.has(value)) {
            seen.add(value)
            changed = true
          }
        }
        return changed ? [...seen].sort() : prev
      })
    },
    [wantsActors, config.actorField],
  )

  const fetchPage = useCallback(
    (cursor: string | null, limit: number) =>
      records.list<TimelineEntry>(config.collection, { ...query, cursor, limit }),
    [records, config.collection, query],
  )

  useEffect(() => {
    let live = true
    const refresh = (limit: number) => {
      void fetchPage(null, limit).then(
        (page) => {
          if (!live) return
          loaded.current = page.rows.length
          absorb(page.rows)
          setResult({ key, entries: page.rows, nextCursor: page.nextCursor, error: null })
        },
        (cause: unknown) => {
          if (!live) return
          setResult({ key, entries: [], nextCursor: null, error: message(cause) })
        },
      )
    }

    refresh(config.pageSize)
    const unsubscribe = records.subscribe(config.collection, () =>
      refresh(Math.max(config.pageSize, loaded.current)),
    )
    return () => {
      live = false
      unsubscribe()
    }
  }, [fetchPage, absorb, key, records, config.collection, config.pageSize])

  const nextCursor = result?.key === key ? result.nextCursor : null

  const loadOlder = useCallback(() => {
    if (nextCursor === null) return
    setLoadingMore(true)
    void fetchPage(nextCursor, config.pageSize).then(
      (page) => {
        absorb(page.rows)
        setResult((prev) => {
          if (!prev || prev.key !== key) return prev
          const entries = [...prev.entries, ...page.rows]
          loaded.current = entries.length
          return { ...prev, entries, nextCursor: page.nextCursor }
        })
        setLoadingMore(false)
      },
      (cause: unknown) => {
        setResult((prev) => (prev ? { ...prev, error: message(cause) } : prev))
        setLoadingMore(false)
      },
    )
  }, [fetchPage, absorb, key, nextCursor, config.pageSize])

  return {
    // Entries from an older query stay on screen while the new ones are in flight, so a keystroke
    // in the search box does not blank the log.
    entries: result?.entries ?? [],
    nextCursor,
    loading: result === null,
    stale: result !== null && result.key !== key,
    loadingMore,
    error: result?.error ?? null,
    actors,
    loadOlder,
  }
}

/**
 * The pill's count: entries that have appeared *above* the one that used to be on top. Older
 * entries fetched by load-more land below it and are not news.
 */
function useArrivals(entries: TimelineEntry[], atTop: { current: boolean }) {
  const [arrived, setArrived] = useState(0)
  const firstId = useRef<string | null>(null)
  const known = useRef<Set<string>>(new Set())
  const clear = useCallback(() => setArrived(0), [])

  useEffect(() => {
    const previousFirst = firstId.current
    firstId.current = entries[0]?.id ?? null

    if (previousFirst !== null) {
      const cut = entries.findIndex((entry) => entry.id === previousFirst)
      if (cut > 0 && !atTop.current) setArrived((count) => count + cut)
    }
    known.current = new Set(entries.map((entry) => entry.id))
  }, [entries, atTop])

  // An entry the reader has not seen before slides in; one already on screen must not re-animate,
  // which is why this is read during render rather than after it.
  const isNew = (entry: TimelineEntry) => known.current.size > 0 && !known.current.has(entry.id)

  return { arrived, clear, isNew }
}

function Attachments({
  files,
  adapter,
}: {
  files: EntryFile[]
  adapter: FilesAdapter | undefined
}) {
  const [failed, setFailed] = useState<string | null>(null)

  const open = (file: EntryFile) => {
    if (!adapter) {
      setFailed('No files adapter was given, so this attachment cannot be opened.')
      return
    }
    void adapter.url(file.id).then(
      (url) => window.open(url, '_blank', 'noopener,noreferrer'),
      (cause: unknown) => setFailed(message(cause)),
    )
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {files.map((file) => (
        <button
          key={file.id}
          type="button"
          data-golem-attachment={file.name}
          onClick={() => open(file)}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs hover:bg-neutral-100"
        >
          <span aria-hidden="true">📎</span>
          <span className="truncate">{file.name}</span>
        </button>
      ))}
      {failed !== null && (
        <span role="alert" className="text-xs text-red-800">
          {failed}
        </span>
      )}
    </div>
  )
}

/** One row of chips: an All chip and one per value, the chosen one filled in. */
function ChipRow({
  label,
  values,
  chosen,
  onChoose,
}: {
  label: string
  values: { id: string; label: string }[]
  chosen: string | undefined
  onChoose: (value: string | null) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-neutral-500">{label}</span>
      {[null, ...values].map((value) => {
        const active = value === null ? chosen === undefined : chosen === value.id
        return (
          <button
            key={value === null ? '__all' : value.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChoose(value === null ? null : value.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {value === null ? 'All' : value.label}
          </button>
        )
      })}
    </div>
  )
}

function TimelineBody({ config, adapters }: GolemProps<TimelineConfig, TimelineAdapters>) {
  const [chosen, setChosen] = useState<Chosen>({})
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')

  // One list call per pause in the typing, not one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(draft), 150)
    return () => clearTimeout(timer)
  }, [draft])

  const { entries, nextCursor, loading, stale, loadingMore, error, actors, loadOlder } = useEntries(
    adapters.records,
    config,
    chosen,
    search,
  )

  const feed = useRef<HTMLDivElement>(null)
  const atTop = useRef(true)
  const { arrived, clear, isNew } = useArrivals(entries, atTop)

  // A narrowed list is a different list, so whatever had piled up above it is no longer news.
  useEffect(() => clear(), [chosen.kind, chosen.actor, search, clear])

  const onScroll = () => {
    const element = feed.current
    if (!element) return
    atTop.current = element.scrollTop < TOP_SLACK
    if (atTop.current && arrived > 0) clear()
  }

  const jumpToTop = () => {
    const element = feed.current
    if (element) element.scrollTop = 0
    atTop.current = true
    clear()
  }

  const now = adapters.clock.now()
  const timeZone = formattableZone(adapters.clock.timeZone())
  const today = dayKeyOf(now, timeZone)
  const yesterday = dayKeyOf(new Date(now.getTime() - 86_400_000), timeZone)

  const kindOf = (entry: TimelineEntry) => {
    if (!config.kindField) return undefined
    const value = entry[config.kindField]
    return config.kinds.find((kind) => kind.id === value)
  }

  /**
   * Entries cut into days, in the order they arrived — which is already newest first. One pass over
   * one page, so it is done on every render rather than memoised against a mutable `Date`.
   */
  const days: { key: string; entries: { entry: TimelineEntry; at: Date | null }[] }[] = []
  for (const entry of entries) {
    const parsed = new Date(String(entry[config.dateField]))
    // An entry whose date the platform cannot read still belongs on the log: it joins the day
    // above it and shows an em dash, rather than being dropped or headed `Invalid Date`.
    const at = Number.isNaN(parsed.getTime()) ? null : parsed
    const key = at ? dayKeyOf(at, timeZone) : (days[days.length - 1]?.key ?? today)
    const group = days[days.length - 1]
    if (group?.key === key) group.entries.push({ entry, at })
    else days.push({ key, entries: [{ entry, at }] })
  }

  const [composerBusy, setComposerBusy] = useState(false)
  const [composerText, setComposerText] = useState('')
  const [composerKind, setComposerKind] = useState(config.kinds[0]?.id ?? '')
  const [composerError, setComposerError] = useState<string | null>(null)

  const addEntry = (event: FormEvent) => {
    event.preventDefault()
    const text = composerText.trim()
    if (text === '' || composerBusy) return

    setComposerBusy(true)
    setComposerError(null)
    const write = async () => {
      const user = adapters.identity ? await adapters.identity.currentUser() : null
      const data: Record<string, unknown> = {
        [config.dateField]: adapters.clock.now().toISOString(),
        [config.bodyField]: text,
      }
      if (config.actorField && user) data[config.actorField] = user.name
      if (config.kindField && composerKind !== '') data[config.kindField] = composerKind
      await adapters.records.create(config.collection, data)
    }
    void write().then(
      () => {
        setComposerText('')
        setComposerBusy(false)
        jumpToTop()
      },
      (cause: unknown) => {
        setComposerError(message(cause))
        setComposerBusy(false)
      },
    )
  }

  const composer = config.composer && (
    <form onSubmit={addEntry} className="mb-3">
      <div className="flex items-center gap-2">
        <input
          value={composerText}
          onChange={(event) => setComposerText(event.target.value)}
          placeholder="Add an entry"
          aria-label="Add an entry"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base sm:text-sm"
        />
        {config.kindField && config.kinds.length > 0 && (
          <select
            value={composerKind}
            onChange={(event) => setComposerKind(event.target.value)}
            aria-label="Kind"
            className="shrink-0 rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm"
          >
            {config.kinds.map((kind) => (
              <option key={kind.id} value={kind.id}>
                {kind.label}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={composerBusy}
          className="shrink-0 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Add
        </button>
      </div>
      {composerError !== null && (
        <p role="alert" className="mt-1.5 text-sm text-red-800">
          {composerError}
        </p>
      )}
    </form>
  )

  const controls = (config.search.length > 0 || config.filters.length > 0) && (
    <div className="mb-3 space-y-2">
      {config.search.length > 0 && (
        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Search"
          placeholder="Search the log"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base sm:text-sm"
        />
      )}
      {config.filters.includes('kind') && (
        <ChipRow
          label="Kind"
          values={config.kinds}
          chosen={chosen.kind}
          onChoose={(value) =>
            setChosen((prev) => ({ ...prev, kind: value === null ? undefined : value }))
          }
        />
      )}
      {config.filters.includes('actor') && (
        <ChipRow
          label="Who"
          values={actors.map((name) => ({ id: name, label: name }))}
          chosen={chosen.actor}
          onChoose={(value) =>
            setChosen((prev) => ({ ...prev, actor: value === null ? undefined : value }))
          }
        />
      )}
    </div>
  )

  let body: ReactNode
  if (loading) {
    body = <p className="px-4 py-8 text-center text-sm text-neutral-500">Loading…</p>
  } else if (error !== null) {
    body = (
      <p role="alert" className="px-4 py-6 text-center text-sm text-red-900">
        {error}
      </p>
    )
  } else if (entries.length === 0) {
    body = <p className="px-4 py-8 text-center text-sm text-neutral-500">{config.emptyState}</p>
  } else {
    body = days.map((group) => (
      <section key={group.key} data-golem-day={group.key}>
        {/* Sticky against the feed's own scroll box, so the day you are reading names itself. */}
        <h3 className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50/95 px-4 py-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase backdrop-blur">
          {dayLabel(group.key, today, yesterday, config.locale)}
        </h3>
        <ol>
          {group.entries.map(({ entry, at }) => {
            const kind = kindOf(entry)
            const mark = MARKS[kind?.tone ?? 'neutral']
            const actor = config.actorField ? userName(entry[config.actorField]) : ''
            const files = config.attachmentsField ? filesOf(entry[config.attachmentsField]) : []
            return (
              <li
                key={entry.id}
                data-golem-entry={entry.id}
                className={`relative border-b border-neutral-100 py-3 pr-4 pl-9 last:border-0 ${
                  isNew(entry) ? 'animate-[golem-slide-in_240ms_ease-out]' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-3 left-3 text-xs leading-5 ${mark.dot}`}
                >
                  {mark.glyph}
                </span>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {kind && (
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${mark.chip}`}
                    >
                      {kind.label}
                    </span>
                  )}
                  {/* An unknown kind is shown as it is written, rather than hidden: the record
                      says something the config has no word for, and that is worth seeing. */}
                  {config.kindField && !kind && entry[config.kindField] != null && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                      {String(entry[config.kindField])}
                    </span>
                  )}
                  {actor !== '' && (
                    <span className="flex items-center gap-1.5 text-xs text-neutral-600">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[9px] font-semibold text-white">
                        {initials(actor)}
                      </span>
                      {actor}
                    </span>
                  )}
                  <time
                    dateTime={at?.toISOString()}
                    className="ml-auto shrink-0 text-xs text-neutral-400"
                  >
                    {timeLabel(at, now, group.key === today, config.locale, timeZone)}
                  </time>
                </div>
                <div className="mt-1 text-sm leading-relaxed text-neutral-800">
                  <Markdown text={String(entry[config.bodyField] ?? '')} />
                </div>
                {files.length > 0 && <Attachments files={files} adapter={adapters.files} />}
              </li>
            )
          })}
        </ol>
      </section>
    ))
  }

  return (
    <div
      data-golem-component="Timeline"
      className={`golem-timeline w-full text-neutral-900 ${stale ? 'opacity-60' : ''}`}
    >
      {composer}
      {controls}

      <div className="relative">
        {arrived > 0 && (
          <button
            type="button"
            data-golem-new-pill=""
            onClick={jumpToTop}
            className="absolute top-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
          >
            {arrived === 1 ? '1 new entry' : `${arrived} new entries`} ↑
          </button>
        )}
        {/* Its own scroll box, so the day headers have something to stick to and the pill has a
            scroll position to watch. */}
        <div
          ref={feed}
          data-golem-feed=""
          onScroll={onScroll}
          className="max-h-[70vh] overflow-y-auto rounded-xl border border-neutral-200 bg-white"
        >
          {body}
          {nextCursor !== null && !loading && (
            <div className="flex justify-center border-t border-neutral-100 p-3">
              <button
                type="button"
                onClick={loadOlder}
                disabled={loadingMore}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                {loadingMore ? 'Loading…' : `Load ${config.pageSize} older`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const Timeline = defineComponent<typeof timelineConfigSchema, TimelineAdapters>({
  name: 'Timeline',
  schema: timelineConfigSchema,
  render: TimelineBody,
})
