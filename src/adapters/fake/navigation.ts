import type { NavigationAdapter, Route } from '../navigation'
import { createEmitter } from './emitter'

export function fakeNavigation(initial: Route = { path: '/', params: {} }): NavigationAdapter {
  let route = initial
  const emitter = createEmitter<Route>()

  return {
    current: () => route,
    go(path: string) {
      route = { path, params: {} }
      emitter.emit(route)
    },
    subscribe: emitter.subscribe,
  }
}
