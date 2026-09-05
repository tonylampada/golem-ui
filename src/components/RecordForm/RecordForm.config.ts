import { z } from 'zod'
import { formFieldSchema } from '../../abi/fields'

export const recordFormConfigSchema = z
  .object({
    collection: z
      .string()
      .min(1)
      .describe('The record type the adapter is asked for, passed to every read and every write.'),
    fields: z
      .array(formFieldSchema)
      .min(1)
      .describe(
        'The controls, in the order they are shown. Each is `{ key, label, type, … }` from the same field vocabulary `RecordList` reads: text, number, date, datetime, enum, boolean, money, user.',
      ),
    mode: z
      .enum(['create', 'edit'])
      .describe(
        '`create` opens blank and calls `create`; `edit` loads the record named by the `recordId` prop and calls `update` with only what changed.',
      ),
    layout: z
      .enum(['single', 'two-column'])
      .default('single')
      .describe(
        'How the controls are arranged above 768px: `single` is one column at a readable width, `two-column` pairs them. Below 768px both are one column, whatever this says.',
      ),
    submitLabel: z
      .string()
      .min(1)
      .default('Save')
      .describe('The button that writes. Name the outcome — "Save ticket", not "Submit".'),
    cancel: z
      .enum(['back', 'none'])
      .default('back')
      .describe(
        '`back` puts a Cancel button beside submit and calls the `onCancel` prop; `none` leaves the form with no way out, for a form that fills a page of its own.',
      ),
    successMessage: z
      .string()
      .min(1)
      .default('Saved.')
      .describe('The line shown once the adapter has taken the write.'),
    deleteAllowed: z
      .boolean()
      .default(false)
      .describe(
        'Adds a Delete button that asks once before calling `remove`. Only in `edit` mode, and only for a reader allowed to delete — the call site decides that by what it puts here.',
      ),
  })
  .strict()
  .superRefine((config, ctx) => {
    for (const [index, field] of config.fields.entries()) {
      if (field.type === 'enum' && !field.options) {
        ctx.addIssue({
          code: 'custom',
          path: ['fields', index, 'options'],
          message: `The enum field "${field.key}" has no \`options\`, so there is nothing to pick. Give it \`[{ id, label }]\`.`,
        })
      }
      if (field.type !== 'enum' && field.options) {
        ctx.addIssue({
          code: 'custom',
          path: ['fields', index, 'options'],
          message: `\`options\` belongs to an enum field, and "${field.key}" is typed ${field.type}. Change the type or drop the options.`,
        })
      }
      if (field.required && field.readOnly) {
        ctx.addIssue({
          code: 'custom',
          path: ['fields', index],
          message: `The field "${field.key}" is both \`required\` and \`readOnly\`, so nobody can ever satisfy it. Pick one.`,
        })
      }
      if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
        ctx.addIssue({
          code: 'custom',
          path: ['fields', index, 'min'],
          message: `The field "${field.key}" has a \`min\` above its \`max\`, so no value passes.`,
        })
      }
    }
    if (config.mode === 'create' && config.deleteAllowed) {
      ctx.addIssue({
        code: 'custom',
        path: ['deleteAllowed'],
        message: 'A record being created cannot be deleted. `deleteAllowed` belongs to edit mode.',
      })
    }
  })

export type RecordFormConfig = z.output<typeof recordFormConfigSchema>
export type RecordFormConfigInput = z.input<typeof recordFormConfigSchema>
