// src/pages/Agenda.tsx
import { useEffect, useMemo, useState } from 'react'
import {
  addMonths, addWeeks, addDays,
  endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO,
  startOfMonth, startOfWeek
} from 'date-fns'
import { es } from 'date-fns/locale'
import { db } from '../db'
import { isHoliday } from '../util/holidays'
import { liveQuery } from 'dexie'

/* ===== Config ===== */
const START_HOUR = 16
const END_HOUR   = 22

/* ===== Tipos ===== */
type CalendarEvent = {
  id?: number
  title: string
  start: Date
  end: Date
  color?: string
  studentId?: number
}
type RepeatOptions = { enabled: boolean; weekdays: number[]; until?: string }

/* ===== Helper: detectar móvil ===== */
function useIsMobile(max = 480) {
  const { options, loading, error: studentsError } = useStudentsOptions();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(max-width:${max}px)`).matches : true
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${max}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [max])
  return isMobile
}

/* ===== Página ===== */
export default function Agenda() {
  const { options, loading, error: studentsError } = useStudentsOptions();
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const saved = localStorage.getItem('agenda.currentDate')
    return saved ? new Date(saved) : new Date()
  })
  const [refreshKey, setRefreshKey] = useState(0) // fuerza a recalcular el mes si cambian datos
  const isMobile = useIsMobile()

  // ✅ Suscripción reactiva a cambios en IndexedDB (sin refrescar manual)
  useEffect(() => {
    const sub = liveQuery(async () => {
      const classes = await db.classes.toArray()
      const students = await db.students.toArray()
      return { classes, students }
    }).subscribe({
      next: ({ classes, students }) => {
        const byId = new Map(students.map(s => [s.id!, s]))
        const evts: CalendarEvent[] = classes.map(c => ({
          id: c.id,
          title: byId.get(c.studentId)?.name || c.title,
          start: typeof c.start === 'string' ? parseISO(c.start) : new Date(c.start),
          end:   typeof c.end   === 'string' ? parseISO(c.end)   : new Date(c.end),
          color: byId.get(c.studentId)?.color,
          studentId: c.studentId,
        }))
        setEvents(evts)
        setRefreshKey(k => k + 1) // actualiza cabeceras (contadores del mes)
      },
      error: (err) => {
        console.error('liveQuery error', err)
      }
    })
    return () => sub.unsubscribe()
  }, [])

  useEffect(() => {
    localStorage.setItem('agenda.currentDate', currentDate.toISOString())
  }, [currentDate])

  /* Marco sin tarjeta en móvil (pantalla completa, sin bordes) */
  const frameStyle = isMobile
    ? { maxWidth: '100%', margin: 0, background: 'transparent', borderRadius: 0, boxShadow: 'none' as const }
    : { maxWidth: '1200px', margin: '0 auto', background: 'rgba(255,255,255,0.98)', borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,.06)' }

  return (
    <div
      style={{
        background: 'transparent',
        minHeight: '100dvh',
        padding: isMobile ? '8px' : '20px',
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif"
      }}
    >
      <div style={frameStyle}>
        {/* Cabecera de la página */}
        <div style={{
          padding: isMobile ? '8px 10px' : '18px 24px',
          background: 'transparent',
          color: '#0f172a',
          borderRadius: isMobile ? 0 : '20px 20px 0 0'
        }}>
          <h1 className="brand-title" style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? 24 : 34 }}>Agenda Sandra</h1>
        </div>

        <div style={{ padding: isMobile ? 0 : 16 }}>
          <MonthTable
            isMobile={isMobile}
            key={refreshKey}
            date={currentDate}
            events={events}
            onPickDay={(d) => setCurrentDate(d)}
            onPrevMonth={() => setCurrentDate(addMonths(currentDate, -1))}
            onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
            onToday={() => setCurrentDate(new Date())}
          />

          {/* Día */}
          <section style={{ marginTop: isMobile ? 8 : 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: isMobile ? '8px 4px' : '10px 6px' }}>
              <strong style={{ color: '#be185d' }}>
                {format(currentDate, "EEEE d 'de' LLLL", { locale: es })}
              </strong>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
                <button onClick={() => setCurrentDate(new Date())}>Hoy</button>
                <button onClick={() => setCurrentDate(addDays(currentDate, -1))}>←</button>
                <button onClick={() => setCurrentDate(addDays(currentDate, 1))}>→</button>
                <input
                  type="date"
                  value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split('-').map(Number)
                    setCurrentDate(new Date(y, m - 1, d))
                  }}
                />
              </div>
            </div>

            <DayTable
              isMobile={isMobile}
              date={currentDate}
              events={events}
              onCreateAtSlot={async (_slot, studentId, start, end, repeat) => {
                if (!studentId || !start || !end) return
                const student = await db.students.get(studentId)
                if (!student) return

                // 1 sola clase
                if (!repeat?.enabled || (repeat.weekdays ?? []).length === 0) {
                  const [sH, sM] = start.split(':').map(Number)
                  const [eH, eM] = end.split(':').map(Number)
                  const st = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), sH, sM)
                  const en = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), eH, eM)
                  await db.classes.add({ studentId: student.id!, title: 'Clase', start: st.toISOString(), end: en.toISOString() })
                  // No hace falta refrescar: liveQuery lo hace solo
                  return
                }

                // Repetición semanal
                const until = repeat.until ? new Date(repeat.until) : addWeeks(currentDate, 8)
                const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
                const daysW = repeat.weekdays!.slice().sort()
                const [sH, sM] = start.split(':').map(Number)
                const [eH, eM] = end.split(':').map(Number)

                const adds: { start: string; end: string }[] = []
                let ws = weekStart
                while (ws <= until) {
                  for (const w of daysW) {
                    const d = addDays(ws, w - 1)
                    if (d < currentDate || d > until) continue
                    const st = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sH, sM)
                    const en = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eH, eM)
                    adds.push({ start: st.toISOString(), end: en.toISOString() })
                  }
                  ws = addWeeks(ws, 1)
                }
                if (adds.length === 0) return

                await db.transaction('rw', db.classes, async () => {
                  for (const a of adds) {
                    await db.classes.add({ studentId: student.id!, title: 'Clase', start: a.start, end: a.end })
                  }
                })
                // liveQuery actualizará la interfaz automáticamente
              }}
              onDeleteEvent={async (id) => {
                if (typeof id === 'number') await db.classes.delete(id)
                // liveQuery actualizará
              }}
              onUpdateEvent={async (id, newStart, newEnd, sid) => {
                await db.classes.update(id, { start: newStart.toISOString(), end: newEnd.toISOString(), studentId: sid })
                // liveQuery actualizará
              }}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

/* ===== DayTable ===== */
function DayTable({
  isMobile, date, events,
  onCreateAtSlot, onDeleteEvent, onUpdateEvent
}:{
  isMobile: boolean
  date: Date
  events: CalendarEvent[]
  onCreateAtSlot?: (slot: string, studentId?: number, start?: string, end?: string, repeat?: RepeatOptions) => void
  onDeleteEvent?: (id: number) => void
  onUpdateEvent?: (evId: number, newStart: Date, newEnd: Date, studentId?: number) => void
}) {
  const dayEvents = useMemo(() => {
    return events
      .filter(e => {
        const d = new Date(e.start)
        const h = d.getHours()
        return d.toDateString() === date.toDateString() && h >= START_HOUR && h < END_HOUR
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [date, events])

  const timeSlots = useMemo(() => {
    const slots: string[] = []
    for (let h = START_HOUR; h <= END_HOUR - 1; h++) slots.push(`${String(h).padStart(2, '0')}:00`)
    return slots
  }, [])

  // ✅ Sin "as Date" para evitar el error de TSX
  function eventsIn(slot: string) {
  const { options, loading, error: studentsError } = useStudentsOptions();
    const [hh] = slot.split(':').map(Number)
    const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, 0)
    const slotEnd   = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh + 1, 0)
    return dayEvents.filter(ev => ev.start < slotEnd && ev.end > slotStart)
  }

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 340px',
    gap: isMobile ? 8 : 16
  } as const

  return (
    <div style={{ padding: isMobile ? '0 2px' : 0 }}>
      <div style={gridStyle}>
        <table role="table" aria-label="Agenda del día" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: 13 }}>Horario</th>
              <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: 13 }}>Estudiantes</th>
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, idx) => {
              const list = eventsIn(slot)
              const isEmpty = list.length === 0
              const bg = ['#fff1f5','#f2f7ff','#f6fff1','#fffaf1','#f6f1ff','#f1fffb'][idx % 6]
              const rowStyle: React.CSSProperties = { background: bg, borderRadius: 14, boxShadow: '0 6px 16px rgba(0,0,0,.06)' }

              return (
                <tr key={slot}>
                  <td style={{ ...rowStyle, padding: 14, width: 110, verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{slot}</div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{String(parseInt(slot) + 1).padStart(2,'0')}:00</div>
                    {isEmpty && <div style={{ fontSize: 12, color: '#059669' }}>Disponible</div>}
                  </td>

                  <td style={{ ...rowStyle, padding: 14 }}>
                    {list.length > 0 ? (
                      <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {list.map(ev => (
                            <Pill
                              key={String(ev.id)}
                              event={ev}
                              onUpdate={onUpdateEvent}
                              onDelete={async (id) => {
                                if (onDeleteEvent && typeof id === 'number') await onDeleteEvent(id)
                              }}
                            />
                          ))}
                        </div>
                        <InlineAdd slot={slot} onCreate={onCreateAtSlot} compact />
                      </div>
                    ) : (
                      <InlineAdd slot={slot} onCreate={onCreateAtSlot} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <ResumenPanel date={date} dayEvents={dayEvents} timeSlots={timeSlots} eventsIn={eventsIn} />
      </div>
    </div>
  )
}

/* ===== Crear + Repetir semanal ===== */
function InlineAdd({
  slot, onCreate, compact
}:{
  slot: string
  onCreate?: (slot: string, studentId?: number, start?: string, end?: string, repeat?: RepeatOptions) => void
  compact?: boolean
}) {
  const [students, setStudents] = useState<{ id?: number; name: string }[]>([])
  const [sid, setSid] = useState<string>('')
  const [start, setStart] = useState<string>(slot)
  const [end, setEnd] = useState<string>(() => {
    const [h] = slot.split(':').map(Number)
    return `${String(h + 1).padStart(2,'0')}:00`
  })

  const weekdayNames = ['L','M','X','J','V','S','D']
  const todayW = ((new Date().getDay() + 6) % 7) + 1
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([todayW])
  const [repeatUntil, setRepeatUntil] = useState<string>(format(addWeeks(new Date(), 8), 'yyyy-MM-dd'))

  useEffect(() => { (async () => setStudents(await db.students.orderBy('name').toArray()))() }, [])

  function toggle(w: number) {
  const { options, loading, error: studentsError } = useStudentsOptions();
    setRepeatWeekdays(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w])
  }

  async function create() {
  const { options, loading, error: studentsError } = useStudentsOptions();
    if (!onCreate || !sid) return
    const repeat = repeatEnabled ? { enabled: true, weekdays: repeatWeekdays, until: repeatUntil } : { enabled: false, weekdays: [] }
    await onCreate(slot, Number(sid), start, end, repeat)
    // limpiamos el selector (feedback visual de que se añadió)
    setSid('')
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="select-pro"><select value={sid} onChange={(e) => setSid(e.target.value)} style={{ minWidth: 140 }}>
          <option value="">Seleccionar alumno…</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></div>
        {!compact && (
          <>
            <input type="time" value={start} step={900} onChange={e => setStart(e.target.value)} />
            <input type="time" value={end}   step={900} onChange={e => setEnd(e.target.value)} />
          </>
        )}
        <button onClick={create} disabled={!sid}>Añadir</button>
      </div>

      {/* Bloque repetir: bien contenido en móvil */}
      <div style={{
        display: 'grid', gap: 6,
        background: '#fff7fb', border: '1px dashed #ec4899',
        borderRadius: 12, padding: 8
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={repeatEnabled} onChange={e => setRepeatEnabled(e.target.checked)} />
          Repetir semanalmente
        </label>
        {repeatEnabled && (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {weekdayNames.map((n, i) => {
                const w = i + 1
                const active = repeatWeekdays.includes(w)
                return (
                  <button key={w} type="button"
                    onClick={() => toggle(w)}
                    style={{
                      padding: '6px 10px', borderRadius: 9999,
                      border: active ? '2px solid #ec4899' : '1px solid #e5e7eb',
                      background: active ? '#fdf2f8' : 'white', fontWeight: 700
                    }}>
                    {n}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>Hasta:</span>
              <input type="date" value={repeatUntil} onChange={e => setRepeatUntil(e.target.value)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ===== Píldora editable ===== */
function Pill({
  event, onUpdate, onDelete
}:{
  event: CalendarEvent
  onUpdate?: (id: number, s: Date, e: Date, sid?: number) => void
  onDelete?: (id: number) => void
}) {
  const [start, setStart] = useState(() => format(event.start, 'HH:mm'))
  const [end,   setEnd]   = useState(() => format(event.end, 'HH:mm'))
  const [isEditing, setIsEditing] = useState(false)

  async function save() {
  const { options, loading, error: studentsError } = useStudentsOptions();
    const [sH, sM] = start.split(':').map(Number)
    const [eH, eM] = end.split(':').map(Number)
    const d = event.start
    const ns = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sH, sM)
    const ne = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eH, eM)
    if (event.id && onUpdate) onUpdate(event.id, ns, ne, event.studentId)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          background: `linear-gradient(135deg, ${event.color || '#fb7185'}, #a855f7)`,
          color: 'white', padding: '8px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700
        }}>
          {event.title} · {format(event.start, 'HH:mm')}–{format(event.end, 'HH:mm')}
        </span>
        <button onClick={() => setIsEditing(true)} style={{ fontSize: 12 }}>✏️</button>
        <button onClick={() => event.id && onDelete && onDelete(event.id)} style={{ fontSize: 12 }}>🗑️</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <strong>{event.title}</strong>
      <input type="time" value={start} step={900} onChange={e => setStart(e.target.value)} />
      <input type="time" value={end}   step={900} onChange={e => setEnd(e.target.value)} />
      <button onClick={save}>Guardar</button>
      <button onClick={() => setIsEditing(false)}>Cancelar</button>
    </div>
  )
}

/* ===== Resumen día ===== */
function ResumenPanel({
  date, dayEvents, timeSlots, eventsIn
}:{
  date: Date
  dayEvents: CalendarEvent[]
  timeSlots: string[]
  eventsIn: (slot: string) => CalendarEvent[]
}) {
  const CAP = 10
  const fmt = (d: Date) => format(d, 'HH:mm')

  const alumnos = useMemo(() => {
    const m = new Map<string, { color: string; times: string[] }>()
    for (const e of dayEvents) {
      const name = e.title
      const t = `${fmt(e.start)}–${fmt(e.end)}`
      const color = e.color || '#ec4899'
      if (!m.has(name)) m.set(name, { color, times: [t] })
      else m.get(name)!.times.push(t)
    }
    return Array.from(m, ([name, v]) => ({ name, color: v.color, times: v.times }))
  }, [dayEvents])

  const totalClases = dayEvents.length
  const totalAlumnos = alumnos.length

  const pctColor = (p: number) => {
  const { options, loading, error: studentsError } = useStudentsOptions();
    if (p >= 0.9) return '#ef4444'
    if (p >= 0.6) return '#f59e0b'
    return '#22c55e'
  }

  return (
    <aside style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
        <div style={{
          background: 'linear-gradient(135deg,#f472b6,#ec4899)',
          color: 'white', padding: 14, borderRadius: 14, boxShadow: '0 8px 20px rgba(236,72,153,.25)'
        }}>
          <div style={{ opacity: .9 }}>Clases</div>
          <div style={{ fontWeight: 900, fontSize: 24 }}>{totalClases}</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
          color: 'white', padding: 14, borderRadius: 14, boxShadow: '0 8px 20px rgba(124,58,237,.25)'
        }}>
          <div style={{ opacity: .9 }}>Alumnos</div>
          <div style={{ fontWeight: 900, fontSize: 24 }}>{totalAlumnos}</div>
        </div>
      </div>

      <div style={{ background: 'white', padding: 14, borderRadius: 14, boxShadow: '0 6px 16px rgba(0,0,0,.06)' }}>
        <div style={{ fontWeight: 800, marginBottom: 8, color: '#334155' }}>🕰️ Ocupación</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {timeSlots.map(slot => {
            const list = eventsIn(slot)
            const used = list.length
            const pct = used / CAP
            const barColor = pctColor(pct)
            const [h] = slot.split(':').map(Number)
            const label = `${String(h).padStart(2,'0')}:00–${String(h+1).padStart(2,'0')}:00`
            return (
              <div key={slot}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginBottom: 4 }}>
                  <span>{label}</span><span>{used}/{CAP}</span>
                </div>
                <div style={{ height: 8, background: '#eef2f7', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, pct*100)}%`, height: '100%', background: barColor }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ background: 'white', padding: 14, borderRadius: 14, boxShadow: '0 6px 16px rgba(0,0,0,.06)' }}>
        <div style={{ fontWeight: 800, marginBottom: 8, color: '#334155' }}>👦👧 Alumnos y horas</div>
        {alumnos.length === 0 && <div style={{ color: '#64748b' }}>Sin clases hoy.</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {alumnos.map((a, i) => (
            <span key={i} style={{
              background: `linear-gradient(135deg, ${a.color}, #a855f7)`,
              color: 'white', padding: '6px 10px', borderRadius: 9999, fontSize: 12,
              boxShadow: '0 6px 18px rgba(0,0,0,.08)'
            }}>
              {a.name} · {a.times.join(', ')}
            </span>
          ))}
        </div>
      </div>
    </aside>
  )
}

/* ===== Mes ===== */
function MonthTable({
  isMobile, date, events, onPickDay, onPrevMonth, onNextMonth, onToday
}: {
  isMobile: boolean
  date: Date
  events: CalendarEvent[]
  onPickDay: (d: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
}) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
  const end   = endOfWeek(endOfMonth(date),   { weekStartsOn: 1 })

  const days: Date[] = []
  let d = start
  while (d <= end) { days.push(d); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) }

  function inHours(e: CalendarEvent) {
  const { options, loading, error: studentsError } = useStudentsOptions();
    const h = e.start.getHours()
    return h >= START_HOUR && h < END_HOUR
  }
  function eventsCount(day: Date) {
  const { options, loading, error: studentsError } = useStudentsOptions(); return events.filter(e => inHours(e) && isSameDay(e.start, day)).length }
  function uniqueStudentsCount(day: Date) {
  const { options, loading, error: studentsError } = useStudentsOptions(); return new Set(events.filter(e => inHours(e) && isSameDay(e.start, day)).map(e => e.title)).size }

  const gap         = isMobile ? 4  : 8
  const titleSize   = isMobile ? 16 : 18
  const weekdaySize = isMobile ? 11 : 12
  const cellPad     = isMobile ? 6  : 10
  const dayNumSize  = isMobile ? 14 : 16
  const badge1 = { fontSize: isMobile ? 10 : 11, padding: isMobile ? '1px 5px' : '2px 6px' }
  const badge2 = { fontSize: isMobile ? 8  : 9,  padding: isMobile ? '1px 5px' : '2px 6px' }

  return (
    <section style={{ marginBottom: isMobile ? 6 : 8, background: 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <strong style={{ fontSize: titleSize }}>{format(date, 'LLLL yyyy', { locale: es })}</strong>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={onToday}>Hoy</button>
          <button onClick={onPrevMonth}>←</button>
          <button onClick={onNextMonth}>→</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap }}>
        {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(h => (
          <div key={h} style={{ textAlign: 'center', fontSize: weekdaySize, color: '#64748b', fontWeight: 700 }}>{h}</div>
        ))}
        {days.map((day) => {
          const inactive = !isSameMonth(day, date)
          const selected = isSameDay(day, date)
          const count = eventsCount(day)
          const students = uniqueStudentsCount(day)
          const holiday = isHoliday(day)

          return (
            <button
              key={day.toISOString()}
              onClick={() => onPickDay(day)}
              style={{
                textAlign: 'left',
                padding: cellPad,
                borderRadius: 10,
                border: 'none',
                background: selected ? '#fdf2f8' : 'white',
                opacity: inactive ? .6 : 1,
                boxShadow: '0 4px 12px rgba(0,0,0,.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: dayNumSize, fontWeight: 800 }}>
                  {format(day, 'd', { locale: es })}{holiday && ' 🎉'}
                </span>
                {count > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    <span style={{ background: '#ec4899', color: 'white', borderRadius: 12, ...badge1, fontWeight: 700 }}>📚 {count}</span>
                    {students > 0 && <span style={{ background: '#7c3aed', color: 'white', borderRadius: 10, ...badge2, fontWeight: 600 }}>👥 {students}</span>}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}








