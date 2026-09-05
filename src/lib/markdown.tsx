import { Fragment, type ReactNode } from 'react'

/**
 * The subset of markdown this kit writes: headings, fenced code, pipe tables, bullet and numbered
 * lists, and inline code / bold / italic / links. Everything else falls through as text. Three
 * readers share it — a chat bubble an agent is streaming into, the prose of a component's docs
 * page, and the body of a Report.
 *
 * It builds React nodes rather than an HTML string, so a message that arrives mid-stream with a
 * half-written `**` or an unclosed fence renders as the plain characters it currently is, and no
 * message can inject markup.
 */

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\))/g

function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((piece, index) => {
    const key = `${keyPrefix}-${index}`
    if (piece.startsWith('`') && piece.endsWith('`') && piece.length > 1) {
      return (
        <code key={key} className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.9em]">
          {piece.slice(1, -1)}
        </code>
      )
    }
    // Bold and italic recurse, so `**a `b`**` is bold text with code inside rather than backticks
    // on the screen. The inner text can hold no further `*`, so the recursion is one level deep.
    if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 3) {
      return <strong key={key}>{inline(piece.slice(2, -2), key)}</strong>
    }
    if (piece.startsWith('*') && piece.endsWith('*') && piece.length > 2) {
      return <em key={key}>{inline(piece.slice(1, -1), key)}</em>
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(piece)
    if (link) {
      // Agent-authored URLs are untrusted; only http(s) becomes a link, anything else stays text.
      const href = link[2]!
      if (!/^https?:\/\//i.test(href)) return <Fragment key={key}>{piece}</Fragment>
      return (
        <a key={key} href={href} target="_blank" rel="noreferrer noopener" className="underline">
          {link[1]}
        </a>
      )
    }
    return <Fragment key={key}>{piece}</Fragment>
  })
}

type Block =
  | { kind: 'code'; lines: string[] }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'table'; headings: string[]; rows: string[][] }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'para'; lines: string[] }

/**
 * A heading's slug, so something outside this file can find it — a report's contents list scrolls
 * to `[data-golem-heading="closed-today"]`. It is a data attribute rather than an `id` because two
 * documents on one page would otherwise mint the same id twice.
 */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** `| a | b |` split into its cells, with the outer pipes dropped. */
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim())

/** The `|---|:--:|` line under a table's headings. It is what tells a table from a line of prose. */
const isTableRule = (line: string | undefined) =>
  line !== undefined && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)

function blocksOf(text: string): Block[] {
  const blocks: Block[] = []
  let fence: Block | null = null
  // A blank line ends whatever block was open, which is what tells a wrapped bullet from the
  // paragraph after the list.
  let blank = false

  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    if (line.trimStart().startsWith('```')) {
      if (fence) fence = null
      else {
        fence = { kind: 'code', lines: [] }
        blocks.push(fence)
      }
      blank = false
      continue
    }
    if (fence) {
      fence.lines.push(line)
      continue
    }

    if (!line.trim()) {
      blank = true
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1]!.length, text: heading[2]!.trim() })
      blank = true
      continue
    }

    // A row of cells is only a table when the next line is the rule; without it, a sentence with a
    // pipe in it is still a sentence.
    if (line.includes('|') && isTableRule(lines[index + 1])) {
      const table: Block = { kind: 'table', headings: cells(line), rows: [] }
      index += 1
      while (index + 1 < lines.length && lines[index + 1]!.includes('|')) {
        index += 1
        table.rows.push(cells(lines[index]!))
      }
      blocks.push(table)
      blank = true
      continue
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    const last = blocks[blocks.length - 1]

    if (bullet ?? numbered) {
      const ordered = !bullet
      const item = (bullet ?? numbered)![1]!
      if (!blank && last?.kind === 'list' && last.ordered === ordered) last.items.push(item)
      else blocks.push({ kind: 'list', ordered, items: [item] })
      blank = false
      continue
    }
    // An indented line under a bullet is that bullet wrapping, not a paragraph of its own.
    if (!blank && last?.kind === 'list') {
      const open = last.items.length - 1
      last.items[open] = `${last.items[open]} ${line.trim()}`
      continue
    }
    if (!blank && last?.kind === 'para') last.lines.push(line)
    else blocks.push({ kind: 'para', lines: [line] })
    blank = false
  }

  return blocks
}

/** Sized in `em`, so one container font-size sets the whole scale — a bubble's or a report's. */
const HEADING_SIZES = [
  'text-[1.5em]',
  'text-[1.3em]',
  'text-[1.15em]',
  'text-[1.05em]',
  'text-[1em]',
  'text-[1em]',
]

/**
 * `hardWraps` is the difference between the readers. A chat bubble keeps a single newline the
 * person typed; a docs paragraph wrapped at the source's column width must not show those wraps.
 */
export function Markdown({ text, hardWraps = true }: { text: string; hardWraps?: boolean }) {
  return (
    <>
      {blocksOf(text).map((block, index) => {
        if (block.kind === 'code') {
          return (
            <pre
              key={index}
              className="my-1 overflow-x-auto rounded-md bg-neutral-900 p-2 font-mono text-xs text-neutral-100"
            >
              <code>{block.lines.join('\n')}</code>
            </pre>
          )
        }
        if (block.kind === 'heading') {
          const Tag = `h${block.level}` as 'h1'
          return (
            <Tag
              key={index}
              data-golem-heading={headingSlug(block.text)}
              className={`mt-4 mb-1 font-semibold first:mt-0 ${HEADING_SIZES[block.level - 1]} break-after-avoid`}
            >
              {inline(block.text, String(index))}
            </Tag>
          )
        }
        if (block.kind === 'table') {
          return (
            // Its own strip, so a wide table never makes the page or the printed sheet scroll.
            <div key={index} className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-left text-[0.95em]">
                <thead>
                  <tr className="border-b border-neutral-300">
                    {block.headings.map((cell, cellIndex) => (
                      <th key={cellIndex} className="py-1.5 pr-4 font-semibold">
                        {inline(cell, `${index}-h-${cellIndex}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-neutral-200 align-top last:border-0"
                    >
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="py-1.5 pr-4">
                          {inline(cell, `${index}-${rowIndex}-${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        if (block.kind === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List
              key={index}
              className={`my-1 ml-4 space-y-0.5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}
            >
              {block.items.map((item, i) => (
                <li key={i}>{inline(item, `${index}-${i}`)}</li>
              ))}
            </List>
          )
        }
        return (
          <p
            key={index}
            className={`my-1 first:mt-0 last:mb-0 ${hardWraps ? 'whitespace-pre-wrap' : ''}`}
          >
            {inline(block.lines.join(hardWraps ? '\n' : ' '), String(index))}
          </p>
        )
      })}
    </>
  )
}
