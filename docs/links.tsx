import type { AdapterDocs, ComponentDocs } from '../src/abi'
import type { DocLinks } from './AdapterPage'

/**
 * Where a page's cross-links point on each surface. Both surfaces render the same page component;
 * only the hrefs differ, and these are them.
 */

/**
 * Inside Storybook. `./?path=` resolves to the Storybook root from a docs page and from the story
 * iframe alike, and `_top` gets the reader out of that iframe.
 */
export const storybookLinks: DocLinks = {
  adapter: (docs: AdapterDocs) => `./?path=/docs/${docs.storybookPath}--docs`,
  component: (docs: ComponentDocs) => `./?path=/docs/${docs.storybookPath}--docs`,
  target: '_top',
}

/** Inside the showcase, whose navigation adapter is the URL hash. */
export const showcaseLinks: DocLinks = {
  adapter: (docs: AdapterDocs) => `#/adapters/${docs.slug}`,
  component: (docs: ComponentDocs) => `#/api/${docs.slug}`,
}
