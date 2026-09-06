import type { ComponentDocs } from './abi'
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
