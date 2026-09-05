import type { ReactNode } from 'react'
import type { GolemProps } from '../../abi'
import type { User } from '../../adapters'
import { fakeIdentity, fakeNavigation } from '../../adapters/fake'
import { Auth, type AuthAdapters } from './Auth'
import type { AuthConfigInput } from './Auth.config'

export type AuthProps = GolemProps<AuthConfigInput, AuthAdapters>

export interface AuthExample {
  name: string
  summary: string
  props: AuthProps
  /** Which of Auth's three surfaces the example shows. */
  surface: 'screen' | 'guard' | 'account'
  /** Roles the guard lets through; only read when `surface` is `guard`. */
  guardRoles?: string[]
  /** Width the example is meant to be seen at. The card is happy at either end. */
  viewportWidth: number
}

/**
 * Adapters are built once, at module load, so props identity is stable: a component handed a new
 * adapter on every render would re-subscribe and re-read the session on every render. Each example
 * that signs a different person in gets its own adapter, because sessions are stateful.
 */

const roles = [
  { id: 'mechanic', label: 'Mechanic' },
  { id: 'front desk', label: 'Front desk' },
  { id: 'owner', label: 'Owner', manages: true },
]

const owner: User = {
  id: 'u-nadia',
  name: 'Nadia Kessler',
  email: 'nadia@northgatecycles.example',
  roles: ['owner'],
}

const members: User[] = [
  owner,
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
]

const base = { workspaceName: 'Northgate Cycles', roles }

const nowhere = fakeNavigation()

const signedOutAdapters: AuthAdapters = {
  identity: fakeIdentity({ user: null, members, password: 'northgate' }),
  navigation: nowhere,
}

const codeAdapters: AuthAdapters = {
  identity: fakeIdentity({ user: null, members, code: '123456' }),
  navigation: nowhere,
}

/**
 * The invite example stands where a reader who clicked the link stands: an invite the adapter
 * already knows, and a route carrying its token. `invite()` mints exactly this shape at runtime.
 */
const INVITE_TOKEN = 'inv-omar-sent-this'

const inviteAdapters: AuthAdapters = {
  identity: fakeIdentity({ user: null, members, invites: { [INVITE_TOKEN]: 'mechanic' } }),
  navigation: fakeNavigation({ path: '/join', params: { invite: INVITE_TOKEN } }),
}

const adminAdapters: AuthAdapters = {
  identity: fakeIdentity({ user: owner, members }),
  navigation: nowhere,
}

const memberAdapters: AuthAdapters = {
  identity: fakeIdentity({ user: members[1]!, members }),
  navigation: nowhere,
}

const deniedAdapters: AuthAdapters = {
  identity: fakeIdentity({ user: members[1]!, members }),
  navigation: nowhere,
}

export const signedOutPassword: AuthExample = {
  name: 'Signed out (password)',
  summary: 'The default: email and password, with a link to create an account.',
  surface: 'screen',
  viewportWidth: 420,
  props: {
    config: {
      ...base,
      copy: { hint: 'Any of the five shop accounts, password northgate.' },
    },
    adapters: signedOutAdapters,
  },
}

export const signedOutCode: AuthExample = {
  name: 'Signed out (code)',
  summary: 'The same screen in code mode: the address first, then the code that was sent to it.',
  surface: 'screen',
  viewportWidth: 420,
  props: {
    config: {
      ...base,
      mode: 'code',
      allowSignUp: false,
      copy: { hint: 'The fake sends every address the same code: 123456.' },
    },
    adapters: codeAdapters,
  },
}

export const signUpViaInvite: AuthExample = {
  name: 'Sign up via invite link',
  summary: 'Opened on an invite URL: sign-up, with the workspace named and the role already set.',
  surface: 'screen',
  viewportWidth: 420,
  props: {
    config: { ...base, allowSignUp: false, inviteOnly: true },
    adapters: inviteAdapters,
  },
}

export const accountMenu: AuthExample = {
  name: 'Account menu',
  summary: 'What a top bar hosts: the name, and behind it the role and the way out.',
  surface: 'account',
  viewportWidth: 420,
  props: { config: base, adapters: adminAdapters },
}

export const membersAsAdmin: AuthExample = {
  name: 'Members as an admin',
  summary: 'A role that manages: an invite link to mint, a role to change, a member to remove.',
  surface: 'screen',
  viewportWidth: 900,
  props: { config: base, adapters: adminAdapters },
}

export const membersAsMember: AuthExample = {
  name: 'Members as a plain member',
  summary: 'The same list without a role that manages: roles read as tags and nothing removes.',
  surface: 'screen',
  viewportWidth: 900,
  props: { config: base, adapters: memberAdapters },
}

export const guardDenies: AuthExample = {
  name: 'Guard denying a role',
  summary: 'A mechanic on an owners-only screen: the not-allowed card, not the screen.',
  surface: 'guard',
  guardRoles: ['owner'],
  viewportWidth: 420,
  props: {
    config: { ...base, copy: { denied: 'The workspace DNA is the owner’s to edit.' } },
    adapters: deniedAdapters,
  },
}

export const invalidConfig: AuthExample = {
  name: 'Invalid config',
  summary: 'An empty workspace name and a mode that does not exist: the card names both fields.',
  surface: 'screen',
  viewportWidth: 420,
  props: {
    config: { workspaceName: '', mode: 'magic-link' } as unknown as AuthConfigInput,
    adapters: signedOutAdapters,
  },
}

/** What an example renders. Stories and tests both go through here, so neither can drift. */
export function renderExample(example: AuthExample): ReactNode {
  if (example.surface === 'account') return <Auth.AccountMenu {...example.props} />
  if (example.surface === 'guard') {
    return (
      <Auth.Guard {...example.props} roles={example.guardRoles}>
        <p className="p-6 text-sm">The workspace DNA, in full.</p>
      </Auth.Guard>
    )
  }
  return <Auth {...example.props} />
}

export const authExamples = [
  signedOutPassword,
  signedOutCode,
  signUpViaInvite,
  accountMenu,
  membersAsAdmin,
  membersAsMember,
  guardDenies,
  invalidConfig,
]
