import { useMemo, type FunctionComponent } from 'react'
import type { z, ZodType } from 'zod'
import { ConfigErrorCard, issuesFromZodError } from './error-card'

/**
 * The outer shape of every golem-ui component, no exceptions.
 *
 * `Slots` carries the ReactNode holes a component exposes, plus the per-use props that belong to
 * the call site rather than to the config — `Auth.Guard`'s `roles` is one. Anything the agent would
 * write once for the whole app belongs in `config`, and anything that reaches the world in
 * `adapters`.
 */
export type GolemProps<ConfigInput, Adapters, Slots = object> = {
  config: ConfigInput
  adapters: Adapters
} & Slots

export interface ComponentSpec<Schema extends ZodType, Adapters, Slots = object> {
  /** Shown in the error card, so it must be the name the agent writes in JSX. */
  name: string
  schema: Schema
  render: FunctionComponent<GolemProps<z.output<Schema>, Adapters, Slots>>
}

/**
 * Wraps a renderer so the component validates its config before it renders anything, and shows a
 * loud error card naming the field and the rule when validation fails.
 */
export function defineComponent<Schema extends ZodType, Adapters, Slots = object>(
  spec: ComponentSpec<Schema, Adapters, Slots>,
): FunctionComponent<GolemProps<z.input<Schema>, Adapters, Slots>> & { schema: Schema } {
  const Render = spec.render

  const Component = (props: GolemProps<z.input<Schema>, Adapters, Slots>) => {
    const { config, ...rest } = props
    const parsed = useMemo(() => spec.schema.safeParse(config), [config])

    if (!parsed.success) {
      return <ConfigErrorCard component={spec.name} issues={issuesFromZodError(parsed.error)} />
    }

    return (
      <Render
        {...(rest as unknown as GolemProps<z.output<Schema>, Adapters, Slots>)}
        config={parsed.data}
      />
    )
  }

  Component.displayName = spec.name
  Component.schema = spec.schema
  return Component
}
