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

/** One field the write was refused over, and the sentence the reader sees under that control. */
export interface FieldRefusal {
  /** The field `key`, as the component's config spells it. */
  field: string
  /** Written for a person: "A quote over $500 needs the owner's sign-off." */
  message: string
}

/**
 * A write the adapter refused for reasons only it knows — a uniqueness clash, a business rule, a
 * server-side validator. Naming the fields is what lets a form put the sentence under the right
 * control instead of at the top of the page.
 */
export class RecordRefusedError extends Error {
  readonly fields: FieldRefusal[]

  constructor(message: string, fields: FieldRefusal[] = []) {
    super(message)
    this.name = 'RecordRefusedError'
    this.fields = fields
  }
}

/**
 * Reads the refusal out of anything thrown, by shape rather than by class: an adapter that crosses
 * a bundle boundary, or one that never imported this module, still gets its fields honoured.
 * Returns `null` for a rejection that names no field, which a form shows as one line instead.
 */
export function refusedFields(error: unknown): FieldRefusal[] | null {
  const fields = (error as { fields?: unknown } | null)?.fields
  if (!Array.isArray(fields) || fields.length === 0) return null
  const named = fields.filter(
    (one): one is FieldRefusal =>
      typeof (one as FieldRefusal)?.field === 'string' &&
      typeof (one as FieldRefusal)?.message === 'string',
  )
  return named.length > 0 ? named : null
}

/**
 * Records is a collection of rows and the four writes that change one.
 *
 * Every method that can be refused rejects with an `Error` whose `message` is shown to the reader
 * as it is written. Throw a `RecordRefusedError` when the refusal belongs to particular fields.
 */
export interface RecordsAdapter {
  list<T>(collection: string, query?: RecordQuery): Promise<RecordPage<T>>
  /** One row by id, or `null` when the collection has no such row. */
  get<T>(collection: string, id: string): Promise<T | null>
  /** Returns the stored row, including whatever id the store minted for it. */
  create<T>(collection: string, data: Record<string, unknown>): Promise<T>
  /** Merges the patch into the stored row and returns the whole row back. */
  update<T>(collection: string, id: string, patch: Record<string, unknown>): Promise<T>
  remove(collection: string, id: string): Promise<void>
  /** Called with no argument whenever the collection changed; the caller re-lists. */
  subscribe(collection: string, listener: () => void): Unsubscribe
}
