import { Fragment, type ReactNode } from 'react'

/**
 * The subset of markdown an agent actually writes into a chat bubble: fenced code, bullet and
 * numbered lists, and inline code / bold / italic / links. Everything else falls through as text.
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
    if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 3) {
      return <strong key={key}>{piece.slice(2, -2)}</strong>
    }
    if (piece.startsWith('*') && piece.endsWith('*') && piece.length > 2) {
      return <em key={key}>{piece.slice(1, -1)}</em>
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

  for (const line of text.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      if (fence) fence = null
      else {
        fence = { kind: 'code', lines: [] }
        blocks.push(fence)
      }
      continue
    }
    if (fence) {
      fence.lines.push(line)
      continue
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    const last = blocks[blocks.length - 1]

    if (bullet ?? numbered) {
      const ordered = !bullet
      const item = (bullet ?? numbered)![1]!
      if (last?.kind === 'list' && last.ordered === ordered) last.items.push(item)
      else blocks.push({ kind: 'list', ordered, items: [item] })
      continue
    }
    if (!line.trim()) continue
    if (last?.kind === 'para') last.lines.push(line)
    else blocks.push({ kind: 'para', lines: [line] })
  }

  return blocks
}

export function Markdown({ text }: { text: string }) {
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
          <p key={index} className="my-1 first:mt-0 last:mb-0 whitespace-pre-wrap">
            {inline(block.lines.join('\n'), String(index))}
          </p>
        )
      })}
    </>
  )
}
