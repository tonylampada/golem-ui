import type { Unsubscribe } from './common'

/**
 * One value a filter matches, or a list of them meaning "any of these". Arrays are how a scoped
 * list says `status is waiting or in progress` without a query language.
 */
export type FilterValue = string | number | boolean | null | Array<string | number | boolean | null>

export interface RecordQuery {
  /** Field-by-field equality. A row matches when every entry matches. */
  filter?: Record<string, FilterValue>
  sort?: { field: string; direction: 'asc' | 'desc' }
  /** Substring match, case-insensitive, against the listed fields only. */
  search?: { text: string; fields: string[] }
  /** `nextCursor` from the previous page, or absent for the first one. */
  cursor?: string | null
  limit?: number
}

export interface RecordPage<T> {
  rows: T[]
  /** Pass back as `cursor` for the next page. `null` means this was the last one. */
  nextCursor: string | null
}

export interface RecordsAdapter {
  list<T>(collection: string, query?: RecordQuery): Promise<RecordPage<T>>
  /** Called with no argument whenever the collection changed; the caller re-lists. */
  subscribe(collection: string, listener: () => void): Unsubscribe
}
