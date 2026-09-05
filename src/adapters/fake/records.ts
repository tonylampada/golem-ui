import type { FilterValue, RecordQuery, RecordsAdapter } from '../records'
import { createEmitter } from './emitter'

export type FakeRow = Record<string, unknown> & { id: string }

/**
 * The fake's store, on top of the adapter interface. `insert` is not part of `RecordsAdapter`: it
 * is how a story, a test or a demo screen puts a row in, which in a real app is the server's job.
 */
export interface FakeRecords extends RecordsAdapter {
  insert(collection: string, row: Record<string, unknown>): FakeRow
}

function matches(value: unknown, wanted: FilterValue): boolean {
  return Array.isArray(wanted) ? wanted.some((one) => one === value) : wanted === value
}

/** Numbers compare as numbers, everything else as its string form. Dates are ISO, so that holds. */
function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const left = String(a ?? '')
  const right = String(b ?? '')
  return left < right ? -1 : left > right ? 1 : 0
}

function hit(row: FakeRow, text: string, fields: string[]): boolean {
  const needle = text.trim().toLowerCase()
  if (needle === '') return true
  return fields.some((field) =>
    String(row[field] ?? '')
      .toLowerCase()
      .includes(needle),
  )
}

/**
 * An in-memory `Records` adapter, seeded per collection. Filtering, sorting, searching and paging
 * all happen over the seeded rows, so a story runs the same code path a server would.
 *
 * The cursor is an offset into the matching rows. That is what makes `nextCursor` honest and it is
 * also its limit: a row inserted while the reader is on page three shifts the pages under them,
 * which is why a live update re-lists from the start rather than paging on.
 */
export function fakeRecords(seed: Record<string, Record<string, unknown>[]> = {}): FakeRecords {
  const store = new Map<string, FakeRow[]>(
    Object.entries(seed).map(([name, rows]) => [name, rows.map((row) => ({ ...row }) as FakeRow)]),
  )
  const emitters = new Map<string, ReturnType<typeof createEmitter<void>>>()
  let nextId = 1

  const rows = (collection: string) => {
    if (!store.has(collection)) store.set(collection, [])
    return store.get(collection)!
  }
  const emitterFor = (collection: string) => {
    if (!emitters.has(collection)) emitters.set(collection, createEmitter<void>())
    return emitters.get(collection)!
  }

  return {
    async list<T>(collection: string, query: RecordQuery = {}) {
      let result = [...rows(collection)]

      if (query.filter) {
        const entries = Object.entries(query.filter)
        result = result.filter((row) => entries.every(([key, want]) => matches(row[key], want)))
      }
      if (query.search) {
        result = result.filter((row) => hit(row, query.search!.text, query.search!.fields))
      }
      if (query.sort) {
        const { field, direction } = query.sort
        const sign = direction === 'asc' ? 1 : -1
        result.sort((a, b) => sign * compare(a[field], b[field]))
      }

      const total = result.length
      const offset = Number(query.cursor ?? 0) || 0
      const limit = query.limit ?? total
      const end = offset + limit

      return {
        rows: result.slice(offset, end) as T[],
        nextCursor: end < total ? String(end) : null,
      }
    },

    insert(collection: string, row: Record<string, unknown>) {
      const next = { id: `fake-${nextId++}`, ...row } as FakeRow
      rows(collection).unshift(next)
      emitterFor(collection).emit()
      return next
    },

    subscribe(collection: string, listener: () => void) {
      return emitterFor(collection).subscribe(listener)
    },
  }
}
