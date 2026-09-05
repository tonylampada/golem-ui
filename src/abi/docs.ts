/**
 * The prose a component page is made of, as data. Both consumers read this one object — the
 * `.mdx` Storybook page and the showcase's phone-first `#/api` page — so a sentence exists once
 * and neither surface can drift from the other.
 *
 * The generated parts of a page are not here: the configuration table is read off the Zod schema
 * and the worked example is rendered from `<X>.examples.tsx`.
 */
export interface ComponentDocs {
  /** As the component is exported and imported: `Shell`, `RecordList`. */
  name: string
  /** The path segment under `#/api/`. */
  slug: string
  /** Storybook's docs id for the component, e.g. `components-shell`. */
  storybookPath: string
  /** One line, for a catalogue: what this component is, with no second sentence. */
  tagline: string
  /** What it is for, and when to reach for something else. Markdown. */
  purpose: string
  /** Anything the schema's own `.describe()` sentences cannot carry, in the order it reads. */
  configNotes?: DocBlock[]
  /** One row per adapter interface. An interface absent from here is one it never touches. */
  adapters: AdapterRow[]
  /** Rules about the adapters that are not per-method. Markdown. */
  adapterNotes?: string
  /** Only for a component that takes slots. */
  slots?: SlotRow[]
  /** The complete config object as copy-pasteable TSX. */
  example: string
  /** A markdown bullet list, each item opening with the bold name of the failure. */
  failureModes: string
}

/**
 * A run of prose, or a table the prose around it refers to — the field-type vocabulary, for one.
 * Markdown carries no tables, so a table is data and each surface draws it its own way.
 */
export type DocBlock = string | { table: DocTable }

export interface DocTable {
  headings: string[]
  /** One array per row, in heading order. Cells are inline markdown. */
  rows: string[][]
}

export interface AdapterRow {
  /** The adapter interface, as it is named in `src/adapters/`. */
  adapter: string
  /** The methods the component calls on it. */
  calls: string
  /** Why it calls them. */
  why: string
}

export interface SlotRow {
  slot: string
  what: string
}
