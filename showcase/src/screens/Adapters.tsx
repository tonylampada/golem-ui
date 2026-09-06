import type { ReactNode } from 'react'
import type { NavigationAdapter } from 'golem-ui'
import { adapterDocs, adapterDocsFor } from 'golem-ui'
import { AdapterList, AdapterPage } from '../../../docs/AdapterPage'
import { showcaseLinks } from '../../../docs/links'

/**
 * The adapters on a phone, beside `#/api`. Same source of prose as the Storybook `Adapters/*`
 * pages and the same renderer — only the links differ, which is what `showcaseLinks` carries.
 * Outside `Auth.Guard`, like the API pages: a spec nobody can read signed out is not a spec.
 */

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-auto bg-neutral-50 text-neutral-900">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">{children}</div>
    </div>
  )
}

export function AdaptersIndex() {
  return (
    <Page>
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">golem-ui</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Adapters</h1>
      <p className="mt-2 text-sm text-neutral-600">
        The second half of the ABI. <code className="font-mono">config</code> is what a component
        is; adapters are how it talks to the world. A component never imports a data layer, a router
        or a fetch — it calls what it was handed, and the app decides what that is. There are{' '}
        {adapterDocs.length}, and one instance of each serves every component that takes it.
      </p>

      <div className="mt-6">
        <AdapterList links={showcaseLinks} />
      </div>

      <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href="#/api" className="font-medium underline">
          The components
        </a>
        <a href="#/today" className="font-medium underline">
          The showcase app
        </a>
      </div>
    </Page>
  )
}

export function AdapterDetail({
  slug,
  navigation,
}: {
  slug: string
  navigation: NavigationAdapter
}) {
  const docs = adapterDocsFor(slug)

  if (!docs) {
    return (
      <Page>
        <h1 className="text-xl font-semibold">No adapter called “{slug}”</h1>
        <button
          type="button"
          onClick={() => navigation.go('/adapters')}
          className="mt-3 text-sm font-medium underline"
        >
          Every adapter that does exist
        </button>
      </Page>
    )
  }

  return (
    <Page>
      <button
        type="button"
        onClick={() => navigation.go('/adapters')}
        className="text-sm font-medium text-neutral-500 underline"
      >
        ← Adapters
      </button>
      <div className="mt-3">
        <AdapterPage docs={docs} links={showcaseLinks} />
      </div>
    </Page>
  )
}
