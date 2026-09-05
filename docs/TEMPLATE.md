# <ComponentName>

> Copy this file to `src/components/<ComponentName>/<ComponentName>.mdx` and fill every section.
> The order is fixed and the sections are not optional: the agent reads this page and nothing else,
> so a fact that is missing here does not exist.

## What it is for

Two or three sentences. What screen problem it solves, and — as importantly — when to reach for a
different component instead.

## The configuration object

Generated from the Zod schema with `<ConfigTable schema={...} />`, never written by hand. If a field
needs prose, put the prose in `.describe()` on the schema so the table carries it.

## The adapters it needs

One row per adapter interface the component takes, saying what it calls and why. Interfaces the
component does not take do not appear.

## One complete example

A `<Canvas of={...} />` of a story from `<ComponentName>.examples.tsx`, plus the config object as
copy-pasteable code. The example file is the single source: it feeds the story and the test, so an
example that stops working fails the build.

## Failure modes

What a wrong config produces (the error card, and which field it names), what an adapter that throws
or resolves empty produces, and any layout limit worth knowing. End with the invalid-config story so
the agent can see the error card.
