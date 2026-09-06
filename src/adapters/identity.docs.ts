import type { AdapterDocs } from '../abi'

export const identityAdapterDocs: AdapterDocs = {
  name: 'Identity',
  slug: 'identity',
  storybookPath: 'adapters-identity',
  tagline: 'Who is here, how they got here, and who else may come in.',

  purpose: `\`Identity\` answers one question everywhere in the kit — who is signed in — and carries the whole
membership story behind it: signing in by password or by a one-time code, signing up, the member
table, invites and roles. A \`User\` is an id, a name, an optional email and **every** role the person
holds; a guard lets them through when one of those roles is on its list.

Authentication itself is the app's, not the kit's. Implement this over a session cookie, a JWT,
an OAuth SDK, or a table in memory.`,

  methods: [
    {
      signature: 'currentUser(): Promise<User | null>',
      guarantees:
        '`null` means signed out, and signed out is never an error. Safe to call on mount before anything has subscribed.',
    },
    {
      signature: 'subscribe(listener: (user: User | null) => void): Unsubscribe',
      guarantees: `Calls the listener with the new user on **every** sign-in, sign-up and sign-out, including ones this
caller triggered, and with \`null\` for signed out. Unlike the collection subscriptions, this one
carries its payload: the listener is handed the user rather than re-reading. Returns the function
that detaches it.`,
    },
    {
      signature: 'signIn(email: string, password: string): Promise<User>',
      guarantees: 'Resolves the signed-in user and fires `subscribe` before it does.',
      throws:
        'An `Error` whose `message` the reader is shown as written — *"That password is not right."* Write it for a person, and keep it vague enough not to say whether the address exists if that matters to you.',
    },
    {
      signature: 'signUp(input: SignUpInput): Promise<User>',
      guarantees: `Creates the account and signs it in. \`input.invite\` is the token the reader arrived on, and **it
decides the new role**; without one the store picks its own default. \`password\` is present in
\`password\` mode and absent in \`code\` mode.`,
      throws:
        'An `Error` for a spent or invented invite, and for an address that already has an account. Both messages reach the reader as written.',
    },
    {
      signature: 'requestCode(email: string): Promise<void>',
      guarantees: 'Sends a one-time code to the address. `code` mode only; resolving means sent.',
      throws: 'An `Error` when the address is unknown, if you choose to say so.',
    },
    {
      signature: 'verifyCode(email: string, code: string): Promise<User>',
      guarantees: 'Resolves the signed-in user, the same as `signIn` does, and fires `subscribe`.',
      throws: 'An `Error` whose `message` the reader is shown — *"That code is not right."*',
    },
    {
      signature: 'signOut(): Promise<void>',
      guarantees:
        'Fires `subscribe` with `null`. Signing out while already signed out is not an error.',
    },
    {
      signature: 'listMembers(): Promise<User[]>',
      guarantees:
        'Everyone with an account, each with their whole `roles` list. This is what a Team screen draws.',
    },
    {
      signature: 'invite(role: string): Promise<string>',
      guarantees:
        'Mints an invite for that role and resolves **the URL to hand out**, not the token. The token is the last thing in the URL, and `signUp` accepts it exactly once.',
    },
    {
      signature: 'removeMember(userId: string): Promise<void>',
      guarantees:
        'The member is gone from `listMembers`. Removing the signed-in user signs them out, and `subscribe` fires with `null`.',
      throws: 'An `Error` whose `message` the reader is shown — a last-owner rule reads as one.',
    },
    {
      signature: 'setRole(userId: string, role: string): Promise<void>',
      guarantees:
        '**Replaces** the member’s roles with this one; it does not add to them. Changing the signed-in user’s role fires `subscribe` so a guard re-decides immediately.',
      throws: 'An `Error` whose `message` the reader is shown.',
    },
  ],

  notes: `**Every rejection's \`message\` is shown to the reader exactly as written**, which is why this
interface names them all: *"That password is not right."*, not \`AUTH_002\`.

**\`roles\` is a list, always.** A person can hold several; a guard passes them when any one matches.
\`setRole\` replacing the list rather than appending is deliberate — role editing in the kit is a
single-select control.

**An invite is a URL, and the role rides on it.** The app decides where that URL points; \`Auth\` reads
the token out of \`Route.params\`, which is why the app's navigation adapter has to put a query string
there.

**Nothing here is a permission check.** The adapter says who someone is and what roles they hold; a
component's config says which roles get in.`,

  fake: {
    name: 'fakeIdentity',
    what: `An in-memory member table with one password for everyone and one code for everyone, both stated in
its options so a demo can say them out loud. Invites really round-trip: \`invite()\` hands back a URL
whose token \`signUp()\` accepts exactly once. \`user: null\` starts the app signed out, which is how a
sign-in screen gets to be the first thing a reader sees.

It holds its invites in memory, which is a real limit: an invite link is meant to be opened in
another tab, and that is a cold page load. The showcase wraps the fake to keep open tokens in
\`localStorage\`, and that wrapper is worth copying.`,
    example: `import { Auth, fakeIdentity } from 'golem-ui'

const identity = fakeIdentity({
  user: null,
  members: [
    { id: 'u-1', name: 'Nadia Okonkwo', email: 'nadia@example.com', roles: ['owner'] },
    { id: 'u-2', name: 'Omar Haddad', email: 'omar@example.com', roles: ['mechanic'] },
  ],
  password: 'golem',
  defaultRole: 'mechanic',
})

;<Auth.Guard config={authConfig} adapters={{ identity, navigation }}>
  <App />
</Auth.Guard>`,
  },

  consumers: ['Shell', 'Auth', 'RecordForm', 'Timeline'],
}
