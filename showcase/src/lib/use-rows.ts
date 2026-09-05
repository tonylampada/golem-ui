import { useEffect, useState } from 'react'
import type { RecordsAdapter, RecordQuery } from 'golem-ui'

/**
 * The seam the future Record form component will own. Screens that are still plain markup read
 * their collection through the same adapter `RecordList` uses, so swapping one for a component is
 * a change of markup and nothing else.
 */
export function useRows<T>(records: RecordsAdapter, collection: string, query?: RecordQuery): T[] {
  const [rows, setRows] = useState<T[]>([])

  useEffect(() => {
    let live = true
    const load = () => {
      void records.list<T>(collection, query).then((page) => {
        if (live) setRows(page.rows)
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
