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

/**
 * The prose an adapter page is made of, as data — the same arrangement `ComponentDocs` has, and
 * for the same reason: the Storybook `Adapters/<Name>` page and the showcase's phone-first
 * `#/adapters/<name>` page both render this one object, so a sentence exists once.
 *
 * An adapter has no Zod schema and no examples file, so nothing on its page is generated from
 * code except `consumers`, which a test holds to what `componentDocs` actually says.
 */
export interface AdapterDocs {
  /** The interface, as `src/adapters/` names it: `Records`, `Files`. */
  name: string
  /** The file's basename in `src/adapters/`, and the path segment under `#/adapters/`. */
  slug: string
  /** Storybook's docs id for the page, e.g. `adapters-records`. */
  storybookPath: string
  /** One line, for a catalogue: what this adapter is, with no second sentence. */
  tagline: string
  /** What the app is being asked for, and where the line between it and the component falls. */
  purpose: string
  /** Every method on the interface, in the order the interface declares them. */
  methods: AdapterMethod[]
  /** Guarantees that span methods — error types, ordering, what a listener is promised. Markdown. */
  notes?: string
  /** The in-memory fake, and how a story or a test reaches for it. */
  fake: AdapterFake
  /**
   * Every component that takes this adapter, by name. Read off each component's own adapter list
   * rather than written here twice; a test fails when the two disagree.
   */
  consumers: string[]
}

export interface AdapterMethod {
  /** The method as the interface declares it, parameter and return types included. */
  signature: string
  /** What an implementation has to be true to. Markdown. */
  guarantees: string
  /** What it rejects with, and when. Markdown. Absent on a method that cannot be refused. */
  throws?: string
}

export interface AdapterFake {
  /** The exported factory: `fakeRecords`. */
  name: string
  /** What it does that a real store does, and where it stops short. Markdown. */
  what: string
  /** Building it and handing it to a component, as copy-pasteable TSX. */
  example: string
}
