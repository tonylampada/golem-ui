import type { ClockAdapter } from '../clock'

/** Frozen by default so time-based views render the same in every story and every test run. */
export function fakeClock(
  fixed: Date = new Date('2026-01-01T09:00:00Z'),
  timeZone = 'UTC',
): ClockAdapter {
  return {
    now: () => new Date(fixed),
    timeZone: () => timeZone,
  }
}
