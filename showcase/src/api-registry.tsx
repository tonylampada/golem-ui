import type { ReactNode } from 'react'
import type { ZodType } from 'zod'
import { Chat, RecordForm, RecordList, Shell, componentDocs, type ComponentDocs } from 'golem-ui'
import { authConfigSchema } from '../../src/components/Auth/Auth.config'
import { chatConfigSchema } from '../../src/components/Chat/Chat.config'
import { recordFormConfigSchema } from '../../src/components/RecordForm/RecordForm.config'
import { recordListConfigSchema } from '../../src/components/RecordList/RecordList.config'
import { shellConfigSchema } from '../../src/components/Shell/Shell.config'
import * as authExamples from '../../src/components/Auth/Auth.examples'
import * as chatExamples from '../../src/components/Chat/Chat.examples'
import * as recordFormExamples from '../../src/components/RecordForm/RecordForm.examples'
import * as recordListExamples from '../../src/components/RecordList/RecordList.examples'
import * as shellExamples from '../../src/components/Shell/Shell.examples'

/**
 * What an API page is made of, and the only place the three sources are named together: the prose
 * from `<X>.docs.ts`, the schema the runtime validates against, and the examples file the stories
 * and the tests already run on. Nothing here is retyped, so nothing here can drift.
 *
 * The examples are elements built once, at module load, because their adapters are: a fresh
 * adapter object on every render would make the component re-subscribe on every render.
 */
export interface ApiComponent {
  docs: ComponentDocs
  schema: ZodType
  /** The example the page walks through, on the kit's fakes. */
  example: ReactNode
  /** The invalid-config example, so the reader sees the error card. */
  invalid: ReactNode
  /** How tall the live example wants to be; a frame needs a height. */
  exampleHeight: number
}

const byName: Record<string, Omit<ApiComponent, 'docs'>> = {
  Shell: {
    schema: shellConfigSchema,
    example: <Shell {...shellExamples.desktop.props} />,
    invalid: <Shell {...shellExamples.invalidConfig.props} />,
    exampleHeight: 460,
  },
  Chat: {
    schema: chatConfigSchema,
    example: <Chat {...chatExamples.conversationExample.props} />,
    invalid: <Chat {...chatExamples.invalidConfig.props} />,
    exampleHeight: 460,
  },
  Auth: {
    schema: authConfigSchema,
    example: authExamples.renderExample(authExamples.signedOutPassword),
    invalid: authExamples.renderExample(authExamples.invalidConfig),
    exampleHeight: 520,
  },
  RecordList: {
    schema: recordListConfigSchema,
    example: <RecordList {...recordListExamples.table.props} />,
    invalid: <RecordList {...recordListExamples.invalidConfig.props} />,
    exampleHeight: 520,
  },
  RecordForm: {
    schema: recordFormConfigSchema,
    example: <RecordForm {...recordFormExamples.createPhone.props} />,
    invalid: <RecordForm {...recordFormExamples.invalidConfig.props} />,
    exampleHeight: 620,
  },
}

/**
 * Every exported component, in the kit's own order. `componentDocs` is the list; a component added
 * to it without an entry above fails typecheck here rather than going missing from the site.
 */
export const apiComponents: ApiComponent[] = componentDocs.map((docs) => ({
  docs,
  ...byName[docs.name]!,
}))

export const STORYBOOK_URL = 'https://tonylampada.github.io/golem-ui/'

export function storybookHref(docs: ComponentDocs): string {
  return `${STORYBOOK_URL}?path=/docs/${docs.storybookPath}--docs`
}

export function apiComponentFor(slug: string): ApiComponent | undefined {
  return apiComponents.find((component) => component.docs.slug === slug)
}
