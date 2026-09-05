import { z } from 'zod'

export const chatConfigSchema = z
  .object({
    placeholder: z
      .string()
      .min(1)
      .default('Message the agent…')
      .describe('Ghost text in the empty composer. Say what this agent is good for.'),
    emptyState: z
      .string()
      .min(1)
      .default('No messages yet.')
      .describe('One line shown in place of the message list before the first message exists.'),
    agentName: z
      .string()
      .min(1)
      .default('Agent')
      .describe('Label above each agent bubble, and the name in the thinking indicator.'),
    userName: z
      .string()
      .min(1)
      .default('You')
      .describe('Label above each of the reader’s own bubbles.'),
    markdown: z
      .boolean()
      .default(true)
      .describe(
        'Whether agent messages render as markdown — bold, lists, links, code. Turn it off for an agent that answers in plain prose, and the text renders verbatim.',
      ),
    showTimestamps: z
      .boolean()
      .default(false)
      .describe('Whether each bubble carries the time it was sent, as HH:MM in UTC.'),
    maxComposerLines: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(6)
      .describe(
        'How tall the composer may grow as the reader types. Past it the composer stops growing and scrolls.',
      ),
  })
  .strict()

export type ChatConfig = z.output<typeof chatConfigSchema>
export type ChatConfigInput = z.input<typeof chatConfigSchema>
