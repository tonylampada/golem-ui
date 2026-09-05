import { useState } from 'react'
import { Panel, Screen } from '../ui'

const dna = `# Northgate Cycles

A neighbourhood bike repair shop. Five people, one bench diary, one counter.

## Records

- **job** — ticket, customer, bike, service, assignee, status, quote, notes
- **log entry** — date, label, detail, kind (win | note | goal)
- **attachment** — a photo or an invoice, attached to a job

## Screens

- Today: what is on the bench right now
- Repair jobs: the whole board, newest first
- Daily report: written every morning from yesterday's tickets
- Shop log: what changed, in order
- Photos & invoices
- Team & access

## Rules

- A ticket is *ready* only when it has been called in to the customer.
- Turnaround target is three days, measured from the ticket date.
`

/** Placeholder for the Editor component: the markdown the agent compiles the app from. */
export function Dna() {
  const [text, setText] = useState(dna)

  return (
    <Screen title="Workspace DNA" lead="The markdown the agent reads before it changes anything.">
      <Panel className="p-0">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          className="block h-96 w-full resize-y rounded-xl bg-white p-4 font-mono text-xs leading-relaxed text-neutral-800"
        />
      </Panel>
      <p className="text-xs text-neutral-500">
        Edits here are local to the demo. In the real app the agent watches this document and the
        app follows it.
      </p>
    </Screen>
  )
}
