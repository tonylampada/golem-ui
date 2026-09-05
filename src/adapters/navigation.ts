import type { Unsubscribe } from './common'

export interface Route {
  path: string
  params: Record<string, string>
}

export interface NavigationAdapter {
  current(): Route
  go(path: string): void
  subscribe(listener: (route: Route) => void): Unsubscribe
}
