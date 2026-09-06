import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adapterDocs, adapterDocsFor, componentDocs, componentsUsing } from '../docs'

/**
 * The seams that keep the adapter pages honest. An adapter is the interface between a Golem app and
 * the world, so an adapter nobody documented is a hole in the spec — and a consumer list written by
 * hand is one that goes stale the first time a component picks the adapter up.
 */

const HERE = import.meta.dirname

/** Every file in `src/adapters/` that declares an adapter interface, by its basename. */
const adapterFiles = readdirSync(HERE)
  .filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.docs.ts') && !file.endsWith('.test.ts'),
  )
  .filter((file) => /export interface \w+Adapter\b/.test(readFileSync(join(HERE, file), 'utf8')))
  .map((file) => file.replace(/\.ts$/, ''))

describe('the adapter pages', () => {
  it('covers every adapter interface in src/adapters', () => {
    expect(adapterFiles.length).toBeGreaterThan(0)
    for (const slug of adapterFiles) {
      expect(adapterDocsFor(slug), `src/adapters/${slug}.ts has no ${slug}.docs.ts`).toBeDefined()
    }
    expect(adapterDocs.map((docs) => docs.slug).sort()).toEqual([...adapterFiles].sort())
  })

  it('names a fake and at least one method on every page', () => {
    for (const docs of adapterDocs) {
      expect(docs.methods.length, `${docs.name} documents no method`).toBeGreaterThan(0)
      expect(docs.fake.name, `${docs.name} names no fake`).toMatch(/^fake/)
    }
  })

  it('lists the consumers the components themselves claim', () => {
    for (const docs of adapterDocs) {
      const derived = componentsUsing(docs.name).map((component) => component.name)
      expect(docs.consumers, `${docs.name}.docs.ts consumers`).toEqual(derived)
    }
  })

  it('documents every adapter a component says it takes', () => {
    for (const component of componentDocs) {
      for (const row of component.adapters) {
        expect(
          adapterDocs.some((docs) => docs.name === row.adapter),
          `${component.name} takes ${row.adapter}, which has no adapter page`,
        ).toBe(true)
      }
    }
  })
})
