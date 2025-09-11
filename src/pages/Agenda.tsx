import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek
} from 'date-fns'
import { es } from 'date-fns/locale'
import { db } from '../db'
import { isHoliday } from '../util/holidays'

type CalendarEvent = { id?: number; title: string; start: Date; end: Date; color?: string; studentId?: number }

export default function Agenda() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const saved = localStorage.getItem('agenda.currentDate')
    return saved ? new Date(saved) : new Date()
  })

  async function loadEvents() {
    const classes = await db.classes.toArray()
    const students = await db.students.toArray()
    const byId = new Map(students.map(s => [s.id!, s]))
    const evts: CalendarEvent[] = classes.map((c) => ({
      id: c.id,
      title: byId.get(c.studentId)?.name || c.title,
      start: parseISO(c.start),
      end: parseISO(c.end),
      color: byId.get(c.studentId)?.color,
      studentId: c.studentId,
    }))
    setEvents(evts)
  }
  ;(window as any).loadEvents = loadEvents

  useEffect(() => { loadEvents() }, [])
  useEffect(() => { localStorage.setItem('agenda.currentDate', currentDate.toISOString()) }, [currentDate])

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 30%, #fbcfe8 70%, #f9a8d4 100%)',
      minHeight: '100vh',
      padding: '24px',
      fontFamily: '\'Inter\', \'Segoe UI\', system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.98)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px rgba(244, 114, 182, 0.25), 0 0 0 1px rgba(255, 182, 193, 0.3)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden'
      }}>
        {/* Cabecera */}
        <div style={{
          background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 30%, #be185d 70%, #db2777 100%)',
          padding: '32px 40px',
          borderRadius: '24px 24px 0 0',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0, color: 'white', fontSize: 48, fontWeight: 800 }}>Agenda Sandra</h1>
            <a href="/alumnos/nuevo" style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 12,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              border: '1px solid rgba(255, 182, 193, 0.4)'
            }}>
              🌸 Nuevo Alumno
            </a>
          </div>
        </div>

        <div style={{ padding: 40 }}>
          <MonthTable
            date={currentDate}
            events={events}
            onPickDay={(d) => setCurrentDate(d)}
            onPrevMonth={() => setCurrentDate(addMonths(currentDate, -1))}
            onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
            onToday={() => setCurrentDate(new Date())}
          />

          {/* Día */}
          <section aria-labelledby="tabla-dia" style={{ marginTop: 32 }}>
            <div style={{
              background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
              padding: '24px 32px',
              borderRadius: '20px 20px 0 0',
              border: '1px solid #f3e8ff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <h3 id="tabla-dia" style={{ margin: 0, color: '#be185d', fontSize: 24, fontWeight: 700 }}>Agenda del Día</h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={() => setCurrentDate(new Date())}>🏠 Hoy</button>
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1))}>← Anterior</button>
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1))}>Siguiente →</button>
                  <input
                    aria-label="Elegir fecha"
                    type="date"
                    value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`}
                    onChange={(e) => {
                      const [y, m, d] = e.target.value.split('-').map(Number)
                      setCurrentDate(new Date(y, m - 1, d))
                    }}
                  />
                </div>
              </div>
            </div>

            <DayTable
              date={currentDate}
              events={events}
              onCreateAtSlot={async (_slot, studentId, start, end) => {
                if (!studentId || !start || !end) return
                const student = await db.students.get(studentId)
                if (!student) return
                const [sH, sM] = start.split(':').map(Number)
                const [eH, eM] = end.split(':').map(Number)
                const startTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), sH, sM)
                const endTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), eH, eM)
                await db.classes.add({ studentId: student.id!, title: 'Clase', start: startTime.toISOString(), end: endTime.toISOString() })
                await loadEvents()
              }}
              onDeleteEvent={async () => { await loadEvents() }}  // aceptada pero no usada dentro del componente
              onUpdateEvent={async (evId, newStart, newEnd, newStudentId) => {
                await db.classes.update(evId, { start: newStart.toISOString(), end: newEnd.toISOString(), studentId: newStudentId })
                await loadEvents()
              }}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

/* ===================== DAY TABLE ===================== */

type DayTableProps = {
  date: Date
  events: CalendarEvent[]
  onCreateAtSlot?: (slot: string, studentId?: number, start?: string, end?: string) => void
  onDeleteEvent?: (ev: CalendarEvent) => void   // la aceptamos, pero no la usamos para evitar TS6133
  onUpdateEvent?: (evId: number, newStart: Date, newEnd: Date, studentId?: number) => void
}

function DayTable(props: DayTableProps) {
  // Importante: NO desestructuramos onDeleteEvent para que no marque "no usado"
  const { date, events, onCreateAtSlot, onUpdateEvent } = props
  const MAX_PER_SLOT = 10

  const dayEvents = useMemo(() => {
    return events
      .filter(event => {
        const eventDate = new Date(event.start)
        const eventHour = eventDate.getHours()
        return eventDate.toDateString() === date.toDateString() && eventHour >= 16 && eventHour < 22
      })
      .sort((a, b) => (a.start as Date).getTime() - (b.start as Date).getTime())
  }, [date, events])

  // Slots de 16:00 a 21:00
  const timeSlots = useMemo(() => {
    const slots: string[] = []
    for (let h = 16; h <= 21; h++) slots.push(`${String(h).padStart(2, '0')}:00`)
    return slots
  }, [])

  function findEventsInSlot(slot: string): CalendarEvent[] {
    const [hh] = slot.split(':').map(Number)
    const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, 0)
    const slotEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh + 1, 0)
    return dayEvents.filter(ev => {
      const s = ev.start as Date
      const e = ev.end as Date
      return (s < slotEnd && e > slotStart)
    })
  }

  return (
    <div style={{ background: 'white', borderRadius: '0 0 20px 20px', border: '1px solid #f3e8ff', borderTop: 'none' }}>
      <div style={{ overflowX: 'auto', padding: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <table role="table" aria-label="Agenda del día" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '16px 20px' }}>⏰ Horario</th>
                <th style={{ textAlign: 'left', padding: '16px 20px' }}>👥 Estudiantes</th>
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => {
                const eventsInSlot = findEventsInSlot(slot)
                const isAtCapacity = eventsInSlot.length >= MAX_PER_SLOT
                const isLongGap = eventsInSlot.length === 0

                return (
                  <tr key={slot}>
                    <td style={{ padding: 0, verticalAlign: 'top' }}>
                      <div style={{ padding: '20px 16px', minHeight: 120 }}>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{slot}</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>
                          {String(parseInt(slot.split(':')[0]) + 1).padStart(2, '0')}:00
                        </div>
                        {isLongGap && <div style={{ fontSize: 12, color: '#059669' }}>✨ Disponible</div>}
                        {isAtCapacity && <div style={{ fontSize: 12, color: '#dc2626' }}>🚫 Completo</div>}
                      </div>
                    </td>

                    <td style={{ padding: 0, verticalAlign: 'top' }}>
                      {eventsInSlot.length > 0 ? (
                        <div style={{ padding: '20px 24px', minHeight: 120 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                            {eventsInSlot.map(ev => <EditablePill key={`${slot}-${ev.id}`} event={ev} onUpdate={onUpdateEvent} />)}
                          </div>
                          {!isAtCapacity && (
                            <div style={{ paddingTop: 16, borderTop: '1px solid #eee', marginTop: 12 }}>
                              <InlineAdd slot={slot} onCreate={onCreateAtSlot} disabled={false} max={MAX_PER_SLOT} compact />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ padding: '20px 24px', minHeight: 120 }}>
                          <InlineAdd slot={slot} onCreate={onCreateAtSlot} disabled={false} max={MAX_PER_SLOT} />
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <AsideResumen dayEvents={dayEvents} timeSlots={timeSlots} findEventsInSlot={findEventsInSlot} />
        </div>
      </div>
    </div>
  )
}

/* ---------- InlineAdd (FALTABA) ---------- */
function InlineAdd({
  slot, onCreate, disabled, max, compact
}: {
  slot: string
  onCreate?: (slot: string, studentId?: number, start?: string, end?: string) => void
  disabled?: boolean
  max?: number
  compact?: boolean
}) {
  const [students, setStudents] = useState<{ id?: number; name: string }[]>([])
  const [sid, setSid] = useState<string>('')
  const [start, setStart] = useState<string>(slot)
  const [end, setEnd] = useState<string>(() => {
    const [h] = slot.split(':').map(Number)
    return `${String(h + 1).padStart(2, '0')}:00`
  })

  useEffect(() => { (async () => setStudents(await db.students.orderBy('name').toArray()))() }, [])

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <select aria-label="Alumno" value={sid} onChange={(e) => setSid(e.target.value)} disabled={disabled}>
          <option value="">🎓 Seleccionar alumno…</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button
          onClick={async () => {
            if (!onCreate || !sid) return
            await onCreate(slot, Number(sid), start, end)
            setSid('')
            const loadEvents = (window as any).loadEvents
            if (loadEvents) await loadEvents()
          }}
          disabled={disabled || !sid}
        >
          ✨ Añadir Alumno
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <select aria-label="Alumno" value={sid} onChange={(e) => setSid(e.target.value)} disabled={disabled}>
        <option value="">Alumno…</option>
        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <input aria-label="Desde" type="time" value={start} step={900} onChange={(e) => setStart(e.target.value)} disabled={disabled} />
      <input aria-label="Hasta" type="time" value={end} step={900} onChange={(e) => setEnd(e.target.value)} disabled={disabled} />
      <button
        onClick={async (e) => {
          e.preventDefault()
          if (!onCreate || !sid) return
          await onCreate(slot, Number(sid), start, end)
          const loadEvents = (window as any).loadEvents
          if (loadEvents) await loadEvents()
        }}
        disabled={disabled}
      >
        Añadir
      </button>
      {disabled && <span style={{ color: '#ef4444', fontSize: 12 }}>Cupo lleno ({max})</span>}
    </div>
  )
}

/* ---------- Aside de resumen ---------- */
function AsideResumen({ dayEvents, timeSlots, findEventsInSlot }:{
  dayEvents: CalendarEvent[], timeSlots: string[], findEventsInSlot: (slot: string)=>CalendarEvent[]
}) {
  return (
    <aside aria-label="Horas ocupadas" style={{ background: '#fafbfc', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
      <h4 style={{ margin: 0, color: '#be185d', fontSize: 20, fontWeight: 700 }}>Resumen del Día</h4>
      <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
        <div style={{ padding: 20, background: '#ec4899', borderRadius: 16, color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>📚 Total Clases</span>
            <span style={{ fontSize: 24, fontWeight: 800 }}>{dayEvents.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span>👥 Estudiantes Únicos</span>
            <span style={{ fontSize: 24, fontWeight: 800 }}>{new Set(dayEvents.map(e => e.title)).size}</span>
          </div>
        </div>

        <div style={{ padding: 20, background: '#7c3aed', borderRadius: 16, color: 'white' }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>🕰️ Ocupación por Franja</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {timeSlots.map(slot => {
              const slotEvents = findEventsInSlot(slot)
              const [startHour] = slot.split(':').map(Number)
              const endHour = startHour + 1
              return (
                <div key={slot} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>{String(startHour).padStart(2, '0')}:00-{String(endHour).padStart(2, '0')}:00</span>
                  <span>{slotEvents.length}/10</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </aside>
  )
}

/* ===================== UTILS / PILLA ===================== */

function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = (num >> 8 & 0x00FF) + amt
  const B = (num & 0x0000FF) + amt
  return '#' + (0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)).toString(16).slice(1)
}

function EditablePill({ event, onUpdate }: { event: CalendarEvent; onUpdate?: (evId: number, newStart: Date, newEnd: Date, studentId?: number) => void }) {
  const [, setStudents] = useState<{ id?: number; name: string }[]>([])
  const [currentStudent, setCurrentStudent] = useState<{ id?: number; name: string } | null>(null)
  const [start, setStart] = useState<string>(() => {
    const d = event.start as Date
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [end, setEnd] = useState<string>(() => {
    const d = event.end as Date
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    ;(async () => {
      const allStudents = await db.students.orderBy('name').toArray()
      setStudents(allStudents)
      if (event.studentId) {
        const student = allStudents.find(s => s.id === event.studentId)
        setCurrentStudent(student || null)
      }
    })()
  }, [event.studentId])

  async function save() {
    const [sH, sM] = start.split(':').map(Number)
    const [eH, eM] = end.split(':').map(Number)
    const day = event.start as Date
    const newStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), sH, sM)
    const newEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), eH, eM)
    if (event.id && onUpdate) onUpdate(event.id, newStart, newEnd, currentStudent?.id)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          background: `linear-gradient(135deg, ${(event as any).color || '#fb7185'} 0%, ${adjustColorBrightness((event as any).color || '#fb7185', -20)} 100%)`,
          color: 'white', padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600
        }}>
          <div style={{ fontWeight: 700 }}>{event.title}</div>
          <div style={{ fontSize: 11 }}>{start} - {end}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setIsEditing(true)} style={{ fontSize: 10 }}>✏️</button>
          <button
            type="button"
            style={{ fontSize: 10 }}
            onMouseDown={async (e) => {
              e.preventDefault(); e.stopPropagation()
              try {
                if (event.id) {
                  await db.classes.delete(event.id)
                  const loadEventsFn = (window as any).loadEvents
                  if (loadEventsFn) await loadEventsFn()
                }
              } catch (error) { alert('Error: ' + error) }
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <span style={{ background: (event as any).color || '#fb7185', color: 'white', padding: '6px 10px', borderRadius: 8 }}>
        {currentStudent ? currentStudent.name : 'Alumno demo'}
      </span>
      <input aria-label="Desde" type="time" value={start} step={900} onChange={(e) => setStart(e.target.value)} />
      <input aria-label="Hasta" type="time" value={end} step={900} onChange={(e) => setEnd(e.target.value)} />
      <button onClick={save}>Guardar</button>
      <button onClick={() => setIsEditing(false)}>Cancelar</button>
    </div>
  )
}

/* ===================== MONTH TABLE ===================== */

function MonthTable({
  date, events, onPickDay, onPrevMonth, onNextMonth, onToday
}: {
  date: Date; events: CalendarEvent[]; onPickDay: (d: Date) => void; onPrevMonth: () => void; onNextMonth: () => void; onToday: () => void
}) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 })

  const days: Date[] = []
  let d = start
  while (d <= end) {
    days.push(d)
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  }

  function eventsCount(day: Date) { return events.filter(e => isSameDay(e.start, day)).length }
  function uniqueStudentsCount(day: Date) { return new Set(events.filter(e => isSameDay(e.start, day)).map(e => e.title)).size }

  return (
    <section aria-labelledby="tabla-mes" style={{ marginBottom: 32, borderRadius: 20, padding: 32, border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 id="tabla-mes" style={{ margin: 0, color: '#1e293b', fontSize: 28, fontWeight: 700 }}>
          {format(date, 'LLLL yyyy', { locale: es })}
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onToday}>🏠 Hoy</button>
          <button onClick={onPrevMonth}>← Anterior</button>
          <button onClick={onNextMonth}>Siguiente →</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(h => (
          <div key={h} style={{ fontWeight: 700, padding: '12px 8px', textAlign: 'center' }}>{h}</div>
        ))}
        {days.map((day) => {
          const inactive = !isSameMonth(day, date)
          const selected = isSameDay(day, date)
          const count = eventsCount(day)
          const studentsCount = uniqueStudentsCount(day)
          const holiday = isHoliday(day)
          return (
            <button
              key={day.toISOString()}
              onClick={() => onPickDay(day)}
              style={{
                textAlign: 'left', padding: 12, borderRadius: 12,
                border: holiday ? '2px solid #f87171' : selected ? '2px solid #ec4899' : '1px solid #e2e8f0',
                background: selected ? '#fdf2f8' : holiday ? '#fee2e2' : 'white',
                opacity: inactive ? 0.6 : 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>
                  {format(day, 'd', { locale: es })}{holiday && ' 🎉'}
                </span>
                {count > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    <div style={{ background: '#ec4899', color: 'white', borderRadius: 12, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>📚 {count}</div>
                    {studentsCount > 0 && (
                      <div style={{ background: '#7c3aed', color: 'white', borderRadius: 10, padding: '2px 6px', fontSize: 9, fontWeight: 600 }}>👥 {studentsCount}</div>
                    )}
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
