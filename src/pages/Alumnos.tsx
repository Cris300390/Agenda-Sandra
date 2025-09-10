// src/pages/Alumnos.tsx
import { useEffect, useMemo, useState } from 'react'
import { db, generateUniqueColor } from '../db'
import type { Student } from '../db'

type Filter = 'todos' | 'activos' | 'inactivos'
type MoneyStats = { totalClases: number; totalPagos: number; pendiente: number }

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0)

export default function Alumnos() {
  const [students, setStudents] = useState<Student[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')
  const [modal, setModal] = useState<{ open: boolean; student?: Student }>({ open: false })
  const [payModal, setPayModal] = useState<{ open: boolean; student?: Student }>({ open: false })
  const [balances, setBalances] = useState<Record<number, MoneyStats>>({})

  // 1) Cargar alumnos al montar
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const list = await db.students.orderBy('name').toArray()
      if (mounted) setStudents(list)
    })()
    return () => { mounted = false }
  }, [])

  // 2) Recalcular saldos cada vez que cambia la lista de alumnos
  useEffect(() => {
    if (!students.length) { setBalances({}); return }
    ;(async () => {
      const map: Record<number, MoneyStats> = {}
      for (const s of students) {
        if (!s.id) continue
        const stats = await calcMoneyForStudent(s.id)
        map[s.id] = stats
      }
      setBalances(map)
    })()
  }, [students])

  // 3) Lista filtrada (buscador + filtro)
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase()
    return students
      .filter(s => {
        const matchTxt =
          s.name.toLowerCase().includes(text) ||
          (s.subjects?.toLowerCase().includes(text) ?? false) ||
          (s.grade?.toLowerCase().includes(text) ?? false)
        const matchFilter =
          filter === 'activos' ? s.active :
          filter === 'inactivos' ? !s.active :
          true
        return matchTxt && matchFilter
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [students, q, filter])

  // 4) Guardar (nuevo o edición)
  async function saveStudent(partial: Partial<Student> & { id?: number }) {
    if (!partial.name) return
    if (partial.id) {
      await db.students.update(partial.id, partial)
    } else {
      await db.students.add({
        name: partial.name,
        color: partial.color || await generateUniqueColor(),
        notes: partial.notes ?? '',
        nextClassNotes: partial.nextClassNotes ?? '',
        active: true,
        age: partial.age,
        grade: partial.grade,
        subjects: partial.subjects,
        repeated: partial.repeated
      })
    }
    setStudents(await db.students.orderBy('name').toArray())
    setModal({ open: false })
  }

  // 5) Eliminar alumno y sus relaciones
  async function deleteStudent(s: Student) {
    if (!s.id) return
    if (!confirm('¿Eliminar este alumno y sus clases/pagos?')) return
    await db.classes.where('studentId').equals(s.id).delete()
    await db.payments.where('studentId').equals(s.id).delete()
    await db.students.delete(s.id)
    setStudents(await db.students.orderBy('name').toArray())
  }

  // 6) Activar / desactivar alumno
  async function toggleActive(s: Student) {
    if (!s.id) return
    await db.students.update(s.id, { active: !s.active })
    setStudents(await db.students.orderBy('name').toArray())
  }

  // 7) Añadir pago
  async function addPayment(student: Student, amount: number, note: string, dateISO: string) {
    if (!student.id) return
    if (!(amount > 0)) return
    await db.payments.add({ studentId: student.id, amount, note, date: dateISO } as any)
    // refrescar saldos
    const stats = await calcMoneyForStudent(student.id)
    setBalances(prev => ({ ...prev, [student.id!]: stats }))
  }

  const total = students.length
  const activos = students.filter(s => s.active).length
  const inactivos = total - activos

  return (
    <section className="card al-card">
      <div className="al-head">
        <div>
          <h2 className="al-title">Alumnos</h2>
          <div className="al-stats">
            <span className="al-stat"><strong>{total}</strong> en total</span>
            <span className="al-stat"><strong>{activos}</strong> activos</span>
            <span className="al-stat"><strong>{inactivos}</strong> inactivos</span>
          </div>
        </div>

        <div className="al-actions">
          <input
            className="al-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, materia o curso…"
            aria-label="Buscar alumnos"
          />
          <div className="al-filters" role="tablist" aria-label="Filtro de estado">
            <button
              className={`chip ${filter === 'todos' ? 'chip-active' : ''}`}
              onClick={() => setFilter('todos')}
              role="tab"
              aria-selected={filter === 'todos'}
            >Todos</button>
            <button
              className={`chip ${filter === 'activos' ? 'chip-active' : ''}`}
              onClick={() => setFilter('activos')}
              role="tab"
              aria-selected={filter === 'activos'}
            >Activos</button>
            <button
              className={`chip ${filter === 'inactivos' ? 'chip-active' : ''}`}
              onClick={() => setFilter('inactivos')}
              role="tab"
              aria-selected={filter === 'inactivos'}
            >Inactivos</button>
          </div>

          <button className="btn btn-primary" onClick={() => setModal({ open: true, student: undefined })}>
            Nuevo
          </button>
        </div>
      </div>

      <ul className="al-list">
        {filtered.map(s => {
          const m = (s.id && balances[s.id]) || { totalClases: 0, totalPagos: 0, pendiente: 0 }
          return (
            <StudentRow
              key={s.id}
              student={s}
              money={m}
              onEdit={() => setModal({ open: true, student: s })}
              onDelete={() => deleteStudent(s)}
              onToggleActive={() => toggleActive(s)}
              onAddPayment={() => setPayModal({ open: true, student: s })}
            />
          )
        })}
        {filtered.length === 0 && (
          <li className="al-empty">
            <p>Sin resultados. Prueba con otro texto o cambia el filtro.</p>
          </li>
        )}
      </ul>

      {modal.open && (
        <StudentModal
          student={modal.student}
          onClose={() => setModal({ open: false })}
          onSave={saveStudent}
        />
      )}

      {payModal.open && payModal.student && (
        <PaymentModal
          student={payModal.student}
          onClose={() => setPayModal({ open: false })}
          onSave={async (amount, note, dateISO) => {
            await addPayment(payModal.student!, amount, note, dateISO)
            setPayModal({ open: false })
          }}
        />
      )}
    </section>
  )
}

/* ==== util: cálculo de dinero por alumno ==== */
async function calcMoneyForStudent(studentId: number): Promise<MoneyStats> {
  const classes = await db.classes.where('studentId').equals(studentId).toArray() as any[]
  const payments = await db.payments.where('studentId').equals(studentId).toArray() as any[]

  const totalClases = (classes ?? []).reduce((sum, c) => {
    let v = 0
    if (typeof c.amount === 'number') v = c.amount
    else if (typeof c.price === 'number') v = c.price
    else if (typeof c.total === 'number') v = c.total
    else {
      // Intento calcular por horas si hay rate + minutos
      const rate =
        (typeof c.hourlyRate === 'number' && c.hourlyRate) ||
        (typeof c.rate === 'number' && c.rate) || 0
      const minutes =
        (typeof c.durationMinutes === 'number' && c.durationMinutes) ||
        (typeof c.minutes === 'number' && c.minutes) || 0
      v = rate * (minutes / 60)
    }
    return sum + (isFinite(v) ? v : 0)
  }, 0)

  const totalPagos = (payments ?? []).reduce((sum, p) => {
    const v = (typeof p.amount === 'number' && p.amount) ||
              (typeof p.value === 'number' && p.value) ||
              (typeof p.total === 'number' && p.total) || 0
    return sum + (isFinite(v) ? v : 0)
  }, 0)

  const pendiente = +(totalClases - totalPagos)
  return { totalClases, totalPagos, pendiente }
}

/* ==== Fila de alumno (tarjeta con color + dinero) ==== */
function StudentRow({
  student, money, onEdit, onDelete, onToggleActive, onAddPayment
}: {
  student: Student
  money: MoneyStats
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
  onAddPayment: () => void
}) {
  const pendienteStyle =
    money.pendiente > 0
      ? { background: '#fff1f3', color: '#b3002c', border: '1px solid #ffc1cd' } // debe €
      : money.pendiente < 0
        ? { background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe' } // a favor
        : { background: '#e8fff6', color: '#0f7a48', border: '1px solid #b7f3d4' } // al día

  return (
    <li
      className="al-item student-card"
      style={{ borderLeft: `6px solid ${student.color}` }}
    >
      <div className="al-left">
        <span className="al-dot" aria-hidden="true" style={{ background: student.color }} />
        <div>
          <div className="al-name">
            {student.name}
            <span className={`badge ${student.active ? 'badge-green' : 'badge-gray'}`}>
              {student.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          <div className="al-sub">
            {student.grade ? `${student.grade} • ` : ''}
            {student.subjects?.trim() || 'Sin materias'}
            {student.repeated ? ' • Ha repetido' : ''}
          </div>

          {/* Línea de dinero */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <span className="badge badge-balance">Total: {eur(money.totalClases)}</span>
            <span className="badge badge-balance">Pagado: {eur(money.totalPagos)}</span>
            <span className="badge" style={pendienteStyle}>
              Pendiente: {eur(money.pendiente)}
            </span>
          </div>
        </div>
      </div>

      <div className="al-actions-row">
        <button className="btn btn-ghost" onClick={onEdit} aria-label={`Editar ${student.name}`}>Editar</button>
        <button className="btn btn-ghost" onClick={onToggleActive} aria-label={`Cambiar estado de ${student.name}`}>
          {student.active ? 'Desactivar' : 'Activar'}
        </button>
        <button className="btn btn-ghost" onClick={onAddPayment} aria-label={`Añadir pago a ${student.name}`}>
          Añadir pago
        </button>
        <button className="btn btn-danger" onClick={onDelete} aria-label={`Eliminar ${student.name}`}>Eliminar</button>
      </div>
    </li>
  )
}

/* ==== Modal (formulario alumno) ==== */
function StudentModal({
  student, onClose, onSave
}: {
  student?: Student
  onClose: () => void
  onSave: (s: Partial<Student> & { id?: number }) => void
}) {
  const [name, setName] = useState(student?.name ?? '')
  const [color, setColor] = useState(student?.color ?? '#fb7185')
  const [notes, setNotes] = useState(student?.notes ?? '')
  const [nextClassNotes, setNextClassNotes] = useState(student?.nextClassNotes ?? '')
  const [age, setAge] = useState<number | undefined>(student?.age)
  const [grade, setGrade] = useState<string | undefined>(student?.grade)
  const [subjects, setSubjects] = useState<string | undefined>(student?.subjects)
  const [repeated, setRepeated] = useState<boolean>(student?.repeated ?? false)

  return (
    <div role="dialog" aria-modal="true" className="modal">
      <div className="modal-content">
        <h3 className="modal-title">{student ? 'Editar alumno' : 'Nuevo alumno'}</h3>

        <div className="form-grid">
          <label className="field">
            <span>Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
          </label>

          <label className="field">
            <span>Color</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>

          <label className="field">
            <span>Edad</span>
            <input
              type="number"
              value={age ?? ''}
              onChange={(e) => setAge(e.target.value ? Number(e.target.value) : undefined)}
            />
          </label>

          <label className="field">
            <span>Curso</span>
            <input
              value={grade ?? ''}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="Ej. 2º ESO"
            />
          </label>

          <label className="field field-full">
            <span>Materias a reforzar</span>
            <input
              value={subjects ?? ''}
              onChange={(e) => setSubjects(e.target.value)}
              placeholder="Ej. Matemáticas, Lengua"
            />
          </label>

          <label className="field field-row">
            <input
              type="checkbox"
              checked={repeated}
              onChange={(e) => setRepeated(e.target.checked)}
            />
            <span>Ha repetido curso</span>
          </label>

          <label className="field field-full">
            <span>Para la próxima clase</span>
            <textarea
              value={nextClassNotes}
              onChange={(e) => setNextClassNotes(e.target.value)}
              rows={3}
            />
          </label>

          <label className="field field-full">
            <span>Notas</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave({
              id: student?.id, name, color, notes, nextClassNotes,
              active: true, age, grade, subjects, repeated
            })}
            disabled={!name.trim()}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ==== Modal (añadir pago) ==== */
function PaymentModal({
  student, onClose, onSave
}: {
  student: Student
  onClose: () => void
  onSave: (amount: number, note: string, dateISO: string) => void
}) {
  const [amountStr, setAmountStr] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)) // yyyy-mm-dd

  const parsedAmount = (() => {
    const s = amountStr.replace(',', '.').trim()
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : NaN
  })()

  return (
    <div role="dialog" aria-modal="true" className="modal">
      <div className="modal-content">
        <h3 className="modal-title">Añadir pago — {student.name}</h3>

        <div className="form-grid">
          <label className="field">
            <span>Fecha</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>

          <label className="field">
            <span>Importe (€)</span>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
            />
          </label>

          <label className="field field-full">
            <span>Nota (opcional)</span>
            <input
              placeholder="p. ej., abono parcial, transferencia, etc."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={!(parsedAmount > 0)}
            onClick={() => onSave(parsedAmount, note, new Date(date + 'T12:00:00').toISOString())}
          >
            Guardar pago
          </button>
        </div>
      </div>
    </div>
  )
}
