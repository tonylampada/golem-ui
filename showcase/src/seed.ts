import { placeholderImage, type ChatMessage, type FakeFileSeed, type User } from 'golem-ui'

/**
 * Northgate Cycles, an invented neighbourhood bike repair shop: five people, a week of repair jobs,
 * and a shop log that has been running since spring. Every date is anchored to `TODAY` so the app
 * never looks abandoned.
 */

export const TODAY = new Date('2026-09-10T13:20:00Z')
export const TIME_ZONE = 'UTC'

/** The shop's five accounts. The Auth adapter is seeded from these, and one of them signs in. */
export const members: User[] = [
  {
    id: 'u-nadia',
    name: 'Nadia Kessler',
    email: 'nadia@northgatecycles.example',
    roles: ['owner'],
  },
  {
    id: 'u-omar',
    name: 'Omar Bright',
    email: 'omar@northgatecycles.example',
    roles: ['mechanic'],
  },
  {
    id: 'u-priya',
    name: 'Priya Sandoval',
    email: 'priya@northgatecycles.example',
    roles: ['mechanic'],
  },
  {
    id: 'u-theo',
    name: 'Theo Lang',
    email: 'theo@northgatecycles.example',
    roles: ['front desk'],
  },
  {
    id: 'u-hana',
    name: 'Hana Vogt',
    email: 'hana@northgatecycles.example',
    roles: ['apprentice'],
  },
]

/** The one password every account takes in the demo. The sign-in screen says so out loud. */
export const SHOP_PASSWORD = 'northgate'

export interface RepairJob {
  id: string
  ticket: string
  date: string
  customer: string
  bike: string
  service: string
  assignee: string
  status: 'waiting' | 'in progress' | 'ready'
  quote: number
  hours: number
  approved: boolean
  updatedAt: string
  notes: string
  tags: string[]
}

export const jobs: RepairJob[] = [
  {
    id: 'j-4187',
    ticket: '#4187',
    date: '2026-09-10',
    customer: 'Delia Marchetti',
    bike: 'Kona Rove, 2019',
    service: 'Rear wheel rebuild',
    assignee: 'Nadia Kessler',
    status: 'in progress',
    quote: 140,
    hours: 3.5,
    approved: true,
    updatedAt: '2026-09-10T11:40:00Z',
    notes:
      'Three broken spokes on the drive side and the rim is out by 4 mm. Rebuilding on the original hub; new spokes are in stock.',
    tags: ['wheels', 'parts in stock'],
  },
  {
    id: 'j-4186',
    ticket: '#4186',
    date: '2026-09-10',
    customer: 'Owen Pratt',
    bike: 'Trek FX 3',
    service: 'Full tune-up',
    assignee: 'Omar Bright',
    status: 'ready',
    quote: 85,
    hours: 1.75,
    approved: true,
    updatedAt: '2026-09-10T11:05:00Z',
    notes:
      'Chain and cassette replaced, both brakes bled. Customer called at 11:40 and will collect after five.',
    tags: ['tune-up'],
  },
  {
    id: 'j-4185',
    ticket: '#4185',
    date: '2026-09-09',
    customer: 'Renata Oyelaran',
    bike: 'Specialized Rockhopper',
    service: 'Fork service',
    assignee: 'Priya Sandoval',
    status: 'waiting',
    quote: 210,
    hours: 2,
    approved: true,
    updatedAt: '2026-09-09T16:20:00Z',
    notes:
      'Lower seals are weeping. Waiting on the SKF kit, quoted Thursday by the supplier. Customer approved the price by text.',
    tags: ['suspension', 'waiting on parts'],
  },
  {
    id: 'j-4184',
    ticket: '#4184',
    date: '2026-09-08',
    customer: 'Sam Ferreira-Okoye',
    bike: 'Brompton M6L',
    service: 'Hinge and cable replacement',
    assignee: 'Omar Bright',
    status: 'ready',
    quote: 120,
    hours: 1.25,
    approved: true,
    updatedAt: '2026-09-08T15:10:00Z',
    notes:
      'Hinge clamp plate swapped and all four cables replaced. Fold is tight again. Collected Tuesday.',
    tags: ['folding'],
  },
  {
    id: 'j-4183',
    ticket: '#4183',
    date: '2026-09-07',
    customer: 'Marguerite Lowe',
    bike: 'Gazelle Ultimate C380',
    service: 'E-bike diagnostic',
    assignee: 'Nadia Kessler',
    status: 'ready',
    quote: 60,
    hours: 0.75,
    approved: false,
    updatedAt: '2026-09-07T10:30:00Z',
    notes:
      'Intermittent cut-out traced to a chafed speed-sensor lead, not the battery. Re-routed and taped. Told the customer to watch it for a fortnight.',
    tags: ['e-bike', 'diagnostic'],
  },
]

export interface LogEntry {
  id: string
  /** A full ISO instant: the shop log is read in minutes during the day, not in calendar days. */
  at: string
  body: string
  kind: 'note' | 'done' | 'problem' | 'parts'
  actor: string
  files?: { id: string; name: string }[]
}

/**
 * The shop log, running back to August. `TODAY` is 13:20, so the newest entries read as minutes
 * ago and everything older carries its clock time.
 */
export const shopLog: LogEntry[] = [
  {
    id: 'l-31',
    at: '2026-09-10T13:06:00Z',
    kind: 'done',
    actor: 'Omar Bright',
    body: '**#4186 Trek FX 3** back together — chain, cassette and both brakes bled. On the collection rack.',
  },
  {
    id: 'l-30',
    at: '2026-09-10T12:15:00Z',
    kind: 'note',
    actor: 'Theo Lang',
    body: 'Owen called about #4186. Collecting after five, paying at the counter.',
  },
  {
    id: 'l-29',
    at: '2026-09-10T09:40:00Z',
    kind: 'problem',
    actor: 'Priya Sandoval',
    body: '#4185 fork lowers are weeping worse than Monday. Photographed both legs before I stripped them.',
    files: [{ id: 'f-3', name: 'rockhopper-fork-seals.jpg' }],
  },
  {
    id: 'l-28',
    at: '2026-09-10T08:05:00Z',
    kind: 'parts',
    actor: 'Nadia Kessler',
    body: 'Spoke order landed. Enough drive-side 292mm for the Kona rebuild and two spares.',
  },
  {
    id: 'l-27',
    at: '2026-09-09T16:20:00Z',
    kind: 'parts',
    actor: 'Priya Sandoval',
    body: 'SKF seal kit for #4185 quoted Thursday by the supplier. Told the customer by text.',
    files: [{ id: 'f-2', name: 'supplier-invoice-2211.pdf' }],
  },
  {
    id: 'l-26',
    at: '2026-09-09T11:30:00Z',
    kind: 'done',
    actor: 'Hana Vogt',
    body: 'First wheel built unsupervised. It is true and it holds.',
  },
  {
    id: 'l-25',
    at: '2026-09-09T09:10:00Z',
    kind: 'note',
    actor: 'Nadia Kessler',
    body: 'Counter clear for the first time since Monday.',
  },
  {
    id: 'l-24',
    at: '2026-09-08T15:45:00Z',
    kind: 'done',
    actor: 'Omar Bright',
    body: '**#4184 Brompton M6L** collected at four. Hinge clamp plate and all four cables.',
  },
  {
    id: 'l-23',
    at: '2026-09-08T10:00:00Z',
    kind: 'problem',
    actor: 'Nadia Kessler',
    body: 'Suspension bench booked out to the 22nd, and Priya is the only one certified on it. Either a second pair of hands, or a longer lead time quoted at the counter.',
  },
  {
    id: 'l-22',
    at: '2026-09-07T14:20:00Z',
    kind: 'note',
    actor: 'Theo Lang',
    body: 'Six bikes in over the weekend. That is the whole of Monday accounted for.',
  },
  {
    id: 'l-21',
    at: '2026-09-07T09:05:00Z',
    kind: 'done',
    actor: 'Nadia Kessler',
    body: '#4183 cut-out traced to a chafed speed-sensor lead, not the battery. Re-routed and taped.',
    files: [{ id: 'f-4', name: 'gazelle-cutout-noise.m4a' }],
  },
  {
    id: 'l-20',
    at: '2026-09-04T16:00:00Z',
    kind: 'note',
    actor: 'Nadia Kessler',
    body: 'Turnaround target set to **three days** at the Friday stand-up. Tracked on this log.',
  },
  {
    id: 'l-19',
    at: '2026-09-01T09:30:00Z',
    kind: 'note',
    actor: 'Theo Lang',
    body: 'Winter service pricing published. New sheet at the counter and on the shop page.',
  },
  {
    id: 'l-18',
    at: '2026-08-19T15:10:00Z',
    kind: 'done',
    actor: 'Nadia Kessler',
    body: 'Second wheel-building stand arrived. Hana trained on it the same afternoon.',
  },
]

/**
 * The daily write-up the agent posts each morning, built from the week's tickets and the shop log.
 * Today's is still a draft: the agent wrote it at 09:12 and Nadia is still editing it in the chat.
 */
export type ShopReport = {
  id: string
  date: string
  title: string
  status: 'draft' | 'final'
  author: string
  sections: string[]
  body: string
}

export const reports: ShopReport[] = [
  {
    id: 'r-0910',
    date: '2026-09-10',
    title: 'Daily report — Thursday',
    status: 'draft',
    author: 'Northgate agent',
    sections: ['Where the week stands', 'Closed today', 'Still open', 'Worth a decision'],
    body: `Nine tickets closed this week and the average turnaround is 2.6 days, against the
three-day target set at the Friday stand-up. Two bikes are waiting for collection at the counter
and one is held for parts.

## Where the week stands

| Measure | This week | Target |
| --- | --- | --- |
| Tickets closed | 9 | 7 |
| Average turnaround | 2.6 days | 3 days |
| Waiting on parts | 1 | — |

## Closed today

- **#4186 Trek FX 3** — full tune-up, chain and cassette replaced, both brakes bled. Owen called at
  11:40 and collects after five.
- **#4184 Brompton M6L** — hinge clamp plate and all four cables. The fold is tight again.
- **#4183 Gazelle Ultimate C380** — the cut-out was a chafed speed-sensor lead, not the battery.
  Re-routed and taped, and the customer is watching it for a fortnight.

## Still open

- **#4187 Kona Rove** — rear wheel rebuild on the bench, three broken spokes on the drive side and
  the rim out by 4 mm. Spokes in stock.
- **#4185 Specialized Rockhopper** — fork lowers weeping. The SKF kit is quoted for Thursday.

## Worth a decision

The suspension bench is booked out to the 22nd and Priya is the only one certified on it. Either a
second pair of hands, or a longer lead time quoted at the counter.`,
  },
  {
    id: 'r-0909',
    date: '2026-09-09',
    title: 'Daily report — Wednesday',
    status: 'final',
    author: 'Northgate agent',
    sections: ['Closed today', 'Still open'],
    body: `Three tickets in, two out. The counter is clear for the first time since Monday.

## Closed today

- **#4182 Surly Long Haul Trucker** — bottom bracket swapped, half an hour on the bench.
- **#4181 Ribble Endurance SL** — full bleed on both brakes.

## Still open

- **#4185 Specialized Rockhopper** — booked in this morning, fork seals weeping. Quoted at $210 and
  approved by text.`,
  },
  {
    id: 'r-0908',
    date: '2026-09-08',
    title: 'Daily report — Tuesday',
    status: 'final',
    author: 'Northgate agent',
    sections: ['Closed today', 'Worth a decision'],
    body: `A quiet Tuesday. One collection, one booking, and the second wheel-building stand is
earning its shelf.

## Closed today

- **#4184 Brompton M6L** — collected at four.

## Worth a decision

The suspension bench is booked to the 22nd. Raised at the stand-up; no answer yet.`,
  },
  {
    id: 'r-0907',
    date: '2026-09-07',
    title: 'Daily report — Monday',
    status: 'final',
    author: 'Northgate agent',
    sections: ['Closed today'],
    body: `Six bikes in over the weekend, which is the whole of Monday accounted for.

## Closed today

- **#4183 Gazelle Ultimate C380** — booked in, diagnostic started.

Hana finished her first wheel unsupervised. It is true and it holds.`,
  },
  {
    id: 'r-0904',
    date: '2026-09-04',
    title: 'Weekly summary — first week of September',
    status: 'final',
    author: 'Northgate agent',
    sections: ['The week'],
    body: `## The week

Seven tickets closed, turnaround target agreed at three days and written onto the shop log. Winter
service pricing goes up at the counter on Monday.`,
  },
]

/**
 * The shop's folder of files: photos from the bench and paperwork from the counter. Every picture
 * is drawn by `placeholderImage` when the page loads — a few hundred bytes of SVG apiece — so the
 * repository carries no photographs of anybody's bike and the gallery still has something in it.
 * The ids are the ones the shop log and the seeded conversation attach, so a chip on a log entry
 * opens the file that is actually in the store.
 */
export const shopFiles: FakeFileSeed[] = [
  {
    id: 'f-1',
    folder: 'shop',
    name: 'rove-rear-wheel-before.jpg',
    contentType: 'image/jpeg',
    size: 1_468_006,
    content: placeholderImage('Kona Rove · rear wheel', 205),
    caption: 'Three broken spokes on the drive side, rim out by 4 mm.',
    uploadedAt: '2026-09-10T11:40:00Z',
  },
  {
    id: 'f-2',
    folder: 'shop',
    name: 'supplier-invoice-2211.pdf',
    contentType: 'application/pdf',
    size: 327_680,
    uploadedAt: '2026-09-09T16:20:00Z',
  },
  {
    id: 'f-3',
    folder: 'shop',
    name: 'rockhopper-fork-seals.jpg',
    contentType: 'image/jpeg',
    size: 2_202_009,
    content: placeholderImage('Rockhopper · fork lowers', 30),
    caption: 'Both legs weeping, photographed before stripping.',
    uploadedAt: '2026-09-09T09:40:00Z',
  },
  {
    id: 'f-4',
    folder: 'shop',
    name: 'gazelle-cutout-noise.m4a',
    contentType: 'audio/mp4',
    size: 184_320,
    uploadedAt: '2026-09-07T09:05:00Z',
  },
  {
    id: 'f-5',
    folder: 'shop',
    name: 'trek-fx3-collection-rack.jpg',
    contentType: 'image/jpeg',
    size: 986_112,
    content: placeholderImage('Trek FX 3 · on the rack', 150),
    uploadedAt: '2026-09-10T08:20:00Z',
  },
  {
    id: 'f-6',
    folder: 'shop',
    name: 'brompton-hinge-plate.jpg',
    contentType: 'image/jpeg',
    size: 1_120_460,
    content: placeholderImage('Brompton · hinge plate', 275),
    uploadedAt: '2026-09-08T15:45:00Z',
  },
  {
    id: 'f-7',
    folder: 'shop',
    name: 'winter-service-prices.pdf',
    contentType: 'application/pdf',
    size: 98_304,
    uploadedAt: '2026-09-01T09:30:00Z',
  },
]

/**
 * The workspace DNA: the markdown the agent reads before it changes anything, and the one document
 * in the demo two writers share. `version` goes up on every write, and the Editor sends the version
 * it read back with each save, so the person and the agent cannot flatten one another.
 */
export type DnaDocument = {
  id: string
  title: string
  body: string
  version: number
}

export const DNA_RULES = `## Rules

- A ticket is *ready* only when it has been called in to the customer.
- Turnaround target is three days, measured from the ticket date.`

/** What the agent writes into the Rules section when Nadia asks it to revise the document. */
export const DNA_REVISED_RULES = `## Rules

- A ticket is *ready* only when it has been called in to the customer.
- Turnaround target is **three days**, measured from the ticket date, and the counter quotes four
  on anything with suspension while the bench is booked out.
- A quote over $200 needs the owner's sign-off before the work starts.`

export const dnaDocument: DnaDocument = {
  id: 'dna',
  title: 'Workspace DNA',
  version: 4,
  body: `# Northgate Cycles

A neighbourhood bike repair shop. Five people, one bench diary, one counter.

## Records

- **job** — ticket, customer, bike, service, assignee, status, quote, hours, approved, notes
- **log entry** — at, body, kind (note | done | problem | parts), actor
- **attachment** — a photo or an invoice, attached to a job

## Screens

- Today: what is on the bench right now
- Repair jobs: the whole board, newest first
- Daily report: written every morning from yesterday's tickets
- Shop log: what changed, in order
- Photos & invoices
- Team & access

${DNA_RULES}
`,
}

export const conversation: ChatMessage[] = [
  {
    id: 'm-1',
    role: 'user',
    text: "morning — can you put together today's shop report from the tickets Omar and Priya closed?",
    at: '2026-09-10T09:12:00Z',
  },
  {
    id: 'm-2',
    role: 'agent',
    text: 'Morning, Nadia. Built it from the six tickets touched this week plus Friday’s stand-up notes. It is open on the canvas.',
    at: '2026-09-10T09:12:00Z',
  },
  {
    id: 'm-3',
    role: 'user',
    text: 'good. swap "steady week" for something with a number in it, the landlord reads this',
    at: '2026-09-10T09:31:00Z',
  },
  {
    id: 'm-4',
    role: 'agent',
    text: 'Changed it to **nine tickets closed, average turnaround 2.6 days**. I also put the turnaround target on the shop log.',
    at: '2026-09-10T09:33:00Z',
  },
  {
    id: 'm-5',
    role: 'user',
    text: 'here are the fork photos for #4185 while you are in there',
    at: '2026-09-10T09:41:00Z',
    attachments: [
      { id: 'f-3', name: 'rockhopper-fork-seals.jpg', size: 2_202_009 },
      { id: 'f-2', name: 'supplier-invoice-2211.pdf', size: 327_680 },
    ],
  },
  {
    id: 'm-6',
    role: 'agent',
    text: 'Both are on ticket #4185 now.',
    at: '2026-09-10T09:41:00Z',
  },
]

/** What the agent answers in the showcase, in order, so the composer is never a dead end. */
export const cannedReplies: string[] = [
  'Noted. I will fold that into today’s report and put a line on the shop log.',
  'Right — that touches three things:\n\n- the **turnaround target** on the shop log\n- the wording in today’s report\n- the workspace DNA, if you want it to stick\n\nSay the word and I will do all three.',
  'Done. The ticket is saved and already showing in the job list.',
]
