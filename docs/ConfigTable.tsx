import type { ZodType } from 'zod'
import { Markdown } from '../src/lib/markdown'
import { configFields, rejectsUnknownFields, STRICT_NOTE } from './config-fields'

/**
 * The configuration table on every Storybook docs page. The showcase's `#/api` page draws the same
 * `configFields()` rows as cards, because a six-column table is not a phone.
 */
export function ConfigTable({ schema }: { schema: ZodType }) {
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
          {configFields(schema).map((field) => (
            <tr key={field.name}>
              <td>
                <code>{field.name}</code>
              </td>
              <td>
                <code>{field.type}</code>
              </td>
              <td>{field.required ? 'yes' : 'no'}</td>
              <td>{field.default === null ? '—' : <code>{field.default}</code>}</td>
              <td>{field.rules}</td>
              <td>
                <Markdown text={field.description} hardWraps={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rejectsUnknownFields(schema) && (
        <p>
          <em>{STRICT_NOTE}</em>
        </p>
      )}
    </>
  )
}
