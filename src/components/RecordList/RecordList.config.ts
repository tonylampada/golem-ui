import { z } from 'zod'

/**
 * The vocabulary an agent picks a field's `type` from. The type decides how a value is rendered and
 * what `format` means, and nothing else — the adapter still returns whatever the record holds.
 */
export const FIELD_TYPES = [
  'text',
  'number',
  'date',
  'datetime',
  'enum',
  'boolean',
  'money',
  'user',
] as const

export type FieldType = (typeof FIELD_TYPES)[number]

const fieldSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .describe('The property to read off each record. Must match what the adapter returns.'),
    label: z
      .string()
      .min(1)
      .describe('The column heading, and the label beside the value on a card.'),
    type: z
      .enum(FIELD_TYPES, {
        error: (issue) =>
          `Unknown field type ${JSON.stringify(issue.input)}. Pick one of: ${FIELD_TYPES.join(', ')}.`,
      })
      .describe(
        'How the value is rendered. `text` verbatim; `number` grouped; `date` and `datetime` as UTC calendar dates; `enum` as a coloured chip; `boolean` as Yes/No; `money` as a currency amount; `user` as a name with initials.',
      ),
    format: z
      .string()
      .optional()
      .describe(
        'A hint read only by some types: an ISO currency code for `money` (default USD), an `Intl` dateStyle — short, medium, long, full — for `date` and `datetime`, and a digit count for `number`. Ignored by every other type.',
      ),
    primary: z
      .boolean()
      .default(false)
      .describe(
        'Marks the field that titles a row: the first column of the table and the heading of a card. At most one field may set it; with none, the first field is the title.',
      ),
  })
  .strict()

export const recordListConfigSchema = z
  .object({
    collection: z
      .string()
      .min(1)
      .describe('The record type the adapter is asked for, passed to `list` and `subscribe`.'),
    fields: z
      .array(fieldSchema)
      .min(1)
      .describe(
        'The columns, in the order they are shown. Each is `{ key, label, type, format?, primary? }`, where `type` is one of text, number, date, datetime, enum, boolean, money, user.',
      ),
    sort: z
      .object({
        field: z.string().min(1).describe('The `key` of the field rows are ordered by.'),
        direction: z.enum(['asc', 'desc']).describe('Ascending or descending, to start with.'),
      })
      .strict()
      .optional()
      .describe(
        'The order the list opens in. The reader changes it from the column headings; leave it out and the adapter’s own order is what arrives.',
      ),
    scope: z
      .record(
        z.string(),
        z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.array(z.union([z.string(), z.number(), z.boolean()])),
        ]),
      )
      .default({})
      .describe(
        'A fixed narrowing applied to every query and never shown as a control: `{ status: ["waiting", "in progress"] }` is a list of what is still open. An array means any of. This is how one collection feeds several screens.',
      ),
    filters: z
      .array(z.string().min(1))
      .default([])
      .describe(
        'Field keys that get a row of filter chips above the list, one chip per value seen. Use it for `enum` and `boolean` fields; every key must also appear in `fields`.',
      ),
    search: z
      .array(z.string().min(1))
      .default([])
      .describe(
        'Field keys the search box matches, as a case-insensitive substring. Empty hides the search box. Keys need not appear in `fields` — a list can be searchable by a field it does not show.',
      ),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(25)
      .describe('How many rows arrive per page, and how many more the load-more button fetches.'),
    emptyState: z
      .string()
      .min(1)
      .default('Nothing here yet.')
      .describe('One line shown in place of the list when a query matches no rows.'),
    rowAction: z
      .enum(['open', 'none'])
      .default('open')
      .describe(
        '`open` makes each row clickable and focusable and calls the `onOpen` prop with the record; `none` makes the list read-only.',
      ),
    density: z
      .enum(['compact', 'comfortable'])
      .default('comfortable')
      .describe(
        'Row height. `comfortable` for a screen of its own, `compact` for a list sitting inside a panel among other blocks.',
      ),
  })
  .strict()
  .superRefine((config, ctx) => {
    const keys = new Set(config.fields.map((field) => field.key))

    if (config.fields.filter((field) => field.primary).length > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['fields'],
        message: 'More than one field sets `primary`. Exactly one field titles a row.',
      })
    }
    for (const [index, key] of config.filters.entries()) {
      if (!keys.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['filters', index],
          message: `No field has the key "${key}", so there is nothing to filter. Add it to \`fields\` first.`,
        })
      }
    }
    if (config.sort && !keys.has(config.sort.field)) {
      ctx.addIssue({
        code: 'custom',
        path: ['sort', 'field'],
        message: `No field has the key "${config.sort.field}", so the list cannot be sorted by it.`,
      })
    }
  })

export type RecordListConfig = z.output<typeof recordListConfigSchema>
export type RecordListConfigInput = z.input<typeof recordListConfigSchema>
export type RecordField = z.output<typeof fieldSchema>
