import type { Unsubscribe } from './common'

export interface User {
  id: string
  name: string
  email?: string
  /** Every role this person holds. A guard lets them through when one of these is on its list. */
  roles: string[]
}

/** What creating an account needs. */
export interface SignUpInput {
  name: string
  email: string
  /** Asked for in `password` mode and absent in `code` mode. */
  password?: string
  /** The token from an invite link, when the reader arrived on one. It decides the new role. */
  invite?: string
}

/**
 * Identity is who is here, how they got here, and who else may come in.
 *
 * Every method that can be refused rejects with an `Error` whose `message` is shown to the reader
 * as it is written — so write those messages for a person: "That password is not right."
 */
export interface IdentityAdapter {
  currentUser(): Promise<User | null>
  /** Called with the new user on every sign-in, sign-up and sign-out; `null` means signed out. */
  subscribe(listener: (user: User | null) => void): Unsubscribe
  signIn(email: string, password: string): Promise<User>
  signUp(input: SignUpInput): Promise<User>
  /** Sends a one-time code to the address. `code` mode only. */
  requestCode(email: string): Promise<void>
  verifyCode(email: string, code: string): Promise<User>
  signOut(): Promise<void>
  listMembers(): Promise<User[]>
  /** Mints an invite for that role and returns the URL to hand out. */
  invite(role: string): Promise<string>
  removeMember(userId: string): Promise<void>
  /** Replaces the member's roles with this one. */
  setRole(userId: string, role: string): Promise<void>
}
