import { useRef, useState } from 'react'
import { Editor } from 'golem-ui'
import type { ClockAdapter, EditorConfigInput, RecordsAdapter } from 'golem-ui'
import { DNA_REVISED_RULES, DNA_RULES, dnaDocument } from '../seed'

/**
 * The workspace DNA, in the one component the whole idea rests on. `/dna` is guarded to the owner,
 * so this is also where the demo shows a role turning somebody away.
 */
export const dnaConfig: EditorConfigInput = {
  collection: 'dna',
  id: dnaDocument.id,
  bodyField: 'body',
  versionField: 'version',
  autosaveMs: 1000,
  preview: 'split',
  outline: true,
  readOnly: false,
  placeholder: 'Write the workspace DNA in markdown…',
  highlightMs: 4000,
  locale: 'en-GB',
}

/** How long the fake agent takes to answer, so there is time to be mid-sentence when it lands. */
const AGENT_DELAY_MS = 2000

export function Dna({ records, clock }: { records: RecordsAdapter; clock: ClockAdapter }) {
  const [asked, setAsked] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * The fake agent: two seconds after it is asked, it rewrites the Rules section and puts the
   * version up. Nothing else about the write is special — it goes through the same `Records`
   * adapter the person's own saves do, which is the whole point.
   */
  const askTheAgent = () => {
    if (timer.current) clearTimeout(timer.current)
    setAsked(true)
    timer.current = setTimeout(() => {
      void records.get<{ body: string; version: number }>('dna', dnaDocument.id).then((current) => {
        if (!current) return
        return records.update('dna', dnaDocument.id, {
          body: current.body.includes(DNA_RULES)
            ? current.body.replace(DNA_RULES, DNA_REVISED_RULES)
            : `${current.body}\n${DNA_REVISED_RULES}\n`,
          version: current.version + 1,
        })
      })
      setAsked(false)
    }, AGENT_DELAY_MS)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">Workspace DNA</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            The markdown the agent reads before it changes anything — and writes back to.
          </p>
        </div>
        <button
          type="button"
          onClick={askTheAgent}
          disabled={asked}
          className="shrink-0 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {asked ? 'The agent is writing…' : 'Ask the agent to revise'}
        </button>
      </div>

      <div className="min-h-0 flex-1">
        <Editor config={dnaConfig} adapters={{ records, clock }} />
      </div>
    </div>
  )
}
