import { useState, type ReactNode } from 'react'
import type { GolemProps } from '../../abi'
import { fakeBrain } from '../../adapters/fake'
import type { ChatAdapter, ChatMessage } from '../../adapters'
import { Chat } from '../Chat/Chat'
import { Brain, type BrainAdapters, type BrainSlots } from './Brain'
import type { BrainConfigInput } from './Brain.config'

export type BrainProps = GolemProps<BrainConfigInput, BrainAdapters, BrainSlots>

export interface BrainExample {
  name: string
  summary: string
  props: BrainProps
  viewportWidth: number
}

/**
 * Northgate Cycles' brain: an OKF bundle for an invented bike shop. Every name, ticket and date is
 * fiction, and the showcase seeds its own brain from this same map.
 */
export const northgateBrain: Record<string, string> = {
  'index.md': `---
okf_version: 0.2
---
# Northgate Cycles

What the shop knows, for whoever is on the counter or the bench today.

## Workshop

* [Turnaround](workshop/turnaround.md) - how long a ticket may sit, and what to say when it slips
* [Fork service](workshop/fork-service.md) - the seal kits we stock and the ones we order
* [Wheel building](workshop/wheel-building.md) - spoke lengths, tensions, and the truing stand

## Counter

* [Quotes](counter/quotes.md) - how a quote is written and when it is honoured
* [Collection](counter/collection.md) - what happens to a bike nobody picks up

## Suppliers

* [Suppliers](suppliers.md) - who we order from, lead times, account numbers
`,
  'log.md': `# Log

- 2026-09-08 — Turnaround target set to three working days; landlord asked for the number.
- 2026-09-05 — Added the SKF seal kit sizes after the Rockhopper job.
- 2026-08-30 — Bundle created from the counter binder.
`,
  'workshop/turnaround.md': `---
type: policy
description: how long a ticket may sit, and what to say when it slips
---
# Turnaround

A ticket is turned around in **three working days** from the bike arriving, parts permitting.

When a part is on order, the ticket waits on the part, and the customer is told the supplier's
date on the day we learn it. Nobody is told "soon".

If the three days slip for any other reason, the mechanic on the ticket calls the customer, not
the counter. The call is logged on the ticket.
`,
  'workshop/fork-service.md': `---
type: procedure
description: the seal kits we stock and the ones we order
---
# Fork service

## Seal kits in stock

- SKF 32 mm, low friction
- SKF 35 mm, low friction
- Enduro 30 mm

## Ordered on demand

Anything 34 mm or 36 mm. Lead time from the distributor is two working days; see
[Suppliers](../suppliers.md).

## The service

1. Drop the lowers, drain, inspect the bushings.
2. Replace both seals and foam rings.
3. Refill with the weight on the sticker under the crown, not what the last shop used.
`,
  'workshop/wheel-building.md': `---
type: procedure
description: spoke lengths, tensions, and the truing stand
---
# Wheel building

Spoke length comes from the calculator on the bench laptop, never from memory.

Tension a rear wheel to 110 kgf on the drive side and let the non-drive side land where it lands.
A front wheel is 100 kgf both sides. Dish is checked twice: once on the stand and once in the frame.
`,
  'counter/quotes.md': `---
type: policy
description: how a quote is written and when it is honoured
---
# Quotes

A quote is written on the ticket before the work starts, parts and labour on separate lines.

A quote is honoured for **fourteen days**. Past that the parts are re-priced, and the customer is
told before anything is ordered.

If the bench finds more than the quote covers, work stops and the counter calls. The customer says
yes to the new number or the bike goes back together as it was.
`,
  'counter/collection.md': `---
type: policy
description: what happens to a bike nobody picks up
---
# Collection

A finished bike is texted the day it is done, and again after a week.

After thirty days it moves to the back rack and the ticket is marked "uncollected". After ninety
days the owner is written to at the address on the ticket. Nothing is sold; the rack is just full.
`,
  'suppliers.md': `---
type: reference
description: who we order from, lead times, account numbers
---
# Suppliers

| Supplier    | What          | Lead time      | Account   |
| ----------- | ------------- | -------------- | --------- |
| Ridgeline   | Forks, seals  | 2 working days | NC-2211   |
| Halden      | Tyres, tubes  | next day       | NC-0084   |
| Coastwheel  | Rims, spokes  | 4 working days | NC-1190   |

Orders go in before 15:00 to make the day's cut-off.
`,
}

/** Built once at module scope so the props identity is stable across renders. */
const adapters: BrainAdapters = { brain: fakeBrain(northgateBrain) }

export const rootIndex: BrainExample = {
  name: 'The root index',
  summary:
    'Nothing open yet: the list column on the left, the bundle’s own index.md in the reading column.',
  viewportWidth: 1100,
  props: { config: { title: 'Shop knowledge' }, adapters },
}

export const openLocation: BrainExample = {
  name: 'A cited passage',
  summary:
    'openLocation names lines 6–8 of the turnaround policy; the reader opens the file with the range highlighted and the front matter as a chip.',
  viewportWidth: 1100,
  props: {
    config: { title: 'Shop knowledge', openLocation: 'workshop/turnaround.md#L6-L8' },
    adapters,
  },
}

export const phoneList: BrainExample = {
  name: 'Phone: the list',
  summary: 'Below 768px the reader is one screen at a time. Nothing open is the list, with search.',
  viewportWidth: 390,
  props: { config: { title: 'Shop knowledge' }, adapters },
}

export const phone: BrainExample = {
  name: 'Phone: a document',
  summary:
    'A document fills the phone screen with a back affordance in the header; back returns to the list where it was.',
  viewportWidth: 390,
  props: {
    config: { title: 'Shop knowledge', openLocation: 'counter/quotes.md#L8-L9' },
    adapters,
  },
}

export const invalidConfig: BrainExample = {
  name: 'Invalid config',
  summary: 'A location with a malformed range and an unknown field: both are named.',
  viewportWidth: 900,
  props: {
    config: { openLocation: 'suppliers.md#3-5', theme: 'dark' } as unknown as BrainConfigInput,
    adapters,
  },
}

export const brainExamples = [rootIndex, openLocation, phoneList, phone, invalidConfig]

/** The conversation behind "Answer with a source": one agent reply carrying the passage it used. */
export const sourcedConversation: ChatMessage[] = [
  {
    id: 'b-1',
    role: 'user',
    text: 'how long can the Rockhopper sit before I have to call her?',
    at: '2026-09-10T09:50:00Z',
  },
  {
    id: 'b-2',
    role: 'agent',
    text: 'Three working days from when it came in, parts permitting. It is waiting on a seal kit, so she gets the supplier’s date the day we learn it.',
    at: '2026-09-10T09:50:08Z',
    sources: ['workshop/turnaround.md#L6-L8', 'workshop/fork-service.md#L15-L17'],
  },
]

/**
 * The wiring an app does: the chip's click lands in `openSource`, the app keeps the location in
 * state, and `Brain` opens it through `openLocation`. Chat on the left, Brain on the right.
 */
export function AnswerWithASource(): ReactNode {
  const [location, setLocation] = useState<string>()
  const [chat] = useState<ChatAdapter>(() => ({
    async history() {
      return sourcedConversation
    },
    async send() {},
    subscribe: () => () => {},
    openSource: setLocation,
  }))
  return (
    <div className="flex h-full min-h-0">
      <div className="w-[340px] shrink-0 border-r border-(--chat-line)">
        <Chat config={{ agentName: 'Golem', userName: 'Nadia' }} adapters={{ chat }} />
      </div>
      <div className="min-w-0 flex-1">
        <Brain config={{ title: 'Shop knowledge', openLocation: location }} adapters={adapters} />
      </div>
    </div>
  )
}
