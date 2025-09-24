import { startOfMonth, endOfMonth, subMonths, formatISO } from "date-fns"
import { db } from "../db"

/**
 * Rollover mensual:
 * - Se ejecuta como mucho 1 vez por mes (usa localStorage).
 * - Calcula por alumno la deuda pendiente del MES ANTERIOR (deuda - pagos)
 *   y crea un movimiento 'debt' el 1 del mes actual con ese importe.
 */
export async function monthlyRollover() {
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`
  const doneKey = "rollover.doneFor"

  if (localStorage.getItem(doneKey) === currentMonthKey) return

  const prevStart = startOfMonth(subMonths(now, 1))
  const prevEnd   = endOfMonth(subMonths(now, 1))
  const prevStartISO = formatISO(prevStart, { representation: "date" })
  const prevEndISO   = formatISO(prevEnd,   { representation: "date" })

  const students = await (db as any).students.toArray()

  await db.transaction("rw", (db as any).movements, async () => {
    for (const s of students) {
      const sid = s.id as number
      if (!sid) continue

      const movs = await (db as any).movements
        .where("date")
        .between(prevStartISO, prevEndISO, true, true)
        .and((m: any) => m.studentId === sid)
        .toArray()

      let debt = 0, paid = 0
      for (const m of movs) {
        if (m.type === "debt")    debt += Number(m.amount) || 0
        if (m.type === "payment") paid += Number(m.amount) || 0
      }
      const pending = Math.max(0, debt - paid)
      if (pending <= 0) continue

      const currentMonthStartISO = formatISO(startOfMonth(now), { representation: "date" })
      await (db as any).movements.add({
        studentId: sid,
        date: currentMonthStartISO,
        type: "debt",
        amount: pending,
        note: "Rollover mes anterior",
      })
    }
  })

  localStorage.setItem(doneKey, currentMonthKey)
  window.dispatchEvent(new CustomEvent("data:changed", { detail: { source: "rollover" } }))
}

// Exponer global para que App.tsx la ejecute al cargar
;(window as any).__monthlyRollover = monthlyRollover
