export interface ClockAdapter {
  now(): Date
  timeZone(): string
}
