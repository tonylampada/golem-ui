import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { defineComponent, type GolemProps } from '../../abi'
import type { ClockAdapter, RecordsAdapter } from '../../adapters'
import { headingSlug, Markdown } from '../../lib/markdown'
import { userName } from '../../lib/format'
import { reportConfigSchema, type ReportConfig } from './Report.config'

export interface ReportAdapters {
  records: RecordsAdapter
  clock: ClockAdapter
}

export interface ReportSlots {
  /**
   * One report by id, instead of the latest of the current period. The component still opens on
   * that report's period, so the arrows and the index carry on from where it sits.
   */
  id?: string
}

/** One report record, as the component reads it: every field is named by the config. */
export type ReportRecord = Record<string, unknown> & { id: string }

/** How many past reports the index offers. Long enough to reach last month, short enough to read. */
const INDEX_LENGTH = 12

type Period = ReportConfig['period']

/* Every date is handled in UTC, so a report covers the same day in every timezone. */

const isoDay = (at: Date) => at.toISOString().slice(0, 10)

/** The first day of the period `at` falls in. A week starts on Monday. */
function startOf(period: Period, at: Date): Date {
  const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()))
  if (period === 'week') start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7))
  if (period === 'month') start.setUTCDate(1)
  return start
}

/** Every ISO day the period covers. This is the filter: an `any of`, not a range query. */
function daysOf(period: Period, start: Date): string[] {
  const days: string[] = []
  const cursor = new Date(start)
  const month = start.getUTCMonth()
  const length = period === 'day' ? 1 : period === 'week' ? 7 : Number.POSITIVE_INFINITY

  while (days.length < length && (period !== 'month' || cursor.getUTCMonth() === month)) {
    days.push(isoDay(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

/** The period `delta` steps away, forwards or back. */
function step(period: Period, start: Date, delta: number): Date {
  const next = new Date(start)
  if (period === 'day') next.setUTCDate(next.getUTCDate() + delta)
  if (period === 'week') next.setUTCDate(next.getUTCDate() + delta * 7)
  if (period === 'month') next.setUTCMonth(next.getUTCMonth() + delta)
  return startOf(period, next)
}

/** What the period is called, in the reader's locale: a day, a Monday-to-Sunday span, a month. */
function periodLabel(period: Period, start: Date, locale: string): string {
  const options: Intl.DateTimeFormatOptions = { timeZone: 'UTC' }
  if (period === 'month') {
    return new Intl.DateTimeFormat(locale, { ...options, month: 'long', year: 'numeric' }).format(
      start,
    )
  }
  if (period === 'week') {
    const format = new Intl.DateTimeFormat(locale, {
      ...options,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 6)
    return format.formatRange(start, end)
  }
  return new Intl.DateTimeFormat(locale, {
    ...options,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(start)
}

/** A record's own date, read as a calendar day at noon so no timezone can shift it. */
function dayOf(value: unknown): Date | null {
  const at = new Date(`${String(value)}T12:00:00Z`)
  return Number.isNaN(at.getTime()) ? null : at
}

const message = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause))

/**
 * A report's optional `sections`: the headings it was written from, as strings or as objects with a
 * `title`. Anything else on the field is ignored rather than guessed at.
 */
function sectionTitles(record: ReportRecord | null): string[] {
  const value = record?.sections
  if (!Array.isArray(value)) return []
  return value
    .map((one) =>
      typeof one === 'string'
        ? one
        : typeof (one as { title?: unknown })?.title === 'string'
          ? (one as { title: string }).title
          : '',
    )
    .filter((title) => title !== '')
}

interface Loaded {
  /** The query these rows answer. A result whose key is not the current one is stale. */
  key: string
  report: ReportRecord | null
  error: string | null
}

/**
 * The document on screen and the index under it, and the one `subscribe` that refreshes both when
 * the agent writes a new version. Nothing here polls.
 */
function useReport(
  records: RecordsAdapter,
  config: ReportConfig,
  days: string[],
  openId: string | undefined,
) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [index, setIndex] = useState<ReportRecord[]>([])

  const key = useMemo(
    () => JSON.stringify([config.collection, config.dateField, days, openId ?? null]),
    [config.collection, config.dateField, days, openId],
  )

  const fetchReport = useCallback((): Promise<ReportRecord | null> => {
    if (openId !== undefined) return records.get<ReportRecord>(config.collection, openId)
    return records
      .list<ReportRecord>(config.collection, {
        filter: { [config.dateField]: days },
        sort: { field: config.dateField, direction: 'desc' },
        limit: 1,
      })
      .then((page) => page.rows[0] ?? null)
  }, [records, config.collection, config.dateField, days, openId])

  useEffect(() => {
    let live = true

    const refresh = () => {
      void fetchReport().then(
        (report) => {
          if (live) setLoaded({ key, report, error: null })
        },
        (cause: unknown) => {
          if (live) setLoaded({ key, report: null, error: message(cause) })
        },
      )
      if (!config.showIndex) return
      void records
        .list<ReportRecord>(config.collection, {
          sort: { field: config.dateField, direction: 'desc' },
          limit: INDEX_LENGTH,
        })
        .then(
          (page) => {
            if (live) setIndex(page.rows)
          },
          () => {
            // The index is an aside; a document that arrived should not be replaced by its error.
          },
        )
    }

    refresh()
    const unsubscribe = records.subscribe(config.collection, refresh)
    return () => {
      live = false
      unsubscribe()
    }
  }, [fetchReport, key, records, config.collection, config.dateField, config.showIndex])

  return {
    report: loaded?.report ?? null,
    error: loaded?.error ?? null,
    loading: loaded === null || loaded.key !== key,
    index,
  }
}

function Chrome({ children }: { children: ReactNode }) {
  return (
    <div data-golem-chrome="" className="mb-3 flex flex-wrap items-center justify-between gap-2">
      {children}
    </div>
  )
}

const stepButton =
  'flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white text-base disabled:opacity-40'

function ReportBody({
  config,
  adapters,
  id,
}: GolemProps<ReportConfig, ReportAdapters, ReportSlots>) {
  const root = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState(() => startOf(config.period, adapters.clock.now()))
  const [openId, setOpenId] = useState(id)

  const days = useMemo(() => daysOf(config.period, anchor), [config.period, anchor])
  const { report, error, loading, index } = useReport(adapters.records, config, days, openId)

  const reportDate = report ? dayOf(report[config.dateField]) : null

  // The period on screen. A report opened by id brings its own, so the arrows carry on from where
  // it sits rather than from wherever the reader was before they opened it.
  const shown = openId !== undefined && reportDate ? startOf(config.period, reportDate) : anchor

  // The reader cannot step past the period they are living in: there is no report from next week.
  const latest = startOf(config.period, adapters.clock.now())
  const move = (delta: number) => {
    setOpenId(undefined)
    setAnchor(step(config.period, shown, delta))
  }

  const title = String(report?.[config.titleField] ?? '')
  const body = String(report?.[config.bodyField] ?? '')
  const author = config.showAuthor ? userName(report?.[config.authorField]) : ''
  const draft = config.statusField !== undefined && report?.[config.statusField] === 'draft'
  const sections = sectionTitles(report)

  const dateLine = periodLabel(
    config.period,
    reportDate ? startOf(config.period, reportDate) : shown,
    config.locale,
  )

  const jumpTo = (heading: string) => {
    root.current
      ?.querySelector(`[data-golem-heading="${headingSlug(heading)}"]`)
      ?.scrollIntoView({ block: 'start' })
  }

  let document: ReactNode
  if (loading) {
    document = <p className="px-1 py-10 text-center text-sm text-neutral-500">Loading…</p>
  } else if (error !== null) {
    document = (
      <p role="alert" className="px-1 py-8 text-center text-sm text-red-900">
        {error}
      </p>
    )
  } else if (report === null) {
    document = (
      <p className="px-1 py-10 text-center text-sm text-neutral-500">{config.emptyState}</p>
    )
  } else {
    document = (
      <>
        <header className="mb-5 border-b border-neutral-200 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
            {draft && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 uppercase">
                Draft
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {dateLine}
            {author !== '' && ` · ${author}`}
          </p>
        </header>

        {sections.length > 0 && (
          <nav
            data-golem-contents=""
            aria-label="Contents"
            className="mb-5 rounded-lg bg-neutral-50 px-4 py-3"
          >
            <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              Contents
            </p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {sections.map((heading) => (
                <li key={heading}>
                  <button
                    type="button"
                    onClick={() => jumpTo(heading)}
                    className="text-left underline-offset-2 hover:underline"
                  >
                    {heading}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* The one place the font size is set; every heading in the body is sized in `em` off it. */}
        <div className="text-[15px] leading-7 text-neutral-800 sm:text-base sm:leading-8">
          <Markdown text={body} hardWraps={false} />
        </div>
      </>
    )
  }

  return (
    <div
      ref={root}
      data-golem-component="Report"
      data-period={config.period}
      data-print={config.print ? 'on' : 'off'}
      className="golem-report w-full text-neutral-900"
    >
      {(config.showNavigation || config.print) && (
        <Chrome>
          {config.showNavigation ? (
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label={`Previous ${config.period}`}
                className={stepButton}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label={`Next ${config.period}`}
                disabled={shown.getTime() >= latest.getTime()}
                className={stepButton}
              >
                ›
              </button>
              <p data-golem-period="" className="min-w-0 truncate text-sm font-medium">
                {periodLabel(config.period, shown, config.locale)}
              </p>
            </div>
          ) : (
            <span />
          )}
          {config.print && (
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium"
            >
              Print / Save as PDF
            </button>
          )}
        </Chrome>
      )}

      <article
        data-golem-paper=""
        className="rounded-xl border border-neutral-200 bg-white px-5 py-6 sm:px-8 sm:py-8"
      >
        {document}
      </article>

      {config.showIndex && index.length > 0 && (
        <nav data-golem-chrome="" aria-label="Past reports" className="mt-4">
          <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Past reports
          </p>
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {index.map((past) => {
              const at = dayOf(past[config.dateField])
              const current = report !== null && past.id === report.id
              return (
                <li key={past.id}>
                  <button
                    type="button"
                    aria-current={current ? 'true' : undefined}
                    onClick={() => setOpenId(past.id)}
                    className={`flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left text-sm ${
                      current ? 'bg-neutral-100 font-medium' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <span className="min-w-0 truncate">
                      {String(past[config.titleField] ?? '—')}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-500">
                      {at
                        ? new Intl.DateTimeFormat(config.locale, {
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'UTC',
                          }).format(at)
                        : '—'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </div>
  )
}

export const Report = defineComponent<typeof reportConfigSchema, ReportAdapters, ReportSlots>({
  name: 'Report',
  schema: reportConfigSchema,
  render: ReportBody,
})
