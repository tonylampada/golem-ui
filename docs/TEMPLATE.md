# <ComponentName>

> The five sections of a component page, in the fixed order. They are not optional: the agent reads
> this page and nothing else, so a fact that is missing here does not exist.
>
> The prose lives in `src/components/<ComponentName>/<ComponentName>.docs.ts`, and two files render
> it — `<ComponentName>.mdx` here and the showcase's `#/api/<component>` page. Write each section
> into the field named below; the `.mdx` is then imports and section headings.

## What it is for

`purpose`. Two or three sentences. What screen problem it solves, and — as importantly — when to
reach for a different component instead. `tagline` beside it is the one line the indexes show.

## The configuration object

Generated from the Zod schema with `<ConfigTable schema={...} />`, never written by hand. If a field
needs prose, put the prose in `.describe()` on the schema so the table carries it. Anything the
per-field sentences cannot carry goes in `configNotes`, which takes prose and tables in order.

## The adapters it needs

`adapters`, one row per adapter interface the component takes, saying which methods it calls and
why. The list is the whole list: an interface absent from it is one the component never touches.
Rules that are not per-method — how streaming works, what a refusal looks like — go in
`adapterNotes`.

## One complete example

`example`, the config object as copy-pasteable code, then a `<Canvas of={...} />` of the matching story from
`<ComponentName>.stories.tsx` — `of` takes a story, not the example behind it.
`<ComponentName>.examples.tsx` is the single source under both: it feeds the story and the test, so
an example that stops working fails the build.

## Failure modes

`failureModes`, a markdown bullet list opening each item with the bold name of the failure. What a
wrong config produces (the error card, and which field it names), what an adapter that throws
or resolves empty produces, and any layout limit worth knowing. End with the invalid-config story so
the agent can see the error card.
