// src/pages/Informes.tsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type { Student } from '../db'
import {
  eachDayOfInterval,
  endOfMonth,
  endOfYear,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfYear,
} from 'date-fns'
import { es } from 'date-fns/locale'

// Recharts
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts'

// Notificaciones profesionales
import { useToast } from '../ui/Toast'

// ✅ Cliente Supabase ya existente (lo usamos para informes también)
import { client as supa } from '../data/supaClient'

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

const MONTHS = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre'
]

/* ===================== Página ===================== */
export default function InformesPage() {
  const { options, loading, error: studentsError } = useStudentsOptions();
  const toast = useToast()

  const [payments, setPayments] = useState<Movement[]>([])
  const [students, setStudents] = useState<Student[]>([])

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0..11

  // ===== Capa de datos (Supabase + fallback Dexie) =====
  async function loadFromSupabase() {
  const { options, loading, error: studentsError } = useStudentsOptions();
    // 1) Movimientos
    const { data: movs, error: errMovs } = await supa
      .from('movimientos')
      .select('*')
      .order('id', { ascending: true })

    // 2) Alumnos (solo para nombres)
    const { data: sts, error: errSts } = await supa
      .from('alumnos')
      .select('*')
      .order('id', { ascending: true })

    if (errMovs || errSts) throw errMovs || errSts

    // Mapear columnas posibles (fecha/importe/tipo vs date/amount/type)
    const mappedMovs: Movement[] = (movs || []).map((r: any) => {
      const date = (r.date ?? r.fecha ?? r.created_at) as string
      const type = (r.type ?? r.tipo ?? 'payment') as 'payment'|'debt'
      const amount = Number(r.amount ?? r.importe ?? 0)
      const studentId = (r.student_id ?? r.studentId) as number | undefined
      return { id: r.id, studentId, date, type, amount }
    })
    const onlyPay = mappedMovs
      .filter(m => m.type === 'payment' && Number.isFinite(m.amount))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setPayments(onlyPay)

    // Alumnos: normalizamos nombre
    const mappedStudents: Student[] = (sts || []).map((s: any) => ({
      // mantenemos tus campos locales; al menos name e id
      id: s.id,
      name: s.name ?? s.nombre ?? `Alumno ${s.id}`,
      active: s.active ?? s.activo ?? true,
      price: s.price ?? s.precio ?? undefined,
      note: s.note ?? s.nota ?? '',
      color: s.color ?? undefined,
    }))
    setStudents(mappedStudents)
  }

  async function loadFromDexie() {
  const { options, loading, error: studentsError } = useStudentsOptions();
    const allMovs: Movement[] = await (db as any).movements.toArray()
    const onlyPay = allMovs
      .filter(m => m.type === 'payment' && Number.isFinite(m.amount))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setPayments(onlyPay)

    const sts: Student[] = await (db as any).students.toArray()
    setStudents(sts)
  }

  // Cargar datos (intenta Supabase y cae a Dexie si falla)
  async function load() {
  const { options, loading, error: studentsError } = useStudentsOptions();
    try {
      await loadFromSupabase()
    } catch {
      await loadFromDexie()
    }
  }
  useEffect(() => { load() }, [])

  // Suscripción realtime (se recarga al cambiar movimientos o alumnos)
  useEffect(() => {
    const ch = supa
      .channel('informes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alumnos' }, load)
      .subscribe((status) => {
        // opcional: console.log('realtime informes:', status)
      })
    return () => { supa.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ==== Helpers nombres / avatar ====
  const nameById = useMemo(() => {
    const m = new Map<number, string>()
    students.forEach(s => { if (typeof s.id === 'number') m.set(s.id, s.name) })
    return m
  }, [students])

  const initials = (name?: string) =>
    (name || '?').trim().split(/\s+/).map(p => p[0]).slice(0,2).join('').toUpperCase()

  const colorFromName = (name?: string) => {
  const { options, loading, error: studentsError } = useStudentsOptions();
    const src = (name || 'X')
    const n = src.charCodeAt(0) + src.charCodeAt(src.length - 1)
    const palette = ['#f472b6','#6366f1','#10b981','#0ea5e9','#f59e0b','#84cc16','#06b6d4','#db2777','#7c3aed']
    return palette[n % palette.length]
  }

  // Años presentes en datos (de pagos)
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
    // lista completa de días (aunque estén a 0)
    const days = eachDayOfInterval({ start: ms, end: me })
    const arr = days.map(d => ({ d, label: format(d, 'd', { locale: es }), total: 0 }))
    for (const p of inMonth) {
      const day = new Date(p.date).getDate() // 1..31
      if (arr[day - 1]) arr[day - 1].total += p.amount
    }
    return arr
  }, [payments, year, month])

  // === Cobros por alumno (año y mes) ===
  function groupByStudent(start: Date, end: Date) {
  const { options, loading, error: studentsError } = useStudentsOptions();
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

  // ==== Estilos (tarjetas y selects) ====
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

    /* Cards por alumno (mes) */
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

  // Tooltip personalizado
  const CurrencyTooltip = ({ active, payload, label }: any) => {
  const { options, loading, error: studentsError } = useStudentsOptions();
    if (!active || !payload?.length) return null
    const v = payload[0].value as number
    return (
      <div style={{ background:'#0f172a', color:'#fff', padding:'6px 8px', borderRadius:8, fontSize:12, boxShadow:'0 8px 22px rgba(0,0,0,.25)' }}>
        <div style={{ opacity:.75, marginBottom:2 }}>{label}</div>
        <div style={{ fontWeight:800 }}>{eur(v)}</div>
      </div>
    )
  }

  // Clic en barra de meses → cambia el mes (seguro para TS)
  const onMonthBarClick = (data: any) => {
  const { options, loading, error: studentsError } = useStudentsOptions();
    const payload = data && (data.payload || data.activePayload?.[0]?.payload)
    if (payload && typeof payload.m === 'number') setMonth(payload.m)
  }

  // Paleta y gradientes (marca)
  const brand1 = '#f472b6'
  const brand2 = '#ec4899'
  const brand3 = '#7c3aed' // morado para diarios

  // ===== Resetear todo el histórico de movimientos (pagos/deudas) =====
  async function resetAllData() {
  const { options, loading, error: studentsError } = useStudentsOptions();
    const ok = await toast.confirm({
      title: 'Resetear datos de pagos',
      message:
        'Se borrará TODO el histórico de movimientos (deudas y pagos) y los informes volverán a cero. Esta acción no se puede deshacer.',
      confirmText: 'Borrar todo',
      cancelText: 'Cancelar',
      tone: 'danger',
    })
    if (!ok) return

    // Primero intentamos en Supabase; si falla, limpiamos Dexie
    const { error } = await supa.from('movimientos').delete().neq('id', -1)
    if (error) {
      await (db as any).movements.clear()
    }
    await load()
    toast.success('Hecho', 'Histórico eliminado correctamente.')
  }

  return (
    <div className="rep-wrap page--withHeader">
      <style>{css}</style>

      {/* Cabecera + selects + totales */}
      <div className="rep-card">
        <div className="rep-head">
          <div>
            <div className="muted">
              Solo cobros • Vista {format(new Date(year, month, 1), "LLLL yyyy", { locale: es })}
            </div>
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

          <div className="rep-selects">
            <label>
              <span className="muted" style={{fontSize:12, display:'block'}}>Año</span>
              <div className="select-pro"><select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select></div>
            </label>
            <label>
              <span className="muted" style={{fontSize:12, display:'block'}}>Mes</span>
              <div className="select-pro"><select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>
                    {m[0].toUpperCase()+m.slice(1)} {dataMonths[i].total>0 ? `— ${eur(dataMonths[i].total)}` : ''}
                  </option>
                ))}
              </select></div>
            </label>

            {/* Botón resetear histórico */}
            <button
              onClick={resetAllData}
              style={{
                marginLeft: 8,
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #fecaca',
                background: '#fee2e2',
                color: '#b91c1c',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="Borra TODOS los movimientos (deudas y pagos)"
            >
              Resetear datos
            </button>
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
                onClick={onMonthBarClick}
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
    </div>
  )
}









import { list as listStudents } from '../data/supaStudents';
