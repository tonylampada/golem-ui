import type { Unsubscribe } from './common'

export interface User {
  id: string
  name: string
  email?: string
  roles: string[]
}

/**
 * Sign-in, sign-up and invite land with the Auth component; Shell only needs to know who is here.
 */
export interface IdentityAdapter {
  currentUser(): Promise<User | null>
  signOut(): Promise<void>
  subscribe(listener: (user: User | null) => void): Unsubscribe
}
