import React, { useEffect, useMemo, useState } from 'react'
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  getHours,
  getMonth,
  getYear,
  isAfter,
  isBefore,
  isSameDay,
  isSameYear,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear
} from 'date-fns'
import { es } from 'date-fns/locale'
import { db } from '../db'

type Cls = {
  id?: number
  studentId?: number
  title?: string
  start: string
  end: string
}

type Student = {
  id?: number
  name: string
  color?: string
  // cualquiera de estos nombres según tu modelo
  pricePerHour?: number
  hourlyRate?: number
  rate?: number
  tarifaHora?: number
  precioHora?: number
}

function money(n: number) {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n || 0)
  } catch {
    return `${(n || 0).toFixed(2)} €`
  }
}
function two(n: number) { return String(n).padStart(2, '0') }

function getRate(s?: Student | null) {
  if (!s) return 0
  return (
    s.pricePerHour ??
    s.hourlyRate ??
    s.rate ??
    s.tarifaHora ??
    s.precioHora ??
    0
  )
}

const H_START = 16
const H_END_EXC = 22 // [16..21]

export default function Informes() {
  const today = new Date()
  const [year, setYear] = useState<number>(getYear(today))
  const [untilToday, setUntilToday] = useState<boolean>(true)
  const [day, setDay] = useState<Date>(today)

  const [loading, setLoading] = useState<boolean>(true)
  const [classes, setClasses] = useState<Cls[]>([])
  const [students, setStudents] = useState<Student[]>([])

  // --------- carga ----------
  async function reload() {
    setLoading(true)
    const [cls, sts] = await Promise.all([
      db.classes.toArray(),
      db.students.toArray()
    ])
    setClasses(cls)
    setStudents(sts)
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  // auto-refresco:
  useEffect(() => {
    const handler = () => reload()
    const vis = () => { if (!document.hidden) reload() }

    window.addEventListener('sandra:db-changed', handler as any)
    window.addEventListener('focus', handler)
    document.addEventListener('visibilitychange', vis)
    const iv = setInterval(handler, 60000) // respaldo cada 60s

    return () => {
      window.removeEventListener('sandra:db-changed', handler as any)
      window.removeEventListener('focus', handler)
      document.removeEventListener('visibilitychange', vis)
      clearInterval(iv)
    }
  }, [])

  // --------- filtros por año / hasta hoy ----------
  const periodStart = useMemo(() => startOfYear(new Date(year, 0, 1)), [year])
  const periodEnd = useMemo(() => endOfYear(new Date(year, 0, 1)), [year])

  const dataYear = useMemo(() => {
    const now = new Date()
    const filtered: { c: Cls; s?: Student | null; start: Date; end: Date }[] = []

    for (const c of classes) {
      const s = students.find(st => st.id === c.studentId) || null
      const sd = parseISO(c.start)
      const ed = parseISO(c.end)

      if (!isSameYear(sd, periodStart)) continue // por start
      if (untilToday && isAfter(sd, now)) continue

      filtered.push({ c, s, start: sd, end: ed })
    }
    return filtered
  }, [classes, students, periodStart, untilToday])

  // --------- agregados por mes ----------
  const ingresosPorMes = useMemo(() => {
    const arr = Array(12).fill(0) as number[]
    for (const { s, start, end } of dataYear) {
      const m = getMonth(start)
      const hours = (end.getTime() - start.getTime()) / 3_600_000
      const eur = hours * getRate(s || undefined)
      arr[m] += isNaN(eur) ? 0 : eur
    }
    return arr
  }, [dataYear])

  const horasPorMes = useMemo(() => {
    // cuenta franjas únicas 16..21 por día
    const arr = Array(12).fill(0) as number[]
    const marksByDay = new Map<string, Set<number>>()

    for (const { start, end } of dataYear) {
      const key = start.toDateString()
      if (!marksByDay.has(key)) marksByDay.set(key, new Set<number>())
      const hoursSet = marksByDay.get(key)!
      for (let h = H_START; h < H_END_EXC; h++) {
        const slotStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h, 0, 0)
        const slotEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h + 1, 0, 0)
        if (start < slotEnd && end > slotStart) hoursSet.add(h)
      }
    }

    for (const key of marksByDay.keys()) {
      const d = new Date(key)
      const m = d.getMonth()
      arr[m] += marksByDay.get(key)!.size
    }
    return arr
  }, [dataYear])

  const totalClases = dataYear.length
  const totalHoras = horasPorMes.reduce((a, b) => a + b, 0)
  const totalEur = ingresosPorMes.reduce((a, b) => a + b, 0)

  // --------- ranking alumnos ----------
  const topAlumnos = useMemo(() => {
    const map = new Map<number, { name: string; total: number }>()
    for (const { c, s, start, end } of dataYear) {
      if (!c.studentId) continue
      const hours = (end.getTime() - start.getTime()) / 3_600_000
      const eur = hours * getRate(s || undefined)
      const cur = map.get(c.studentId) || { name: s?.name || 'Alumno', total: 0 }
      cur.total += isNaN(eur) ? 0 : eur
      map.set(c.studentId, cur)
    }
    const arr = Array.from(map.entries()).map(([id, v]) => ({ id, ...v }))
    arr.sort((a, b) => b.total - a.total)
    return arr.slice(0, 8)
  }, [dataYear])

  // --------- resumen mensual (tabla) ----------
  const resumenMeses = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, m) => {
      const start = startOfMonth(new Date(year, m, 1))
      let classesCount = 0
      let hours = 0
      let euros = 0
      const marksByDay = new Map<string, Set<number>>()

      for (const { s, start: sd, end: ed } of dataYear) {
        if (getMonth(sd) !== m) continue
        classesCount++
        // euros
        const hs = ( ed.getTime() - sd.getTime() ) / 3_600_000
        euros += (isNaN(hs) ? 0 : hs) * getRate(s || undefined)

        // horas por franjas 16..21 únicas por día
        const key = sd.toDateString()
        if (!marksByDay.has(key)) marksByDay.set(key, new Set<number>())
        const set = marksByDay.get(key)!
        for (let h = H_START; h < H_END_EXC; h++) {
          const slotStart = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate(), h, 0, 0)
          const slotEnd = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate(), h + 1, 0, 0)
          if (sd < slotEnd && ed > slotStart) set.add(h)
        }
      }

      for (const k of marksByDay.keys()) hours += marksByDay.get(k)!.size

      return {
        mes: format(start, 'MMM', { locale: es }),
        classes: classesCount,
        horas: hours,
        euros
      }
    })
    return months
  }, [dataYear, year])

  // --------- resumen del día ----------
  const daySummary = useMemo(() => {
    const list = dataYear.filter(e => isSameDay(e.start, day))
    const byHour = new Set<number>()
    let euros = 0

    for (const { s, start, end } of list) {
      const hs = (end.getTime() - start.getTime()) / 3_600_000
      euros += (isNaN(hs) ? 0 : hs) * getRate(s || undefined)
      for (let h = H_START; h < H_END_EXC; h++) {
        const slotStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h, 0, 0)
        const slotEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h + 1, 0, 0)
        if (start < slotEnd && end > slotStart) byHour.add(h)
      }
    }

    return {
      clases: list.length,
      horas: byHour.size,
      euros,
      list
    }
  }, [dataYear, day])

  // --------- UI ----------
  const yearOptions = useMemo(() => {
    const minY = Math.min(year, getYear(new Date()) - 3)
    const maxY = Math.max(year, getYear(new Date()) + 3)
    const res: number[] = []
    for (let y = minY; y <= maxY; y++) res.push(y)
    return res
  }, [year])

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Filtros + KPIs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 700 }}>Año:</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={untilToday} onChange={e => setUntilToday(e.target.checked)} />
            Solo hasta hoy
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={reload}>Refrescar</button>
          <span>📚 {totalClases} clases</span>
          <span>⏱ {totalHoras} h</span>
          <span>💶 {money(totalEur)}</span>
        </div>
      </div>

      {/* Gráficas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
        <Card title="📈 Ingresos por mes">
          <Bars values={ingresosPorMes} fmt={money} />
        </Card>

        <Card title="⏱ Horas realizadas por mes (16–22)">
          <Bars values={horasPorMes} fmt={(v) => `${v}h`} color="#10b981" />
        </Card>
      </div>

      {/* Top alumnos */}
      <div style={{ marginTop: 20 }}>
        <Card title="🏆 Alumnos con más ingresos">
          {topAlumnos.length === 0 ? (
            <div style={{ color: '#64748b' }}>Sin datos de ingresos. Asegúrate de asignar <strong>Tarifa por hora</strong> a tus alumnos y de tener clases en este año.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {topAlumnos.map((a, i) => (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontWeight: 700 }}>{i + 1}. {a.name}</div>
                    <div style={{ height: 8, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${(a.total / (topAlumnos[0].total || 1)) * 100}%`, height: '100%', background: '#f59e0b' }} />
                    </div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{money(a.total)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Resumen meses */}
      <div style={{ marginTop: 20 }}>
        <Card title="📋 Resumen de todos los meses">
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                <th style={th}>Mes</th>
                <th style={th}>Clases</th>
                <th style={th}>Horas</th>
                <th style={th}>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {resumenMeses.map((r, idx) => (
                <tr key={idx}>
                  <td style={td}>{r.mes}</td>
                  <td style={td}>{r.classes}</td>
                  <td style={td}>{r.horas}</td>
                  <td style={td}>{money(r.euros)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* --------- Resumen del día --------- */}
      <div style={{ marginTop: 20 }}>
        <Card title={`📆 Resumen del día — ${format(day, "EEEE d 'de' MMMM", { locale: es })}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <button onClick={() => setDay(addDays(day, -1))}>← Anterior</button>
            <button onClick={() => setDay(new Date())}>🏠 Hoy</button>
            <button onClick={() => setDay(addDays(day, +1))}>Siguiente →</button>
            <input
              type="date"
              value={`${day.getFullYear()}-${two(day.getMonth() + 1)}-${two(day.getDate())}`}
              onChange={(e) => {
                const [y, m, d] = e.target.value.split('-').map(Number)
                setDay(new Date(y, m - 1, d))
              }}
            />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontWeight: 700 }}>
              <span>📚 {daySummary.clases} clases</span>
              <span>⏱ {daySummary.horas} h</span>
              <span>💶 {money(daySummary.euros)}</span>
            </div>
          </div>

          {daySummary.list.length === 0 ? (
            <div style={{ color: '#64748b' }}>No hay clases en este día.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  <th style={th}>Hora</th>
                  <th style={th}>Alumno</th>
                  <th style={th}>Duración</th>
                  <th style={th}>Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {daySummary.list
                  .slice()
                  .sort((a, b) => a.start.getTime() - b.start.getTime())
                  .map(({ c, s, start, end }, i) => {
                    const mins = Math.round((end.getTime() - start.getTime()) / 60000)
                    const eur = (mins / 60) * getRate(s || undefined)
                    return (
                      <tr key={i}>
                        <td style={td}>{two(start.getHours())}:{two(start.getMinutes())}</td>
                        <td style={td}>{s?.name || 'Alumno'}</td>
                        <td style={td}>{mins} min</td>
                        <td style={td}>{money(eur)}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}

/* ---------- Componentes pequeños ---------- */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: 'white',
      borderRadius: 16,
      border: '1px solid #e5e7eb',
      padding: 16,
      boxShadow: '0 6px 20px rgba(0,0,0,.04)'
    }}>
      <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>{title}</div>
      {children}
    </section>
  )
}

/** Mini-barras mensuales (12 columnas) */
function Bars({ values, fmt, color }: { values: number[]; fmt: (v: number) => string; color?: string }) {
  const max = Math.max(1, ...values)
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 6, alignItems: 'end', height: 120 }}>
        {values.map((v, i) => (
          <div key={i} title={`${months[i]}: ${fmt(v)}`} style={{ display: 'grid', gap: 4, alignItems: 'end' }}>
            <div style={{
              height: `${(v / max) * 100}%`,
              background: color ?? 'linear-gradient(180deg,#ec4899,#ef5aa5)',
              borderRadius: 6
            }} />
            <div style={{ textAlign: 'center', fontSize: 11, color: '#64748b' }}>{months[i]}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 6, fontSize: 12, color: '#64748b' }}>
        {values.map((v, i) => (
          <div key={i} style={{ textAlign: 'center' }}>{fmt(v)}</div>
        ))}
      </div>
    </div>
  )
}

/* estilos table */
const th: React.CSSProperties = {
  textAlign: 'left',
  fontWeight: 800,
  color: '#0f172a',
  padding: '8px 10px',
  borderBottom: '1px solid #e5e7eb'
}
const td: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px dashed #e5e7eb'
}
