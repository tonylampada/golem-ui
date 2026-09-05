import { Fragment, type ReactNode } from 'react'

/**
 * The subset of markdown this kit writes: fenced code, bullet and numbered lists, and inline code /
 * bold / italic / links. Everything else falls through as text. Two readers share it — a chat
 * bubble an agent is streaming into, and the prose of a component's docs page.
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
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'para'; lines: string[] }

function blocksOf(text: string): Block[] {
  const blocks: Block[] = []
  let fence: Block | null = null
  // A blank line ends whatever block was open, which is what tells a wrapped bullet from the
  // paragraph after the list.
  let blank = false

  for (const line of text.split('\n')) {
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

/**
 * `hardWraps` is the difference between the two readers. A chat bubble keeps a single newline the
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
