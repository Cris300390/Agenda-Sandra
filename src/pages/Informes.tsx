import { useEffect, useMemo, useState } from 'react'
import { format, getYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { db } from '../db'

/* ================== Config ================== */
const START_HOUR = 16 // 16,17,18,19,20,21
const END_HOUR = 22   // no incluido

/* ================== Tipos ================== */
type Clase = {
  id?: number
  studentId?: number
  title?: string
  start: string // ISO
  end: string   // ISO
}
type StudentAny = {
  id?: number
  name: string
  color?: string
  // cualquier posible nombre de tarifa que puedas tener en tu BD
  rate?: number
  hourlyRate?: number
  pricePerHour?: number
  price?: number
  tarifa?: number
  [key: string]: any
}

/* ================== Estilos de tabla ================== */
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 8px', color: '#334155', fontWeight: 800, fontSize: 12
}
const tdStyle: React.CSSProperties = {
  padding: '10px 8px', color: '#475569', fontSize: 13
}

/* ================== Utilidades ================== */
const monthNames: string[] = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function useIsMobile(max = 480): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(max-width:${max}px)`).matches
      : true
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${max}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [max])
  return isMobile
}

function hoursOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart
}
function getStudentRate(s?: StudentAny): number {
  if (!s) return 0
  const n = Number(s.rate ?? s.hourlyRate ?? s.pricePerHour ?? s.price ?? s.tarifa ?? 0)
  return isNaN(n) ? 0 : n
}

/* ================== UI Helpers ================== */
function Card(props: { title: string; children: React.ReactNode; gradient?: string }) {
  const { title, children, gradient } = props
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 12, boxShadow: '0 6px 16px rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong style={{ color: '#334155' }}>{title}</strong>
        {gradient && <span style={{ width: 48, height: 6, borderRadius: 9999, background: gradient }} />}
      </div>
      {children}
    </div>
  )
}

function SimpleBarChart(props: {
  data: { label: string; value: number; color?: string }[]
  height?: number
  maxValue?: number
  yFormat?: (v: number) => string
  compactLabels?: boolean
}) {
  const { data, height = 140, maxValue, yFormat = (v) => v.toString(), compactLabels = false } = props
  const H = height
  const max = maxValue ?? Math.max(1, ...data.map(d => d.value))
  const barW = Math.max(18, Math.floor(320 / Math.max(1, data.length)))
  const gap = 8
  const W = data.length * (barW + gap) + gap

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={W} height={H + 36} role="img" aria-label="bar chart">
        <line x1={0} y1={H} x2={W} y2={H} stroke="#e5e7eb" />
        {data.map((d, i) => {
          const x = i * (barW + gap) + gap
          const h = max === 0 ? 0 : Math.round((d.value / max) * (H - 20))
          const y = H - h
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} rx={8} ry={8} fill={d.color || 'url(#gradDefault)'} />
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="10" fill="#64748b">
                {compactLabels ? (d.label.length > 3 ? d.label.slice(0, 3) : d.label) : d.label}
              </text>
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="#334155">
                {yFormat(d.value)}
              </text>
            </g>
          )
        })}
        <defs>
          <linearGradient id="gradDefault" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

/* ================== Página: Informes ================== */
export default function Informes() {
  const isMobile = useIsMobile()

  const [classes, setClasses] = useState<Clase[]>([])
  const [students, setStudents] = useState<StudentAny[]>([])

  // Año seleccionado (persistido)
  const [year, setYear] = useState<number>(() => {
    const saved = localStorage.getItem('informes.year')
    const y = saved ? Number(saved) : new Date().getFullYear()
    return isNaN(y) ? new Date().getFullYear() : y
  })

  // Filtro: Ignorar clases futuras (para que no “salgan horas” sin haber trabajado)
  const [onlyPast, setOnlyPast] = useState<boolean>(() => localStorage.getItem('informes.onlyPast') !== '0')
  useEffect(() => { localStorage.setItem('informes.onlyPast', onlyPast ? '1' : '0') }, [onlyPast])

  // Cargar datos
  const loadData = async (): Promise<void> => {
    const cls = await db.classes.toArray()
    const sts = await db.students.toArray()
    setClasses(cls as Clase[])
    setStudents(sts as StudentAny[])
  }

  useEffect(() => { loadData() }, [])

  // Actualizar al volver a la pestaña/visibilidad
  useEffect(() => {
    const onFocus = () => { loadData() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  // Guardar año
  useEffect(() => { localStorage.setItem('informes.year', String(year)) }, [year])

  // Rango de años amplio (datos ± extra)
  const yearsAvailable: number[] = useMemo(() => {
    const list: number[] = classes.map(c => getYear(new Date(c.start)))
    const now = new Date().getFullYear()
    let minY = list.length ? Math.min(...list) : now
    let maxY = list.length ? Math.max(...list) : now
    minY = Math.min(minY, now - 3)
    maxY = Math.max(maxY, now + 10)
    const arr: number[] = []
    for (let y = minY; y <= maxY; y++) arr.push(y)
    return arr
  }, [classes])

  /* ====== Cálculos ====== */
  type Metrics = {
    ingresosPorMes: number[]
    horasPorMes: number[]
    topAlumnos: { name: string; color?: string; total: number }[]
    resumenMensual: { mes: string; clases: number; horas: number; ingresos: number }[]
    totalAnualIngresos: number
    totalAnualHoras: number
    totalAnualClases: number
  }

  const metrics: Metrics = useMemo<Metrics>(() => {
    const eurosMes: number[] = Array(12).fill(0)
    const horasMes: number[] = Array(12).fill(0)
    const clasesMes: number[] = Array(12).fill(0)
    const slotsPorMes: Array<Set<string>> = Array.from({ length: 12 }, () => new Set<string>())
    const ingresosPorAlumno = new Map<number, { name: string; color?: string; total: number }>()
    const stById = new Map<number, StudentAny>(students.map(s => [s.id!, s]))
    const today = new Date()

    for (const c of classes) {
      const sDate = new Date(c.start)
      const eDate = new Date(c.end)
      if (getYear(sDate) !== year) continue
      if (onlyPast && eDate > today) continue

      const m = sDate.getMonth()
      clasesMes[m] += 1

      const st = c.studentId ? stById.get(c.studentId) : undefined
      const rate = getStudentRate(st)
      const durH = Math.max(0, (eDate.getTime() - sDate.getTime()) / 36e5)
      eurosMes[m] += rate * durH

      if (st) {
        const prev = ingresosPorAlumno.get(st.id!) || { name: st.name, color: st.color, total: 0 }
        prev.total += rate * durH
        ingresosPorAlumno.set(st.id!, prev)
      }

      // Horas únicas por franja (16..21)
      for (let h = START_HOUR; h < END_HOUR; h++) {
        const slotStart = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate(), h, 0, 0, 0)
        const slotEnd = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate(), h + 1, 0, 0, 0)
        if (hoursOverlap(sDate, eDate, slotStart, slotEnd)) {
          const key = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}-${String(sDate.getDate()).padStart(2, '0')}|${h}`
          slotsPorMes[m].add(key)
        }
      }
    }

    for (let i = 0; i < 12; i++) horasMes[i] = slotsPorMes[i].size

    const topAlumnosArr = Array.from(ingresosPorAlumno.values()).sort((a, b) => b.total - a.total)
    const resumenMensualArr = monthNames.map((mes, i) => ({
      mes,
      clases: clasesMes[i],
      horas: horasMes[i],
      ingresos: eurosMes[i]
    }))

    const totalAnualIngresos = eurosMes.reduce((a: number, b: number) => a + b, 0)
    const totalAnualHoras = horasMes.reduce((a: number, b: number) => a + b, 0)
    const totalAnualClases = clasesMes.reduce((a: number, b: number) => a + b, 0)

    return {
      ingresosPorMes: eurosMes,
      horasPorMes: horasMes,
      topAlumnos: topAlumnosArr,
      resumenMensual: resumenMensualArr,
      totalAnualIngresos,
      totalAnualHoras,
      totalAnualClases
    }
  }, [classes, students, year, onlyPast])

  const {
    ingresosPorMes, horasPorMes, topAlumnos,
    resumenMensual, totalAnualIngresos, totalAnualHoras, totalAnualClases
  } = metrics

  /* ====== Marco ====== */
  const frameStyle = isMobile
    ? { maxWidth: '100%', margin: 0, background: 'transparent', borderRadius: 0, boxShadow: 'none' as const }
    : { maxWidth: '1200px', margin: '0 auto', background: 'rgba(255,255,255,0.98)', borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,.06)' }

  return (
    <div style={{
      background: 'linear-gradient(135deg,#fdf2f8 0%,#fce7f3 40%,#fbcfe8 100%)',
      minHeight: '100dvh',
      padding: isMobile ? '8px' : '20px',
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif"
    }}>
      <div style={frameStyle}>
        {/* Cabecera */}
        <div style={{
          padding: isMobile ? '8px 10px' : '18px 24px',
          background: isMobile ? 'transparent' : 'linear-gradient(135deg,#f472b6,#ec4899)',
          color: isMobile ? '#be185d' : 'white',
          borderRadius: isMobile ? 0 : '20px 20px 0 0'
        }}>
          <h1 style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? 24 : 34 }}>Informes</h1>
        </div>

        {/* Controles */}
        <div style={{ padding: isMobile ? '10px 8px' : 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#334155', fontWeight: 700 }}>Año:</span>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ padding: '6px 8px', borderRadius: 8 }}>
              {yearsAvailable.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={onlyPast} onChange={(e) => setOnlyPast(e.target.checked)} />
            Solo hasta hoy
          </label>

          <button onClick={() => loadData()} style={{ marginLeft: 'auto' }}>Refrescar</button>

          <div style={{ display: 'flex', gap: 8, color: '#334155' }}>
            <span>📚 {totalAnualClases} clases</span>
            <span>⏱️ {totalAnualHoras} h</span>
            <span>💶 {totalAnualIngresos.toFixed(2)} €</span>
          </div>
        </div>

        {/* Gráficos */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,minmax(0,1fr))', gap: 12, padding: isMobile ? '0 8px 12px' : '0 16px 16px' }}>
          <Card title="💶 Ingresos por mes" gradient="linear-gradient(90deg,#f472b6,#a855f7)">
            <SimpleBarChart
              data={monthNames.map((m, i) => ({ label: m, value: ingresosPorMes[i] }))}
              yFormat={(v) => `${v.toFixed(0)}€`}
              compactLabels={true}
            />
          </Card>

          <Card title="⏱️ Horas realizadas por mes (16–22)" gradient="linear-gradient(90deg,#22c55e,#06b6d4)">
            <SimpleBarChart
              data={monthNames.map((m, i) => ({ label: m, value: horasPorMes[i] }))}
              yFormat={(v) => `${v.toFixed(0)}h`}
              compactLabels={true}
            />
          </Card>

          <div style={{ gridColumn: isMobile ? 'auto' : '1 / span 2' }}>
            <Card title="🏆 Alumnos con más ingresos" gradient="linear-gradient(90deg,#f59e0b,#ef4444)">
              <SimpleBarChart
                data={topAlumnos.map(a => ({ label: a.name, value: a.total }))}
                yFormat={(v) => `${v.toFixed(0)}€`}
              />
              {topAlumnos.length === 0 && (
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
                  Sin datos de ingresos. Asegúrate de poner una <b>tarifa por hora</b> en cada alumno.
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Resumen mensual */}
        <div style={{ padding: isMobile ? '0 8px 20px' : '0 16px 24px' }}>
          <Card title="📅 Resumen de todos los meses" gradient="linear-gradient(90deg,#94a3b8,#334155)">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={thStyle}>Mes</th>
                    <th style={thStyle}>Clases</th>
                    <th style={thStyle}>Horas</th>
                    <th style={thStyle}>Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenMensual.map((r, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={tdStyle}>{r.mes}</td>
                      <td style={tdStyle}>{r.clases}</td>
                      <td style={tdStyle}>{r.horas}</td>
                      <td style={tdStyle}>{r.ingresos.toFixed(2)} €</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #cbd5e1', background: '#f8fafc' }}>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>Total {year}</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{resumenMensual.reduce((acc, r) => acc + r.clases, 0)}</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{resumenMensual.reduce((acc, r) => acc + r.horas, 0)}</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{resumenMensual.reduce((acc, r) => acc + r.ingresos, 0).toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
