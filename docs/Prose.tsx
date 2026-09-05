import type { AdapterRow, DocBlock, DocTable, SlotRow } from '../src/abi'
import { Markdown } from '../src/lib/markdown'

/**
 * The renderers both component pages share: the Storybook `.mdx` and the showcase's phone-first
 * `#/api` page. Every one of them takes its content out of `<X>.docs.ts`, so a sentence deleted
 * there disappears from both.
 */

/**
 * A run of markdown prose. Source line wraps are wraps, not line breaks, and the spacing is set
 * through child selectors so it outranks the tighter margins `Markdown` wears in a chat bubble.
 */
export function Prose({ text }: { text: string }) {
  return (
    <div className="leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&>ol]:my-3 [&>p]:my-3 [&>pre]:my-3 [&>ul]:my-3">
      <Markdown text={text} hardWraps={false} />
    </div>
  )
}

/** Prose and the tables it refers to, in the order `<X>.docs.ts` puts them. */
export function DocBlocks({ blocks }: { blocks: DocBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, index) =>
        typeof block === 'string' ? (
          <Prose key={index} text={block} />
        ) : (
          <SimpleTable key={index} table={block.table} />
        ),
      )}
    </div>
  )
}

/**
 * Wide content scrolls inside its own strip rather than making the page scroll sideways, which is
 * the showcase's rule for a phone and costs the Storybook page nothing.
 */
export function SimpleTable({ table }: { table: DocTable }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-300">
            {table.headings.map((heading) => (
              <th key={heading} className="py-2 pr-4 font-semibold">
                <Markdown text={heading} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={index} className="border-b border-neutral-200 align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-2 pr-4">
                  <Markdown text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** One row per adapter interface the component takes. Absent from here is never touched. */
export function AdapterTable({ rows }: { rows: AdapterRow[] }) {
  return (
    <SimpleTable
      table={{
        headings: ['Adapter', 'What it calls', 'Why'],
        rows: rows.map((row) => [`\`${row.adapter}\``, row.calls, row.why]),
      }}
    />
  )
}

export function SlotTable({ rows }: { rows: SlotRow[] }) {
  return (
    <SimpleTable
      table={{
        headings: ['Slot', 'What goes in it'],
        rows: rows.map((row) => [`\`${row.slot}\``, row.what]),
      }}
    />
  )
}

/** The one complete example, as the characters an agent copies. */
export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs leading-relaxed text-neutral-100">
      <code>{code}</code>
    </pre>
  )
}
