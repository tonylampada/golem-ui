import type { AdapterDocs } from '../abi'

export const clockAdapterDocs: AdapterDocs = {
  name: 'Clock',
  slug: 'clock',
  storybookPath: 'adapters-clock',
  tagline:
    'Now, and the zone to read it in — two methods, so nothing in the kit reads the wall clock.',

  purpose: `\`Clock\` is the smallest adapter in the kit and it exists for one reason: a component that reads the
wall clock cannot be tested, screenshotted or demonstrated twice with the same result. Everything
that needs the time asks for it here.

Hand it \`fakeClock()\` and "today" is a fixed day, so a dated document renders the same in every story
and every test run. Hand it a real clock in the app and nothing else changes.`,

  methods: [
    {
      signature: 'now(): Date',
      guarantees: `A fresh \`Date\`, synchronously. Callers may keep it, so return a new object rather than one they could
mutate. It is called on render, which means it must be cheap and must never do I/O.`,
    },
    {
      signature: 'timeZone(): string',
      guarantees: `An IANA zone name — \`Europe/Lisbon\`, \`UTC\` — used to format the times a reader sees. It is the
reader's zone, not the server's; a component formats every timestamp through it, so two people in two
places read the same record differently and both read it correctly.`,
    },
  ],

  notes: `**Nothing here is asynchronous and nothing here is subscribable.** A component re-reads \`now()\` when
it re-renders; a clock that has to tick drives that from outside.

**Records carry their own timestamps.** \`Clock\` is for the *reading* time — "Saved 13:20", which day
"today" is, which day a timeline entry falls in. What a row was created at came from the store.`,

  fake: {
    name: 'fakeClock',
    what: `Frozen. \`fakeClock()\` is \`2026-01-01T09:00:00Z\` in \`UTC\` and returns that same instant every time, so
a time-based view renders identically in every story and every test run. Pass a \`Date\` and a zone to
move it. There is no tick and no advance method: a test that needs time to pass builds a second
clock.`,
    example: `import { Report, fakeClock } from 'golem-ui'

const clock = fakeClock(new Date('2026-01-14T08:00:00Z'), 'Europe/Lisbon')

;<Report config={reportConfig} adapters={{ records, clock }} />`,
  },

  consumers: ['Report', 'Editor', 'Timeline'],
}
