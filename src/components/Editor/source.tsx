import { Fragment, type ReactNode } from 'react'

/**
 * Markdown source styled where it stands: the characters the person typed, still all there, wearing
 * the weight and colour of what they mean. It is not a preview and it is not a WYSIWYG surface —
 * `##` stays `##`, and deleting one is how a heading stops being a heading.
 *
 * It is drawn under a transparent textarea, so **every span has to keep the monospace advance
 * width**: weight, colour and background only. A larger heading or an italic run would slide the
 * text out from under the caret.
 */

export type LineKind = 'heading' | 'code' | 'list' | 'quote' | 'plain'

export interface SourceLine {
  text: string
  kind: LineKind
}

/** A fence opens and closes across lines, so a line's kind is only knowable in document order. */
export function scanSource(lines: string[]): SourceLine[] {
  let fenced = false
  return lines.map((text) => {
    if (text.trimStart().startsWith('```')) {
      fenced = !fenced
      return { text, kind: 'code' as const }
    }
    if (fenced) return { text, kind: 'code' as const }
    if (/^#{1,6}\s/.test(text)) return { text, kind: 'heading' as const }
    if (/^\s*([-*+]|\d+[.)])\s/.test(text)) return { text, kind: 'list' as const }
    if (/^\s*>/.test(text)) return { text, kind: 'quote' as const }
    return { text, kind: 'plain' as const }
  })
}

/** Every heading in the document, in order, for the outline. */
export function headingsOf(lines: string[]): { line: number; level: number; text: string }[] {
  return scanSource(lines).flatMap((line, index) => {
    if (line.kind !== 'heading') return []
    const match = /^(#{1,6})\s+(.*)$/.exec(line.text)
    if (!match || match[2]!.trim() === '') return []
    return [{ line: index, level: match[1]!.length, text: match[2]!.trim() }]
  })
}

const LINE_CLASS: Record<LineKind, string> = {
  heading: 'font-semibold text-neutral-900',
  code: 'bg-neutral-100 text-neutral-600',
  list: 'text-neutral-800',
  quote: 'text-neutral-500',
  plain: 'text-neutral-800',
}

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]\n]+\]\([^)\s]+\))/g

function inline(text: string, key: string): ReactNode[] {
  return text.split(INLINE).map((piece, index) => {
    const id = `${key}-${index}`
    if (piece.startsWith('`') && piece.endsWith('`') && piece.length > 1) {
      return (
        <span key={id} className="rounded bg-neutral-200/70 text-rose-700">
          {piece}
        </span>
      )
    }
    if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 3) {
      return (
        <span key={id} className="font-semibold">
          {piece}
        </span>
      )
    }
    if (piece.startsWith('[')) {
      return (
        <span key={id} className="text-sky-700">
          {piece}
        </span>
      )
    }
    return <Fragment key={id}>{piece}</Fragment>
  })
}

/** The marker a line opens with — `##`, `-`, `1.`, `>` — coloured apart from what follows it. */
const MARKER = /^(\s*)(#{1,6}|[-*+]|\d+[.)]|>)(\s+)(.*)$/

export function SourceRow({ line, index }: { line: SourceLine; index: number }) {
  if (line.kind === 'code') return <>{line.text}</>

  const marked = MARKER.exec(line.text)
  if (!marked || (line.kind !== 'heading' && line.kind !== 'list' && line.kind !== 'quote')) {
    return <>{inline(line.text, String(index))}</>
  }

  return (
    <>
      {marked[1]}
      <span className="text-sky-600">{marked[2]}</span>
      {marked[3]}
      {inline(marked[4]!, String(index))}
    </>
  )
}

export { LINE_CLASS }
