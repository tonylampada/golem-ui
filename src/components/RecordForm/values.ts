import type { FormField, RecordRow } from '../../abi/fields'
import { formatValue } from '../../lib/format'

/** What an untouched control holds in create mode. A checkbox is off; everything else is blank. */
export function blankValue(field: FormField): unknown {
  return field.type === 'boolean' ? false : ''
}

export function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

/**
 * The record's value as the control shows it. `datetime` is the one that has to be reshaped: a
 * record holds a full ISO instant and `datetime-local` takes minutes in UTC.
 */
export function toInput(value: unknown, field: FormField): string {
  if (isEmpty(value)) return ''
  if (field.type === 'datetime') {
    const at = new Date(String(value))
    return Number.isNaN(at.getTime()) ? String(value) : at.toISOString().slice(0, 16)
  }
  return String(value)
}

/** The control's text as the record holds it. An empty control writes an empty string, never `0`. */
export function fromInput(text: string, field: FormField): unknown {
  if (text === '') return ''
  if (field.type === 'number' || field.type === 'money') {
    const parsed = Number(text)
    // A number the browser could not parse is kept as typed, so validation can name it.
    return Number.isNaN(parsed) ? text : parsed
  }
  if (field.type === 'datetime') {
    const at = new Date(`${text}Z`)
    return Number.isNaN(at.getTime()) ? text : at.toISOString()
  }
  return text
}

/** Numbers compare as numbers; dates are ISO, so they compare as strings. */
function below(value: unknown, bound: unknown, field: FormField): boolean {
  if (field.type === 'number' || field.type === 'money') return Number(value) < Number(bound)
  return String(value) < String(bound)
}

/**
 * One field's complaint, or `null` when it is fine. The sentence is what the reader sees under the
 * control, so it names the field the way its label does.
 */
export function validateField(field: FormField, value: unknown): string | null {
  if (field.readOnly) return null

  if (isEmpty(value)) {
    return field.required ? `${field.label} is required.` : null
  }
  if ((field.type === 'number' || field.type === 'money') && typeof value !== 'number') {
    return `${field.label} must be a number.`
  }
  if (field.type === 'enum' && !field.options?.some((option) => option.id === value)) {
    return `${field.label} must be one of the offered choices.`
  }
  if (field.min !== undefined && below(value, field.min, field)) {
    return `${field.label} must be ${formatValue(field.min, field)} or more.`
  }
  if (field.max !== undefined && below(field.max, value, field)) {
    return `${field.label} must be ${formatValue(field.max, field)} or less.`
  }
  return null
}

/** Every editable field that fails, in the order the form shows them. */
export function validateAll(
  fields: FormField[],
  values: RecordRow,
): { key: string; message: string }[] {
  const failures: { key: string; message: string }[] = []
  for (const field of fields) {
    const message = validateField(field, values[field.key])
    if (message !== null) failures.push({ key: field.key, message })
  }
  return failures
}

/** Every editable field's value, which is what `create` sends: a new record has nothing to diff. */
export function dataOf(fields: FormField[], values: RecordRow): RecordRow {
  const data: RecordRow = {}
  for (const field of fields) data[field.key] = values[field.key]
  return data
}

/** What the reader actually changed. `readOnly` fields are never in it: the store owns them. */
export function patchOf(fields: FormField[], values: RecordRow, initial: RecordRow): RecordRow {
  const patch: RecordRow = {}
  for (const field of fields) {
    if (field.readOnly) continue
    if (values[field.key] !== initial[field.key]) patch[field.key] = values[field.key]
  }
  return patch
}
