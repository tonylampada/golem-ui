import type { AdapterDocs, ComponentDocs } from './abi'
import { chatAdapterDocs } from './adapters/chat.docs'
import { clockAdapterDocs } from './adapters/clock.docs'
import { filesAdapterDocs } from './adapters/files.docs'
import { identityAdapterDocs } from './adapters/identity.docs'
import { navigationAdapterDocs } from './adapters/navigation.docs'
import { recordsAdapterDocs } from './adapters/records.docs'
import { authDocs } from './components/Auth/Auth.docs'
import { chatDocs } from './components/Chat/Chat.docs'
import { editorDocs } from './components/Editor/Editor.docs'
import { recordFormDocs } from './components/RecordForm/RecordForm.docs'
import { recordListDocs } from './components/RecordList/RecordList.docs'
import { reportDocs } from './components/Report/Report.docs'
import { shellDocs } from './components/Shell/Shell.docs'
import { timelineDocs } from './components/Timeline/Timeline.docs'
import { uploadDocs } from './components/Upload/Upload.docs'

/**
 * Every exported component's page prose, in the order a reader meets them: the frame first, then
 * what goes in its slots, then the screens. The Storybook introduction and the showcase's `#/api`
 * index are both this list.
 */
export const componentDocs: ComponentDocs[] = [
  shellDocs,
  chatDocs,
  authDocs,
  recordListDocs,
  recordFormDocs,
  reportDocs,
  editorDocs,
  timelineDocs,
  uploadDocs,
]

/**
 * Every adapter's page prose, in the order a reader meets them: the two that carry the app's data
 * first, then who is using it, then the conversation, then the two small ones. The Storybook
 * `Adapters/Overview` page and the showcase's `#/adapters` index are both this list.
 */
export const adapterDocs: AdapterDocs[] = [
  recordsAdapterDocs,
  filesAdapterDocs,
  identityAdapterDocs,
  chatAdapterDocs,
  clockAdapterDocs,
  navigationAdapterDocs,
]

export function adapterDocsFor(slug: string): AdapterDocs | undefined {
  return adapterDocs.find((docs) => docs.slug === slug)
}

/** The documented adapter a component's `adapters` row names, for the link between the two pages. */
export function adapterDocsNamed(name: string): AdapterDocs | undefined {
  return adapterDocs.find((docs) => docs.name === name)
}

/**
 * Every component that takes this adapter, read off the components' own adapter lists rather than
 * written down a second time. `<name>.docs.ts` carries the same list so the file reads as a whole
 * document; `adapters.docs.test.ts` fails when the two disagree.
 */
export function componentsUsing(adapter: string): ComponentDocs[] {
  return componentDocs.filter((docs) => docs.adapters.some((row) => row.adapter === adapter))
}
