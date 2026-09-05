import { z } from 'zod'

/**
 * A locale the platform can actually format with. `en_GB` and `english` are the two an agent
 * writes by mistake, and both would otherwise throw inside `Intl` at render time rather than land
 * on the error card.
 */
function isFormattableLocale(locale: string): boolean {
  try {
    new Intl.DateTimeFormat(locale)
    return true
  } catch {
    return false
  }
}

export const reportConfigSchema = z
  .object({
    collection: z
      .string()
      .min(1)
      .describe(
        'The record type the reports live in, passed to `list`, `get` and `subscribe`. One report is one record.',
      ),
    period: z
      .enum(['day', 'week', 'month'])
      .default('day')
      .describe(
        'How long one report covers, which is also what the previous/next arrows step by. A daily stand-up report is `day`; a Monday summary is `week`; a board pack is `month`.',
      ),
    dateField: z
      .string()
      .min(1)
      .default('date')
      .describe(
        'The field holding the day the report covers, as an ISO calendar date (`2026-09-10`). It picks the period and orders the index.',
      ),
    titleField: z
      .string()
      .min(1)
      .default('title')
      .describe('The field shown as the document’s heading, and as each line of the index.'),
    bodyField: z
      .string()
      .min(1)
      .default('body')
      .describe(
        'The field holding the document itself, as markdown: headings, lists, tables, code and links.',
      ),
    statusField: z
      .string()
      .min(1)
      .optional()
      .describe(
        'The field holding `draft` or `final`. Set it and a report still being written wears a Draft badge; leave it out and every report reads as finished.',
      ),
    authorField: z
      .string()
      .min(1)
      .default('author')
      .describe(
        'The field naming who wrote the report — a name, or a record with a `name` on it. Only read when `showAuthor` is on.',
      ),
    showAuthor: z
      .boolean()
      .default(true)
      .describe('Whether the byline is shown under the date. Off for a report nobody signs.'),
    showIndex: z
      .boolean()
      .default(true)
      .describe(
        'Whether past reports are listed under the document as a compact index. Off for a report embedded in a wider screen, where the index belongs to the screen.',
      ),
    showNavigation: z
      .boolean()
      .default(true)
      .describe(
        'Whether the previous/next arrows are shown. Off pins the component to the latest report of the current period, which is what a dashboard card wants.',
      ),
    print: z
      .boolean()
      .default(true)
      .describe(
        'Whether the Print / Save as PDF action is offered. On also brings the print stylesheet: the chrome disappears and the document prints on its own.',
      ),
    emptyState: z
      .string()
      .min(1)
      .default('No report for this period.')
      .describe('One line shown in place of the document when the period holds no report.'),
    locale: z
      .string()
      .min(2)
      .default('en-GB')
      .describe(
        'A BCP-47 tag — `en-GB`, `en-US`, `pt-BR` — that every date on the page is formatted with. Dates are read in UTC, so a report reads the same everywhere.',
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
  })

export type ReportConfig = z.output<typeof reportConfigSchema>
export type ReportConfigInput = z.input<typeof reportConfigSchema>
