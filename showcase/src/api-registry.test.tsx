import { describe, expect, it } from 'vitest'
import { componentDocs } from 'golem-ui'
import { apiComponentFor, apiComponents } from './api-registry'

/**
 * The one seam worth holding: `#/api` is built off `componentDocs`, and a component whose page
 * prose lands without an entry in the registry would go up as a blank page rather than a build
 * error. Every exported component has an API page, and this is what says so.
 */
describe('the API pages', () => {
  it('covers every exported component', () => {
    expect(apiComponents).toHaveLength(componentDocs.length)
    for (const component of apiComponents) {
      expect(component.schema, `${component.docs.name} has no schema`).toBeDefined()
      expect(component.example, `${component.docs.name} has no example`).toBeTruthy()
      expect(component.invalid, `${component.docs.name} has no invalid example`).toBeTruthy()
    }
  })

  it('reaches every component by the slug in its own docs', () => {
    for (const docs of componentDocs) {
      expect(apiComponentFor(docs.slug)?.docs.name).toBe(docs.name)
    }
    expect(apiComponentFor('nothing-by-that-name')).toBeUndefined()
  })
})
