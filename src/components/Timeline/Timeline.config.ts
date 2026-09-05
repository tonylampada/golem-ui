import { z } from 'zod'
import { isFormattableLocale } from '../../lib/locale'

/**
 * What a kind says about an entry, and the only thing that decides its mark and its colour. Four
 * tones rather than a palette: an agent picking a colour would pick a different one on every
 * screen, and a log is read by scanning down one column of marks.
 */
export const TONES = ['neutral', 'good', 'warn', 'bad'] as const

export type Tone = (typeof TONES)[number]

export const timelineKindSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .describe('The value the record holds in `kindField` when the entry is of this kind.'),
    label: z
      .string()
      .min(1)
      .describe('What names the kind on the entry and on its filter chip. Never written back.'),
    tone: z
      .enum(TONES, {
        error: (issue) =>
          `Unknown tone ${JSON.stringify(issue.input)}. Pick one of: ${TONES.join(', ')}.`,
      })
      .describe(
        'The mark and the colour: `neutral` a grey dot, `good` a green tick, `warn` an amber triangle, `bad` a red cross.',
      ),
  })
  .strict()

export const timelineConfigSchema = z
  .object({
    collection: z
      .string()
      .min(1)
      .describe(
        'The record type the entries live in, passed to `list`, `subscribe` and `create`. One entry is one record.',
      ),
    dateField: z
      .string()
      .min(1)
      .default('at')
      .describe(
        'The field holding the instant the entry happened, as a full ISO datetime (`2026-09-10T14:32:00Z`). It orders the timeline, newest first, and cuts it into days.',
      ),
    bodyField: z
      .string()
      .min(1)
      .default('body')
      .describe(
        'The field holding what the entry says, as short markdown: a sentence or two, bold, links, a bullet list.',
      ),
    kindField: z
      .string()
      .min(1)
      .optional()
      .describe(
        'The field holding which of the `kinds` an entry is. Leave it out and every entry gets the same neutral dot.',
      ),
    kinds: z
      .array(timelineKindSchema)
      .default([])
      .describe(
        'The vocabulary `kindField` is read against: `{ id, label, tone }` each, where `tone` is one of neutral, good, warn, bad. Set it with `kindField` or not at all.',
      ),
    actorField: z
      .string()
      .min(1)
      .optional()
      .describe(
        'The field naming who the entry is by — a name, or a record with a `name` on it. Leave it out and entries are unsigned.',
      ),
    attachmentsField: z
      .string()
      .min(1)
      .optional()
      .describe(
        'The field holding the entry’s file references, as an array of ids or of `{ id, name }`. Each becomes a chip that opens through `Files.url`, so setting this field makes the `files` adapter required.',
      ),
    filters: z
      .array(z.enum(['kind', 'actor']))
      .default([])
      .describe(
        'Which rows of filter chips sit above the timeline. `kind` offers every configured kind; `actor` offers every person whose entries have arrived. Each needs its field set.',
      ),
    search: z
      .array(z.string().min(1))
      .default([])
      .describe(
        'Field keys the search box matches, as a case-insensitive substring — usually just the body field. Empty hides the search box.',
      ),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(25)
      .describe(
        'How many entries arrive per page, and how many older ones the load-more button fetches.',
      ),
    composer: z
      .boolean()
      .default(false)
      .describe(
        'Whether a one-line box for adding an entry sits above the timeline. On makes the `identity` adapter required: the new entry is stamped with the signed-in member and with the clock’s current instant.',
      ),
    emptyState: z
      .string()
      .min(1)
      .default('Nothing on the log yet.')
      .describe('One line shown in place of the entries when the query matches none.'),
    locale: z
      .string()
      .min(2)
      .default('en-GB')
      .describe(
        'A BCP-47 tag — `en-GB`, `en-US`, `pt-BR` — that every day header and clock time is formatted with. Days are cut in the `Clock` adapter’s time zone, so "Today" means today where the reader is.',
      ),
  })
  .strict()
  .superRefine((config, ctx) => {
    if (!isFormattableLocale(config.locale)) {
      ctx.addIssue({
        code: 'custom',
        path: ['locale'],
        message: `"${config.locale}" is not a BCP-47 language tag, so no date on the page can be formatted. Write it with a hyphen: en-GB, en-US, pt-BR.`,
      })
    }
    if (config.kindField !== undefined && config.kinds.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['kinds'],
        message: `\`kindField\` reads "${config.kindField}" against a vocabulary that is empty, so no entry can be marked. List the kinds, or drop \`kindField\`.`,
      })
    }
    if (config.kindField === undefined && config.kinds.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['kindField'],
        message: 'There are `kinds` but no `kindField` to read them against. Name the field.',
      })
    }

    const seen = new Set<string>()
    for (const [index, kind] of config.kinds.entries()) {
      if (seen.has(kind.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['kinds', index, 'id'],
          message: `Two kinds share the id "${kind.id}", so an entry of that kind has two meanings.`,
        })
      }
      seen.add(kind.id)
    }

    for (const [index, filter] of config.filters.entries()) {
      const needed = filter === 'kind' ? config.kindField : config.actorField
      if (needed === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['filters', index],
          message: `Filtering by ${filter} needs \`${filter}Field\` set, otherwise there is nothing to filter on.`,
        })
      }
    }
  })

export type TimelineConfig = z.output<typeof timelineConfigSchema>
export type TimelineConfigInput = z.input<typeof timelineConfigSchema>
