import type { ZodError } from 'zod'

export interface ConfigIssue {
  /** Dotted path of the offending field, or `(root)` for the object itself. */
  field: string
  /** The rule that rejected it, in Zod's own vocabulary. */
  rule: string
  message: string
}

export function issuesFromZodError(error: ZodError): ConfigIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : '(root)',
    rule: issue.code,
    message: issue.message,
  }))
}

/**
 * Rendered in place of the component whenever its config fails validation — in dev and in prod
 * alike. A silent fallback would hide the mistake from the agent that made it.
 */
export function ConfigErrorCard({
  component,
  issues,
}: {
  component: string
  issues: ConfigIssue[]
}) {
  return (
    <div
      role="alert"
      data-golem-error="config"
      className="golem-error-card m-2 rounded-lg border-2 border-red-500 bg-red-50 p-4 font-mono text-sm text-red-900"
    >
      <p className="mb-2 font-bold">
        golem-ui: {component} received an invalid <code>config</code>
      </p>
      <ul className="space-y-1">
        {issues.map((issue, i) => (
          <li key={i}>
            <span className="font-bold underline">{issue.field}</span>
            {' — '}
            {issue.message} <span className="opacity-70">[{issue.rule}]</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 opacity-70">
        Fix the config object. The schema is on the {component} docs page.
      </p>
    </div>
  )
}
