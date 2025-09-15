// src/pages/Alumnos.tsx
import { useEffect, useMemo, useState } from 'react'
import { db, generateUniqueColor } from '../db'
import type { Student } from '../db'

type Filter = 'todos' | 'activos' | 'inactivos'

export default function Alumnos() {
  const [students, setStudents] = useState<Student[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')
  const [modal, setModal] = useState<{ open: boolean; student?: Student }>({ open: false })

  // Bloquea el scroll del fondo cuando el modal está abierto
  useEffect(() => {
    if (modal.open) document.body.classList.add('body-lock')
    else document.body.classList.remove('body-lock')
    return () => document.body.classList.remove('body-lock')
  }, [modal.open])

  // 1) Cargar alumnos al montar
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const list = await db.students.orderBy('name').toArray()
      if (mounted) setStudents(list)
    })()
    return () => { mounted = false }
  }, [])

  // 2) Lista filtrada (buscador + filtro)
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

  // 3) Guardar (nuevo o edición)
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
        repeated: partial.repeated,
        // Se mantiene en datos, pero NO lo usamos aquí
        debtTotal: 0
      })
    }
    setStudents(await db.students.orderBy('name').toArray())
    setModal({ open: false })
  }

  // 4) Eliminar alumno y sus relaciones (clases/pagos)
  async function deleteStudent(s: Student) {
    if (!s.id) return
    if (!confirm('¿Eliminar este alumno y sus clases/pagos?')) return
    await db.classes.where('studentId').equals(s.id).delete()
    await db.payments.where('studentId').equals(s.id).delete()
    await db.students.delete(s.id)
    setStudents(await db.students.orderBy('name').toArray())
  }

  // 5) Activar / desactivar alumno
  async function toggleActive(s: Student) {
    if (!s.id) return
    await db.students.update(s.id, { active: !s.active })
    setStudents(await db.students.orderBy('name').toArray())
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
            >
              Todos
            </button>
            <button
              className={`chip ${filter === 'activos' ? 'chip-active' : ''}`}
              onClick={() => setFilter('activos')}
              role="tab"
              aria-selected={filter === 'activos'}
            >
              Activos
            </button>
            <button
              className={`chip ${filter === 'inactivos' ? 'chip-active' : ''}`}
              onClick={() => setFilter('inactivos')}
              role="tab"
              aria-selected={filter === 'inactivos'}
            >
              Inactivos
            </button>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setModal({ open: true, student: undefined })}
          >
            Nuevo
          </button>
        </div>
      </div>

      <ul className="al-list">
        {filtered.map(s => (
          <StudentRow
            key={s.id}
            student={s}
            onEdit={() => setModal({ open: true, student: s })}
            onDelete={() => deleteStudent(s)}
            onToggleActive={() => toggleActive(s)}
          />
        ))}
        {filtered.length === 0 && (
          <li className="al-empty">
            <p>Sin resultados. Prueba con otro texto o cambia el filtro.</p>
          </li>
        )}
      </ul>

      {modal.open && (
        <>
          <div className="modal-backdrop" onClick={() => setModal({ open: false })} />
          <StudentModal
            student={modal.student}
            onClose={() => setModal({ open: false })}
            onSave={saveStudent}
          />
        </>
      )}
    </section>
  )
}

/* ==== Fila de alumno (solo información, sin pagos) ==== */
function StudentRow({
  student, onEdit, onDelete, onToggleActive
}: {
  student: Student
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}) {
  return (
    <li className="al-item student-card" style={{ borderLeft: `6px solid ${student.color}` }}>
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
            {student.age ? `Edad: ${student.age} • ` : ''}
            {student.grade ? `${student.grade} • ` : ''}
            {(student.subjects?.trim() || 'Sin materias')}
            {student.repeated ? ' • Ha repetido' : ''}
          </div>

          {student.nextClassNotes?.trim() && (
            <p style={{ marginTop: 6 }}>
              <strong>Para la próxima clase:</strong> {student.nextClassNotes}
            </p>
          )}
          {student.notes?.trim() && (
            <p style={{ marginTop: 4 }}>
              <strong>Notas:</strong> {student.notes}
            </p>
          )}
        </div>
      </div>

      <div className="al-actions-row">
        <button className="btn btn-ghost" onClick={onEdit} aria-label={`Editar ${student.name}`}>Editar</button>
        <button className="btn btn-ghost" onClick={onToggleActive} aria-label={`Cambiar estado de ${student.name}`}>
          {student.active ? 'Desactivar' : 'Activar'}
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
            <input value={grade ?? ''} onChange={(e) => setGrade(e.target.value)} placeholder="Ej. 2º ESO" />
          </label>

          <label className="field field-full">
            <span>Materias a reforzar</span>
            <input value={subjects ?? ''} onChange={(e) => setSubjects(e.target.value)} placeholder="Ej. Matemáticas, Lengua" />
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
              id: student?.id,
              name,
              color,
              notes,
              nextClassNotes,
              active: true,
              age,
              grade,
              subjects,
              repeated
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

