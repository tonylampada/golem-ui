import type { IdentityAdapter, User } from '../identity'
import { createEmitter } from './emitter'

export const fakeUser: User = {
  id: 'u-1',
  name: 'Robin Vale',
  email: 'robin@example.com',
  roles: ['member'],
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
