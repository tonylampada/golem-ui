/**
 * A locale the platform can actually format with. `en_GB` and `english` are the two an agent
 * writes by mistake, and both would otherwise throw inside `Intl` at render time rather than land
 * on the error card.
 */
export function isFormattableLocale(locale: string): boolean {
  try {
    new Intl.DateTimeFormat(locale)
    return true
  } catch {
    return false
  }
}

/**
 * A time zone `Intl` accepts, or UTC. The zone comes from the `Clock` adapter rather than from the
 * config, so there is no field to name on an error card — a zone the platform does not know falls
 * back rather than throwing mid-render.
 */
export function formattableZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone })
    return timeZone
  } catch {
    return 'UTC'
  }
}
