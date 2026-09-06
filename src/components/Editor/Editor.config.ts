import { z } from 'zod'
import { isFormattableLocale } from '../../lib/locale'

export const editorConfigSchema = z
  .object({
    collection: z
      .string()
      .min(1)
      .describe(
        'The record type the document lives in, passed to `get`, `update` and `subscribe`. One document is one record.',
      ),
    id: z
      .string()
      .min(1)
      .describe(
        'The id of the one record this editor opens. An editor edits a document, not a collection: point two editors at two ids.',
      ),
    bodyField: z
      .string()
      .min(1)
      .default('body')
      .describe(
        'The field holding the document itself, as markdown. It is both what the person types into and what the agent rewrites.',
      ),
    versionField: z
      .string()
      .min(1)
      .default('version')
      .describe(
        'The field holding a number that goes up on every write. Saving sends the version it read as `expectedVersion`, so a write that arrived second is refused rather than overwriting the other writer.',
      ),
    autosaveMs: z
      .number()
      .int()
      .min(0)
      .max(60_000)
      .default(1200)
      .describe(
        'How long typing has to stop before the draft is saved. `0` saves on every keystroke, which is what a document two writers share wants; a slow store wants two or three thousand.',
      ),
    preview: z
      .enum(['toggle', 'split', 'off'])
      .default('toggle')
      .describe(
        'How the rendered document is reached. `toggle` swaps the pane, `split` puts the rendering beside the source at desktop width and falls back to `toggle` on a phone, `off` shows the source only.',
      ),
    outline: z
      .boolean()
      .default(true)
      .describe(
        'Whether the headings are offered as a drawer that jumps to them. Off for a document short enough to scroll.',
      ),
    readOnly: z
      .boolean()
      .default(false)
      .describe(
        'Whether the document is only readable. The source and the preview stay, the toolbar and the autosave go, and nothing the person types reaches the record.',
      ),
    placeholder: z
      .string()
      .default('Write the document in markdown…')
      .describe('The line shown in place of an empty document, to say what belongs in it.'),
    highlightMs: z
      .number()
      .int()
      .min(0)
      .max(60_000)
      .default(4000)
      .describe(
        'How long a line the agent just wrote keeps its coloured gutter. `0` never marks anything; a few seconds is long enough to catch the eye and short enough to stop being noise.',
      ),
    locale: z
      .string()
      .min(2)
      .default('en-GB')
      .describe(
        'A BCP-47 tag — `en-GB`, `en-US`, `pt-BR` — that the saved-at time in the status line is formatted with.',
      ),
  })
  .strict()
  .superRefine((config, ctx) => {
    if (!isFormattableLocale(config.locale)) {
      ctx.addIssue({
        code: 'custom',
        path: ['locale'],
        message: `"${config.locale}" is not a BCP-47 language tag, so the saved-at time cannot be formatted. Write it with a hyphen: en-GB, en-US, pt-BR.`,
      })
    }
  })

export type EditorConfig = z.output<typeof editorConfigSchema>
export type EditorConfigInput = z.input<typeof editorConfigSchema>
