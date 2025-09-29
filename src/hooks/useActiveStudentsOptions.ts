import { useEffect, useState } from "react"
import { listActive, type StudentApp as Student } from "../data/supaStudents"

export type SelectOption = { value: string; label: string }

/** Opciones <select> de alumnos ACTIVOS. label usa `nombre` o `name`. */
export function useActiveStudentsOptions() {
  const [options, setOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const students: Student[] = await listActive()
        const opts = (students ?? []).map(s => ({
          value: s.id,
          label: ((s as any).nombre ?? (s as any).name ?? "").trim() || "Sin nombre"
        }))
        setOptions(opts)
        setError(null)
      } catch (e: any) {
        setError(e?.message ?? "Error al cargar alumnos")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return { options, loading, error }
}
