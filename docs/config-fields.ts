import { z, type ZodType } from 'zod'

type JsonSchema = {
  properties?: Record<string, Record<string, unknown>>
  required?: string[]
  additionalProperties?: boolean
}

/** One row of a component's configuration, read off the schema rather than written by hand. */
export interface ConfigField {
  name: string
  type: string
  required: boolean
  /** The default as JSON, or null when the field has none. */
  default: string | null
  /** The validator's rules in one phrase, or an em dash. */
  rules: string
  /** The field's `.describe()` sentence. */
  description: string
}

function describeType(field: Record<string, unknown>): string {
  if (Array.isArray(field.enum)) return field.enum.map((v) => JSON.stringify(v)).join(' | ')
  if (field.type === 'integer') return 'integer'
  return String(field.type ?? 'unknown')
}

function describeRules(field: Record<string, unknown>): string {
  const rules: string[] = []
  if (typeof field.minLength === 'number') rules.push(`min length ${field.minLength}`)
  if (typeof field.maxLength === 'number') rules.push(`max length ${field.maxLength}`)
  if (typeof field.minimum === 'number') rules.push(`>= ${field.minimum}`)
  if (typeof field.maximum === 'number') rules.push(`<= ${field.maximum}`)
  if (typeof field.pattern === 'string') rules.push(`matches ${field.pattern}`)
  return rules.join(', ') || '—'
}

/**
 * The configuration of a component as data, read straight off the Zod schema so it cannot drift
 * from the validator that rejects the agent's config at runtime. Every surface that documents a
 * config reads this — the desktop table on the Storybook page, the cards on the phone-first API
 * page — so the two cannot disagree either.
 */
export function configFields(schema: ZodType): ConfigField[] {
  const json = z.toJSONSchema(schema, { io: 'input' }) as JsonSchema
  const required = new Set(json.required ?? [])

  return Object.entries(json.properties ?? {}).map(([name, field]) => ({
    name,
    type: describeType(field),
    required: required.has(name),
    default: 'default' in field ? JSON.stringify(field.default) : null,
    rules: describeRules(field),
    description: String(field.description ?? ''),
  }))
}

/** `.strict()` on the schema, which is what makes a misspelt option an error rather than a default. */
export function rejectsUnknownFields(schema: ZodType): boolean {
  return (z.toJSONSchema(schema, { io: 'input' }) as JsonSchema).additionalProperties === false
}

/** The sentence every surface prints under a strict config's fields. */
export const STRICT_NOTE =
  'Unknown fields are rejected. A misspelt option produces the error card, never a silent default.'
