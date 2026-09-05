import type { ChatMessage, User } from 'golem-ui'

/**
 * Northgate Cycles, an invented neighbourhood bike repair shop: five people, a week of repair jobs,
 * and a shop log that has been running since spring. Every date is anchored to `TODAY` so the app
 * never looks abandoned.
 */

export const TODAY = new Date('2026-09-10T13:20:00Z')
export const TIME_ZONE = 'UTC'

export const signedIn: User = {
  id: 'u-nadia',
  name: 'Nadia Kessler',
  email: 'nadia@northgatecycles.example',
  roles: ['mechanic', 'owner'],
}

export interface TeamMember {
  id: string
  name: string
  role: string
  station: string
  initials: string
  lastSeen: string
}

export const team: TeamMember[] = [
  {
    id: 'u-nadia',
    name: 'Nadia Kessler',
    role: 'owner',
    station: 'Wheel bench',
    initials: 'NK',
    lastSeen: 'now',
  },
  {
    id: 'u-omar',
    name: 'Omar Bright',
    role: 'mechanic',
    station: 'Drivetrain bench',
    initials: 'OB',
    lastSeen: '2 h ago',
  },
  {
    id: 'u-priya',
    name: 'Priya Sandoval',
    role: 'mechanic',
    station: 'Suspension bench',
    initials: 'PS',
    lastSeen: 'yesterday',
  },
  {
    id: 'u-theo',
    name: 'Theo Lang',
    role: 'front desk',
    station: 'Counter',
    initials: 'TL',
    lastSeen: '20 min ago',
  },
  {
    id: 'u-hana',
    name: 'Hana Vogt',
    role: 'apprentice',
    station: 'Build stand',
    initials: 'HV',
    lastSeen: '3 days ago',
  },
]

export interface RepairJob {
  id: string
  ticket: string
  date: string
  customer: string
  bike: string
  service: string
  assignee: string
  status: 'waiting' | 'in progress' | 'ready'
  quote: string
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
    quote: '$140',
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
    quote: '$85',
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
    quote: '$210',
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
    quote: '$120',
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
    quote: '$60',
    notes:
      'Intermittent cut-out traced to a chafed speed-sensor lead, not the battery. Re-routed and taped. Told the customer to watch it for a fortnight.',
    tags: ['e-bike', 'diagnostic'],
  },
]

export interface LogEntry {
  id: string
  date: string
  label: string
  detail: string
  kind: 'win' | 'note' | 'goal'
}

export const shopLog: LogEntry[] = [
  {
    id: 'l-8',
    date: '2026-09-10',
    label: 'Nine tickets closed this week',
    detail: 'Best week since the spring service rush.',
    kind: 'win',
  },
  {
    id: 'l-7',
    date: '2026-09-08',
    label: 'Suspension bench booked out to the 22nd',
    detail: 'Priya is the only one certified on it. Worth a second pair of hands.',
    kind: 'note',
  },
  {
    id: 'l-6',
    date: '2026-09-04',
    label: 'Turnaround target set to three days',
    detail: 'Agreed at the Friday stand-up, tracked on this page.',
    kind: 'goal',
  },
  {
    id: 'l-5',
    date: '2026-09-01',
    label: 'Winter service pricing published',
    detail: 'New sheet at the counter and on the shop page.',
    kind: 'note',
  },
  {
    id: 'l-4',
    date: '2026-08-19',
    label: 'Second wheel-building stand arrived',
    detail: 'Hana trained on it the same afternoon.',
    kind: 'win',
  },
]

export interface Attachment {
  id: string
  name: string
  kind: 'photo' | 'pdf' | 'audio'
  size: string
  addedBy: string
  date: string
}

export const attachments: Attachment[] = [
  {
    id: 'f-1',
    name: 'rove-rear-wheel-before.jpg',
    kind: 'photo',
    size: '1.4 MB',
    addedBy: 'Nadia Kessler',
    date: '2026-09-10',
  },
  {
    id: 'f-2',
    name: 'supplier-invoice-2211.pdf',
    kind: 'pdf',
    size: '320 KB',
    addedBy: 'Theo Lang',
    date: '2026-09-09',
  },
  {
    id: 'f-3',
    name: 'rockhopper-fork-seals.jpg',
    kind: 'photo',
    size: '2.1 MB',
    addedBy: 'Priya Sandoval',
    date: '2026-09-09',
  },
  {
    id: 'f-4',
    name: 'gazelle-cutout-noise.m4a',
    kind: 'audio',
    size: '180 KB',
    addedBy: 'Nadia Kessler',
    date: '2026-09-07',
  },
]

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
    text: 'Changed it to "nine tickets closed, average turnaround 2.6 days". I also put the turnaround target on the shop log.',
    at: '2026-09-10T09:33:00Z',
  },
]

/** What the agent answers in the showcase, in order, so the composer is never a dead end. */
export const cannedReplies: string[] = [
  'Noted. I will fold that into today’s report and put a line on the shop log.',
  'Right. Does that change the turnaround target? If it does, I will update the workspace DNA too.',
  'Done. The ticket is saved and already showing in the job list.',
]
