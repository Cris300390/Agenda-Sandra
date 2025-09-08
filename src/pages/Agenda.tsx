import { useEffect, useMemo, useState } from 'react'
import { addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns'
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
  
  // Make loadEvents available globally for the recurring class creation
  ;(window as any).loadEvents = loadEvents

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    localStorage.setItem('agenda.currentDate', currentDate.toISOString())
  }, [currentDate])

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
        {/* Header elegante */}
        <div style={{
          background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 30%, #be185d 70%, #db2777 100%)',
          padding: '32px 40px',
          borderRadius: '24px 24px 0 0',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.08"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.3
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            <div>
              <h1 style={{ 
                margin: 0, 
                color: 'white',
                fontSize: '48px',
                fontWeight: '800',
                letterSpacing: '-1px',
                textShadow: '0 4px 8px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                fontFamily: '\'Playfair Display\', \'Georgia\', serif'
              }}>
                <span style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 192, 203, 0.4) 100%)',
                  padding: '12px 16px',
                  borderRadius: '20px',
                  fontSize: '32px',
                  boxShadow: '0 4px 12px rgba(255, 182, 193, 0.3)'
                }}>🌸</span>
                Agenda Sandra
              </h1>
            </div>
            <a 
              href="/alumnos/nuevo"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600',
                border: '1px solid rgba(255, 182, 193, 0.4)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🌸</span> Nuevo Alumno
            </a>
          </div>
        </div>
        
        <div style={{ padding: '40px' }}>
      <MonthTable
        date={currentDate}
        events={events}
        onPickDay={(d) => setCurrentDate(d)}
        onPrevMonth={() => setCurrentDate(addMonths(currentDate, -1))}
        onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
        onToday={() => setCurrentDate(new Date())}
      />

      {/* Tabla del día, más amigable para revisión rápida */}
      <section aria-labelledby="tabla-dia" style={{ marginTop: 32 }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
          padding: '24px 32px',
          borderRadius: '20px 20px 0 0',
          border: '1px solid #f3e8ff',
          marginBottom: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <h3 id="tabla-dia" style={{ 
              margin: 0,
              color: '#be185d',
              fontSize: '24px',
              fontWeight: '700',
              letterSpacing: '-0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '12px',
                fontSize: '18px'
              }}>📋</span>
              Agenda del Día
            </h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button 
              onClick={() => setCurrentDate(new Date())}
              style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(236, 72, 153, 0.3)'
              }}
            >🏠 Hoy</button>
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1))}
              style={{
                background: 'white',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >← Anterior</button>
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1))}
              style={{
                background: 'white',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >Siguiente →</button>
            <input
              aria-label="Elegir fecha"
              type="date"
              value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`}
              onChange={(e) => {
                const [y,m,d] = e.target.value.split('-').map(Number)
                setCurrentDate(new Date(y, m - 1, d))
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '500',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            />
            </div>
          </div>
        </div>
        <DayTable 
          date={currentDate} 
          events={events} 
          onCreateAtSlot={async (slot, studentId, start, end) => {
            if (!studentId || !start || !end) return
            const student = await db.students.get(studentId)
            if (!student) return
            
            const selectedDate = currentDate
            const [sH, sM] = start.split(':').map(Number)
            const [eH, eM] = end.split(':').map(Number)
            const startTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), sH, sM)
            const endTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), eH, eM)
            await db.classes.add({ studentId: student.id!, title: 'Clase', start: startTime.toISOString(), end: endTime.toISOString() })
            await loadEvents()
          }}
          onDeleteEvent={async () => {
            await loadEvents()
          }}
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

function DayTable({ date, events, onCreateAtSlot, onDeleteEvent, onUpdateEvent }: { date: Date; events: CalendarEvent[]; onCreateAtSlot?: (slot: string, studentId?: number, start?: string, end?: string) => void; onDeleteEvent?: (ev: CalendarEvent) => void; onUpdateEvent?: (evId: number, newStart: Date, newEnd: Date, studentId?: number) => void }) {
  const MAX_PER_SLOT = 10
  
  const dayEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = new Date(event.start)
      const eventHour = eventDate.getHours()
      // Solo mostrar eventos del día actual y dentro del horario 16:00-22:00
      return eventDate.toDateString() === date.toDateString() && 
             eventHour >= 16 && eventHour < 22
    }).sort((a, b) => (a.start as Date).getTime() - (b.start as Date).getTime())
  }, [date, events])

  // Crear franjas horarias de 1 hora
  const timeSlots = useMemo(() => {
    const slots = []
    // Agregar slots de 1 hora de 16:00 a 22:00
    for (let h = 16; h <= 21; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`)
    }
    
    return slots
  }, [])

  function findEventsInSlot(slot: string): CalendarEvent[] {
    const [hh] = slot.split(':').map(Number)
    const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, 0)
    const slotEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh + 1, 0)
    
    return dayEvents.filter(ev => {
      const s = ev.start as Date
      const e = ev.end as Date
      // Evento se superpone con esta franja horaria
      return (s < slotEnd && e > slotStart)
    })
  }

  return (
    <div style={{ 
      background: 'white',
      borderRadius: '0 0 20px 20px',
      border: '1px solid #f3e8ff',
      borderTop: 'none',
      boxShadow: '0 10px 25px rgba(236, 72, 153, 0.08)',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto', padding: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <table role="table" aria-label="Agenda del día" style={{ 
          width: '100%', 
          borderCollapse: 'separate',
          borderSpacing: '0 8px'
        }}>
        <thead>
          <tr>
            <th style={{ 
              textAlign: 'left', 
              padding: '16px 20px', 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '12px 0 0 12px',
              width: 120,
              fontSize: '14px',
              fontWeight: '700',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRight: 'none'
            }}>⏰ Horario</th>
            <th style={{ 
              textAlign: 'left', 
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '0 12px 12px 0',
              fontSize: '14px',
              fontWeight: '700',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderLeft: 'none'
            }}>👥 Estudiantes</th>
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slot) => {
            const eventsInSlot = findEventsInSlot(slot)
            const isAtCapacity = eventsInSlot.length >= MAX_PER_SLOT
            
            // Detectar huecos (franjas vacías)
            let isLongGap = false
            if (eventsInSlot.length === 0) {
              isLongGap = true // Cualquier franja vacía se marca como libre
            }
            
            // Estilo de fila: rojo si está completo, verde si hay hueco largo, normal si no
            let rowStyle = {}
            if (isAtCapacity) {
              rowStyle = { background: '#fef2f2', borderLeft: '3px solid #ef4444' }
            } else if (isLongGap) {
              rowStyle = { background: '#f0fdf4' }
            }
            
            return (
              <tr key={slot} style={rowStyle}>
                <td style={{ 
                  padding: '0',
                  verticalAlign: 'top'
                }}>
                  <div style={{ 
                    background: isAtCapacity 
                      ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
                      : isLongGap 
                        ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' 
                        : 'linear-gradient(135deg, #fafafa 0%, #f4f4f5 100%)',
                    padding: '20px 16px',
                    borderRadius: '16px 0 0 16px',
                    border: isAtCapacity 
                      ? '2px solid #fca5a5' 
                      : isLongGap 
                        ? '2px solid #86efac' 
                        : '1px solid #e4e4e7',
                    borderRight: 'none',
                    boxShadow: isAtCapacity 
                      ? '0 4px 12px rgba(248, 113, 113, 0.15)' 
                      : isLongGap 
                        ? '0 4px 12px rgba(34, 197, 94, 0.15)'
                        : '0 2px 8px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    minHeight: '120px',
                    justifyContent: 'center'
                  }}>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: '800', 
                      color: isAtCapacity ? '#dc2626' : isLongGap ? '#059669' : '#374151', 
                      marginBottom: 8,
                      letterSpacing: '-0.5px'
                    }}>
                      {slot}
                    </div>
                    <div style={{ 
                      fontSize: 24, 
                      color: isAtCapacity ? '#f87171' : isLongGap ? '#34d399' : '#9ca3af', 
                      marginBottom: 8,
                      transform: 'rotate(90deg)'
                    }}>⏤</div>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: '800', 
                      color: isAtCapacity ? '#dc2626' : isLongGap ? '#059669' : '#374151',
                      letterSpacing: '-0.5px'
                    }}>
                      {String(parseInt(slot.split(':')[0]) + 1).padStart(2, '0')}:00
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isLongGap && (
                        <span style={{ 
                          color: '#059669', 
                          fontSize: 11, 
                          background: 'rgba(5, 150, 105, 0.1)', 
                          padding: '2px 6px', 
                          borderRadius: 6,
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3
                        }}>
                          ✨ Disponible
                        </span>
                      )}
                      {isAtCapacity && (
                        <span style={{ 
                          color: '#dc2626', 
                          fontSize: 11, 
                          background: 'rgba(220, 38, 38, 0.1)', 
                          padding: '2px 6px', 
                          borderRadius: 6, 
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3
                        }}>
                          🚫 Completo
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '0', verticalAlign: 'top' }}>
                  {/* Mostrar todos los eventos de esta franja horaria agrupados */}
                  {eventsInSlot.length > 0 ? (
                    <div style={{ 
                      padding: '20px 24px', 
                      background: isAtCapacity 
                        ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
                        : 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)', 
                      borderRadius: '0 16px 16px 0', 
                      border: isAtCapacity 
                        ? '2px solid #fca5a5' 
                        : '1px solid #e2e8f0',
                      borderLeft: 'none',
                      boxShadow: isAtCapacity 
                        ? '0 8px 25px rgba(248, 113, 113, 0.15)'
                        : '0 4px 12px rgba(0,0,0,0.05)',
                      minHeight: '120px'
                    }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                        {eventsInSlot.map(ev => (
                          <EditablePill key={`${slot}-${ev.id}`} event={ev} onUpdate={onUpdateEvent} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: !isAtCapacity ? 16 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: isAtCapacity 
                              ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' 
                              : 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: 25,
                            fontSize: 14,
                            fontWeight: '700',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}>
                            <span>👥</span>
                            <span>{eventsInSlot.length}/{MAX_PER_SLOT} estudiantes</span>
                          </div>
                          {isAtCapacity && (
                            <div style={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: 'white',
                              padding: '3px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: '700',
                              boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                            }}>
                              🚫 COMPLETO
                            </div>
                          )}
                        </div>
                      </div>
                      {!isAtCapacity && (
                        <div style={{ 
                          paddingTop: 16, 
                          borderTop: '2px solid rgba(236, 72, 153, 0.1)',
                          marginTop: 12
                        }}>
                          <InlineAdd slot={slot} onCreate={onCreateAtSlot} disabled={false} max={MAX_PER_SLOT} compact={true} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '20px 24px', 
                      background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', 
                      borderRadius: '0 16px 16px 0', 
                      border: '2px dashed #ec4899',
                      borderLeft: 'none',
                      boxShadow: '0 4px 12px rgba(236, 72, 153, 0.1)',
                      minHeight: '120px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <InlineAdd slot={slot} onCreate={onCreateAtSlot} disabled={false} max={MAX_PER_SLOT} />
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
        </table>
        <aside aria-label="Horas ocupadas" style={{ 
          background: 'linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%)', 
          borderRadius: '16px', 
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
        <h4 style={{ 
          margin: '0 0 20px 0', 
          color: '#be185d', 
          fontSize: 20, 
          fontWeight: '700',
          letterSpacing: '-0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
            color: 'white',
            padding: '6px 8px',
            borderRadius: '8px',
            fontSize: '16px'
          }}>📊</span>
          Resumen del Día
        </h4>
        
        {/* Estadísticas principales */}
        <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
          <div style={{ 
            padding: '20px', 
            background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', 
            borderRadius: 16, 
            color: 'white', 
            boxShadow: '0 8px 25px rgba(236, 72, 153, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: '600' }}>📚 Total Clases</span>
              <span style={{ fontSize: 24, fontWeight: '800' }}>{dayEvents.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: '600' }}>👥 Estudiantes Únicos</span>
              <span style={{ fontSize: 24, fontWeight: '800' }}>{new Set(dayEvents.map(e => e.title)).size}</span>
            </div>
          </div>
          
          {/* Estadísticas por franja horaria */}
          <div style={{ 
            padding: '20px', 
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
            borderRadius: 16, 
            color: 'white', 
            boxShadow: '0 8px 25px rgba(139, 92, 246, 0.25)'
          }}>
            <div style={{ fontSize: 16, fontWeight: '700', marginBottom: 12 }}>🕰️ Ocupación por Franja</div>
            <div style={{ display: 'grid', gap: 4 }}>
              {timeSlots.map(slot => {
                const slotEvents = findEventsInSlot(slot)
                const [startHour] = slot.split(':').map(Number)
                const endHour = startHour + 1
                return (
                  <div key={slot} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span>{String(startHour).padStart(2, '0')}:00-{String(endHour).padStart(2, '0')}:00</span>
                    <span style={{ 
                      background: slotEvents.length > 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', 
                      padding: '1px 6px', 
                      borderRadius: 10,
                      fontWeight: '600'
                    }}>
                      {slotEvents.length}/{MAX_PER_SLOT}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Estadísticas adicionales */}
          <div style={{ 
            padding: '20px', 
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', 
            borderRadius: 16, 
            color: 'white', 
            boxShadow: '0 8px 25px rgba(6, 182, 212, 0.25)'
          }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: '600' }}>🟢 Franjas Libres</span>
                <span style={{ fontSize: 18, fontWeight: '800' }}>{timeSlots.filter(slot => findEventsInSlot(slot).length === 0).length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: '600' }}>🔴 Franjas Completas</span>
                <span style={{ fontSize: 18, fontWeight: '800' }}>{timeSlots.filter(slot => findEventsInSlot(slot).length >= MAX_PER_SLOT).length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: '600' }}>📊 Ocupación Total</span>
                <span style={{ fontSize: 18, fontWeight: '800' }}>{Math.round((dayEvents.length / (timeSlots.length * MAX_PER_SLOT)) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cronograma detallado */}
        {dayEvents.length > 0 ? (
          <div>
            <h5 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: 14, fontWeight: '600', display: 'flex', alignItems: 'center', gap: 6 }}>
              🕐 Cronograma Detallado
              <span style={{ fontSize: 11, background: '#e5e7eb', color: '#6b7280', padding: '2px 6px', borderRadius: 10 }}>
                {dayEvents.length} clases
              </span>
            </h5>
            <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
              {dayEvents
                .sort((a,b) => (a.start as Date).getTime() - (b.start as Date).getTime())
                .map((ev, index) => {
                  const startTime = ev.start as Date
                  const endTime = ev.end as Date
                  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)) // minutos
                  return (
                    <div key={`${startTime.toISOString()}-${ev.id}`} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      padding: '10px', 
                      marginBottom: 8,
                      background: 'white',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      position: 'relative'
                    }}>
                      <div style={{ 
                        width: 24, 
                        height: 24, 
                        background: (ev as any).color || '#fb7185', 
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 'bold'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 12, color: '#6b7280', fontWeight: '600' }}>
                            {String(startTime.getHours()).padStart(2,'0')}
                            :{String(startTime.getMinutes()).padStart(2,'0')}–
                            {String(endTime.getHours()).padStart(2,'0')}
                            :{String(endTime.getMinutes()).padStart(2,'0')}
                          </span>
                          <span style={{ 
                            fontSize: 10, 
                            background: '#f3f4f6', 
                            color: '#6b7280', 
                            padding: '1px 4px', 
                            borderRadius: 4 
                          }}>
                            {duration}min
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: '600',
                          color: '#1f2937',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          👤 {ev.title}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '24px 12px', 
            color: '#9ca3af', 
            background: 'white',
            borderRadius: 8,
            border: '2px dashed #d1d5db'
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 14, fontWeight: '500' }}>Sin clases programadas</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Todos los horarios están disponibles</div>
          </div>
        )}
        </aside>
        </div>
      </div>
    </div>
  )
}

function InlineAdd({ slot, onCreate, disabled, max, compact }: { slot: string; onCreate?: (slot: string, studentId?: number, start?: string, end?: string) => void; disabled?: boolean; max?: number; compact?: boolean }) {
  const [students, setStudents] = useState<{ id?: number; name: string }[]>([])
  const [sid, setSid] = useState<string>('')
  const [start, setStart] = useState<string>(slot)
  const [end, setEnd] = useState<string>(() => {
    const [h] = slot.split(':').map(Number)
    return `${String(h + 1).padStart(2, '0')}:00`
  })
  const [showAdvancedRepeat, setShowAdvancedRepeat] = useState<boolean>(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [repeatStartDate, setRepeatStartDate] = useState<string>(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  })
  const [repeatEndDate, setRepeatEndDate] = useState<string>(() => {
    const endOfYear = new Date(new Date().getFullYear(), 11, 31)
    return `${endOfYear.getFullYear()}-${String(endOfYear.getMonth() + 1).padStart(2, '0')}-${String(endOfYear.getDate()).padStart(2, '0')}`
  })

  useEffect(() => {
    ;(async () => setStudents(await db.students.orderBy('name').toArray()))()
  }, [])

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <select 
          aria-label="Alumno" 
          value={sid} 
          onChange={(e) => setSid(e.target.value)} 
          disabled={disabled} 
          style={{ 
            fontSize: 13, 
            padding: '6px 12px', 
            borderRadius: 8, 
            border: '2px solid #e5e7eb',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            minWidth: 160,
            fontWeight: '500',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            cursor: 'pointer'
          }}
        >
          <option value="">🎓 Seleccionar alumno…</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button 
          onClick={async () => {
            if (!onCreate || !sid) return
            await onCreate(slot, Number(sid), start, end)
            setSid('') // Reset selection
            // Recargar eventos para actualizar el panel lateral
            const loadEvents = (window as any).loadEvents
            if (loadEvents) await loadEvents()
          }} 
          disabled={disabled || !sid}
          style={{ 
            fontSize: 12, 
            padding: '6px 16px',
            background: sid 
              ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' 
              : 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: '600',
            cursor: sid ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            boxShadow: sid ? '0 3px 8px rgba(5, 150, 105, 0.3)' : '0 2px 4px rgba(156, 163, 175, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
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
        type="button"
        onClick={() => setShowAdvancedRepeat(!showAdvancedRepeat)}
        style={{ 
          fontSize: 12, 
          padding: '6px 12px', 
          background: showAdvancedRepeat ? '#3b82f6' : '#6b7280', 
          color: 'white', 
          border: 'none', 
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: '500'
        }}
      >
        📅 Planificación Avanzada
      </button>
      <button 
        className="btn-primary" 
        onClick={async (e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('Add button clicked')
          try {
            if (!onCreate) {
              console.log('No onCreate function')
              return
            }
            
            if (showAdvancedRepeat && selectedDays.length > 0) {
              // Planificación avanzada con días específicos
              console.log('Creating recurring classes')
              console.log('Selected days before calling function:', selectedDays)
              await createRecurringClasses()
            } else {
              // Crear para el día actual
              console.log('Creating single class')
              await onCreate(slot, Number(sid), start, end)
              // Recargar eventos para actualizar el panel lateral
              const loadEvents = (window as any).loadEvents
              if (loadEvents) {
                console.log('Reloading events...')
                await loadEvents()
                console.log('Events reloaded')
              }
            }
          } catch (error) {
            console.error('Error adding class:', error)
            alert('Error al añadir clase: ' + error)
          }
        }} 
        disabled={disabled}
      >
        Añadir
      </button>
      {disabled && <span style={{ color: '#ef4444', fontSize: 12 }}>Cupo lleno ({max})</span>}
      
      {showAdvancedRepeat && (
        <div style={{ 
          marginTop: 12, 
          padding: 12, 
          background: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: 8 
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#374151' }}>📅 Planificación Recurrente</h4>
          
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Días de la semana:</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => {
                const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
                const isSelected = selectedDays.includes(index + 1)
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('Day button clicked:', dayNames[index])
                      const dayNum = index + 1
                      setSelectedDays(prev => 
                        isSelected 
                          ? prev.filter(d => d !== dayNum)
                          : [...prev, dayNum].sort()
                      )
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      fontSize: 12,
                      fontWeight: '600',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      background: isSelected ? '#3b82f6' : '#fff',
                      color: isSelected ? '#fff' : '#374151',
                      cursor: 'pointer'
                    }}
                    title={dayNames[index]}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Desde:</label>
              <input 
                type="date" 
                value={repeatStartDate} 
                onChange={(e) => setRepeatStartDate(e.target.value)}
                style={{ width: '100%', padding: '4px 6px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Hasta:</label>
              <input 
                type="date" 
                value={repeatEndDate} 
                onChange={(e) => setRepeatEndDate(e.target.value)}
                style={{ width: '100%', padding: '4px 6px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4 }}
              />
            </div>
          </div>
          
          {selectedDays.length > 0 && (
            <div style={{ fontSize: 11, color: '#6b7280', background: '#e0f2fe', padding: 6, borderRadius: 4 }}>
              📊 Se crearán aproximadamente {calculateClassCount()} clases
            </div>
          )}
        </div>
      )}
    </div>
  )
  
  async function createRecurringClasses() {
    console.log('createRecurringClasses called')
    console.log('onCreate:', !!onCreate)
    console.log('sid:', sid)
    console.log('selectedDays:', selectedDays)
    console.log('repeatStartDate:', repeatStartDate)
    console.log('repeatEndDate:', repeatEndDate)
    
    if (!onCreate || !sid) {
      console.log('Missing onCreate or sid, returning')
      return
    }
    
    if (selectedDays.length === 0) {
      alert('Por favor selecciona al menos un día de la semana')
      return
    }
    
    if (!repeatStartDate || !repeatEndDate) {
      alert('Por favor selecciona las fechas de inicio y fin')
      return
    }
    
    const startDate = new Date(repeatStartDate)
    const endDate = new Date(repeatEndDate)
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    
    console.log('Date range:', startDate, 'to', endDate)
    console.log('Time range:', start, 'to', end)
    
    let classesCreated = 0
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay() // Convert Sunday from 0 to 7
      
      if (selectedDays.includes(dayOfWeek)) {
        const classStart = new Date(currentDate)
        classStart.setHours(sh, sm, 0, 0)
        const classEnd = new Date(currentDate)
        classEnd.setHours(eh, em, 0, 0)
        
        console.log('Creating class for:', classStart.toDateString())
        
        try {
          await db.classes.add({
            studentId: Number(sid),
            title: 'Clase',
            start: classStart.toISOString(),
            end: classEnd.toISOString()
          })
          classesCreated++
          console.log('Class created successfully')
        } catch (error) {
          console.error('Error creating class:', error)
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    console.log('Total classes created:', classesCreated)
    
    // Reload events to show new classes
    const loadEvents = (window as any).loadEvents
    if (loadEvents) {
      console.log('Reloading events...')
      await loadEvents()
      console.log('Events reloaded')
    }
    
    alert(`✅ Se crearon ${classesCreated} clases exitosamente`)
    
    // Reset form
    setSid('')
    setSelectedDays([])
    setShowAdvancedRepeat(false)
    console.log('Form reset completed')
  }
  
  function calculateClassCount() {
    if (selectedDays.length === 0) return 0
    
    const startDate = new Date(repeatStartDate)
    const endDate = new Date(repeatEndDate)
    let count = 0
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay()
      if (selectedDays.includes(dayOfWeek)) {
        count++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return count
  }
}

// Función auxiliar para ajustar brillo de colores
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = (num >> 8 & 0x00FF) + amt
  const B = (num & 0x0000FF) + amt
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
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
      // Encontrar el estudiante actual del evento
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
          color: 'white', 
          padding: '8px 16px', 
          borderRadius: 12,
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid rgba(255,255,255,0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'rgba(255,255,255,0.3)'
          }} />
          <div style={{
            width: 20,
            height: 20,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px'
          }}>
            🎓
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', letterSpacing: '0.3px' }}>{event.title}</div>
            <div style={{ opacity: 0.9, fontSize: '11px', fontWeight: '500' }}>{start} - {end}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button 
            onClick={() => setIsEditing(true)}
            style={{ 
              fontSize: 10, 
              padding: '4px 8px', 
              background: '#3b82f6', 
              color: 'white',
              border: 'none', 
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: '500'
            }}
            title="Editar clase"
          >
            ✏️
          </button>
          <button 
            type="button"
            style={{ 
              fontSize: 10, 
              padding: '4px 8px', 
              background: '#ef4444', 
              color: 'white',
              border: 'none', 
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: '500'
            }} 
            onMouseDown={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('Delete button mousedown triggered')
              
              try {
                if (event.id) {
                  console.log('Deleting class with ID:', event.id)
                  await db.classes.delete(event.id)
                  console.log('Class deleted, reloading events')
                  
                  // Recargar eventos
                  const loadEventsFn = (window as any).loadEvents
                  if (loadEventsFn) {
                    await loadEventsFn()
                    console.log('Events reloaded successfully')
                  }
                } else {
                  console.log('No event ID found')
                }
              } catch (error) {
                console.error('Error deleting:', error)
                alert('Error: ' + error)
              }
            }}
            title="Eliminar clase"
          >
            🗑️
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', background: '#f9fafb', padding: '8px', borderRadius: 6, border: '1px solid #e5e7eb' }}>
      <span style={{ background: (event as any).color || '#fb7185', color: 'white', padding: '8px 12px', borderRadius: 12, fontSize: '14px', fontWeight: '600' }}>
        {currentStudent ? currentStudent.name : 'Alumno demo'}
      </span>
      <input aria-label="Desde" type="time" value={start} step={900} onChange={(e) => setStart(e.target.value)} />
      <input aria-label="Hasta" type="time" value={end} step={900} onChange={(e) => setEnd(e.target.value)} />
      <button onClick={save} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: '600' }}>Guardar</button>
      <button onClick={() => setIsEditing(false)} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: '600' }}>Cancelar</button>
    </div>
  )
}

function MonthTable({ date, events, onPickDay, onPrevMonth, onNextMonth, onToday }: { date: Date; events: CalendarEvent[]; onPickDay: (d: Date) => void; onPrevMonth: () => void; onNextMonth: () => void; onToday: () => void }) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 })

  const days: Date[] = []
  let d = start
  while (d <= end) {
    days.push(d)
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  }

  function eventsCount(day: Date) {
    return events.filter(e => isSameDay(e.start, day)).length
  }

  function uniqueStudentsCount(day: Date) {
    const dayEvents = events.filter(e => isSameDay(e.start, day))
    const uniqueStudents = new Set(dayEvents.map(e => e.title))
    return uniqueStudents.size
  }

  return (
    <section aria-labelledby="tabla-mes" style={{ 
      marginBottom: 32,
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      borderRadius: 20,
      padding: 32,
      boxShadow: '0 20px 40px rgba(148, 163, 184, 0.15), 0 0 0 1px rgba(203, 213, 225, 0.2)',
      border: '1px solid rgba(203, 213, 225, 0.3)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 id="tabla-mes" style={{ 
          margin: 0, 
          color: '#1e293b',
          fontSize: 28,
          fontWeight: '700',
          letterSpacing: '-0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '20px'
          }}>📅</span>
          {format(date, 'LLLL yyyy', { locale: es })}
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={onToday}
            style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🏠 Hoy
          </button>
          <button 
            onClick={onPrevMonth}
            style={{
              background: 'white',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              padding: '12px 20px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Anterior
          </button>
          <button 
            onClick={onNextMonth}
            style={{
              background: 'white',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              padding: '12px 20px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Siguiente →
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(h => (
          <div key={h} style={{ 
            fontWeight: 700, 
            color: '#475569', 
            padding: '12px 8px',
            textAlign: 'center',
            fontSize: 14,
            background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
            borderRadius: '12px',
            margin: '0 2px 8px 2px'
          }}>{h}</div>
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
                textAlign: 'left', 
                padding: 12, 
                borderRadius: 12, 
                border: holiday 
                  ? '2px solid #f87171' 
                  : selected 
                    ? '2px solid #ec4899' 
                    : '1px solid #e2e8f0', 
                background: selected 
                  ? 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)' 
                  : holiday 
                    ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
                    : 'white', 
                opacity: inactive ? 0.6 : 1,
                backdropFilter: 'blur(10px)',
                boxShadow: selected 
                  ? '0 8px 25px rgba(236, 72, 153, 0.25)' 
                  : '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              aria-label={`Seleccionar ${format(day, 'EEEE d', { locale: es })}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: selected ? '#be185d' : holiday ? '#dc2626' : '#1e293b'
                }}>
                  {format(day, 'd', { locale: es })}
                  {isHoliday(day) && <span style={{ marginLeft: '4px' }}>🎉</span>}
                </span>
                {count > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', 
                      color: 'white', 
                      borderRadius: 12, 
                      padding: '3px 8px', 
                      fontSize: 11,
                      fontWeight: '700',
                      boxShadow: '0 2px 4px rgba(244, 63, 94, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      📚 {count}
                    </div>
                    {studentsCount > 0 && (
                      <div style={{ 
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
                        color: 'white', 
                        borderRadius: 10, 
                        padding: '2px 6px', 
                        fontSize: 9,
                        fontWeight: '600',
                        boxShadow: '0 1px 3px rgba(59, 130, 246, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}>
                        👥 {studentsCount}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {holiday && (
                <div style={{ 
                  color: selected ? '#dc2626' : '#f87171', 
                  fontSize: 10, 
                  marginTop: 6,
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3
                }}>
                  🎉 Festivo
                </div>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
