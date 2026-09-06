import type { AdapterDocs } from '../abi'

export const navigationAdapterDocs: AdapterDocs = {
  name: 'Navigation',
  slug: 'navigation',
  storybookPath: 'adapters-navigation',
  tagline:
    'Where the reader is, how to send them somewhere else, and a listener for when that changes.',

  purpose: `\`Navigation\` is the router, reduced to what a component actually needs: read the current route, go to a
path, hear about it when it changes. A \`Route\` is a \`path\` and a flat \`params\` map of strings.

No component in this kit imports a router, and that is what makes the kit work under React Router,
under a hash, under Next.js, or under a \`useState\`. It is also the one adapter an app most often
writes itself rather than taking the fake — the showcase's \`hashNavigation\` is about thirty lines.`,

  methods: [
    {
      signature: 'current(): Route',
      guarantees: `The route right now, synchronously. Called during render, so it reads existing state rather than
parsing anything expensive.`,
    },
    {
      signature: 'go(path: string): void',
      guarantees: `Navigates, and fires \`subscribe\`. Returns nothing and is not awaited — a component calls it and stops
caring. Whether it pushes onto history or replaces is the implementation's to decide.`,
    },
    {
      signature: 'subscribe(listener: (route: Route) => void): Unsubscribe',
      guarantees: `Calls the listener with the new route on every change, **including a change the reader made with the
back button**, not only ones \`go\` caused. This one carries its payload rather than nudging. Returns
the function that detaches it.`,
    },
  ],

  notes: `**\`params\` is where a token arrives.** \`Auth\` reads an invite token out of \`Route.params\`, so an
implementation over a hash has to parse the hash's query string into it — that is the one detail
\`fakeNavigation\` does not do and a real one must.

**There is no \`back\`, no \`replace\` and no route matching.** The app owns its route table; a component
only ever says "go here".

**Two components take it and neither routes.** \`Shell\` calls \`go('/')\` from the title, \`Auth\` sends a
reader on after signing in. Everything else on a screen is the app's own wiring.`,

  fake: {
    name: 'fakeNavigation',
    what: `Keeps the route in a variable. It is right for a story, where the route is a prop and the point is
that a click changed it, and it is wrong for an app: the route is lost on reload and a screen has no
URL anyone can link to. It also never fills \`params\`, so \`Auth\`'s invite path needs a real one.

An app writes its own. The showcase's \`hashNavigation\` reads \`window.location.hash\`, splits the query
string into \`params\`, and listens on \`hashchange\` — which survives a reload and survives being served
under a GitHub Pages subpath.`,
    example: `import { Shell, fakeNavigation } from 'golem-ui'

const navigation = fakeNavigation({ path: '/today', params: {} })

;<Shell config={shellConfig} adapters={{ identity, navigation }} chat={chat} canvas={canvas} />`,
  },

  consumers: ['Shell', 'Auth'],
}
