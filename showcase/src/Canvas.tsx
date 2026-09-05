import type {
  ClockAdapter,
  IdentityAdapter,
  NavigationAdapter,
  RecordsAdapter,
  Route,
} from 'golem-ui'
import { Dna } from './screens/Dna'
import { Files } from './screens/Files'
import { Jobs } from './screens/Jobs'
import { Log } from './screens/Log'
import { NewJob } from './screens/NewJob'
import { Report } from './screens/Report'
import { Team } from './screens/Team'
import { Today } from './screens/Today'

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
  records: RecordsAdapter
  clock: ClockAdapter
  identity: IdentityAdapter
  navigation: NavigationAdapter
}

function screenFor(path: string, a: CanvasAdapters) {
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
      return <Dna />
    case '/team':
      return <Team records={a.records} identity={a.identity} />
    default:
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
