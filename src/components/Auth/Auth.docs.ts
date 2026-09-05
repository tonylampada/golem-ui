import type { ComponentDocs } from '../../abi'

export const authDocs: ComponentDocs = {
  name: 'Auth',
  slug: 'auth',
  storybookPath: 'components-auth',
  tagline:
    'The door and the guest list: sign-in, sign-up, invites, the member list, and a role guard.',

  purpose: `\`Auth\` is everything a multi-user app needs around identity, so the app writes no login code. It is
three surfaces on one config:

- **\`<Auth />\`** — the screen. Signed out it is sign-in, sign-up and the invite landing; signed in it
  is the member list, with roles and removals for whoever is allowed to manage them.
- **\`<Auth.Guard roles={[...]}>\`** — wraps what only some roles may see. It renders the sign-in
  screen to a stranger, a not-allowed card to the wrong role, and the children to the right one.
- **\`<Auth.AccountMenu />\`** — the name, the role and the way out. It goes in \`Shell\`'s \`account\`
  slot.

Wrap the whole app in one \`Guard\` with no \`roles\` to make signing in the front door, and put a
narrower \`Guard\` around each screen that needs one. For a profile page, a settings form, or an
organisation switcher, reach for something else: Auth is the door and the guest list, not the
account.`,

  configNotes: [
    `\`roles\` carries the whole role model. Each entry is \`{ id, label, manages }\`: \`id\` is what a \`Guard\`
lists and what \`setRole\` writes, \`label\` is what a person reads, and \`manages\` marks the roles that
may invite, re-role and remove. The **first entry is the default** — what someone who signs up
without an invite becomes, and what the invite control offers first.

\`copy\` overrides labels one at a time; everything you leave out keeps its default.`,
  ],

  adapters: [
    {
      adapter: 'Identity',
      calls: '`currentUser()`, `subscribe()`',
      why: 'Who is here on mount, and every later flip. All three surfaces read it.',
    },
    {
      adapter: 'Identity',
      calls: '`signIn()`, `signOut()`',
      why: 'The password mode, and the way out of both the account menu and the not-allowed card.',
    },
    {
      adapter: 'Identity',
      calls: '`requestCode()`, `verifyCode()`',
      why: 'The `code` mode: the address first, the one-time code second.',
    },
    {
      adapter: 'Identity',
      calls: '`signUp()`',
      why: 'Sign-up, carrying the invite token when the reader arrived on a link.',
    },
    {
      adapter: 'Identity',
      calls: '`listMembers()`, `invite()`, `setRole()`, `removeMember()`',
      why: 'The member list and what a managing role does to it.',
    },
    {
      adapter: 'Navigation',
      calls: '`current()`, `subscribe()`',
      why: "Reads `params.invite` — the app's router is what knows how its own URLs are shaped.",
    },
  ],

  adapterNotes: `Auth takes no other adapter. It never fetches, never stores, and never reads \`window\`.

**Refusals are prose, not codes.** Any Identity method may reject with an \`Error\`, and Auth prints
its \`message\` under the form exactly as written. Write those messages for the person reading them.

**Invite links round-trip through the router.** \`invite(role)\` returns a URL whose token is the last
thing in it. The reader opens that URL, the app's Navigation adapter parses the token into
\`params.invite\`, and Auth opens sign-up with the workspace named and the role already decided.
An app whose router does not put query parameters into \`Route.params\` never sees the invite.`,

  example: `import { Auth, Shell, fakeIdentity, fakeNavigation } from 'golem-ui'
import 'golem-ui/styles.css'

const config = {
  workspaceName: 'Northgate Cycles',
  mode: 'password',
  allowSignUp: false,
  inviteOnly: true,
  roles: [
    { id: 'mechanic', label: 'Mechanic' },
    { id: 'front desk', label: 'Front desk' },
    { id: 'owner', label: 'Owner', manages: true },
  ],
  copy: { hint: 'Any of the five shop accounts, password northgate.' },
}

const adapters = { identity: fakeIdentity(), navigation: fakeNavigation() }

;<Auth.Guard config={config} adapters={adapters}>
  <Shell
    config={{ title: 'Northgate Cycles' }}
    adapters={adapters}
    account={<Auth.AccountMenu config={config} adapters={adapters} />}
    canvas={
      <Auth.Guard config={config} adapters={adapters} roles={['owner']}>
        <DnaScreen />
      </Auth.Guard>
    }
  />
</Auth.Guard>`,

  failureModes: `- **Invalid config.** Auth renders an error card instead of the screen, in dev and in prod, naming
  every field that failed. An unknown field is a failure too — \`allowsignup\` does not quietly become
  \`allowSignUp\`.
- **The adapter refuses.** Whatever the rejection's \`message\` says is what appears under the form,
  and the form keeps what was typed so it can be corrected. A rejection with no message reads
  "Something went wrong. Try again."
- **\`inviteOnly\` with no invite in the route.** There is no way to sign up, and the screen says so.
  That is the setting working; if it is a surprise, the router is not putting \`?invite=\` into
  \`Route.params\`.
- **A used invite.** Tokens are single-use. A second sign-up on the same link is refused by the
  adapter, and the refusal shows under the form like any other.
- **\`Guard\` while the session is still loading.** It renders nothing rather than flashing the
  sign-in screen at someone who is already signed in. A guard around a whole app is therefore blank
  for one tick.
- **A role that no longer exists.** A member holding a role that is not in \`roles\` reads as the raw
  id in the list, and a \`Guard\` that does not list it turns them away. Changing \`roles\` does not
  migrate anyone; \`setRole\` does.
- **Removing yourself.** The button is not drawn on your own row, because the way out of a workspace
  is signing out, not deleting the last managing account.
- **A new adapter object on every render.** Auth re-subscribes when \`adapters\` changes identity,
  which re-reads the session and the member list. Build adapters once, outside render.`,
}
