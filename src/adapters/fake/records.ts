import type { RecordQuery, RecordsAdapter } from '../records'
import { createEmitter } from './emitter'

type Row = Record<string, unknown> & { id: string }

export function fakeRecords(seed: Record<string, Row[]> = {}): RecordsAdapter {
  const store = new Map<string, Row[]>(Object.entries(seed).map(([k, v]) => [k, [...v]]))
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
    async list<T>(collection: string, query?: RecordQuery) {
      let result = [...rows(collection)]
      if (query?.filter) {
        result = result.filter((row) =>
          Object.entries(query.filter!).every(([key, value]) => row[key] === value),
        )
      }
      if (query?.sort) {
        const { field, direction } = query.sort
        result.sort((a, b) =>
          String(a[field]) < String(b[field])
            ? direction === 'asc'
              ? -1
              : 1
            : String(a[field]) > String(b[field])
              ? direction === 'asc'
                ? 1
                : -1
              : 0,
        )
      }
      if (query?.page) {
        result = result.slice(query.page.offset, query.page.offset + query.page.limit)
      }
      return result as T[]
    },
    async get<T>(collection: string, id: string) {
      return (rows(collection).find((row) => row.id === id) ?? null) as T | null
    },
    async create<T>(collection: string, data: Record<string, unknown>) {
      const row = { id: `fake-${nextId++}`, ...data } as Row
      rows(collection).push(row)
      emitterFor(collection).emit()
      return row as T
    },
    async update<T>(collection: string, id: string, patch: Record<string, unknown>) {
      const list = rows(collection)
      const index = list.findIndex((row) => row.id === id)
      if (index === -1) throw new Error(`fakeRecords: no ${collection}/${id}`)
      const next = { ...list[index]!, ...patch }
      list[index] = next
      emitterFor(collection).emit()
      return next as T
    },
    async remove(collection: string, id: string) {
      const list = rows(collection)
      const index = list.findIndex((row) => row.id === id)
      if (index !== -1) list.splice(index, 1)
      emitterFor(collection).emit()
    },
    subscribe(collection: string, listener: () => void) {
      return emitterFor(collection).subscribe(listener)
    },
  }
}
