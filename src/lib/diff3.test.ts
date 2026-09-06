import { describe, expect, it } from 'vitest'
import { merge3, mergedText, type Merge3Chunk } from './diff3'

const text = (lines: string[]) => lines.join('\n')

/** The merged document when nothing has to be chosen, which is the only case with one answer. */
const clean = (base: string, mine: string, theirs: string) => {
  const merged = merge3(base, mine, theirs)
  expect(merged.conflicted).toBe(false)
  return mergedText(merged.chunks).text
}

describe('merge3', () => {
  it('takes both sides when they changed different parts of the document', () => {
    const base = text(['# Shop', '', 'a', 'b', 'c', '', 'end'])
    const mine = text(['# Shop', '', 'a', 'b MINE', 'c', '', 'end'])
    const theirs = text(['# Shop', '', 'a', 'b', 'c', '', 'end THEIRS'])

    expect(clean(base, mine, theirs)).toBe(
      text(['# Shop', '', 'a', 'b MINE', 'c', '', 'end THEIRS']),
    )
  })

  it('marks the lines the other side wrote, and only those', () => {
    const base = text(['one', 'two', 'three'])
    const mine = text(['one MINE', 'two', 'three'])
    const theirs = text(['one', 'two', 'three THEIRS'])

    const { text: merged, theirLines } = mergedText(merge3(base, mine, theirs).chunks)
    expect(merged).toBe(text(['one MINE', 'two', 'three THEIRS']))
    expect(theirLines).toEqual([{ start: 2, end: 3 }])
  })

  it('takes an insertion from one side without disturbing the other', () => {
    const base = text(['a', 'b'])
    const mine = text(['a', 'b', 'mine tail'])
    const theirs = text(['theirs head', 'a', 'b'])

    expect(clean(base, mine, theirs)).toBe(text(['theirs head', 'a', 'b', 'mine tail']))
  })

  it('is clean when both sides made the same edit', () => {
    const base = text(['a', 'b', 'c'])
    const both = text(['a', 'b changed', 'c'])

    const merged = merge3(base, both, both)
    expect(merged.conflicted).toBe(false)
    expect(mergedText(merged.chunks).text).toBe(both)
    expect(mergedText(merged.chunks).theirLines).toEqual([])
  })

  it('is clean when neither side changed anything', () => {
    const same = text(['a', 'b'])
    expect(clean(same, same, same)).toBe(same)
  })

  it('conflicts when both sides rewrote the same line, keeping both versions', () => {
    const base = text(['title', 'rule one', 'tail'])
    const mine = text(['title', 'rule one, amended by hand', 'tail'])
    const theirs = text(['title', 'rule one, rewritten by the agent', 'tail'])

    const merged = merge3(base, mine, theirs)
    expect(merged.conflicted).toBe(true)

    const conflict = merged.chunks.find((chunk) => chunk.kind === 'conflict')
    expect(conflict).toEqual({
      kind: 'conflict',
      mine: ['rule one, amended by hand'],
      theirs: ['rule one, rewritten by the agent'],
    })
  })

  it('resolves a conflict either way, and marks the lines only when theirs is taken', () => {
    const base = text(['a', 'x', 'b'])
    const mine = text(['a', 'mine', 'b'])
    const theirs = text(['a', 'theirs', 'b'])
    const { chunks } = merge3(base, mine, theirs)

    expect(mergedText(chunks, () => 'mine')).toEqual({
      text: text(['a', 'mine', 'b']),
      theirLines: [],
    })
    expect(mergedText(chunks, () => 'theirs')).toEqual({
      text: text(['a', 'theirs', 'b']),
      theirLines: [{ start: 1, end: 2 }],
    })
  })

  it('conflicts once per place the two disagree, not once per document', () => {
    const base = text(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    const mine = text(['a MINE', 'b', 'c', 'd', 'e', 'f', 'g MINE'])
    const theirs = text(['a THEIRS', 'b', 'c', 'd', 'e', 'f', 'g THEIRS'])

    const merged = merge3(base, mine, theirs)
    expect(merged.chunks.filter((chunk) => chunk.kind === 'conflict')).toHaveLength(2)
  })

  it('keeps a deletion from one side', () => {
    const base = text(['a', 'b', 'c', 'd'])
    const mine = text(['a', 'c', 'd'])
    const theirs = text(['a', 'b', 'c', 'd CHANGED'])

    expect(clean(base, mine, theirs)).toBe(text(['a', 'c', 'd CHANGED']))
  })

  it('keeps both insertions when each side wrote into an empty document', () => {
    const merged = merge3('', 'mine', 'theirs')
    expect(merged.conflicted).toBe(false)
    expect(merged.chunks).toEqual<Merge3Chunk[]>([
      { kind: 'clean', lines: ['mine'], from: 'mine' },
      { kind: 'clean', lines: ['theirs'], from: 'theirs' },
    ])
  })

  it('keeps both when the two wrote adjacent lines rather than the same one', () => {
    const base = text(['a', 'b', 'c'])
    const mine = text(['a', 'b MINE', 'c'])
    const theirs = text(['a', 'b', 'c THEIRS'])

    expect(clean(base, mine, theirs)).toBe(text(['a', 'b MINE', 'c THEIRS']))
  })

  it('takes the incoming document whole when the local draft never moved', () => {
    const base = text(['a', 'b'])
    const theirs = text(['a', 'b', 'c'])
    const { text: merged, theirLines } = mergedText(merge3(base, base, theirs).chunks)

    expect(merged).toBe(theirs)
    expect(theirLines).toEqual([{ start: 2, end: 3 }])
  })
})
