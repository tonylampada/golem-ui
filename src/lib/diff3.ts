/**
 * A three-way merge over lines, which is what lets a person and an agent write the same document at
 * the same time without either one flattening the other. `base` is the version both started from,
 * `mine` is the local draft, `theirs` is what arrived; the result is the chunks a merged document is
 * made of, each one saying where its lines came from.
 *
 * Lines, not characters: a merge that resolves inside a sentence produces text neither writer wrote.
 * A whole line is the smallest unit a person can look at and say "that one, not that one".
 */

export type Merge3Chunk =
  | {
      kind: 'clean'
      lines: string[]
      /** `both` is untouched, `mine` is the local edit, `theirs` is what the agent just wrote. */
      from: 'both' | 'mine' | 'theirs'
    }
  | { kind: 'conflict'; mine: string[]; theirs: string[] }

export interface Merge3 {
  chunks: Merge3Chunk[]
  /** True when at least one chunk is a conflict, so the reader has to choose. */
  conflicted: boolean
}

/** One side's edit against the base, as half-open ranges. */
interface Edit {
  side: 'mine' | 'theirs'
  baseStart: number
  baseEnd: number
  sideStart: number
  sideEnd: number
}

/**
 * Above this many lines the quadratic table below would cost more than the merge is worth, so the
 * whole document counts as one edit: the reader still gets a choice, just a coarse one.
 */
const MAX_LINES = 4000

const splitLines = (text: string): string[] => (text === '' ? [] : text.split('\n'))

const same = (a: string[], b: string[]) =>
  a.length === b.length && a.every((one, i) => one === b[i])

/**
 * Matched line pairs between two sequences, longest-common-subsequence order. The table is
 * `(a.length + 1) × (b.length + 1)` numbers, which is why `MAX_LINES` exists.
 */
function matchedPairs(a: string[], b: string[]): [number, number][] {
  const rows = a.length
  const cols = b.length
  const table: number[][] = Array.from({ length: rows + 1 }, () =>
    new Array<number>(cols + 1).fill(0),
  )

  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      table[i]![j] =
        a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!)
    }
  }

  const pairs: [number, number][] = []
  let i = 0
  let j = 0
  while (i < rows && j < cols) {
    if (a[i] === b[j]) {
      pairs.push([i, j])
      i++
      j++
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) i++
    else j++
  }
  return pairs
}

/** The runs where `side` differs from `base`, derived from the lines the two still share. */
function editsOf(base: string[], side: string[], which: 'mine' | 'theirs'): Edit[] {
  const pairs = matchedPairs(base, side)
  const edits: Edit[] = []
  let baseAt = 0
  let sideAt = 0

  const close = (baseEnd: number, sideEnd: number) => {
    if (baseEnd > baseAt || sideEnd > sideAt) {
      edits.push({ side: which, baseStart: baseAt, baseEnd, sideStart: sideAt, sideEnd })
    }
  }

  for (const [baseIndex, sideIndex] of pairs) {
    close(baseIndex, sideIndex)
    baseAt = baseIndex + 1
    sideAt = sideIndex + 1
  }
  close(base.length, side.length)
  return edits
}

export function merge3(baseText: string, mineText: string, theirsText: string): Merge3 {
  const base = splitLines(baseText)
  const mine = splitLines(mineText)
  const theirs = splitLines(theirsText)

  if (same(mine, theirs)) {
    return { chunks: [{ kind: 'clean', lines: mine, from: 'both' }], conflicted: false }
  }
  if (Math.max(base.length, mine.length, theirs.length) > MAX_LINES) {
    return { chunks: [{ kind: 'conflict', mine, theirs }], conflicted: true }
  }

  // Both sides' edits on one timeline, ordered by where they land in the base. Two edits that
  // overlap in the base are one decision, so they are grouped before either is applied.
  const edits = [...editsOf(base, mine, 'mine'), ...editsOf(base, theirs, 'theirs')].sort(
    (a, b) => a.baseStart - b.baseStart || a.baseEnd - b.baseEnd,
  )

  const chunks: Merge3Chunk[] = []
  let conflicted = false
  let baseAt = 0
  let mineAt = 0
  let theirsAt = 0
  let at = 0

  const keepUntouched = (until: number) => {
    if (until > baseAt)
      chunks.push({ kind: 'clean', lines: base.slice(baseAt, until), from: 'both' })
    mineAt += until - baseAt
    theirsAt += until - baseAt
    baseAt = until
  }

  while (at < edits.length) {
    const group = [edits[at]!]
    let baseEnd = group[0]!.baseEnd
    at++
    // Only a real overlap makes one decision out of two edits. Edits that merely touch — the agent
    // rewriting the line above the one being typed on — stay two, and both are kept.
    while (at < edits.length && edits[at]!.baseStart < baseEnd) {
      baseEnd = Math.max(baseEnd, edits[at]!.baseEnd)
      group.push(edits[at]!)
      at++
    }
    const baseStart = group[0]!.baseStart

    keepUntouched(baseStart)

    // Each side's span for this region. Every base line before the group's first edit is unchanged
    // on both sides, so the running cursor is already that side's start; only the end has to be
    // carried out from the last edit.
    const sides = {
      mine: group.filter((edit) => edit.side === 'mine'),
      theirs: group.filter((edit) => edit.side === 'theirs'),
    }
    const sliceOf = (which: 'mine' | 'theirs', lines: string[], cursor: number) => {
      const own = sides[which]
      const last = own[own.length - 1]
      const end =
        last === undefined
          ? cursor + (baseEnd - baseStart)
          : last.sideEnd + (baseEnd - last.baseEnd)
      return lines.slice(cursor, Math.max(cursor, end))
    }

    const mineLines = sliceOf('mine', mine, mineAt)
    const theirsLines = sliceOf('theirs', theirs, theirsAt)

    if (sides.theirs.length === 0) chunks.push({ kind: 'clean', lines: mineLines, from: 'mine' })
    else if (sides.mine.length === 0)
      chunks.push({ kind: 'clean', lines: theirsLines, from: 'theirs' })
    else if (same(mineLines, theirsLines))
      chunks.push({ kind: 'clean', lines: mineLines, from: 'both' })
    else {
      chunks.push({ kind: 'conflict', mine: mineLines, theirs: theirsLines })
      conflicted = true
    }

    mineAt += mineLines.length
    theirsAt += theirsLines.length
    baseAt = baseEnd
  }

  keepUntouched(base.length)

  return {
    chunks: chunks.filter((chunk) => chunk.kind === 'conflict' || chunk.lines.length > 0),
    conflicted,
  }
}

/**
 * The merged document as text, plus the line ranges the other side wrote — what the editor paints a
 * gutter down so the person can see what the agent just changed. `choose` settles any conflict; a
 * merge with none never calls it.
 */
export function mergedText(
  chunks: Merge3Chunk[],
  choose: (chunk: { mine: string[]; theirs: string[] }, index: number) => 'mine' | 'theirs' = () =>
    'mine',
): { text: string; theirLines: { start: number; end: number }[] } {
  const lines: string[] = []
  const theirLines: { start: number; end: number }[] = []

  chunks.forEach((chunk, index) => {
    const taken =
      chunk.kind === 'clean'
        ? chunk.lines
        : choose(chunk, index) === 'mine'
          ? chunk.mine
          : chunk.theirs
    const fromThem =
      chunk.kind === 'clean' ? chunk.from === 'theirs' : choose(chunk, index) === 'theirs'
    if (fromThem && taken.length > 0)
      theirLines.push({ start: lines.length, end: lines.length + taken.length })
    lines.push(...taken)
  })

  return { text: lines.join('\n'), theirLines }
}
