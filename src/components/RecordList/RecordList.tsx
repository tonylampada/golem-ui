import {
  Fragment,
  useCallback,
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { defineComponent, type GolemProps } from '../../abi'
import type { FilterValue, RecordsAdapter } from '../../adapters'
import { useContainerWidth } from '../../lib/use-container-width'
import {
  recordListConfigSchema,
  type RecordField,
  type RecordListConfig,
} from './RecordList.config'
import { chipTone, formatValue, initials, userName } from './format'

/** Whatever the adapter hands back. `id` is the row key when there is one. */
export type RecordRow = Record<string, unknown>

export interface RecordListAdapters {
  records: RecordsAdapter
}

export interface RecordListSlots {
  /**
   * Where a row goes when it is opened — a click, Enter or Space. Only reached with
   * `rowAction: 'open'`; the list has no router of its own, so the call site names the route.
   */
  onOpen?: (row: RecordRow) => void
}

/**
 * The width the table gives way to cards. It is Shell's default breakpoint, so a list in Shell's
 * canvas turns into cards on the same phone that turns Shell into tabs.
 */
const CARDS_BELOW = 768

type Sort = { field: string; direction: 'asc' | 'desc' }
type FacetValue = string | number | boolean

function isFacet(value: unknown): value is FacetValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

interface Result {
  /** The query these rows answer. A result whose key is not the current one is stale. */
  key: string
  rows: RecordRow[]
  nextCursor: string | null
  error: string | null
}

const message = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause))

/**
 * Pages, live updates, and the filter chips' vocabulary — everything that arrives from the adapter.
 *
 * The chips offer the values that have actually arrived, and keep offering them once a filter
 * narrows the list; otherwise choosing a value would erase every other choice from the row.
 */
function useRecordPages(
  records: RecordsAdapter,
  config: RecordListConfig,
  sort: Sort | null,
  chosen: Record<string, FacetValue>,
  search: string,
) {
  const [result, setResult] = useState<Result | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [facets, setFacets] = useState<Record<string, FacetValue[]>>({})

  // How deep the reader has paged, so a live update re-lists what they can see rather than
  // snapping them back to page one.
  const loaded = useRef(0)

  const query = useMemo(() => {
    const filter: Record<string, FilterValue> = { ...config.scope, ...chosen }
    const text = search.trim()
    return {
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sort: sort ?? undefined,
      search: text !== '' && config.search.length > 0 ? { text, fields: config.search } : undefined,
    }
  }, [config.scope, config.search, chosen, sort, search])

  const key = useMemo(
    () => JSON.stringify([config.collection, query, config.pageSize]),
    [config.collection, query, config.pageSize],
  )

  const absorb = useCallback(
    (rows: RecordRow[]) => {
      if (config.filters.length === 0) return
      setFacets((prev) => {
        let changed = false
        const next: Record<string, FacetValue[]> = { ...prev }
        for (const name of config.filters) {
          const seen = new Set<FacetValue>(prev[name] ?? [])
          for (const row of rows) {
            const value = row[name]
            if (isFacet(value) && !seen.has(value)) {
              seen.add(value)
              changed = true
            }
          }
          next[name] = [...seen].sort((a, b) => (String(a) < String(b) ? -1 : 1))
        }
        return changed ? next : prev
      })
    },
    [config.filters],
  )

  const fetchPage = useCallback(
    (cursor: string | null, limit: number) =>
      records.list<RecordRow>(config.collection, { ...query, cursor, limit }),
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
          setResult({ key, rows: page.rows, nextCursor: page.nextCursor, error: null })
        },
        (cause: unknown) => {
          if (!live) return
          setResult({ key, rows: [], nextCursor: null, error: message(cause) })
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

  const loadMore = useCallback(() => {
    if (nextCursor === null) return
    setLoadingMore(true)
    void fetchPage(nextCursor, config.pageSize).then(
      (page) => {
        absorb(page.rows)
        setResult((prev) => {
          if (!prev || prev.key !== key) return prev
          const rows = [...prev.rows, ...page.rows]
          loaded.current = rows.length
          return { ...prev, rows, nextCursor: page.nextCursor }
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
    // Rows from an older query stay on screen while the new ones are in flight, so a keystroke in
    // the search box does not blank the list.
    rows: result?.rows ?? [],
    nextCursor,
    loading: result === null,
    stale: result !== null && result.key !== key,
    loadingMore,
    error: result?.error ?? null,
    facets,
    loadMore,
  }
}

function Chip({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${chipTone(value)}`}
    >
      {value}
    </span>
  )
}

function Cell({ row, field }: { row: RecordRow; field: RecordField }): ReactNode {
  const value = row[field.key]
  if (value === null || value === undefined || value === '') {
    return <span className="text-neutral-400">—</span>
  }
  if (field.type === 'enum') return <Chip value={String(value)} />
  if (field.type === 'user') {
    const name = userName(value) || String(value)
    return (
      <span className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">
          {initials(name)}
        </span>
        <span className="truncate">{name}</span>
      </span>
    )
  }
  const text = formatValue(value, field)
  const numeric = field.type === 'number' || field.type === 'money'
  return <span className={numeric ? 'tabular-nums' : undefined}>{text}</span>
}

/** Arrow keys walk the rows; the row itself is the tab stop, so one Tab enters the list. */
function moveFocus(from: HTMLElement, delta: number) {
  const list = from.closest('[data-golem-rows]')
  const rows = Array.from(list?.querySelectorAll<HTMLElement>('[data-golem-row]') ?? [])
  const index = rows.indexOf(from)
  if (index === -1) return
  rows[Math.min(rows.length - 1, Math.max(0, index + delta))]?.focus()
}

function RecordListBody({
  config,
  adapters,
  onOpen,
}: GolemProps<RecordListConfig, RecordListAdapters, RecordListSlots>) {
  const listId = useId()
  const [sort, setSort] = useState<Sort | null>(config.sort ?? null)
  const [chosen, setChosen] = useState<Record<string, FacetValue>>({})
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')

  // One list call per pause in the typing, not one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(draft), 150)
    return () => clearTimeout(timer)
  }, [draft])

  const { rows, nextCursor, loading, stale, loadingMore, error, facets, loadMore } = useRecordPages(
    adapters.records,
    config,
    sort,
    chosen,
    search,
  )

  const root = useRef<HTMLDivElement>(null)
  const cards = useContainerWidth(root) < CARDS_BELOW

  const primary = config.fields.find((field) => field.primary) ?? config.fields[0]!
  const chipField = config.fields.find((field) => field.type === 'enum' && field !== primary)
  const secondary = config.fields.filter((field) => field !== primary && field !== chipField)
  const searchable = config.fields.filter((field) => config.search.includes(field.key))
  const activatable = config.rowAction === 'open'
  const pad = config.density === 'compact' ? 'py-1.5' : 'py-3'

  const toggleSort = (key: string) =>
    setSort((prev) =>
      prev && prev.field === key
        ? { field: key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field: key, direction: 'asc' },
    )

  const choose = (key: string, value: FacetValue | null) =>
    setChosen((prev) => {
      const next = { ...prev }
      if (value === null) delete next[key]
      else next[key] = value
      return next
    })

  const rowProps = (row: RecordRow) =>
    activatable
      ? {
          tabIndex: 0,
          onClick: () => onOpen?.(row),
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              moveFocus(event.currentTarget, event.key === 'ArrowDown' ? 1 : -1)
            } else if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpen?.(row)
            }
          },
        }
      : {}

  const keyOf = (row: RecordRow, index: number) =>
    typeof row.id === 'string' || typeof row.id === 'number' ? String(row.id) : `row-${index}`

  // At card width there are no column headings to click, so the sort moves into the control bar.
  const sortControl = cards && (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="text-xs font-medium text-neutral-500" htmlFor={`${listId}-sort`}>
        Sort
      </label>
      <select
        id={`${listId}-sort`}
        value={sort?.field ?? ''}
        onChange={(event) =>
          setSort(
            event.target.value === ''
              ? null
              : { field: event.target.value, direction: sort?.direction ?? 'asc' },
          )
        }
        className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm"
      >
        <option value="">Adapter order</option>
        {config.fields.map((field) => (
          <option key={field.key} value={field.key}>
            {field.label}
          </option>
        ))}
      </select>
      {sort && (
        <button
          type="button"
          onClick={() => toggleSort(sort.field)}
          aria-label={sort.direction === 'asc' ? 'Sort descending' : 'Sort ascending'}
          className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm"
        >
          {sort.direction === 'asc' ? '↑' : '↓'}
        </button>
      )}
    </div>
  )

  const controls = (config.search.length > 0 || config.filters.length > 0 || cards) && (
    <div className="mb-3 space-y-2">
      {config.search.length > 0 && (
        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Search"
          placeholder={
            searchable.length > 0
              ? `Search ${searchable.map((field) => field.label.toLowerCase()).join(', ')}`
              : 'Search'
          }
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base sm:text-sm"
        />
      )}
      {config.filters.map((key) => {
        const field = config.fields.find((one) => one.key === key)!
        return (
          <div key={key} className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-neutral-500">{field.label}</span>
            {[null, ...(facets[key] ?? [])].map((value) => {
              const active = value === null ? chosen[key] === undefined : chosen[key] === value
              return (
                <button
                  key={value === null ? '__all' : String(value)}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(key, value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {value === null ? 'All' : formatValue(value, field)}
                </button>
              )
            })}
          </div>
        )
      })}
      {sortControl}
    </div>
  )

  let body: ReactNode
  if (loading) {
    body = (
      <p className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
        Loading…
      </p>
    )
  } else if (error !== null) {
    body = (
      <p
        role="alert"
        className="rounded-xl border border-red-300 bg-red-50 px-4 py-6 text-center text-sm text-red-900"
      >
        {error}
      </p>
    )
  } else if (rows.length === 0) {
    body = (
      <p className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
        {config.emptyState}
      </p>
    )
  } else if (cards) {
    body = (
      <ul data-golem-rows="" className="space-y-2">
        {rows.map((row, index) => (
          <li key={keyOf(row, index)}>
            <article
              data-golem-row=""
              {...rowProps(row)}
              className={`rounded-xl border border-neutral-200 bg-white ${
                config.density === 'compact' ? 'p-2.5' : 'p-3'
              } ${
                activatable
                  ? 'cursor-pointer focus:outline-2 focus:outline-offset-2 focus:outline-neutral-900'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 truncate text-sm font-semibold">
                  {formatValue(row[primary.key], primary)}
                </h3>
                {chipField && row[chipField.key] !== undefined && (
                  <Chip value={String(row[chipField.key])} />
                )}
              </div>
              <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                {secondary.map((field) => (
                  <Fragment key={field.key}>
                    <dt className="text-neutral-500">{field.label}</dt>
                    <dd className="min-w-0 truncate">
                      <Cell row={row} field={field} />
                    </dd>
                  </Fragment>
                ))}
              </dl>
            </article>
          </li>
        ))}
      </ul>
    )
  } else {
    body = (
      // Its own scroll box, so the sticky heading has something to stick to and a wide table
      // scrolls sideways inside the list instead of pushing the page out.
      <div className="max-h-[70vh] overflow-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-max border-collapse text-left text-sm">
          <thead>
            <tr>
              {config.fields.map((field) => {
                const active = sort?.field === field.key
                return (
                  <th
                    key={field.key}
                    scope="col"
                    aria-sort={
                      active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                    className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 p-0"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(field.key)}
                      className="flex w-full items-center gap-1 px-3 py-2 text-xs font-semibold tracking-wide text-neutral-600 uppercase hover:text-neutral-900"
                    >
                      {field.label}
                      <span aria-hidden="true" className={active ? '' : 'opacity-0'}>
                        {active && sort.direction === 'desc' ? '↓' : '↑'}
                      </span>
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody data-golem-rows="">
            {rows.map((row, index) => (
              <tr
                key={keyOf(row, index)}
                data-golem-row=""
                {...rowProps(row)}
                className={`border-b border-neutral-100 last:border-0 ${
                  activatable
                    ? 'cursor-pointer hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-2 focus:-outline-offset-2 focus:outline-neutral-900'
                    : ''
                }`}
              >
                {config.fields.map((field) => (
                  <td
                    key={field.key}
                    className={`px-3 align-top ${pad} ${
                      field === primary ? 'font-medium whitespace-nowrap' : ''
                    }`}
                  >
                    <Cell row={row} field={field} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div
      ref={root}
      data-golem-component="RecordList"
      data-layout={cards ? 'cards' : 'table'}
      className={`golem-record-list w-full text-neutral-900 ${stale ? 'opacity-60' : ''}`}
    >
      {controls}
      {body}
      {nextCursor !== null && !loading && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : `Load ${config.pageSize} more`}
          </button>
        </div>
      )}
    </div>
  )
}

export const RecordList = defineComponent<
  typeof recordListConfigSchema,
  RecordListAdapters,
  RecordListSlots
>({
  name: 'RecordList',
  schema: recordListConfigSchema,
  render: RecordListBody,
})
