// src/pages/Informes.tsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type { Student } from '../db'
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

/* ============== Tipos y utilidades ============== */
type Movement = {
  id?: number
  studentId?: number
  date: string        // ISO
  type: 'debt' | 'payment'
  amount: number
}

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0)

const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

/* ===================== Página ===================== */
export default function InformesPage() {
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

      {/* Cabecera + selects + totales + reset */}
      <div className="rep-card">
        <div className="rep-head">
          <div>
            <div className="muted">Solo cobros • Vista {format(new Date(year, month, 1), "LLLL yyyy", { locale: es })}</div>
            <div className="rep-stats" style={{marginTop:8}}>
              <div className="rep-stat">
                <h5>Total cobrado este mes</h5>
                <div className="big">{eur(totalMonth)}</div>
              </div>
              <div className="rep-stat">
                <h5>Total cobrado este año</h5>
                <div className="big">{eur(totalYear)}</div>
              </div>
            </div>
          </div>

          <div style={{ display:'grid', gap:10 }}>
            <div className="rep-selects">
              <label>
                <span className="muted" style={{fontSize:12, display:'block'}}>Año</span>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <label>
                <span className="muted" style={{fontSize:12, display:'block'}}>Mes</span>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>
                      {m[0].toUpperCase()+m.slice(1)} {dataMonths[i].total>0 ? `— ${eur(dataMonths[i].total)}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Botón Reset + aviso */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setConfirmOpen(true)}
                style={{
                  background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontWeight: 900,
                  boxShadow: '0 10px 20px rgba(239,68,68,.25)',
                  cursor: 'pointer',
                }}
                title="Borrar todos los cobros (solo pagos)"
              >
                Resetear informes
              </button>
              <span className="muted" style={{ fontSize: 12 }}>
                Esta acción borra <strong>solo cobros</strong>. Las deudas no se tocan.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfica: meses del año */}
      <div className="rep-card">
        <h3 style={{ margin:'0 0 10px' }}>Cobros por mes — {year}</h3>
        <div style={{ width:'100%', height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={dataMonths} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gMonth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={brand1} stopOpacity={0.95}/>
                  <stop offset="100%" stopColor={brand2} stopOpacity={0.85}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9e9f5" />
              <XAxis dataKey="label" tickMargin={6}/>
              <YAxis tickFormatter={(v) => eur(v as number)} width={80} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar
                dataKey="total"
                name="Cobrado"
                fill="url(#gMonth)"
                radius={[10,10,0,0]}
                // ⚠️ Usamos chartState para sacar activePayload y evitar error de tipos
                onClick={(data, index, chartState: any) => handleMonthBarClick(data, index, chartState)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="muted" style={{ marginTop:8 }}>
          Consejo: pulsa una barra para ver el detalle diario de ese mes.
        </p>
      </div>

      {/* Gráfica: días del mes */}
      <div className="rep-card">
        <h3 style={{ margin:'0 0 10px' }}>
          Cobros por día — {MONTHS[month][0].toUpperCase()+MONTHS[month].slice(1)} {year}
        </h3>
        <div style={{ width:'100%', height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={dataDays} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gDay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={brand3} stopOpacity={0.95}/>
                  <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.85}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9e9f5" />
              <XAxis dataKey="label" tickMargin={6}/>
              <YAxis tickFormatter={(v) => eur(v as number)} width={80} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="total" name="Cobrado" fill="url(#gDay)" radius={[10,10,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="muted" style={{ marginTop:8 }}>
          Total del mes: <strong>{eur(totalMonth)}</strong>.
        </p>
      </div>

      {/* Cobros por alumno — Año (Top 10) */}
      <div className="rep-card">
        <h3 style={{ margin:'0 0 10px' }}>Cobros por alumno — {year} (Top 10)</h3>
        <div style={{ width:'100%', height: 320 }}>
          <ResponsiveContainer>
            <BarChart
              data={studentsYear.slice(0, 10).map(s => ({ name: s.name, total: s.total }))}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gStudentYear" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.95}/>
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0.85}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9e9f5" />
              <XAxis dataKey="name" tickMargin={6} interval={0} angle={-20} height={60}/>
              <YAxis tickFormatter={(v) => eur(v as number)} width={80} />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="total" name="Cobrado" fill="url(#gStudentYear)" radius={[10,10,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {studentsYear.length === 0 && <p className="muted">No hay cobros registrados en este año.</p>}
      </div>

      {/* Detalle por alumno — Mes (cards) */}
      <div className="rep-card">
        <h3 style={{ margin:'0 0 10px' }}>
          Detalle por alumno — {MONTHS[month][0].toUpperCase()+MONTHS[month].slice(1)} {year}
        </h3>
        {studentsMonth.length === 0 && <p className="muted">Este mes no hay cobros registrados.</p>}
        <div className="al-grid">
          {studentsMonth.map(s => {
            const bg = colorFromName(s.name)
            return (
              <div key={s.id} className="al-item">
                <div className="al-avatar" style={{ background:bg }}>{initials(s.name)}</div>
                <div>
                  <div className="al-name">{s.name}</div>
                  <div className="muted">Total cobrado este mes</div>
                </div>
                <div className="al-money">{eur(s.total)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Diálogo + Toast */}
      <ConfirmModal
        open={confirmOpen}
        title="Resetear informes"
        message="Se eliminará todo el historial de cobros. Esta acción no se puede deshacer. ¿Deseas continuar?"
        confirmText="Sí, borrar"
        cancelText="Cancelar"
        tone="danger"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleResetConfirmed}
      />
      <ToastBar open={toastOpen} text={toastMsg} onClose={() => setToastOpen(false)} />
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
