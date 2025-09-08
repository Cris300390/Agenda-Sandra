import { useEffect, useState } from 'react'
import { db, generateUniqueColor } from '../db'
import type { Student } from '../db'

export default function Alumnos() {
  const [students, setStudents] = useState<Student[]>([])
  const [modal, setModal] = useState<{ open: boolean; student?: Student }>({ open: false })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const list = await db.students.orderBy('name').toArray()
      if (mounted) setStudents(list)
    })()
    return () => { mounted = false }
  }, [])

  async function saveStudent(partial: Partial<Student> & { id?: number }) {
    if (!partial.name) return
    if (partial.id) {
      await db.students.update(partial.id, partial)
    } else {
      await db.students.add({ name: partial.name, color: partial.color || await generateUniqueColor(), notes: '', nextClassNotes: '', active: true, age: partial.age, grade: partial.grade, subjects: partial.subjects, repeated: partial.repeated })
    }
    setStudents(await db.students.orderBy('name').toArray())
    setModal({ open: false })
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Alumnos</h2>
        <button className="btn-primary" onClick={() => setModal({ open: true, student: undefined })}>Nuevo</button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
        {students.map(s => (
          <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span aria-hidden="true" style={{ width: 12, height: 12, background: s.color, borderRadius: 9999 }} />
            <button aria-label={`Editar ${s.name}`} className="linklike" onClick={() => setModal({ open: true, student: s })}>
              {s.name}
            </button>
            <span style={{ flex: 1 }} />
            <button 
              aria-label={`Eliminar ${s.name}`} 
              className="linklike" 
              style={{ color: '#ef4444' }} 
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Delete student clicked:', s.name)
                if (s.id && confirm('¿Eliminar este alumno y sus clases/pagos?')) {
                  try {
                    console.log('Deleting student ID:', s.id)
                    await db.classes.where('studentId').equals(s.id).delete()
                    await db.payments.where('studentId').equals(s.id).delete()
                    await db.students.delete(s.id)
                    console.log('Student deleted, updating list')
                    setStudents(await db.students.orderBy('name').toArray())
                  } catch (error) {
                    console.error('Error deleting student:', error)
                    alert('Error: ' + error)
                  }
                }
              }}
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>

      {modal.open && (
        <StudentModal
          student={modal.student}
          onClose={() => setModal({ open: false })}
          onSave={saveStudent}
        />
      )}
    </div>
  )
}

function StudentModal({ student, onClose, onSave }: { student?: Student; onClose: () => void; onSave: (s: Partial<Student> & { id?: number }) => void }) {
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
        <h3 style={{ marginTop: 0 }}>{student ? 'Editar alumno' : 'Nuevo alumno'}</h3>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
        </label>
        <label>
          Color
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label>
          Edad
          <input type="number" value={age ?? ''} onChange={(e) => setAge(e.target.value ? Number(e.target.value) : undefined)} />
        </label>
        <label>
          Curso
          <input value={grade ?? ''} onChange={(e) => setGrade(e.target.value)} placeholder="Ej. 2º ESO" />
        </label>
        <label>
          Materias a reforzar
          <input value={subjects ?? ''} onChange={(e) => setSubjects(e.target.value)} placeholder="Ej. Matemáticas, Lengua" />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={repeated} onChange={(e) => setRepeated(e.target.checked)} /> Ha repetido curso
        </label>
        <label>
          Para la próxima clase
          <textarea value={nextClassNotes} onChange={(e) => setNextClassNotes(e.target.value)} rows={3} />
        </label>
        <label>
          Notas
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave({ id: student?.id, name, color, notes, nextClassNotes, active: true, age, grade, subjects, repeated })}>Guardar</button>
        </div>
      </div>
    </div>
  )
}


