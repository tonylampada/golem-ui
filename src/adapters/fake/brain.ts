import type { BrainAdapter, BrainEntry, BrainHit } from '../brain'
import { createEmitter } from './emitter'

/** The `key: value` lines of a document's YAML front matter; enough for `type` and `description`. */
function frontMatter(text: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---/.exec(text)
  const fields: Record<string, string> = {}
  for (const line of match?.[1]?.split('\n') ?? []) {
    const pair = /^(\w+):\s*(.*)$/.exec(line)
    if (pair) fields[pair[1]!] = pair[2]!.replace(/^["']|["']$/g, '')
  }
  return fields
}

const RESERVED = new Set(['index.md', 'log.md'])
const dirOf = (dir?: string) => (dir ? dir.replace(/\/$/, '') + '/' : '')

/**
 * An in-memory bundle: `files` maps a path to its markdown. Real enough for the reader and the
 * search; `write` replaces a file and fires `subscribe`.
 */
export function fakeBrain(files: Record<string, string>): BrainAdapter {
  const store = { ...files }
  const emitter = createEmitter<void>()

  const list = async (dir?: string): Promise<BrainEntry[]> => {
    const prefix = dirOf(dir)
    const seen = new Map<string, BrainEntry>()
    for (const path of Object.keys(store)) {
      if (!path.startsWith(prefix)) continue
      const rest = path.slice(prefix.length)
      const slash = rest.indexOf('/')
      const entry: BrainEntry =
        slash < 0 ? { path, kind: 'file' } : { path: prefix + rest.slice(0, slash), kind: 'dir' }
      seen.set(entry.path, entry)
    }
    return [...seen.values()].sort((a, b) =>
      a.kind === b.kind ? a.path.localeCompare(b.path) : a.kind === 'dir' ? -1 : 1,
    )
  }

  return {
    list,
    async index(dir) {
      const own = store[`${dirOf(dir)}index.md`]
      if (own !== undefined) return own
      // The spec's fallback: one bullet per concept, from its front matter.
      const entries = await list(dir)
      const lines = entries
        .filter((entry) => !(entry.kind === 'file' && RESERVED.has(entry.path.split('/').pop()!)))
        .map((entry) => {
          const name = entry.path.slice(dirOf(dir).length)
          const description =
            entry.kind === 'file' ? frontMatter(store[entry.path]!).description : ''
          return `* [${name}](${name}${entry.kind === 'dir' ? '/' : ''})${description ? ` - ${description}` : ''}`
        })
      return `# ${dir ?? 'Index'}\n\n${lines.join('\n')}\n`
    },
    async read(path) {
      const text = store[path]
      if (text === undefined) throw new Error(`No file at ${path}.`)
      return text
    },
    async search(query) {
      const needle = query.trim().toLowerCase()
      if (!needle) return []
      const hits: BrainHit[] = []
      for (const [path, text] of Object.entries(store)) {
        text.split('\n').forEach((excerpt, index) => {
          if (excerpt.toLowerCase().includes(needle)) hits.push({ path, line: index + 1, excerpt })
        })
      }
      return hits
    },
    subscribe: emitter.subscribe,
    async write(path, text) {
      store[path] = text
      emitter.emit()
    },
  }
}
