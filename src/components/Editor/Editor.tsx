import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { defineComponent, type GolemProps } from '../../abi'
import { conflictingRecord, type ClockAdapter, type RecordsAdapter } from '../../adapters'
import { merge3, mergedText, type Merge3Chunk } from '../../lib/diff3'
import { headingSlug, Markdown } from '../../lib/markdown'
import { useContainerWidth } from '../../lib/use-container-width'
import { editorConfigSchema, type EditorConfig } from './Editor.config'
import { headingsOf, scanSource, SourceRow, LINE_CLASS } from './source'

export interface EditorAdapters {
  records: RecordsAdapter
  clock: ClockAdapter
}

export interface EditorSlots {
  /**
   * Work the person had not saved when they last left — from a local draft store, say. The editor
   * opens on it instead of the record's body, dirty against the record's version, so the first
   * thing that arrives from the agent is merged rather than dropped on top of it.
   */
  draft?: string
}

/** Below this the source and the preview cannot both fit, so `split` falls back to `toggle`. */
const SPLIT_ABOVE = 768

type Status = 'loading' | 'saved' | 'dirty' | 'saving' | 'conflict' | 'error'

/** A run of lines the agent wrote, in the draft's own line numbers, and when it landed. */
interface Mark {
  start: number
  end: number
}

interface Doc {
  draft: string
  /** The text the person and the agent last agreed on: the base every merge is run from. */
  base: string
  version: number
  status: Status
  error: string | null
  savedAt: Date | null
  marks: Mark[]
  /** Set while the two disagree; the source pane is replaced by the choice until it is empty. */
  conflict: Merge3Chunk[] | null
  choices: ('mine' | 'theirs' | null)[]
}

const EMPTY: Doc = {
  draft: '',
  base: '',
  version: 0,
  status: 'loading',
  error: null,
  savedAt: null,
  marks: [],
  conflict: null,
  choices: [],
}

const message = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause))

type DocRecord = Record<string, unknown> & { id: string }

/**
 * Undo is local and it is the editor's own: a draft the agent rewrote is set programmatically, and
 * the browser's native textarea history has no entry for that. Keystrokes inside half a second
 * coalesce into one step, measured on the wall clock rather than on the `Clock` adapter — a frozen
 * clock is a document's clock, not a stopwatch.
 */
const COALESCE_MS = 500

function useHistory() {
  const state = useRef({ stack: [] as string[], at: -1, last: 0 })

  const reset = useCallback((text: string) => {
    state.current = { stack: [text], at: 0, last: 0 }
  }, [])

  const remember = useCallback((text: string) => {
    const history = state.current
    const now = Date.now()
    if (history.at >= 0 && now - history.last < COALESCE_MS) {
      history.stack[history.at] = text
      history.last = now
      return
    }
    history.stack = [...history.stack.slice(0, history.at + 1), text]
    history.at = history.stack.length - 1
    history.last = now
  }, [])

  const step = useCallback((delta: number): string | null => {
    const history = state.current
    const next = history.at + delta
    if (next < 0 || next >= history.stack.length) return null
    history.at = next
    history.last = 0
    return history.stack[next]!
  }, [])

  return useMemo(() => ({ reset, remember, step }), [reset, remember, step])
}

function EditorBody({
  config,
  adapters,
  draft: openWith,
}: GolemProps<EditorConfig, EditorAdapters, EditorSlots>) {
  const { records, clock } = adapters
  const root = useRef<HTMLDivElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLDivElement>(null)

  const [doc, setDocState] = useState<Doc>(EMPTY)
  const docRef = useRef(doc)
  const setDoc = useCallback((patch: Partial<Doc>) => {
    docRef.current = { ...docRef.current, ...patch }
    setDocState(docRef.current)
  }, [])

  const [mode, setMode] = useState<'source' | 'preview'>('source')
  const [outlineOpen, setOutlineOpen] = useState(false)
  const history = useHistory()
  const selection = useRef<[number, number] | null>(null)
  /** An incoming version that arrived while a conflict was open, applied once it is settled. */
  const pending = useRef<DocRecord | null>(null)

  const wide = useContainerWidth(root) >= SPLIT_ABOVE
  const split = config.preview === 'split' && wide
  const showPreview = split || (config.preview !== 'off' && mode === 'preview')
  const showSource = split || !showPreview

  /**
   * A version that arrived from somewhere else, folded into the draft. Three outcomes: it is already
   * what we have, it merges cleanly and the lines it wrote are marked, or the two disagree and the
   * person is asked which lines to keep.
   */
  const applyIncoming = useCallback(
    (record: DocRecord) => {
      const current = docRef.current
      const theirs = String(record[config.bodyField] ?? '')
      const version = Number(record[config.versionField] ?? current.version)

      if (current.conflict !== null) {
        pending.current = record
        return
      }
      if (theirs === current.base && version === current.version) return

      const merged = merge3(current.base, current.draft, theirs)
      if (merged.conflicted) {
        setDoc({
          base: theirs,
          version,
          status: 'conflict',
          error: null,
          conflict: merged.chunks,
          choices: merged.chunks.map(() => null),
        })
        return
      }

      const { text, theirLines } = mergedText(merged.chunks)
      history.remember(text)
      setDoc({
        draft: text,
        base: theirs,
        version,
        status: text === theirs ? 'saved' : 'dirty',
        error: null,
        marks: config.highlightMs > 0 ? theirLines : [],
      })
    },
    [config.bodyField, config.versionField, config.highlightMs, history, setDoc],
  )

  /** The one write. The version it read goes out as `expectedVersion`; a refusal merges instead. */
  const save = useCallback(async () => {
    const current = docRef.current
    if (config.readOnly || current.status === 'conflict' || current.status === 'loading') return
    if (current.draft === current.base) return

    const body = current.draft
    const expected = current.version
    setDoc({ status: 'saving' })

    try {
      const saved = await records.update<DocRecord>(
        config.collection,
        config.id,
        { [config.bodyField]: body, [config.versionField]: expected + 1 },
        { expectedVersion: expected, versionField: config.versionField },
      )
      setDoc({
        base: body,
        version: Number(saved[config.versionField] ?? expected + 1),
        // The person kept typing while the write was in flight, so there is already more to send.
        status: docRef.current.draft === body ? 'saved' : 'dirty',
        error: null,
        savedAt: clock.now(),
      })
    } catch (cause) {
      const theirs = conflictingRecord(cause)
      if (theirs) {
        setDoc({ status: 'dirty' })
        applyIncoming(theirs as DocRecord)
        return
      }
      setDoc({ status: 'error', error: message(cause) })
    }
  }, [applyIncoming, clock, config, records, setDoc])

  // The document, and the subscription that brings every later version of it. Nothing polls.
  useEffect(() => {
    let live = true

    const load = () =>
      records.get<DocRecord>(config.collection, config.id).then(
        (record) => {
          if (!live) return
          if (record === null) {
            setDoc({
              status: 'error',
              error: `There is no ${config.collection} record with the id ${config.id}.`,
            })
            return
          }
          if (docRef.current.status === 'loading') {
            const body = String(record[config.bodyField] ?? '')
            const opening = openWith ?? body
            history.reset(opening)
            setDoc({
              draft: opening,
              base: body,
              version: Number(record[config.versionField] ?? 0),
              status: opening === body ? 'saved' : 'dirty',
              error: null,
            })
            return
          }
          applyIncoming(record)
        },
        (cause: unknown) => {
          if (live) setDoc({ status: 'error', error: message(cause) })
        },
      )

    void load()
    const unsubscribe = records.subscribe(config.collection, () => void load())
    return () => {
      live = false
      unsubscribe()
    }
    // `openWith` is the draft the editor opens on, read once; a later change to it is not an edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    records,
    config.collection,
    config.id,
    config.bodyField,
    config.versionField,
    applyIncoming,
    history,
    setDoc,
  ])

  // Autosave: typing stops, the debounce runs out, the draft goes.
  useEffect(() => {
    if (config.readOnly || doc.status !== 'dirty') return undefined
    const timer = setTimeout(() => void save(), config.autosaveMs)
    return () => clearTimeout(timer)
  }, [doc.draft, doc.status, config.autosaveMs, config.readOnly, save])

  // The agent's lines keep their gutter for a few seconds, then the document is just a document.
  useEffect(() => {
    if (doc.marks.length === 0 || config.highlightMs === 0) return undefined
    const timer = setTimeout(() => setDoc({ marks: [] }), config.highlightMs)
    return () => clearTimeout(timer)
  }, [doc.marks, config.highlightMs, setDoc])

  // The textarea grows with its content, so the pane scrolls and the overlay never has to be
  // scrolled in step with it.
  useLayoutEffect(() => {
    const element = textarea.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [doc.draft, showSource])

  // A draft set in code — a wrap, an indent, an undo — puts the caret back where the person left it.
  useLayoutEffect(() => {
    const wanted = selection.current
    if (!wanted || !textarea.current) return
    selection.current = null
    textarea.current.focus()
    textarea.current.setSelectionRange(wanted[0], wanted[1])
  }, [doc.draft])

  const lines = useMemo(() => doc.draft.split('\n'), [doc.draft])
  const scanned = useMemo(() => scanSource(lines), [lines])
  const headings = useMemo(() => headingsOf(lines), [lines])
  const marked = useMemo(() => {
    const rows = new Set<number>()
    for (const mark of doc.marks)
      for (let line = mark.start; line < mark.end; line++) rows.add(line)
    return rows
  }, [doc.marks])

  const write = (text: string, caret?: [number, number]) => {
    history.remember(text)
    if (caret) selection.current = caret
    setDoc({ draft: text, status: text === docRef.current.base ? 'saved' : 'dirty' })
  }

  /** Wraps the selection, or opens an empty pair with the caret inside it. */
  const wrap = (marker: string) => {
    const element = textarea.current
    if (!element) return
    const [from, to] = [element.selectionStart, element.selectionEnd]
    const text = docRef.current.draft
    const next = `${text.slice(0, from)}${marker}${text.slice(from, to)}${marker}${text.slice(to)}`
    write(next, [from + marker.length, to + marker.length])
  }

  /** Two spaces on or off the front of every line the selection touches. */
  const indent = (out: boolean) => {
    const element = textarea.current
    if (!element) return
    const text = docRef.current.draft
    const start = text.lastIndexOf('\n', element.selectionStart - 1) + 1
    const end = text.indexOf('\n', element.selectionEnd)
    const stop = end === -1 ? text.length : end
    const block = text.slice(start, stop)
    const shifted = block
      .split('\n')
      .map((line) => (out ? line.replace(/^ {1,2}/, '') : `  ${line}`))
      .join('\n')
    const moved = shifted.length - block.length
    write(`${text.slice(0, start)}${shifted}${text.slice(stop)}`, [
      Math.max(start, element.selectionStart + (out ? -2 : 2)),
      Math.max(start, element.selectionEnd + moved),
    ])
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const meta = event.metaKey || event.ctrlKey
    const key = event.key.toLowerCase()

    if (meta && key === 's') {
      event.preventDefault()
      void save()
      return
    }
    if (meta && key === 'b') {
      event.preventDefault()
      wrap('**')
      return
    }
    if (meta && key === 'i') {
      event.preventDefault()
      wrap('*')
      return
    }
    if (meta && key === 'z') {
      event.preventDefault()
      const text = history.step(event.shiftKey ? 1 : -1)
      if (text !== null)
        setDoc({ draft: text, status: text === docRef.current.base ? 'saved' : 'dirty' })
      return
    }
    if (event.key === 'Tab') {
      // Only a list line takes Tab. Everywhere else it moves focus on, which is how a keyboard
      // reader gets out of a textarea.
      const at = event.currentTarget.selectionStart
      const line = docRef.current.draft.slice(
        docRef.current.draft.lastIndexOf('\n', at - 1) + 1,
        at,
      )
      if (!/^\s*([-*+]|\d+[.)])\s/.test(line)) return
      event.preventDefault()
      indent(event.shiftKey)
    }
  }

  const jumpTo = (heading: { line: number; text: string }) => {
    setOutlineOpen(false)
    if (showPreview && !showSource) {
      preview.current
        ?.querySelector(`[data-golem-heading="${headingSlug(heading.text)}"]`)
        ?.scrollIntoView({ block: 'start' })
      return
    }
    overlay.current?.children[heading.line]?.scrollIntoView({ block: 'start' })
    const element = textarea.current
    if (!element) return
    const at = lines.slice(0, heading.line).reduce((sum, line) => sum + line.length + 1, 0)
    element.focus()
    element.setSelectionRange(at, at)
  }

  const choose = (index: number, side: 'mine' | 'theirs') => {
    const current = docRef.current
    if (current.conflict === null) return
    const choices = current.choices.map((one, at) => (at === index ? side : one))
    const undecided = current.conflict.some(
      (chunk, at) => chunk.kind === 'conflict' && choices[at] === null,
    )
    if (undecided) {
      setDoc({ choices })
      return
    }

    const { text, theirLines } = mergedText(current.conflict, (_chunk, at) => choices[at] ?? 'mine')
    history.remember(text)
    setDoc({
      draft: text,
      status: text === current.base ? 'saved' : 'dirty',
      conflict: null,
      choices: [],
      marks: config.highlightMs > 0 ? theirLines : [],
    })

    const later = pending.current
    pending.current = null
    if (later) applyIncoming(later)
  }

  return (
    <div
      ref={root}
      data-golem-component="Editor"
      data-status={doc.status}
      className="golem-editor flex h-full min-h-0 w-full flex-col bg-white text-neutral-900"
    >
      {wide && (
        <Toolbar
          doc={doc}
          config={config}
          headings={headings.length}
          outlineOpen={outlineOpen}
          onOutline={() => setOutlineOpen((open) => !open)}
          mode={mode}
          split={split}
          onMode={setMode}
          onWrap={wrap}
          onSave={() => void save()}
          clock={clock}
        />
      )}

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        {config.outline && outlineOpen && (
          <Outline headings={headings} onJump={jumpTo} wide={wide} />
        )}

        {doc.conflict !== null ? (
          <Conflict chunks={doc.conflict} choices={doc.choices} onChoose={choose} />
        ) : (
          <>
            {showSource && (
              <div
                data-golem-pane="source"
                className={`min-h-0 flex-1 overflow-auto ${split ? 'sm:border-r sm:border-neutral-200' : ''}`}
              >
                <div className="relative min-h-full font-mono text-[13px] leading-6">
                  {/* The styled source, drawn under a textarea whose own text is transparent. Both
                      wrap identically, so the caret always sits on the character it is on. */}
                  <div
                    ref={overlay}
                    aria-hidden="true"
                    style={{ '--golem-mark-ms': `${config.highlightMs}ms` } as CSSProperties}
                    className="pointer-events-none absolute inset-0 p-4 break-words whitespace-pre-wrap"
                  >
                    {scanned.map((line, index) => (
                      <div
                        key={index}
                        data-golem-marked={marked.has(index) ? 'true' : undefined}
                        className={`-mx-2 px-2 ${LINE_CLASS[line.kind]} ${
                          marked.has(index) ? 'golem-editor-mark' : ''
                        }`}
                      >
                        {line.text === '' ? ' ' : <SourceRow line={line} index={index} />}
                      </div>
                    ))}
                  </div>
                  <textarea
                    ref={textarea}
                    value={doc.draft}
                    readOnly={config.readOnly}
                    aria-label="Document source"
                    placeholder={config.placeholder}
                    spellCheck={false}
                    onChange={(event) => write(event.target.value)}
                    onKeyDown={onKeyDown}
                    className="relative block w-full resize-none overflow-hidden bg-transparent p-4 font-mono text-[13px] leading-6 break-words whitespace-pre-wrap text-transparent caret-neutral-900 outline-none placeholder:text-neutral-400"
                  />
                </div>
              </div>
            )}

            {showPreview && (
              <div
                ref={preview}
                data-golem-pane="preview"
                className="min-h-0 flex-1 overflow-auto bg-neutral-50 p-4 text-[15px] leading-7 sm:p-6"
              >
                <Markdown text={doc.draft} hardWraps={false} />
              </div>
            )}
          </>
        )}
      </div>

      {!wide && (
        <Toolbar
          doc={doc}
          config={config}
          headings={headings.length}
          outlineOpen={outlineOpen}
          onOutline={() => setOutlineOpen((open) => !open)}
          mode={mode}
          split={split}
          onMode={setMode}
          onWrap={wrap}
          onSave={() => void save()}
          clock={clock}
          bottom
        />
      )}
    </div>
  )
}

const button =
  'rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-sm font-medium disabled:opacity-40'

function Toolbar({
  doc,
  config,
  headings,
  outlineOpen,
  onOutline,
  mode,
  split,
  onMode,
  onWrap,
  onSave,
  clock,
  bottom = false,
}: {
  doc: Doc
  config: EditorConfig
  headings: number
  outlineOpen: boolean
  onOutline: () => void
  mode: 'source' | 'preview'
  split: boolean
  onMode: (mode: 'source' | 'preview') => void
  onWrap: (marker: string) => void
  onSave: () => void
  clock: ClockAdapter
  bottom?: boolean
}) {
  return (
    <div
      data-golem-toolbar={bottom ? 'bottom' : 'top'}
      className={`flex shrink-0 flex-wrap items-center gap-2 bg-white px-3 py-2 ${
        bottom ? 'border-t border-neutral-200' : 'border-b border-neutral-200'
      }`}
    >
      {!config.readOnly && (
        <>
          <button type="button" onClick={() => onWrap('**')} aria-label="Bold" className={button}>
            <span className="font-bold">B</span>
          </button>
          <button type="button" onClick={() => onWrap('*')} aria-label="Italic" className={button}>
            <span className="italic">I</span>
          </button>
        </>
      )}

      {config.outline && headings > 0 && (
        <button type="button" onClick={onOutline} aria-expanded={outlineOpen} className={button}>
          Outline
        </button>
      )}

      {config.preview !== 'off' && !split && (
        <button
          type="button"
          onClick={() => onMode(mode === 'source' ? 'preview' : 'source')}
          className={button}
        >
          {mode === 'source' ? 'Preview' : 'Source'}
        </button>
      )}

      <Status doc={doc} config={config} clock={clock} />

      {!config.readOnly && (
        <button
          type="button"
          onClick={onSave}
          disabled={doc.status !== 'dirty'}
          className="ml-auto rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Save
        </button>
      )}
    </div>
  )
}

function Status({ doc, config, clock }: { doc: Doc; config: EditorConfig; clock: ClockAdapter }) {
  const time = (at: Date) =>
    new Intl.DateTimeFormat(config.locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: clock.timeZone(),
    }).format(at)

  const line =
    doc.status === 'loading'
      ? 'Loading…'
      : doc.status === 'error'
        ? (doc.error ?? 'Something went wrong.')
        : doc.status === 'conflict'
          ? 'The agent changed lines you were editing.'
          : doc.status === 'saving'
            ? 'Saving…'
            : doc.status === 'dirty'
              ? 'Unsaved changes'
              : doc.savedAt
                ? `Saved ${time(doc.savedAt)}`
                : 'Saved'

  return (
    <p
      data-golem-status={doc.status}
      role={doc.status === 'error' ? 'alert' : undefined}
      className={`min-w-0 truncate text-xs ${
        doc.status === 'error' || doc.status === 'conflict' ? 'text-red-800' : 'text-neutral-500'
      }`}
    >
      {line}
    </p>
  )
}

function Outline({
  headings,
  onJump,
  wide,
}: {
  headings: { line: number; level: number; text: string }[]
  onJump: (heading: { line: number; text: string }) => void
  wide: boolean
}) {
  return (
    <nav
      data-golem-outline=""
      aria-label="Outline"
      className={`shrink-0 overflow-auto border-neutral-200 bg-neutral-50 p-2 ${
        wide ? 'w-56 border-r' : 'max-h-48 border-b'
      }`}
    >
      <ul className="space-y-0.5 text-sm">
        {headings.map((heading) => (
          <li key={`${heading.line}-${heading.text}`}>
            <button
              type="button"
              onClick={() => onJump(heading)}
              style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
              className="block w-full truncate rounded py-1 pr-2 text-left hover:bg-neutral-200"
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * The lines the two writers disagree on, side by side, with the untouched document around them for
 * context. Nothing is applied until every one of them has been chosen: a half-resolved document is
 * one neither writer wrote.
 */
function Conflict({
  chunks,
  choices,
  onChoose,
}: {
  chunks: Merge3Chunk[]
  choices: ('mine' | 'theirs' | null)[]
  onChoose: (index: number, side: 'mine' | 'theirs') => void
}) {
  return (
    <div data-golem-pane="conflict" className="min-h-0 flex-1 overflow-auto p-3">
      <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        The agent rewrote lines you were editing. Choose which version stays; the rest of the
        document is already merged.
      </p>
      <div className="space-y-2 font-mono text-[13px] leading-6">
        {chunks.map((chunk, index) =>
          chunk.kind === 'clean' ? (
            <pre key={index} className="overflow-x-auto whitespace-pre-wrap text-neutral-500">
              {chunk.lines.join('\n')}
            </pre>
          ) : (
            <div
              key={index}
              data-golem-conflict=""
              data-chosen={choices[index] ?? undefined}
              className="overflow-hidden rounded-lg border-2 border-amber-400"
            >
              <Side
                label="Yours"
                lines={chunk.mine}
                chosen={choices[index] === 'mine'}
                action="Keep mine"
                onChoose={() => onChoose(index, 'mine')}
              />
              <Side
                label="The agent’s"
                lines={chunk.theirs}
                chosen={choices[index] === 'theirs'}
                action="Take theirs"
                onChoose={() => onChoose(index, 'theirs')}
              />
            </div>
          ),
        )}
      </div>
    </div>
  )
}

function Side({
  label,
  lines,
  chosen,
  action,
  onChoose,
}: {
  label: string
  lines: string[]
  chosen: boolean
  action: string
  onChoose: () => void
}): ReactNode {
  return (
    <div className={`border-b border-amber-200 p-2 last:border-0 ${chosen ? 'bg-emerald-50' : ''}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-sans text-xs font-semibold text-neutral-500">{label}</span>
        <button
          type="button"
          onClick={onChoose}
          className="shrink-0 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 font-sans text-xs font-medium"
        >
          {action}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap">{lines.join('\n') || '(nothing)'}</pre>
    </div>
  )
}

export const Editor = defineComponent<typeof editorConfigSchema, EditorAdapters, EditorSlots>({
  name: 'Editor',
  schema: editorConfigSchema,
  render: EditorBody,
})
