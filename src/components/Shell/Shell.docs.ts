import type { ComponentDocs } from '../../abi'

export const shellDocs: ComponentDocs = {
  name: 'Shell',
  slug: 'shell',
  storybookPath: 'components-shell',
  tagline:
    'The app frame: a thin top bar, the canvas, the app’s bottom menu bar, and the chat behind a toggle.',

  purpose: `\`Shell\` is the app frame, pinned to the viewport. A thin **top bar** carries the app title and, on the
right, icon-only buttons: the **chat toggle**, the **settings** gear (a dropdown with the theme toggle
and whatever rows the app adds), and the **account** avatar. Along the bottom, a **menu bar** lists the
app's own screens from \`config.menu\`, phone-app style: an icon over a short label, at every width.
Between the two is the canvas.

The chat is what the toggle shows and hides. Above the breakpoint it is a side column on \`chatSide\`,
drag-resizable, above the menu bar, and its width and open state are kept in this browser. Below
the breakpoint it is a sheet over the app, menu bar included: the canvas stays mounted underneath, so closing it lands you
exactly where you were, scroll included. A route change closes the sheet, because a route change is
a screen the reader asked for. Chat hidden means the canvas has the whole width.

The frame never scrolls as a whole: the top bar and the menu bar stay put, and only the chat and
the canvas scroll inside themselves. Shell also owns the kit's theme — the
\`data-golem-theme\` attribute on the document — from the saved choice or the OS preference.

Use it once, at the root of an app. It does not render the conversation (hand that in as \`chat\`),
and it does not route (hand the current screen in as \`canvas\`, and the screens as \`menu\`).`,

  adapters: [
    {
      adapter: 'Identity',
      calls: '`currentUser()`, `subscribe()`',
      why: "Shows the signed-in user's name in the top bar when no `account` slot is given, and keeps it current when they sign out.",
    },
    {
      adapter: 'Navigation',
      calls: '`current()`, `go()`, `subscribe()`',
      why: 'The title is the way home; a menu item with `href` goes there; the current route marks the current item and closes the chat sheet.',
    },
  ],

  adapterNotes:
    'Shell takes no other adapter. It never fetches, never reads a router, and stores only its own chrome — chat width, chat open, theme — in this browser.',

  slots: [
    {
      slot: 'chat',
      what: 'The conversation. `Chat` is what belongs here; empty renders a labelled placeholder, `null` removes the chat and its toggle altogether.',
    },
    {
      slot: 'canvas',
      what: 'The screen the agent built. Empty renders a labelled placeholder.',
    },
    {
      slot: 'account',
      what: 'The right-hand end of the top bar. `Auth.AccountMenu` is what belongs here; empty falls back to the signed-in name as plain text.',
    },
    {
      slot: 'settings',
      what: 'Extra rows in the gear dropdown, under the theme toggle. Each row is a `Shell.Setting` — an icon, a short label, and `on` when it is a toggle. `Shell.Icon` has the line icons the bar uses.',
    },
    {
      slot: 'onSelect',
      what: 'Called with the item id when a menu item without `href` is tapped: the app changes its own state and passes `activeId` back.',
    },
  ],

  example: `import { Auth, Shell, fakeIdentity, fakeNavigation } from 'golem-ui'
import 'golem-ui/styles.css'

;<Shell
  config={{
    title: 'Northgate Cycles',
    menu: [
      { id: 'today', label: 'Today', icon: '🏠', href: '/today' },
      { id: 'jobs', label: 'Jobs', icon: '🔧', href: '/jobs' },
      { id: 'admin', label: 'Admin', icon: '🛠️' },
    ],
    activeId: showingAdmin ? 'admin' : undefined,
    chatSide: 'left',
    chatOpen: true,
    breakpoint: 768,
  }}
  adapters={{ identity: fakeIdentity(), navigation: fakeNavigation() }}
  chat={<AgentChat />}
  canvas={<TodayScreen />}
  account={<Auth.AccountMenu config={authConfig} adapters={{ identity, navigation }} />}
  settings={
    <Shell.Setting icon={<Shell.Icon name="wrench" />} label="Builder" on={builder} onClick={toggleBuilder} />
  }
  onSelect={(id) => id === 'admin' && setShowingAdmin(true)}
/>`,

  failureModes: `- **Invalid config.** Shell renders an error card instead of the frame, in dev and in prod, naming
  every field that failed and the rule it broke. An unknown field is a failure too — \`chatside\` does
  not quietly become \`chatSide\`, and the retired \`initialTab\` is rejected.
- **No slot.** A missing \`chat\` or \`canvas\` renders a labelled placeholder, so a half-wired app looks
  half-wired rather than broken. \`chat={null}\` is different: the app has no chat in this mode, so there
  is no column, no sheet and no toggle, only the canvas.
- **An empty menu.** No bottom bar is drawn; the canvas runs to the bottom edge.
- **A menu item with neither \`href\` nor an \`onSelect\` handler.** Tapping it does nothing. Give it one
  or the other.
- **Identity resolves to \`null\`.** The top bar renders without a name. Signing out is not an error.
- **The breakpoint is measured on the frame, not the window.** A Shell inside a narrow column gets
  the phone layout, which is usually what you want and is occasionally a surprise.
- **The frame is \`100dvh\` tall, capped at its parent.** Put it at the root, or in a box with a
  height; inside an auto-height parent it is the viewport's height and the page would scroll.`,
}
