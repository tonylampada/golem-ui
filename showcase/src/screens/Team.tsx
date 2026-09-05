import type { IdentityAdapter, RecordsAdapter } from 'golem-ui'
import { useRows } from '../lib/use-rows'
import type { TeamMember } from '../seed'
import { Avatar, Panel, Screen, Tag } from '../ui'

/** Placeholder for the Auth component: sign in, invite by link, account menu, screen guard. */
export function Team({
  records,
  identity,
}: {
  records: RecordsAdapter
  identity: IdentityAdapter
}) {
  const members = useRows<TeamMember>(records, 'team')

  return (
    <Screen
      title="Team & access"
      lead="Everyone who can open this workspace."
      action={
        <button
          type="button"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium"
        >
          Invite by link
        </button>
      }
    >
      {members.map((member) => (
        <Panel key={member.id}>
          <div className="flex items-center gap-3">
            <Avatar initials={member.initials} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.name}</p>
              <p className="truncate text-xs text-neutral-500">
                {member.station} · seen {member.lastSeen}
              </p>
            </div>
            <Tag>{member.role}</Tag>
          </div>
        </Panel>
      ))}
      <button
        type="button"
        onClick={() => void identity.signOut()}
        className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium sm:w-auto"
      >
        Sign out
      </button>
    </Screen>
  )
}
