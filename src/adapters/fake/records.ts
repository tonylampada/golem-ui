import {
  RecordRefusedError,
  VersionConflictError,
  VERSION_FIELD,
  type FilterValue,
  type RecordQuery,
  type RecordsAdapter,
  type UpdateOptions,
} from '../records'
import { createEmitter } from './emitter'

export type FakeRow = Record<string, unknown> & { id: string }

/**
 * The fake's store, on top of the adapter interface. `insert` is not part of `RecordsAdapter`: it
 * is the synchronous way a story or a test puts a row in without going through `create`, so a
 * seeded collection can grow while a refusal is switched on.
 */
export interface FakeRecords extends RecordsAdapter {
  insert(collection: string, row: Record<string, unknown>): FakeRow
}

export interface FakeRecordsOptions {
  /**
   * Makes every `create` and `update` reject, naming this field. It is how a story shows what an
   * adapter's refusal looks like landing under one control.
   */
  refuse?: { field: string; message: string }
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
export function fakeRecords(
  seed: Record<string, Record<string, unknown>[]> = {},
  options: FakeRecordsOptions = {},
): FakeRecords {
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
  const indexOf = (collection: string, id: string) =>
    rows(collection).findIndex((row) => row.id === id)

  const refuseIfAsked = () => {
    const { refuse } = options
    if (refuse) {
      throw new RecordRefusedError(`The store refused this ${refuse.field}.`, [
        { field: refuse.field, message: refuse.message },
      ])
    }
  }

  const insert = (collection: string, row: Record<string, unknown>) => {
    const next = { id: `fake-${nextId++}`, ...row } as FakeRow
    rows(collection).unshift(next)
    emitterFor(collection).emit()
    return next
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

    async get<T>(collection: string, id: string) {
      const found = rows(collection).find((row) => row.id === id)
      return (found ? ({ ...found } as T) : null) as T | null
    },

    async create<T>(collection: string, data: Record<string, unknown>) {
      refuseIfAsked()
      return { ...insert(collection, data) } as T
    },

    async update<T>(
      collection: string,
      id: string,
      patch: Record<string, unknown>,
      options?: UpdateOptions,
    ) {
      refuseIfAsked()
      const at = indexOf(collection, id)
      if (at === -1) throw new Error(`There is no ${collection} record with the id ${id}.`)

      const current = rows(collection)[at]!
      if (options) {
        const field = options.versionField ?? VERSION_FIELD
        if (current[field] !== options.expectedVersion) {
          throw new VersionConflictError(
            `This ${collection} record is at ${field} ${String(current[field])}, not ${options.expectedVersion}. Somebody else wrote to it first.`,
            { ...current },
          )
        }
      }

      const next = { ...current, ...patch, id }
      rows(collection)[at] = next
      emitterFor(collection).emit()
      return { ...next } as T
    },

    async remove(collection: string, id: string) {
      const at = indexOf(collection, id)
      if (at === -1) throw new Error(`There is no ${collection} record with the id ${id}.`)
      rows(collection).splice(at, 1)
      emitterFor(collection).emit()
    },

    insert,

    subscribe(collection: string, listener: () => void) {
      return emitterFor(collection).subscribe(listener)
    },
  }
}
