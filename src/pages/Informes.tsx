// src/pages/Informes.tsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import { addDays, endOfDay, format, parseISO, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { liveQuery } from 'dexie'

type DayRow = {
  hour: string
  studentName: string
  durationMin: number
  income: number
}

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0)

export default function Informes() {
  const [date, setDate] = useState<Date>(() => new Date())
  const [rows, setRows] = useState<DayRow[]>([])
  const [summary, setSummary] = useState({ classes: 0, hours: 0, income: 0 })

  useEffect(() => {
    const start = startOfDay(date)
    const end = endOfDay(date)
    const anyDb = db as any

    // Suscripción reactiva: si cambian clases, alumnos, pagos o movimientos → recalculamos
    const sub = liveQuery(async () => {
      const [classes, students] = await Promise.all([
        db.classes.toArray(),
        db.students.toArray(),
      ])
      const movs = anyDb.movements?.toArray ? await anyDb.movements.toArray() : []
      const pays = anyDb.payments?.toArray ? await anyDb.payments.toArray() : []
      return { classes, students, movs, pays }
    }).subscribe({
      next: ({ classes, students, movs, pays }) => {
        // 1) Filtrar clases del día (que no estén canceladas/noShow)
        const classesToday = classes.filter((c: any) => {
          const s = parseISO(c.start)
          return s >= start && s <= end && !c.canceled && !c.noShow
        })

        // 2) Calcular pagos del día por rango (robusto con zona horaria)
        let paymentsToday = 0
        const paymentsByStudent: Record<number, number> = {}
        const addPayment = (studentId: number | undefined, rawAmount: any, rawDate: any) => {
          if (!rawDate) return
          const d = typeof rawDate === 'string' ? parseISO(rawDate) : new Date(rawDate)
          if (d < start || d > end) return
          const amount = Number(rawAmount) || 0
          paymentsToday += amount
          const sid = typeof studentId === 'number' ? studentId : -1
          if (sid > -1) paymentsByStudent[sid] = (paymentsByStudent[sid] ?? 0) + amount
        }

        // movements (nueva)
        movs.forEach((m: any) => {
          if (m?.type === 'payment') addPayment(m.studentId, m.amount, m.date)
        })
        // payments (legacy) solo si no hubo en movements
        if (paymentsToday === 0) {
          pays.forEach((p: any) => addPayment(p.studentId, p.amount, p.date))
        }

        // 3) Filas para la tabla del día
        const rowsBuilt: DayRow[] = classesToday.map((cls: any) => {
          const st = students.find((s: any) => s.id === cls.studentId)
          const startD = parseISO(cls.start)
          const endD = parseISO(cls.end)
          const durationMin = Math.max(0, Math.round((+endD - +startD) / 60000))
          const incomeForStudent = paymentsByStudent[cls.studentId!] ?? 0

          return {
            hour: format(startD, 'HH:mm', { locale: es }),
            studentName: st?.name ?? '—',
            durationMin,
            income: incomeForStudent,
          }
        })

        // 4) Resumen superior
        const totalMinutes = rowsBuilt.reduce((a, r) => a + r.durationMin, 0)
        setSummary({
          classes: rowsBuilt.length,
          hours: Math.round((totalMinutes / 60) * 10) / 10,
          income: Math.round(paymentsToday * 100) / 100,
        })
        setRows(rowsBuilt)
      },
      error: (e) => console.error('Informes liveQuery error:', e),
    })

    return () => sub.unsubscribe()
  }, [date])

  const dateStr = useMemo(() => format(date, "EEEE d 'de' MMMM", { locale: es }), [date])

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>🗓️ Resumen del día — {dateStr}</h2>
        <div className="toolbar">
          <button onClick={() => setDate(addDays(date, -1))}>← Anterior</button>
          <button onClick={() => setDate(new Date())}>🏠 Hoy</button>
          <button onClick={() => setDate(addDays(date, 1))}>Siguiente →</button>
          <input
            type="date"
            value={format(date, 'yyyy-MM-dd')}
            onChange={e => setDate(parseISO(e.target.value))}
          />
          <div className="stats">
            <span>📚 {summary.classes} clases</span>
            <span>⏱️ {summary.hours} h</span>
            <span>💶 {eur(summary.income)}</span>
          </div>
        </div>
      </div>

      <div className="table">
        <div className="thead">
          <div>Hora</div>
          <div>Alumno</div>
          <div>Duración</div>
          <div>Ingresos</div>
        </div>
        {rows.map((r, i) => (
          <div className="trow" key={i}>
            <div>{r.hour}</div>
            <div>{r.studentName}</div>
            <div>{r.durationMin} min</div>
            <div>{eur(r.income)}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="empty">No hay clases este día.</div>}
      </div>
    </div>
  )
}
