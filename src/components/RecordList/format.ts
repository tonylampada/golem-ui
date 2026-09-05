import type { RecordField } from './RecordList.config'

const DATE_STYLES = ['short', 'medium', 'long', 'full'] as const
type DateStyle = (typeof DATE_STYLES)[number]

function dateStyle(format: string | undefined, fallback: DateStyle): DateStyle {
  return DATE_STYLES.includes(format as DateStyle) ? (format as DateStyle) : fallback
}

/**
 * A `user` value is either the name as a string or a record with one on it, because a records
 * adapter may hand back either and the list should not care which.
 */
export function userName(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const named = value as { name?: unknown; email?: unknown }
    if (typeof named.name === 'string') return named.name
    if (typeof named.email === 'string') return named.email
  }
  return ''
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

/**
 * Every value is formatted in UTC, so a row reads the same in every timezone — for a local reading,
 * put local time in the record. An unparseable date falls back to the raw string rather than to
 * `Invalid Date`: the reader should see what the record actually holds.
 */
export function formatValue(value: unknown, field: RecordField): string {
  if (value === null || value === undefined || value === '') return '—'

  switch (field.type) {
    case 'number': {
      const digits = Number(field.format)
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: Number.isFinite(digits) ? digits : undefined,
        maximumFractionDigits: Number.isFinite(digits) ? digits : undefined,
      }).format(Number(value))
    }
    case 'money':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: field.format || 'USD',
      }).format(Number(value))
    case 'date':
    case 'datetime': {
      const at = new Date(field.type === 'date' ? `${String(value)}T12:00:00Z` : String(value))
      if (Number.isNaN(at.getTime())) return String(value)
      return new Intl.DateTimeFormat('en-GB', {
        dateStyle: dateStyle(field.format, 'medium'),
        timeStyle: field.type === 'datetime' ? 'short' : undefined,
        timeZone: 'UTC',
      }).format(at)
    }
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'user':
      return userName(value) || String(value)
    default:
      return String(value)
  }
}

const CHIP_TONES = [
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
  'bg-rose-100 text-rose-800',
  'bg-neutral-200 text-neutral-700',
]

/**
 * An enum chip's colour is derived from the value itself, so the same status is the same colour on
 * every screen and no config has to name a palette.
 */
export function chipTone(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  return CHIP_TONES[hash % CHIP_TONES.length]!
}
