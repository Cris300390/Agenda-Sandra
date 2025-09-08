import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, generateUniqueColor } from '../db'

export default function AlumnoNuevo() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [grade, setGrade] = useState('')
  const [subjects, setSubjects] = useState('')
  const [repeated, setRepeated] = useState(false)
  const [notes, setNotes] = useState('')
  const [nextClassNotes, setNextClassNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const color = await generateUniqueColor()
    await db.students.add({
      name: name.trim(),
      color,
      age: age === '' ? undefined : Number(age),
      grade: grade || undefined,
      subjects: subjects || undefined,
      repeated,
      notes: notes || undefined,
      nextClassNotes: nextClassNotes || undefined,
      active: true,
    })
    nav('/alumnos')
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Nuevo alumno</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
        <label>
          Nombre completo
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nombre y apellidos" />
        </label>
        <label>
          Edad
          <input type="number" value={age} onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')} />
        </label>
        <label>
          Curso
          <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Ej. 3º ESO" />
        </label>
        <label>
          Materias a reforzar
          <input value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="Ej. Matemáticas, Lengua" />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={repeated} onChange={(e) => setRepeated(e.target.checked)} /> Ha repetido curso
        </label>
        <label>
          Para la próxima clase
          <textarea rows={3} value={nextClassNotes} onChange={(e) => setNextClassNotes(e.target.value)} />
        </label>
        <label>
          Notas
          <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => nav(-1)}>Cancelar</button>
          <button className="btn-primary" type="submit">Guardar alumno</button>
        </div>
      </form>
    </div>
  )
}



