import { z } from 'zod'

export const shellConfigSchema = z
  .object({
    title: z.string().min(1).describe('Text shown in the top bar. Usually the app name.'),
    chatSide: z
      .enum(['left', 'right'])
      .default('left')
      .describe('Which side of the frame the agent chat column sits on, at desktop width.'),
    breakpoint: z
      .number()
      .int()
      .min(320)
      .max(1920)
      .default(768)
      .describe(
        'Viewport width in pixels. Below it the chat and the canvas stop sitting side by side and become tabs.',
      ),
    showTopBar: z
      .boolean()
      .default(true)
      .describe('Whether the top bar is rendered at all. Turn it off when the host app has one.'),
  })
  .strict()

export type ShellConfig = z.output<typeof shellConfigSchema>
export type ShellConfigInput = z.input<typeof shellConfigSchema>
