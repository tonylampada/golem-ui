import type { Unsubscribe } from './common'

/**
 * A brain is an Open Knowledge Format bundle (v0.2): a directory tree of markdown concept documents
 * with YAML front matter, an optional `index.md` in any directory, and an optional `log.md` at the
 * root. Paths are relative to the bundle root, `/`-separated, no leading slash.
 *
 * A **source location** is `path#L<start>-L<end>`, 1-based and inclusive: what the agent cites,
 * and what `Brain`'s `openLocation` opens.
 */
export interface BrainEntry {
  path: string
  kind: 'file' | 'dir'
}

export interface BrainHit {
  path: string
  /** 1-based line the match is on. */
  line: number
  excerpt: string
}

export interface BrainAdapter {
  /** That directory's `index.md`, synthesized from the front matter of its concepts when absent. */
  index(dir?: string): Promise<string>
  /** The direct children of a directory, files and directories alike. Root when `dir` is omitted. */
  list(dir?: string): Promise<BrainEntry[]>
  read(path: string): Promise<string>
  search(query: string): Promise<BrainHit[]>
  /** Fires on any change to any file in the bundle. */
  subscribe(listener: () => void): Unsubscribe
  /** Replaces a file's text. Optional: a brain the app keeps read-only omits it. */
  write?(path: string, text: string): Promise<void>
}

/** `path#L3-L5` → `{ path, start: 3, end: 5 }`. A location with no range opens the file at the top. */
export function parseLocation(location: string): { path: string; start?: number; end?: number } {
  const match = /^([^#]+)(?:#L(\d+)(?:-L(\d+))?)?$/.exec(location)
  if (!match) return { path: location }
  const start = match[2] ? Number(match[2]) : undefined
  return { path: match[1]!, start, end: match[3] ? Number(match[3]) : start }
}
