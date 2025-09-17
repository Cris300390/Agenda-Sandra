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

type DebugPay = {
  source: 'movements' | 'payments'
  sid: number | null
  studentName: string
  amount: number
  rawDate: any
  parsed: Date | null
  included: boolean
}

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0)

// ---- Helpers robustos ----
function asDate(v: any): Date | null {
  if (!v) return null
  if (v instanceof Date && !isNaN(+v)) return v
  if (typeof v === 'number') return new Date(v)
  if (typeof v === 'string') {
    const d = parseISO(v) // soporta 'YYYY-MM-DD' e ISO con/ sin Z
    return isNaN(+d) ? null : d
  }
  return null
}
function num(v: any): number {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v)
  return Number.isFinite(n) ? n : 0
}
function sidOf(v: any): number | null {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}
function inRange(d: Date, start: Date, end: Date) {
  return d >= start && d <= end
}

export default function Informes() {
  const [date, setDate] = useState<Date>(() => new Date())
  const [rows, setRows] = useState<DayRow[]>([])
  const [summary, setSummary] = useState({ classes: 0, hours: 0, income: 0 })
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugList, setDebugList] = useState<DebugPay[]>([])

  useEffect(() => {
    const start = startOfDay(date)
    const end = endOfDay(date)
    const anyDb = db as any

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
        // 1) Clases del día (activas)
        const classesToday = classes.filter((c: any) => {
          const s = parseISO(c.start)
          return s >= start && s <= end && !c.canceled && !c.noShow
        })

        // 2) Recolectar pagos (con depuración)
        const dbg: DebugPay[] = []

        const pushDbg = (source: 'movements' | 'payments', studentId: any, amountRaw: any, dateRaw: any) => {
          const parsed = asDate(dateRaw)
          const included = parsed ? inRange(parsed, start, end) : false
          const sid = sidOf(studentId)
          const st = sid !== null ? students.find((s: any) => s.id === sid) : null
          dbg.push({
            source,
            sid,
            studentName: st?.name ?? (sid !== null ? `#${sid}` : '—'),
            amount: num(amountRaw),
            rawDate: dateRaw,
            parsed: parsed ?? null,
            included
          })
        }

        // movements: aceptamos type === 'payment' o registros con amount>0
        movs.forEach((m: any) => {
          if (m?.type && m.type !== 'payment') return
          const dateRaw = m?.date ?? m?.paidAt ?? m?.createdAt ?? m?.timestamp
          pushDbg('movements', m?.studentId, m?.amount ?? m?.value, dateRaw)
        })

        // payments (legacy)
        pays.forEach((p: any) => {
          const dateRaw = p?.date ?? p?.paidAt ?? p?.createdAt ?? p?.timestamp
          pushDbg('payments', p?.studentId, p?.amount ?? p?.value, dateRaw)
        })

        // 3) Sumar únicamente los incluidos en el día
        let paymentsToday = 0
        const paymentsByStudent: Record<number, number> = {}
        dbg.forEach(d => {
          if (!d.included || !d.amount) return
          paymentsToday += d.amount
          if (d.sid !== null) paymentsByStudent[d.sid] = (paymentsByStudent[d.sid] ?? 0) + d.amount
        })

        // 4) Filas del día
        const rowsBuilt: DayRow[] = classesToday.map((cls: any) => {
          const st = students.find((s: any) => s.id === cls.studentId)
          const startD = parseISO(cls.start)
          const endD = parseISO(cls.end)
          const durationMin = Math.max(0, Math.round((+endD - +startD) / 60000))
          const sid = sidOf(cls.studentId)
          const incomeForStudent = sid !== null ? paymentsByStudent[sid] ?? 0 : 0

          return {
            hour: format(startD, 'HH:mm', { locale: es }),
            studentName: st?.name ?? '—',
            durationMin,
            income: incomeForStudent,
          }
        })

        // 5) Actualizar estado (resumen, filas y depuración)
        const totalMinutes = rowsBuilt.reduce((a, r) => a + r.durationMin, 0)
        setSummary({
          classes: rowsBuilt.length,
          hours: Math.round((totalMinutes / 60) * 10) / 10,
          income: Math.round(paymentsToday * 100) / 100,
        })
        setRows(rowsBuilt)
        setDebugList(dbg)
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
          <button onClick={() => setDebugOpen(v => !v)} style={{ marginLeft: 8 }}>
            {debugOpen ? '🔧 Ocultar pagos del día' : '🔎 Ver pagos del día'}
          </button>
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

      {debugOpen && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-header"><h3>🔎 Pagos detectados hoy</h3></div>
          <div className="table">
            <div className="thead">
              <div>Origen</div>
              <div>Alumno</div>
              <div>Importe</div>
              <div>Fecha (raw)</div>
              <div>Fecha (parseada)</div>
              <div>¿Incluido?</div>
            </div>
            {debugList.filter(d => d.amount).map((d, i) => (
              <div className="trow" key={i}>
                <div>{d.source}</div>
                <div>{d.studentName}</div>
                <div>{eur(d.amount)}</div>
                <div style={{ fontFamily: 'monospace' }}>{String(d.rawDate ?? '—')}</div>
                <div style={{ fontFamily: 'monospace' }}>
                  {d.parsed ? format(d.parsed, 'yyyy-MM-dd HH:mm') : '—'}
                </div>
                <div>{d.included ? '✅' : '❌'}</div>
              </div>
            ))}
            {debugList.length === 0 && <div className="empty">No hay pagos guardados.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
