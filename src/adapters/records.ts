import type { Unsubscribe } from './common'

export interface RecordQuery {
  filter?: Record<string, unknown>
  sort?: { field: string; direction: 'asc' | 'desc' }
  page?: { offset: number; limit: number }
}

export interface RecordsAdapter {
  list<T>(collection: string, query?: RecordQuery): Promise<T[]>
  get<T>(collection: string, id: string): Promise<T | null>
  create<T>(collection: string, data: Record<string, unknown>): Promise<T>
  update<T>(collection: string, id: string, patch: Record<string, unknown>): Promise<T>
  remove(collection: string, id: string): Promise<void>
  subscribe(collection: string, listener: () => void): Unsubscribe
}
