import { z } from 'zod'

const roleSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    manages: z.boolean().default(false),
  })
  .strict()

const copySchema = z
  .object({
    signInTitle: z.string().min(1).default('Sign in'),
    signUpTitle: z.string().min(1).default('Create your account'),
    hint: z.string().default(''),
    submit: z.string().min(1).default('Continue'),
    membersTitle: z.string().min(1).default('Members'),
    denied: z.string().min(1).default('This screen is not open to your role.'),
  })
  .strict()

export const authConfigSchema = z
  .object({
    workspaceName: z
      .string()
      .min(1)
      .describe(
        'The workspace people are signing in to. Names the sign-in screen and the invite a new member opens.',
      ),
    mode: z
      .enum(['password', 'code'])
      .default('password')
      .describe(
        'How a returning member proves who they are. `password` asks for one; `code` sends a one-time code to the address and asks for that instead.',
      ),
    allowSignUp: z
      .boolean()
      .default(true)
      .describe(
        'Whether the sign-in screen offers a link to create an account. An invite link always leads to sign-up whatever this says.',
      ),
    inviteOnly: z
      .boolean()
      .default(false)
      .describe(
        'Whether an account can only be created from an invite link. On, the sign-up link is hidden and the form appears only for a reader who arrived on an invite.',
      ),
    roles: z
      .array(roleSchema)
      .min(1)
      .prefault([
        { id: 'member', label: 'Member' },
        { id: 'admin', label: 'Admin', manages: true },
      ])
      .describe(
        'Every role this workspace has, each `{ id, label, manages }`. The first is what a new member gets. A role with `manages: true` may invite people, change their role and remove them; every other role sees the same list read-only.',
      ),
    copy: copySchema
      .prefault({})
      .describe(
        'Overrides for the labels the screens are built from: `signInTitle`, `signUpTitle`, `hint` (a line under the title, where a demo says which accounts work), `submit`, `membersTitle`, `denied`.',
      ),
  })
  .strict()

export type AuthConfig = z.output<typeof authConfigSchema>
export type AuthConfigInput = z.input<typeof authConfigSchema>
export type AuthRole = z.output<typeof roleSchema>
