import { z, type ZodType } from 'zod'

type JsonSchema = {
  properties?: Record<string, Record<string, unknown>>
  required?: string[]
  additionalProperties?: boolean
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
 * The configuration table on every docs page, read straight off the Zod schema so it cannot drift
 * from the validator that rejects the agent's config at runtime.
 */
export function ConfigTable({ schema }: { schema: ZodType }) {
  const json = z.toJSONSchema(schema, { io: 'input' }) as JsonSchema
  const properties = json.properties ?? {}
  const required = new Set(json.required ?? [])

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Required</th>
            <th>Default</th>
            <th>Rules</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(properties).map(([name, field]) => (
            <tr key={name}>
              <td>
                <code>{name}</code>
              </td>
              <td>
                <code>{describeType(field)}</code>
              </td>
              <td>{required.has(name) ? 'yes' : 'no'}</td>
              <td>{'default' in field ? <code>{JSON.stringify(field.default)}</code> : '—'}</td>
              <td>{describeRules(field)}</td>
              <td>{String(field.description ?? '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {json.additionalProperties === false && (
        <p>
          <em>
            Unknown fields are rejected. A misspelt option produces the error card, never a silent
            default.
          </em>
        </p>
      )}
    </>
  )
}
