import { useEffect, useState } from 'react'
import { list, type StudentApp } from '../data/supaStudents'

export type Option = { value: string; label: string }

export function useStudentsOptions() {
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    list()
      .then((students: StudentApp[]) => {
        if (cancelled) return
        const opts = students
          .filter(s => s.active)
          .sort((a,b)=>a.name.localeCompare(b.name))
          .map(s => ({ value: s.id!, label: s.name }))
        setOptions(opts)
      })
      .catch(e => !cancelled && setError(e?.message ?? String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  return { options, loading, error }
}
