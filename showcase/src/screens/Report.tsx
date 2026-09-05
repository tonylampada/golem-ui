import type { ClockAdapter } from 'golem-ui'
import { Panel, Screen } from '../ui'

/** Placeholder for the Report component: a rendered markdown document with a date, printable. */
export function Report({ clock }: { clock: ClockAdapter }) {
  const date = clock.now().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: clock.timeZone(),
  })

  return (
    <Screen title="Daily report" lead={date}>
      <Panel>
        <div className="space-y-4 text-sm leading-relaxed text-neutral-700">
          <p>
            Nine tickets closed, average turnaround 2.6 days. Two bikes are waiting for collection
            at the counter and one is held for parts.
          </p>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Closed today</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>#4186 Trek FX 3 — full tune-up, chain and cassette replaced.</li>
              <li>#4184 Brompton M6L — hinge plate and all four cables.</li>
              <li>#4183 Gazelle C380 — cut-out traced to a chafed sensor lead, not the battery.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Still open</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>#4187 Kona Rove — rear wheel rebuild on the bench, spokes in stock.</li>
              <li>#4185 Rockhopper — fork seals, SKF kit quoted for Thursday.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Worth a decision</h3>
            <p className="mt-2">
              The suspension bench is booked out to the 22nd and Priya is the only one certified on
              it. A second pair of hands or a longer quoted lead time.
            </p>
          </div>
        </div>
      </Panel>
      <p className="text-xs text-neutral-500">
        Written by the agent this morning from the week&rsquo;s tickets, then edited in the chat.
      </p>
    </Screen>
  )
}
