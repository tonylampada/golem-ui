import type { ReactNode } from 'react'

/**
 * The demo's own page furniture — a screen heading, a panel, a status chip. Every screen that was a
 * placeholder for a kit component now uses that component, so nothing here is standing in for one.
 */

export function Screen({
  title,
  lead,
  action,
  wide = false,
  children,
}: {
  title: string
  lead: string
  action?: ReactNode
  /** A screen whose content wants the whole canvas — the job board's table, for one. */
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={`mx-auto w-full px-4 py-5 sm:px-6 sm:py-7 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{lead}</p>
        </div>
        {action}
      </div>
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-neutral-200 bg-white p-4 ${className}`}>
      {children}
    </section>
  )
}

export function PanelTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold text-neutral-900">{children}</h2>
      {aside && <span className="shrink-0 text-xs text-neutral-500">{aside}</span>}
    </div>
  )
}

const statusTone: Record<string, string> = {
  'in progress': 'bg-amber-100 text-amber-800',
  waiting: 'bg-neutral-200 text-neutral-700',
  ready: 'bg-emerald-100 text-emerald-800',
}

export function Tag({ children, tone }: { children: string; tone?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        statusTone[tone ?? ''] ?? 'bg-neutral-100 text-neutral-600'
      }`}
    >
      {children}
    </span>
  )
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
      {initials}
    </span>
  )
}

/** Every date in the seed is an ISO day; the shop reads them as "10 Sep". */
export function day(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}
