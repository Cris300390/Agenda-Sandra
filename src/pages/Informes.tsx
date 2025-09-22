// src/pages/Informes.tsx
import { useEffect, useMemo, useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subMonths,
  endOfMonth as eom,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { db } from '../db'

type Movement = {
  id?: number
  type?: 'payment' | 'debt'
  amount: number
  date: string
  studentId?: number
  note?: string
}

// Formateo €
const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(n ?? 0)

/** Convierte a Date de forma segura */
function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d)
}

/** Gráfico de barras SVG sin librerías */
function SvgBarChart({
  title,
  labels,
  values,
  height = 180,
  pad = 16,
}: {
  title: string
  labels: string[]
  values: number[]
  height?: number
  pad?: number
}) {
  const max = Math.max(1, ...values)
  const barGap = 8
  const barWidth = 28
  const innerWidth = values.length * barWidth + (values.length - 1) * barGap
  const width = innerWidth + pad * 2
  const chartHeight = height - pad * 2 - 18

  return (
    <div className="card">
      <div className="card-header">{title}</div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <rect x="0" y="0" width={width} height={height} rx="14" fill="var(--card,#fff)" />
        {[0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = pad + chartHeight * (1 - p)
          return (
            <line
              key={i}
              x1={pad}
              x2={width - pad}
              y1={y}
              y2={y}
              stroke="var(--slot-sep,#eee)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          )
        })}
        {values.map((v, i) => {
          const h = max === 0 ? 0 : (v / max) * chartHeight
          const x = pad + i * (barWidth + barGap)
          const y = pad + chartHeight - h
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={h} rx="8" fill="var(--accent,#e879f9)" />
              <text
                x={x + barWidth / 2}
                y={height - 6}
                fontSize="11"
                textAnchor="middle"
                fill="var(--muted,#6b7280)"
              >
                {labels[i]}
              </text>
              {h > 22 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  fontSize="11"
                  textAnchor="middle"
                  fill="var(--text,#1f2937)"
                >
                  {Math.round(v)}
                </text>
              )}
            </g>
          )
        })}
        <rect x="0" y="0" width={width} height={height} rx="14" fill="none" stroke="rgba(0,0,0,.04)" />
      </svg>
    </div>
  )
}

export default function Informes() {
  const [payments, setPayments] = useState<Movement[]>([])

  // Cargar: intenta tabla "movements" (type='payment'); si no existe, usa "payments" (compatibilidad)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // @ts-ignore
        const hasMovs = typeof db.movements?.toArray === 'function'
        if (hasMovs) {
          // @ts-ignore
          const all: Movement[] = await db.movements.toArray()
          const only = all.filter(
            (m) => (m.type ?? 'payment') === 'payment' && typeof m.amount === 'number' && !!m.date
          )
          if (alive) setPayments(only)
        } else {
          // @ts-ignore
          const hasPays = typeof db.payments?.toArray === 'function'
          if (hasPays) {
            // @ts-ignore
            const old: any[] = await db.payments.toArray()
            const mapped: Movement[] = old
              .filter((p) => typeof p.amount === 'number' && !!p.date)
              .map((p) => ({
                id: p.id,
                type: 'payment',
                amount: p.amount,
                date: p.date,
                studentId: p.studentId,
              }))
            if (alive) setPayments(mapped)
          } else if (alive) setPayments([])
        }
      } catch (e) {
        console.error(e)
        if (alive) setPayments([])
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Mes actual
  const now = new Date()
  const start = startOfMonth(now)
  const end = endOfMonth(now)

  // Total cobrado en el mes actual (solo pagos)
  const totalMes = useMemo(
    () =>
      payments
        .filter((p) => {
          const d = toDate(p.date)
          return d >= start && d <= end
        })
        .reduce((acc, p) => acc + (p.amount || 0), 0),
    [payments, start, end]
  )

  // Cobros por día (mes actual)
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start, end })
    const map = new Map<string, number>()
    for (const d of days) map.set(d.toISOString().slice(0, 10), 0)
    for (const p of payments) {
      const d = toDate(p.date)
      if (d >= start && d <= end) {
        const key = d.toISOString().slice(0, 10)
        map.set(key, (map.get(key) || 0) + (p.amount || 0))
      }
    }
    const labels = days.map((d) => format(d, 'd'))
    const values = days.map((d) => map.get(d.toISOString().slice(0, 10)) || 0)
    return { labels, values }
  }, [payments, start, end])

  // Cobros por mes (últimos 6 meses, incluido el actual)
  const monthlyData = useMemo(() => {
    const months: { s: Date; e: Date }[] = []
    for (let i = 5; i >= 0; i--) {
      const s = startOfMonth(subMonths(now, i))
      months.push({ s, e: eom(s) })
    }
    const labels = months.map((m) => format(m.s, 'MMM', { locale: es }))
    const values = months.map(({ s, e }) =>
      payments
        .filter((p) => {
          const d = toDate(p.date)
          return d >= s && d <= e
        })
        .reduce((acc, p) => acc + (p.amount || 0), 0)
    )
    return { labels, values }
  }, [payments, now])

  return (
    <div className="container informes">
      <header className="header">
        <h1>Informes</h1>
        <p className="sub">Solo cobros. Mes actual: {format(now, "LLLL yyyy", { locale: es })}</p>
      </header>

      <section className="total-card">
        <div className="total-label">Total cobrado este mes</div>
        <div className="total-amount">{eur(totalMes)}</div>
        <div className="total-note">Se actualiza automáticamente con cada pago</div>
      </section>

      <section>
        <SvgBarChart title="Cobros por mes (últimos 6)" labels={monthlyData.labels} values={monthlyData.values} />
      </section>

      <section>
        <SvgBarChart
          title="Cobros por día (mes actual)"
          labels={dailyData.labels}
          values={dailyData.values}
          height={200}
        />
      </section>

      <style>{css}</style>
    </div>
  )
}

const css = `
.container.informes{max-width:920px;margin:0 auto;padding:16px}
.header h1{margin:0 0 4px 0;font-size:clamp(20px,3.8vw,28px)}
.header .sub{margin:0 0 16px 0;color:var(--muted,#6b7280);font-size:14px}
.total-card{background:var(--card,#fff);border-radius:16px;box-shadow:var(--shadow,0 10px 25px rgba(0,0,0,.06));padding:16px;margin:8px 0 16px;border:1px solid rgba(0,0,0,.04)}
.total-label{color:var(--muted,#6b7280);font-size:14px}
.total-amount{font-size:clamp(28px,7vw,44px);font-weight:800;line-height:1.1;margin:6px 0;letter-spacing:-0.5px}
.total-note{color:var(--muted,#6b7280);font-size:12px}
.card{background:var(--card,#fff);border-radius:16px;box-shadow:var(--shadow,0 10px 25px rgba(0,0,0,.06));border:1px solid rgba(0,0,0,.04);overflow:hidden;margin:12px 0}
.card-header{padding:12px 14px;font-weight:600;border-bottom:1px solid rgba(0,0,0,.06);background:linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,0))}
:root{--card:#fff;--muted:#6b7280;--text:#1f2937;--slot-sep:#ede9fe;--accent:#e879f9;--shadow:0 10px 25px rgba(0,0,0,.06)}
@media (prefers-color-scheme: dark){
  :root{--card:#0f1115;--muted:#9aa3af;--text:#e5e7eb;--slot-sep:#1f2937;--shadow:0 10px 25px rgba(0,0,0,.3)}
}
`
