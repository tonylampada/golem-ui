import type { IdentityAdapter, User } from '../identity'
import { createEmitter } from './emitter'

export const fakeUser: User = {
  id: 'u-1',
  name: 'Ana Ribeiro',
  email: 'ana@example.com',
  roles: ['therapist'],
}

export function fakeIdentity(initial: User | null = fakeUser): IdentityAdapter {
  let user = initial
  const emitter = createEmitter<User | null>()

  return {
    async currentUser() {
      return user
    },
    async signOut() {
      user = null
      emitter.emit(user)
    },
    subscribe: emitter.subscribe,
  }
}
