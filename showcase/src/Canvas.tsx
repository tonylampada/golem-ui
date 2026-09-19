import { Auth, Brain } from 'golem-ui'
import type {
  BrainAdapter,
  ClockAdapter,
  FilesAdapter,
  IdentityAdapter,
  NavigationAdapter,
  RecordsAdapter,
  Route,
} from 'golem-ui'
import { Dna } from './screens/Dna'
import { Files } from './screens/Files'
import { JobForm } from './screens/JobForm'
import { Jobs } from './screens/Jobs'
import { Log } from './screens/Log'
import { Report } from './screens/Report'
import { Today } from './screens/Today'
import { authConfig, DNA_ROLE } from './auth-config'

/** The menu row. `manages` marks a screen only a managing role gets. */
export const screens: { path: string; label: string; manages?: boolean }[] = [
  { path: '/today', label: 'Today' },
  { path: '/jobs', label: 'Jobs' },
  { path: '/report', label: 'Report' },
  { path: '/log', label: 'Log' },
  { path: '/files', label: 'Files' },
  { path: '/dna', label: 'DNA' },
  { path: '/brain', label: 'Brain' },
  { path: '/admin', label: 'Admin', manages: true },
]

export interface CanvasAdapters {
  records: RecordsAdapter
  clock: ClockAdapter
  files: FilesAdapter
  identity: IdentityAdapter
  navigation: NavigationAdapter
  brain: BrainAdapter
}

function screenFor(route: Route, a: CanvasAdapters) {
  const path = route.path
  const auth = { identity: a.identity, navigation: a.navigation }

  switch (path) {
    case '/jobs':
      return <Jobs records={a.records} navigation={a.navigation} />
    case '/jobs/new':
      return <JobForm records={a.records} identity={a.identity} navigation={a.navigation} />
    case '/report':
      return <Report records={a.records} clock={a.clock} />
    case '/log':
      return <Log records={a.records} clock={a.clock} identity={a.identity} files={a.files} />
    case '/files':
      return <Files files={a.files} />
    case '/dna':
      // The one screen a mechanic cannot open, so the guard is visible in the demo.
      return (
        <Auth.Guard config={authConfig} adapters={auth} roles={[DNA_ROLE]}>
          <Dna records={a.records} clock={a.clock} />
        </Auth.Guard>
      )
    case '/admin':
      return <Auth config={authConfig} adapters={auth} />
    case '/brain':
      // `?at=<location>` is what a source chip in the chat puts in the hash.
      return (
        <div className="h-full">
          <Brain
            config={{ title: 'Shop knowledge', openLocation: route.params.at }}
            adapters={{ brain: a.brain }}
          />
        </div>
      )
    default:
      // One ticket, opened from a row of the job list. The same form, in edit mode.
      if (path.startsWith('/jobs/')) {
        return (
          <JobForm
            id={path.slice('/jobs/'.length)}
            records={a.records}
            identity={a.identity}
            navigation={a.navigation}
          />
        )
      }
      return <Today records={a.records} clock={a.clock} files={a.files} navigation={a.navigation} />
  }
}

export function Canvas({ route, adapters }: { route: Route; adapters: CanvasAdapters }) {
  return <div className="h-full bg-neutral-50 dark:bg-neutral-950">{screenFor(route, adapters)}</div>
}
