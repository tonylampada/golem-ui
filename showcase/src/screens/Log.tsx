import { Timeline } from 'golem-ui'
import type {
  ClockAdapter,
  FilesAdapter,
  IdentityAdapter,
  RecordsAdapter,
  TimelineConfigInput,
} from 'golem-ui'
import { Screen } from '../ui'

/** The four things that happen in a bike shop, one per tone. */
const kinds: TimelineConfigInput['kinds'] = [
  { id: 'note', label: 'Note', tone: 'neutral' },
  { id: 'done', label: 'Done', tone: 'good' },
  { id: 'parts', label: 'Parts', tone: 'warn' },
  { id: 'problem', label: 'Problem', tone: 'bad' },
]

const shared = {
  collection: 'log',
  dateField: 'at',
  bodyField: 'body',
  kindField: 'kind',
  kinds,
  actorField: 'actor',
  attachmentsField: 'files',
} satisfies Partial<TimelineConfigInput>

/** The whole log: chips, a search box, and the box the shop writes its next line in. */
export const logConfig: TimelineConfigInput = {
  ...shared,
  filters: ['kind', 'actor'],
  search: ['body'],
  pageSize: 8,
  composer: true,
  emptyState: 'Nothing on the log yet. The agent writes a line when a ticket moves.',
}

/**
 * The same component on Today, one config away: three entries, no chips and no composer, because
 * the block is a glance at the log rather than the log.
 */
export const latestConfig: TimelineConfigInput = {
  ...shared,
  pageSize: 3,
  emptyState: 'Nothing on the log yet.',
}

export function Log({
  records,
  clock,
  identity,
  files,
}: {
  records: RecordsAdapter
  clock: ClockAdapter
  identity: IdentityAdapter
  files: FilesAdapter
}) {
  return (
    <Screen title="Shop log" lead="What changed, in order, since the summer.">
      <Timeline config={logConfig} adapters={{ records, clock, identity, files }} />
    </Screen>
  )
}
