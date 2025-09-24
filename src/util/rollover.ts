import { db } from '../db'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

type Movement = {
  id?: number
  studentId?: number
  date: string           // ISO
  type: 'debt' | 'payment'
  amount: number
  note?: string
}

/**
 * Arrastra la deuda pendiente del mes anterior al mes actual.
 * - Idempotente por mes (usa localStorage).
 * - Calcula por alumno: deuda_mes_anterior - pagos_mes_anterior.
 * - Si pendiente > 0 -> inserta un movimiento 'debt' el día 1 del mes actual.
 */
export async function rolloverDebtsIfNeeded() {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const last = localStorage.getItem('payments.lastRollover')
  if (last === ym) return

  const currStart = startOfMonth(now)
  const prevStart = startOfMonth(subMonths(now, 1))
  const prevEnd   = endOfMonth(prevStart)

  const allMovs: Movement[] = await (db as any).movements.toArray()

  const prevMovs = allMovs.filter(m => {
    const d = new Date(m.date)
    return d >= prevStart && d <= prevEnd
  })

  const totals = new Map<number, { debt: number; pay: number }>()
  for (const m of prevMovs) {
    if (typeof m.studentId !== 'number') continue
    const acc = totals.get(m.studentId) ?? { debt: 0, pay: 0 }
    if (m.type === 'debt') acc.debt += m.amount || 0
    if (m.type === 'payment') acc.pay += m.amount || 0
    totals.set(m.studentId, acc)
  }

  const creations: Movement[] = []
  const rollDate = new Date(currStart.getFullYear(), currStart.getMonth(), 1, 0, 0, 0)

  totals.forEach((acc, studentId) => {
    const pending = Math.max(0, (acc.debt || 0) - (acc.pay || 0))
    if (pending > 0) {
      creations.push({
        studentId,
        date: rollDate.toISOString(),
        type: 'debt',
        amount: pending,
        note: 'Rollover mes anterior',
      })
    }
  })

  if (creations.length > 0) {
    await db.transaction('rw', (db as any).movements, async () => {
      for (const c of creations) await (db as any).movements.add(c)
    })
  }

  localStorage.setItem('payments.lastRollover', ym)
}
