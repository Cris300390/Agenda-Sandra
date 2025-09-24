// src/pages/Informes.tsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type { Student } from '../db'
import {
  eachDayOfInterval, endOfMonth, endOfYear, format, isWithinInterval,
  parseISO, startOfMonth, startOfYear
} from 'date-fns'
import { es } from 'date-fns/locale'

// Recharts
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine
} from 'recharts'

/* =========================================
   Mini UI: Confirmación + Toast elegantes
   ========================================= */
function ConfirmModal({
  open,
  title = '¿Estás seguro?',
  message,
  confirmText = 'Sí, borrar',
  cancelText = 'Cancelar',
  tone = 'danger',
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'primary';
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null
  const color =
    tone === 'danger'
      ? 'linear-gradient(135deg,#ef4444,#dc2626)'
      : 'linear-gradient(135deg,#6366f1,#4f46e5)'
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.35)',
        backdropFilter: 'blur(2px)',
        zIndex: 9999,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(520px, 96vw)',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0,0,0,.25)',
          border: '1px solid #f1f5f9',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg,#ffe4f1,#f8fafc)',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <strong style={{ fontSize: 16 }}>{title}</strong>
        </div>
        <div style={{ padding: 16, fontSize: 14, color: '#334155' }}>{message}</div>
        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            padding: 12,
            borderTop: '1px solid #f1f5f9',
            background: '#fbfbff',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid transparent',
              background: color,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 900,
              boxShadow: '0 8px 20px rgba(0,0,0,.12)',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

function ToastBar({
  open,
  text,
  onClose,
}: {
  open: boolean
  text: string
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 18,
        background:
          'linear-gradient(135deg, rgba(236,72,153,.96), rgba(124,58,237,.96))',
        color: '#fff',
        padding: '10px 14px',
        borderRadius: 12,
        boxShadow: '0 16px 30px rgba(0,0,0,.25)',
        zIndex: 9999,
        maxWidth: '90vw',
        fontWeight: 700,
      }}
      onClick={onClose}
    >
      {text}
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
  const [students, setStudents] = useState<Student[]>([])

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0..11

  // Confirm + Toast
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  // Cargar datos (solo payments y lista de alumnos para nombres)
  async function load() {
    const allMovs: Movement[] = await (db as any).movements.toArray()
    const onlyPay = allMovs
      .filter(m => m.type === 'payment' && Number.isFinite(m.amount))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setPayments(onlyPay)

    const sts: Student[] = await (db as any).students.toArray()
    setStudents(sts)
  }
  useEffect(() => { load() }, [])

  // ==== Helpers nombres / avatar ====
  const nameById = useMemo(() => {
    const m = new Map<number, string>()
    students.forEach(s => { if (typeof s.id === 'number') m.set(s.id!, s.name) })
    return m
  }, [students])
  const initials = (name?: string) =>
    (name || '?').trim().split(/\s+/).map(p => p[0]).slice(0,2).join('').toUpperCase()
  const colorFromName = (name?: string) => {
    const safe = (name || 'X')
    const n = safe.charCodeAt(0) + safe.charCodeAt(safe.length - 1)
    const palette = ['#f472b6','#6366f1','#10b981','#0ea5e9','#f59e0b','#84cc16','#06b6d4','#db2777','#7c3aed']
    return palette[n % palette.length]
  }

  // Años presentes en datos
  const yearsInData = useMemo(() => {
    if (payments.length === 0) return []
    const set = new Set<number>()
    for (const p of payments) set.add(new Date(p.date).getFullYear())
    return Array.from(set).sort((a,b) => a - b)
  }, [payments])

  // Rango ampliado de años (pasado y futuro)
  const yearOptions = useMemo(() => {
    const current = now.getFullYear()
    const minData = yearsInData.length ? yearsInData[0] : current
    const start = Math.min(minData, current - 5)
    const end   = current + 5
    const arr: number[] = []
    for (let y = start; y <= end; y++) arr.push(y)
    return arr.reverse() // los más recientes arriba
  }, [yearsInData])

  // Datos por MES del año seleccionado
  const dataMonths = useMemo(() => {
    const s = startOfYear(new Date(year, 0, 1))
    const e = endOfYear(s)
    const inYear = payments.filter(m =>
      isWithinInterval(parseISO(m.date), { start: s, end: e })
    )
    const arr = Array.from({ length: 12 }, (_, i) => ({
      m: i,
      label: MONTHS[i].slice(0,3),
      total: 0,
    }))
    for (const p of inYear) {
      const d = new Date(p.date)
      arr[d.getMonth()].total += p.amount
    }
    return arr
  }, [payments, year])

  // Ajustar mes si el actual no tiene datos
  useEffect(() => {
    const has = dataMonths[month]?.total > 0
    if (!has) {
      const idx = dataMonths.findIndex(x => x.total > 0)
      if (idx >= 0) setMonth(idx)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataMonths])

  // Datos por DÍA del mes seleccionado (del año seleccionado)
  const dataDays = useMemo(() => {
    const ms = startOfMonth(new Date(year, month, 1))
    const me = endOfMonth(ms)
    const inMonth = payments.filter(m =>
      isWithinInterval(parseISO(m.date), { start: ms, end: me })
    )
    const days = eachDayOfInterval({ start: ms, end: me })
    const arr = days.map(d => ({ d, label: format(d, 'd', { locale: es }), total: 0 }))
    for (const p of inMonth) {
      const day = new Date(p.date).getDate() // 1..31
      if (arr[day - 1]) arr[day - 1].total += p.amount
    }
    return arr
  }, [payments, year, month])

  // Cobros por alumno (año/mes)
  function groupByStudent(start: Date, end: Date) {
    const inRange = payments.filter(m =>
      isWithinInterval(parseISO(m.date), { start, end }) &&
      typeof m.studentId === 'number'
    )
    const acc = new Map<number, number>()
    for (const p of inRange) {
      const id = p.studentId as number
      acc.set(id, (acc.get(id) || 0) + p.amount)
    }
    const arr = Array.from(acc, ([id, total]) => ({
      id,
      name: nameById.get(id) ?? `Alumno ${id}`,
      total
    }))
    arr.sort((a,b) => b.total - a.total || a.name.localeCompare(b.name, 'es'))
    return arr
  }

  const studentsYear  = useMemo(() => groupByStudent(
    startOfYear(new Date(year, 0, 1)),
    endOfYear(new Date(year, 0, 1))
  ), [payments, year, nameById])

  const studentsMonth = useMemo(() => groupByStudent(
    startOfMonth(new Date(year, month, 1)),
    endOfMonth(new Date(year, month, 1))
  ), [payments, year, month, nameById])

  // Totales
  const totalYear  = useMemo(() => dataMonths.reduce((a, r) => a + r.total, 0), [dataMonths])
  const totalMonth = useMemo(() => dataDays.reduce((a, r) => a + r.total, 0), [dataDays])

  // Tooltip personalizado
  const CurrencyTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const v = payload[0].value as number
    return (
      <div style={{ background:'#0f172a', color:'#fff', padding:'6px 8px', borderRadius:8, fontSize:12, boxShadow:'0 8px 22px rgba(0,0,0,.25)' }}>
        <div style={{ opacity:.75, marginBottom:2 }}>{label}</div>
        <div style={{ fontWeight:800 }}>{eur(v)}</div>
      </div>
    )
  }

  // onClick barra: usamos activePayload del evento para evitar el problema de tipos
  function handleMonthBarClick(_: any, __: any, chart: any) {
    const payload = chart?.activePayload?.[0]?.payload
    if (payload && typeof payload.m === 'number') setMonth(payload.m)
  }

  // Paleta y gradientes
  const brand1 = '#f472b6'
  const brand2 = '#ec4899'
  const brand3 = '#7c3aed'

  // ===== Reset de pagos (solo payments) =====
  async function handleResetConfirmed() {
    try {
      await (db as any).movements.where('type').equals('payment').delete()
      const rest = await (db as any).movements
        .toArray()
        .then((ms: any[]) => ms.filter((m) => m.type === 'payment' && Number.isFinite(m.amount)))
      setPayments(rest)

      setConfirmOpen(false)
      setToastMsg('Historial de cobros reseteado correctamente.')
      setToastOpen(true)
      setTimeout(() => setToastOpen(false), 2500)
    } catch {
      setConfirmOpen(false)
      setToastMsg('No se pudo completar el reseteo.')
      setToastOpen(true)
      setTimeout(() => setToastOpen(false), 2500)
    }
  }

  // ==== Estilos locales (solo esta página) ====
  const css = `
    .rep-wrap { display:grid; gap:16px; }
    .rep-card { background:#fff; border:1px solid #eee; border-radius:16px; padding:14px; box-shadow:0 10px 24px rgba(0,0,0,.06); }
    .rep-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
    .rep-selects { display:flex; gap:10px; flex-wrap:wrap; }
    .rep-selects select { padding:10px 12px; border:1px solid #e5e7eb; border-radius:12px; min-width:120px; }
    .rep-stats { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
    .rep-stat { background:#fbfbfe; border:1px solid #eef2f7; border-radius:14px; padding:12px; }
    .rep-stat h5 { margin:0 0 4px; font-size:12px; color:#64748b; }
    .rep-stat .big { font-size:26px; font-weight:900; }
    .muted { color:#6b7280; }

    .al-grid { display:grid; gap:12px; grid-template-columns: repeat(2, minmax(0,1fr)); }
    @media (max-width: 900px) { .al-grid { grid-template-columns: 1fr; } }
    .al-item {
      display:flex; align-items:center; gap:12px;
      border:1px solid #eef2f7; border-radius:14px; padding:10px 12px; background:#fff;
      box-shadow:0 6px 16px rgba(0,0,0,.05);
    }
    .al-avatar { width:36px; height:36px; border-radius:50%; color:#fff; font-weight:900; display:flex; align-items:center; justify-content:center; }
    .al-name { font-weight:800; }
    .al-money { margin-left:auto; font-weight:900; }
  `

  return (
    <div className="rep-wrap page--withHeader">
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
