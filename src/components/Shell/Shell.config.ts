import { z } from 'zod'

const menuItemSchema = z
  .object({
    id: z.string().min(1).describe('Names the item to `activeId` and to `onSelect`.'),
    label: z.string().min(1).describe('The word on the row.'),
    icon: z.string().optional().describe('A short glyph drawn before the label — an emoji does.'),
    href: z
      .string()
      .optional()
      .describe(
        'The route the item opens, through `navigation.go`. Left out, tapping it calls `onSelect(id)` instead.',
      ),
  })
  .strict()

export const shellConfigSchema = z
  .object({
    title: z.string().min(1).describe('Text shown in the top bar. Usually the app name.'),
    menu: z
      .array(menuItemSchema)
      .default([])
      .describe(
        "The app's own screens, one item each, in the menu row under the top bar. Empty means no menu row.",
      ),
    activeId: z
      .string()
      .optional()
      .describe(
        'The menu item drawn as current. Left out, the item whose `href` starts the current route is current.',
      ),
    chatSide: z
      .enum(['left', 'right'])
      .default('left')
      .describe('Which side of the frame the agent chat column sits on, at desktop width.'),
    chatOpen: z
      .boolean()
      .default(true)
      .describe(
        'Whether the chat column is open at the first paint at desktop width, when this browser has no remembered choice. Turning it on later opens the chat on either layout, which is how an app raises the chat when a mode switches on. Below the breakpoint the chat starts closed.',
      ),
    breakpoint: z
      .number()
      .int()
      .min(320)
      .max(1920)
      .default(768)
      .describe(
        'Viewport width in pixels. Below it the chat stops being a side column and opens as a sheet over the app.',
      ),
    chatWidth: z
      .number()
      .int()
      .min(240)
      .max(960)
      .default(320)
      .describe(
        'Starting width of the chat column in pixels, at desktop width. The reader can drag the edge between chat and canvas to change it, and the choice is kept in this browser.',
      ),
    showTopBar: z
      .boolean()
      .default(true)
      .describe('Whether the top bar is rendered at all. Turn it off when the host app has one.'),
  })
  .strict()

export type ShellConfig = z.output<typeof shellConfigSchema>
export type ShellConfigInput = z.input<typeof shellConfigSchema>
export type ShellMenuItem = z.output<typeof menuItemSchema>
