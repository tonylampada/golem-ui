import { z } from 'zod'

export const brainConfigSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .default('Knowledge')
      .describe('Heading over the folder tree. Name the brain as the reader knows it.'),
    openLocation: z
      .string()
      .regex(/^[^#\s]+(#L\d+(-L\d+)?)?$/, 'a path, optionally followed by #L<start>-L<end>')
      .optional()
      .describe(
        'A source location, `path#L<start>-L<end>`, to open and highlight. Change it and the reader opens the file and scrolls the range into view; omit it and the root index.md opens.',
      ),
  })
  .strict()

export type BrainConfig = z.output<typeof brainConfigSchema>
export type BrainConfigInput = z.input<typeof brainConfigSchema>
