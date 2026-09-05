import { Auth } from 'golem-ui'
import type { ClockAdapter, FakeRecords, IdentityAdapter, NavigationAdapter, Route } from 'golem-ui'
import { Dna } from './screens/Dna'
import { Files } from './screens/Files'
import { Job } from './screens/Job'
import { Jobs } from './screens/Jobs'
import { Log } from './screens/Log'
import { NewJob } from './screens/NewJob'
import { Report } from './screens/Report'
import { Today } from './screens/Today'
import { authConfig, DNA_ROLE } from './auth-config'

export const screens = [
  { path: '/today', label: 'Today' },
  { path: '/jobs', label: 'Jobs' },
  { path: '/report', label: 'Report' },
  { path: '/log', label: 'Log' },
  { path: '/files', label: 'Files' },
  { path: '/dna', label: 'DNA' },
  { path: '/team', label: 'Team' },
] as const

export interface CanvasAdapters {
  // The fake's own type, because the New-ticket placeholder writes a row: `RecordsAdapter` is
  // read-only, and stays that way until the Record form component lands.
  records: FakeRecords
  clock: ClockAdapter
  identity: IdentityAdapter
  navigation: NavigationAdapter
}

function screenFor(path: string, a: CanvasAdapters) {
  const auth = { identity: a.identity, navigation: a.navigation }

  switch (path) {
    case '/jobs':
      return <Jobs records={a.records} navigation={a.navigation} />
    case '/jobs/new':
      return <NewJob records={a.records} navigation={a.navigation} />
    case '/report':
      return <Report clock={a.clock} />
    case '/log':
      return <Log records={a.records} />
    case '/files':
      return <Files records={a.records} />
    case '/dna':
      // The one screen a mechanic cannot open, so the guard is visible in the demo.
      return (
        <Auth.Guard config={authConfig} adapters={auth} roles={[DNA_ROLE]}>
          <Dna />
        </Auth.Guard>
      )
    case '/team':
      return <Auth config={authConfig} adapters={auth} />
    default:
      // One ticket, opened from a row of the job list.
      if (path.startsWith('/jobs/')) {
        return (
          <Job id={path.slice('/jobs/'.length)} records={a.records} navigation={a.navigation} />
        )
      }
      return <Today records={a.records} clock={a.clock} navigation={a.navigation} />
  }
}

export function Canvas({ route, adapters }: { route: Route; adapters: CanvasAdapters }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* The strip scrolls sideways inside itself on a narrow phone, so the page never does. */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-neutral-200 bg-white px-3 py-2">
        {screens.map((screen) => {
          const active = route.path.startsWith(screen.path)
          return (
            <button
              key={screen.path}
              type="button"
              onClick={() => adapters.navigation.go(screen.path)}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium ${
                active ? 'bg-neutral-900 text-white' : 'text-neutral-600'
              }`}
            >
              {screen.label}
            </button>
          )
        })}
      </nav>
      <div className="min-h-0 flex-1 overflow-auto bg-neutral-50">
        {screenFor(route.path, adapters)}
      </div>
    </div>
  )
}
