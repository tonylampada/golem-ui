import type { Unsubscribe } from '../common'

/** Shared listener bookkeeping for the fakes; not part of the public adapter surface. */
export function createEmitter<T>() {
  const listeners = new Set<(value: T) => void>()
  return {
    subscribe(listener: (value: T) => void): Unsubscribe {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    emit(value: T) {
      for (const listener of listeners) listener(value)
    },
  }
}
