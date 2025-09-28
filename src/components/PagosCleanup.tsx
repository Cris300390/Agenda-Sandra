import { useState } from "react"
import { useStudentsOptions } from '../hooks/useStudentsOptions'
import { supa } from "../data/supaClient"
import { useToast } from "../ui/Toast"

type Props = { monthKey?: string; onChanged?: () => void }

export default function PagosCleanup({ monthKey, onChanged }: Props) {
  const { options, loading, error: studentsError } = useStudentsOptions();
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const currentKey = monthKey ?? new Date().toISOString().slice(0, 7)

  async function wipeMonth() {
  const { options, loading, error: studentsError } = useStudentsOptions();
    const ok = await toast.confirm({
      title: "Borrar historial del mes",
      // Ojo: sin template literals para no romper al pegar por terminal
      message: "Se eliminarán TODOS los movimientos con month_key = " + currentKey + ". Esta acción no se puede deshacer.",
      confirmText: "Borrar",
      cancelText: "Cancelar",
      tone: "danger",
    })
    if (!ok) return
    try {
      setBusy(true)
      const { error } = await supa.from("movimientos").delete().eq("month_key", currentKey)
      if (error) throw error
      toast.success("Hecho", "Se borró el histórico de " + currentKey + ".")
      onChanged?.(); window.dispatchEvent(new Event("data:changed"))
    } catch (e: any) {
      toast.error("No se pudo borrar", e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  async function removeOrphans() {
  const { options, loading, error: studentsError } = useStudentsOptions();
    const ok = await toast.confirm({
      title: "Limpiar movimientos huérfanos",
      message: "Se eliminarán los movimientos sin alumno o asociados a un alumno inexistente.",
      confirmText: "Limpiar",
      cancelText: "Cancelar",
    })
    if (!ok) return
    try {
      setBusy(true)
      const { data: students, error: e1 } = await supa.from("alumnos").select("id")
      if (e1) throw e1
      const valid = new Set<number>((students ?? []).map((s: any) => s.id))

      const { data: movs, error: e2 } = await supa.from("movimientos").select("id, student_id")
      if (e2) throw e2
      const ids: number[] = (movs ?? [])
        .filter((m: any) => !m.student_id || !valid.has(m.student_id))
        .map((m: any) => m.id)

      if (ids.length === 0) {
        toast.info("Nada que limpiar", "No se encontraron movimientos huérfanos.")
      } else {
        const chunk = 1000
        for (let i = 0; i < ids.length; i += chunk) {
          const slice = ids.slice(i, i + chunk)
          const { error } = await supa.from("movimientos").delete().in("id", slice)
          if (error) throw error
        }
        toast.success("Limpieza completada", ids.length + " movimientos eliminados.")
        onChanged?.(); window.dispatchEvent(new Event("data:changed"))
      }
    } catch (e: any) {
      toast.error("No se pudo limpiar", e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="block">
      <strong style={{ display:"block", marginBottom: 8 }}>Mantenimiento de pagos</strong>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
        <button disabled={busy} onClick={wipeMonth}
          style={{ padding:"10px 14px", borderRadius:12, border:"1px solid #fecaca", background:"#fee2e2", color:"#b91c1c", fontWeight:800 }}>
          Borrar historial del mes
        </button>
        <button disabled={busy} onClick={removeOrphans}
          style={{ padding:"10px 14px", borderRadius:12, border:"1px solid #fdba74", background:"#fff7ed", color:"#9a3412", fontWeight:800 }}>
          Limpiar movimientos huérfanos
        </button>
      </div>
    </section>
  )
}






