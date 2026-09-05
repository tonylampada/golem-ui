import type { IdentityAdapter, SignUpInput, User } from '../identity'
import { createEmitter } from './emitter'

export const fakeUser: User = {
  id: 'u-1',
  name: 'Robin Vale',
  email: 'robin@example.com',
  roles: ['member'],
}

export interface FakeIdentityOptions {
  /** Who is signed in on mount. Omit and it is the first member; `null` starts the app signed out. */
  user?: User | null
  /** The member table the list, invite and remove all work on. Defaults to `[fakeUser]`. */
  members?: User[]
  /** The one password every member accepts, so a demo can say it out loud. */
  password?: string
  /** The one code `requestCode` always "sends". */
  code?: string
  /** Role given to someone who signs up without an invite. */
  defaultRole?: string
  /** What `invite()` prefixes the token with. The token is the last thing in the URL. */
  inviteBase?: string
  /** Invites that already exist, token to role, so an example can open on a link nobody minted. */
  invites?: Record<string, string>
}

/**
 * The in-memory Identity adapter: a member table, a signed-in user, and invite tokens that really
 * round-trip — `invite()` hands back a URL whose token `signUp()` accepts exactly once.
 */
export function fakeIdentity(options: FakeIdentityOptions = {}): IdentityAdapter {
  const password = options.password ?? 'golem'
  const code = options.code ?? '123456'
  const defaultRole = options.defaultRole ?? 'member'
  const inviteBase = options.inviteBase ?? 'https://app.example/#/join?invite='

  const members = (options.members ?? [fakeUser]).map((member) => ({ ...member }))
  let user = options.user === undefined ? (members[0] ?? null) : options.user
  const invites = new Map<string, string>(Object.entries(options.invites ?? {}))
  const emitter = createEmitter<User | null>()
  let nextId = 1

  const find = (email: string) =>
    members.find((member) => member.email?.toLowerCase() === email.trim().toLowerCase())

  const enter = (member: User) => {
    user = { ...member }
    emitter.emit(user)
    return user
  }

  return {
    async currentUser() {
      return user && { ...user }
    },
    subscribe: emitter.subscribe,

    async signIn(email, given) {
      const member = find(email)
      if (!member) throw new Error('We do not know that email address.')
      if (given !== password) throw new Error('That password is not right.')
      return enter(member)
    },

    async signUp(input: SignUpInput) {
      let role = defaultRole
      if (input.invite !== undefined) {
        const invited = invites.get(input.invite)
        if (!invited) throw new Error('That invite link has already been used, or never existed.')
        invites.delete(input.invite)
        role = invited
      }
      if (find(input.email)) throw new Error('There is already an account with that email address.')
      const member: User = {
        id: `u-fake-${nextId++}`,
        name: input.name.trim(),
        email: input.email.trim(),
        roles: [role],
      }
      members.push(member)
      return enter(member)
    },

    async requestCode(email) {
      if (!find(email)) throw new Error('We do not know that email address.')
    },

    async verifyCode(email, given) {
      const member = find(email)
      if (!member) throw new Error('We do not know that email address.')
      if (given.trim() !== code) throw new Error('That code is not right.')
      return enter(member)
    },

    async signOut() {
      user = null
      emitter.emit(user)
    },

    async listMembers() {
      return members.map((member) => ({ ...member }))
    },

    async invite(role) {
      const token = `inv-${nextId++}`
      invites.set(token, role)
      return `${inviteBase}${token}`
    },

    async removeMember(userId) {
      const index = members.findIndex((member) => member.id === userId)
      if (index !== -1) members.splice(index, 1)
      if (user?.id === userId) {
        user = null
        emitter.emit(user)
      }
    },

    async setRole(userId, role) {
      const member = members.find((entry) => entry.id === userId)
      if (!member) throw new Error(`fakeIdentity: no member ${userId}`)
      member.roles = [role]
      if (user?.id === userId) enter(member)
    },
  }
}
