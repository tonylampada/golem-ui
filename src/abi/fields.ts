import { z } from 'zod'

/**
 * The vocabulary an agent picks a field's `type` from, shared by every component configured with a
 * list of fields. The type decides how a value is rendered, what `format` means, and — on a form —
 * which control the reader gets. It never changes what the adapter returns or what is written back.
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

/** What every field carries, whatever component is reading it. */
const common = {
  key: z
    .string()
    .min(1)
    .describe('The property to read off each record. Must match what the adapter returns.'),
  label: z
    .string()
    .min(1)
    .describe('What names the field on screen: a column heading, or the label above a control.'),
  type: z
    .enum(FIELD_TYPES, {
      error: (issue) =>
        `Unknown field type ${JSON.stringify(issue.input)}. Pick one of: ${FIELD_TYPES.join(', ')}.`,
    })
    .describe(
      'How the value is rendered and edited. `text` verbatim; `number` grouped; `date` and `datetime` as UTC calendar dates; `enum` as a coloured chip or a select; `boolean` as Yes/No or a checkbox; `money` as a currency amount; `user` as a name with initials.',
    ),
  format: z
    .string()
    .optional()
    .describe(
      'A hint read only by some types: an ISO currency code for `money` (default USD), an `Intl` dateStyle — short, medium, long, full — for `date` and `datetime`, and a digit count for `number`. Ignored by every other type.',
    ),
}

/** A field as a list shows it: read-only, one column wide. */
export const listFieldSchema = z
  .object({
    ...common,
    primary: z
      .boolean()
      .default(false)
      .describe(
        'Marks the field that titles a row: the first column of the table and the heading of a card. At most one field may set it; with none, the first field is the title.',
      ),
  })
  .strict()

export const fieldOptionSchema = z
  .object({
    id: z.string().min(1).describe('The value written to the record when this choice is picked.'),
    label: z.string().min(1).describe('What the reader sees in the control. Never written back.'),
  })
  .strict()

/** A field as a form edits it: everything above, plus what makes a control out of it. */
export const formFieldSchema = z
  .object({
    ...common,
    required: z
      .boolean()
      .default(false)
      .describe('Blocks submit while the value is empty, and marks the label with an asterisk.'),
    readOnly: z
      .boolean()
      .default(false)
      .describe(
        'Shows the value formatted, with no control and no place in the patch. Use it for what the server owns — an id, a created date, a computed total.',
      ),
    help: z
      .string()
      .optional()
      .describe('One line under the control, always visible. Say what a good value looks like.'),
    placeholder: z
      .string()
      .optional()
      .describe('Ghost text inside an empty control. A sample value, never a second label.'),
    options: z
      .array(fieldOptionSchema)
      .min(1)
      .optional()
      .describe(
        'The choices for an `enum` field, as `{ id, label }`. The reader picks the label and the record gets the id. Required on `enum`, rejected on every other type.',
      ),
    min: z
      .union([z.number(), z.string()])
      .optional()
      .describe(
        'The lowest accepted value: a number for `number` and `money`, an ISO date or datetime string for `date` and `datetime`. Ignored by every other type.',
      ),
    max: z
      .union([z.number(), z.string()])
      .optional()
      .describe('The highest accepted value, in the same shape as `min`.'),
    multiline: z
      .boolean()
      .default(false)
      .describe(
        'Draws a `text` field as a textarea, spanning both columns of a two-column layout. Ignored by every other type.',
      ),
    users: z
      .enum(['members', 'free'])
      .default('members')
      .describe(
        'Where a `user` field gets its choices: `members` is a select over `Identity.listMembers()`, `free` is a text box for a name typed by hand. Ignored by every other type.',
      ),
  })
  .strict()

export type ListField = z.output<typeof listFieldSchema>
export type FormField = z.output<typeof formFieldSchema>
export type FieldOption = z.output<typeof fieldOptionSchema>

/** Whatever a records adapter hands back. `id` is the row key when there is one. */
export type RecordRow = Record<string, unknown>

/** The part of a field that formatting reads. Both field shapes satisfy it. */
export interface RenderedField {
  type: FieldType
  format?: string
}
