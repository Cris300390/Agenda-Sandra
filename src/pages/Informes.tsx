// src/pages/Informes.tsx
import { useEffect, useMemo, useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfYear,
  endOfYear,
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

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n ?? 0)

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d)
}

/** Bar chart en SVG sin librerías */
function SvgBarChart({
  title, labels, values, height = 200, pad = 16,
}: { title: string; labels: string[]; values: number[]; height?: number; pad?: number }) {
  const max = Math.max(1, ...values)
  const gap = 8
  const barW = Math.max(20, Math.floor(260 / Math.max(1, values.length)))
  const innerW = values.length * barW + (values.length - 1) * gap
  const width = innerW + pad * 2
  const chartH = height - pad * 2 - 18
  return (
    <div className="card">
      <div className="card-header">{title}</div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <rect x="0" y="0" width={width} height={height} rx="14" fill="var(--card,#fff)"/>
        {[0.25,0.5,0.75,1].map((p,i)=> {
          const y = pad + chartH * (1-p)
          return <line key={i} x1={pad} x2={width-pad} y1={y} y2={y} stroke="var(--slot-sep,#eee)" strokeDasharray="4 4"/>
        })}
        {values.map((v,i)=> {
          const h = max===0?0:(v/max)*chartH
          const x = pad + i*(barW+gap)
          const y = pad + chartH - h
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} rx="8" fill="var(--accent,#e879f9)"/>
              <text x={x+barW/2} y={height-6} fontSize="11" textAnchor="middle" fill="var(--muted,#6b7280)">{labels[i]}</text>
              {h>22 && <text x={x+barW/2} y={y-4} fontSize="11" textAnchor="middle" fill="var(--text,#111827)">{Math.round(v)}</text>}
            </g>
          )
        })}
        <rect x="0" y="0" width={width} height={height} rx="14" fill="none" stroke="rgba(0,0,0,.05)"/>
      </svg>
    </div>
  )
}

export default function Informes() {
  const [payments, setPayments] = useState<Movement[]>([])
  const [year, setYear] = useState<number>(() => new Date().getFullYear())

  // Carga (movements -> payments legacy)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // @ts-ignore
        const hasMovs = typeof db.movements?.toArray === 'function'
        if (hasMovs) {
          // @ts-ignore
          const all: Movement[] = await db.movements.toArray()
          const only = all.filter(m => (m.type ?? 'payment') === 'payment' && typeof m.amount === 'number' && !!m.date)
          if (alive) setPayments(only)
        } else {
          // @ts-ignore
          const hasPays = typeof db.payments?.toArray === 'function'
          if (hasPays) {
            // @ts-ignore
            const old: any[] = await db.payments.toArray()
            const mapped: Movement[] = old
              .filter(p => typeof p.amount === 'number' && !!p.date)
              .map(p => ({ id: p.id, type: 'payment', amount: p.amount, date: p.date, studentId: p.studentId }))
            if (alive) setPayments(mapped)
          } else if (alive) setPayments([])
        }
      } catch {
        if (alive) setPayments([])
      }
    })()
    return () => { alive = false }
  }, [])

  // Mes actual (total + diario)
  const now = new Date()
  const mStart = startOfMonth(now)
  const mEnd = endOfMonth(now)

  const totalMes = useMemo(() =>
    payments
      .filter(p => { const d = toDate(p.date); return d >= mStart && d <= mEnd })
      .reduce((a,p) => a + (p.amount || 0), 0)
  , [payments, mStart, mEnd])

  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: mStart, end: mEnd })
    const map = new Map<string, number>()
    for (const d of days) map.set(d.toISOString().slice(0,10), 0)
    for (const p of payments) {
      const d = toDate(p.date)
      if (d >= mStart && d <= mEnd) {
        const key = d.toISOString().slice(0,10)
        map.set(key, (map.get(key) || 0) + (p.amount || 0))
      }
    }
    return {
      labels: days.map(d => format(d,'d')),
      values: days.map(d => map.get(d.toISOString().slice(0,10)) || 0)
    }
  }, [payments, mStart, mEnd])

  // Anual (selector de año)
  const yStart = startOfYear(new Date(year,0,1))
  const yEnd = endOfYear(new Date(year,0,1))
  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  const yearlyData = useMemo(() => {
    const sums = Array(12).fill(0) as number[]
    for (const p of payments) {
      const d = toDate(p.date)
      if (d < yStart || d > yEnd) continue
      sums[d.getMonth()] += p.amount || 0
    }
    return { labels: monthNames, values: sums }
  }, [payments, yStart, yEnd])

  const yearOptions = useMemo(() => {
    const thisY = new Date().getFullYear()
    const min = 2024, max = thisY + 2
    const arr: number[] = []
    for (let y = min; y <= max; y++) arr.push(y)
    return arr
  }, [])

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

      <div className="year-bar">
        <div className="year-left"><button onClick={() => setYear(y => y - 1)}>← Año anterior</button></div>
        <div className="year-center">
          <label>Año:&nbsp;</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="year-right"><button onClick={() => setYear(y => y + 1)}>Año siguiente →</button></div>
      </div>

      <section>
        <SvgBarChart title={`Cobros por mes — ${year}`} labels={yearlyData.labels} values={yearlyData.values} height={220}/>
      </section>

      <section>
        <SvgBarChart title="Cobros por día (mes actual)" labels={dailyData.labels} values={dailyData.values} height={200}/>
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
.year-bar{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin:8px 0 4px}
.year-left{text-align:left}.year-center{text-align:center}.year-right{text-align:right}
:root{--card:#fff;--muted:#6b7280;--text:#1f2937;--slot-sep:#ede9fe;--accent:#e879f9;--shadow:0 10px 25px rgba(0,0,0,.06)}
@media (prefers-color-scheme: dark){
  :root{--card:#0f1115;--muted:#9aa3af;--text:#e5e7eb;--slot-sep:#1f2937;--shadow:0 10px 25px rgba(0,0,0,.3)}
}
`
