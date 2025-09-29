// src/hooks/useStudentsOptions.ts
import { useEffect, useMemo, useState } from 'react'
import { list as listStudents } from '../data/supaStudents'

// Opción para los <select>
export type StudentOption = { value: string; label: string; active: boolean }

/**
 * Carga alumnos desde Supabase y devuelve opciones ordenadas para los selects.
 * - Solo lista activos (active !== false)
 * - Orden alfabético en español
 */
export function useStudentsOptions() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [students, setStudents] = useState<Array<{ id: string; name: string | null; active?: boolean }>>([])

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        setLoading(true)
        const rows = await listStudents() // ← ya tienes este helper apuntando a Supabase
        if (!cancel) setStudents(rows as any)
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? 'Error cargando alumnos')
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [])

  const options: StudentOption[] = useMemo(() => {
    return students
      .filter(s => s.active !== false)
      .map(s => ({
        value: s.id,
        label: s.name ?? 'Sin nombre',
        active: s.active !== false,
      }))
      .sort((a, b) =>
        (a.label ?? '').localeCompare((b.label ?? ''), 'es', { sensitivity: 'base' })
      )
  }, [students])

  return { options, loading, error, raw: students }
}
