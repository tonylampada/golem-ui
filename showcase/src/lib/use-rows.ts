import { useEffect, useState } from 'react'
import type { RecordsAdapter, RecordQuery } from 'golem-ui'

/**
 * The seam the future Record list and Record form components will own. Until they exist, the
 * screens read the same collections through the same adapter, so swapping a screen for a component
 * is a change of markup and nothing else.
 */
export function useRows<T>(records: RecordsAdapter, collection: string, query?: RecordQuery): T[] {
  const [rows, setRows] = useState<T[]>([])

  useEffect(() => {
    let live = true
    const load = () => {
      void records.list<T>(collection, query).then((next) => {
        if (live) setRows(next)
      })
    }
    load()
    const unsubscribe = records.subscribe(collection, load)
    return () => {
      live = false
      unsubscribe()
    }
  }, [records, collection, query])

  return rows
}
