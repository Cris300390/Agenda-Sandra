// src/pages/Alumnos.tsx
import { useEffect, useMemo, useState } from 'react'
import { db, generateUniqueColor } from '../db'
import type { Student } from '../db'

type Filter = 'todos' | 'activos' | 'inactivos'
type MoneyStats = { totalClases: number; totalPagos: number; pendiente: number }
type DebtMode = 'add' | 'set'

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0)

export default function Alumnos() {
  const [students, setStudents] = useState<Student[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')
  const [modal, setModal] = useState<{ open: boolean; student?: Student }>({ open: false })
  const [payModal, setPayModal] = useState<{ open: boolean; student?: Student }>({ open: false })
  const [historyModal, setHistoryModal] = useState<{ open: boolean; student?: Student }>({ open: false })
  const [debtModal, setDebtModal] = useState<{ open: boolean; student?: Student; mode: DebtMode }>({ open: false, mode: 'add' })
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
        const stats = await calcMoneyForStudent(s) // usamos debtTotal si existe
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
        repeated: partial.repeated,
        debtTotal: 0
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

  // 7) Añadir pago (con quién paga)
  async function addPayment(student: Student, amount: number, note: string, dateISO: string, payer: string) {
    if (!student.id) return
    if (!(amount > 0)) return
    await db.payments.add({ studentId: student.id, amount, note, date: dateISO, payer } as any)
    // refrescar saldos SOLO de ese alumno
    const stats = await calcMoneyForStudent(student)
    setBalances(prev => ({ ...prev, [student.id!]: stats }))
  }

  // 8) Añadir o fijar deuda total
  async function updateDebt(student: Student, mode: DebtMode, amount: number) {
    if (!student.id) return
    const current = Number(student.debtTotal || 0)
    const newTotal = mode === 'add' ? current + amount : amount
    await db.students.update(student.id, { debtTotal: newTotal })
    // refrescamos alumnos y su saldo
    const list = await db.students.orderBy('name').toArray()
    setStudents(list)
    const fresh = list.find(s => s.id === student.id)
    if (fresh) {
      const stats = await calcMoneyForStudent(fresh)
      setBalances(prev => ({ ...prev, [fresh.id!]: stats }))
    }
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
            <button className={`chip ${filter === 'todos' ? 'chip-active' : ''}`} onClick={() => setFilter('todos')} role="tab" aria-selected={filter === 'todos'}>Todos</button>
            <button className={`chip ${filter === 'activos' ? 'chip-active' : ''}`} onClick={() => setFilter('activos')} role="tab" aria-selected={filter === 'activos'}>Activos</button>
            <button className={`chip ${filter === 'inactivos' ? 'chip-active' : ''}`} onClick={() => setFilter('inactivos')} role="tab" aria-selected={filter === 'inactivos'}>Inactivos</button>
          </div>

          <button className="btn btn-primary" onClick={() => setModal({ open: true, student: undefined })}>
            Nuevo
          </button>
        </div>
      </div>

      <ul className="al-list">
        {filtered.map(s => {
          const m = (s.id && balances[s.id]) || { totalClases: Number(s.debtTotal || 0), totalPagos: 0, pendiente: Number(s.debtTotal || 0) }
          return (
            <StudentRow
              key={s.id}
              student={s}
              money={m}
              onEdit={() => setModal({ open: true, student: s })}
              onDelete={() => deleteStudent(s)}
              onToggleActive={() => toggleActive(s)}
              onAddPayment={() => setPayModal({ open: true, student: s })}
              onShowHistory={() => setHistoryModal({ open: true, student: s })}
              onAddDebt={() => setDebtModal({ open: true, student: s, mode: 'add' })}
              onSetDebt={() => setDebtModal({ open: true, student: s, mode: 'set' })}
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
          onSave={async (amount, note, dateISO, payer) => {
            await addPayment(payModal.student!, amount, note, dateISO, payer)
            setPayModal({ open: false })
          }}
        />
      )}

      {historyModal.open && historyModal.student && (
        <PaymentHistoryModal
          student={historyModal.student}
          onClose={() => setHistoryModal({ open: false })}
        />
      )}

      {debtModal.open && debtModal.student && (
        <DebtModal
          student={debtModal.student}
          mode={debtModal.mode}
          onClose={() => setDebtModal({ open: false, student: undefined, mode: 'add' })}
          onSave={async (amount) => {
            await updateDebt(debtModal.student!, debtModal.mode, amount)
            setDebtModal({ open: false, student: undefined, mode: 'add' })
          }}
        />
      )}
    </section>
  )
}

/* ==== util: cálculo de dinero por alumno ==== */
async function calcMoneyForStudent(student: Student): Promise<MoneyStats> {
  const studentId = student.id!
  const classes = await db.classes.where('studentId').equals(studentId).toArray() as any[]
  const payments = await db.payments.where('studentId').equals(studentId).toArray() as any[]

  // Base de adeudado:
  // - Si hay debtTotal definido, lo usamos (control manual).
  // - Si no, calculamos por clases (compatibilidad con lo que ya tenías).
  let totalClases = typeof student.debtTotal === 'number'
    ? Number(student.debtTotal || 0)
    : (classes ?? []).reduce((sum, c) => {
        let v = 0
        if (typeof c.amount === 'number') v = c.amount
        else if (typeof c.price === 'number') v = c.price
        else if (typeof c.total === 'number') v = c.total
        else {
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

  // Redondeo
  totalClases = Math.round(totalClases * 100) / 100
  const pendiente = Math.round((totalClases - totalPagos) * 100) / 100
  return { totalClases, totalPagos, pendiente }
}

/* ==== Fila de alumno ==== */
function StudentRow({
  student, money, onEdit, onDelete, onToggleActive, onAddPayment, onShowHistory, onAddDebt, onSetDebt
}: {
  student: Student
  money: MoneyStats
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
  onAddPayment: () => void
  onShowHistory: () => void
  onAddDebt: () => void
  onSetDebt: () => void
}) {
  const pendienteStyle =
    money.pendiente > 0
      ? { background: '#fff1f3', color: '#b3002c', border: '1px solid #ffc1cd' }
      : money.pendiente < 0
        ? { background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe' }
        : { background: '#e8fff6', color: '#0f7a48', border: '1px solid #b7f3d4' }

  const debtBadgeStyle = {
    background: '#fff7ed',
    color: '#9a3412',
    border: '1px solid #fed7aa'
  }

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
            {student.grade ? `${student.grade} • ` : ''}
            {student.subjects?.trim() || 'Sin materias'}
            {student.repeated ? ' • Ha repetido' : ''}
          </div>

          {/* Línea de dinero */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <span className="badge" style={debtBadgeStyle}>
              Deuda total: {eur((student.debtTotal ?? money.totalClases) || 0)}
            </span>
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
        <button className="btn btn-ghost" onClick={onAddDebt} aria-label={`Añadir deuda a ${student.name}`}>Añadir deuda</button>
        <button className="btn btn-ghost" onClick={onSetDebt} aria-label={`Fijar deuda total de ${student.name}`}>Fijar total</button>
        <button className="btn btn-ghost" onClick={onAddPayment} aria-label={`Añadir pago a ${student.name}`}>Añadir pago</button>
        <button className="btn btn-ghost" onClick={onShowHistory} aria-label={`Ver historial de pagos de ${student.name}`}>Historial</button>
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
            <input type="number" value={age ?? ''} onChange={(e) => setAge(e.target.value ? Number(e.target.value) : undefined)} />
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
            <input type="checkbox" checked={repeated} onChange={(e) => setRepeated(e.target.checked)} />
            <span>Ha repetido curso</span>
          </label>

          <label className="field field-full">
            <span>Para la próxima clase</span>
            <textarea value={nextClassNotes} onChange={(e) => setNextClassNotes(e.target.value)} rows={3} />
          </label>

          <label className="field field-full">
            <span>Notas</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
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
  onSave: (amount: number, note: string, dateISO: string, payer: string) => void
}) {
  const [amountStr, setAmountStr] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)) // yyyy-mm-dd
  const [payer, setPayer] = useState<string>('Madre')
  const [otherPayer, setOtherPayer] = useState<string>('')

  const parsedAmount = (() => {
    const s = amountStr.replace(',', '.').trim()
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : NaN
  })()

  const finalPayer = payer === 'Otro' ? (otherPayer.trim() || 'Otro') : payer

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

          <label className="field">
            <span>¿Quién paga?</span>
            <select value={payer} onChange={(e) => setPayer(e.target.value)}>
              <option>Madre</option>
              <option>Padre</option>
              <option>Abuela</option>
              <option>Abuelo</option>
              <option>Alumna</option>
              <option>Alumno</option>
              <option>Otro</option>
            </select>
          </label>

          {payer === 'Otro' && (
            <label className="field">
              <span>Especificar</span>
              <input
                placeholder="Tía, tutor, etc."
                value={otherPayer}
                onChange={(e) => setOtherPayer(e.target.value)}
              />
            </label>
          )}

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
            onClick={() => onSave(parsedAmount, note, new Date(date + 'T12:00:00').toISOString(), finalPayer)}
          >
            Guardar pago
          </button>
        </div>
      </div>
    </div>
  )
}

/* ==== Modal (historial de pagos) ==== */
function PaymentHistoryModal({
  student, onClose
}: {
  student: Student
  onClose: () => void
}) {
  const [items, setItems] = useState<Array<{ id?: number; date?: string; amount?: number; note?: string; payer?: string }>>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!student.id) return
      const list = await db.payments.where('studentId').equals(student.id).toArray() as any[]
      const sorted = list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      if (mounted) setItems(sorted)
    })()
    return () => { mounted = false }
  }, [student.id])

  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)

  return (
    <div role="dialog" aria-modal="true" className="modal">
      <div className="modal-content">
        <h3 className="modal-title">Historial — {student.name}</h3>

        {items.length === 0 ? (
          <p style={{ marginTop: 8 }}>No hay pagos registrados.</p>
        ) : (
          <div style={{ maxHeight: 360, overflow: 'auto', marginTop: 8 }}>
            <table className="al-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Fecha</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Importe</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Quién paga</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Nota</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id ?? Math.random()}>
                    <td style={{ padding: '8px', borderTop: '1px solid #eee' }}>
                      {p.date ? new Date(p.date).toLocaleDateString('es-ES') : '—'}
                    </td>
                    <td style={{ padding: '8px', borderTop: '1px solid #eee' }}>
                      {eur(Number(p.amount) || 0)}
                    </td>
                    <td style={{ padding: '8px', borderTop: '1px solid #eee' }}>
                      {p.payer || '—'}
                    </td>
                    <td style={{ padding: '8px', borderTop: '1px solid #eee' }}>
                      {p.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ padding: '8px', borderTop: '1px solid #eee', fontWeight: 700 }}>Total pagado</td>
                  <td style={{ padding: '8px', borderTop: '1px solid #eee', fontWeight: 700 }}>{eur(total)}</td>
                  <td colSpan={2} style={{ borderTop: '1px solid #eee' }} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="modal-actions">
          <button
            className="btn"
            onClick={() => {
              const w = window.open('', '_blank')
              if (!w) return
              const rows = items.map(p =>
                `<tr>
                  <td>${p.date ? new Date(p.date).toLocaleDateString('es-ES') : ''}</td>
                  <td>${eur(Number(p.amount) || 0)}</td>
                  <td>${p.payer || ''}</td>
                  <td>${(p.note || '').replace(/</g, '&lt;')}</td>
                </tr>`
              ).join('')
              w.document.write(`
                <html><head><title>Factura - ${student.name}</title>
                  <style>
                    body { font-family: Arial, sans-serif; padding: 16px; }
                    h2 { margin: 0 0 12px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
                    tfoot td { font-weight: bold; }
                  </style>
                </head>
                <body>
                  <h2>Historial de pagos — ${student.name}</h2>
                  <table>
                    <thead>
                      <tr><th>Fecha</th><th>Importe</th><th>Quién paga</th><th>Nota</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                    <tfoot><tr><td>Total</td><td>${eur(total)}</td><td colspan="2"></td></tr></tfoot>
                  </table>
                </body></html>
              `)
              w.document.close()
              w.focus()
              w.print()
            }}
          >
            Imprimir/Factura
          </button>
          <button className="btn btn-primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

/* ==== Modal (deuda: añadir o fijar) ==== */
function DebtModal({
  student, mode, onClose, onSave
}: {
  student: Student
  mode: DebtMode
  onClose: () => void
  onSave: (amount: number) => void
}) {
  const [amountStr, setAmountStr] = useState('')
  const parsedAmount = (() => {
    const s = amountStr.replace(',', '.').trim()
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : NaN
  })()

  const title = mode === 'add' ? `Añadir deuda — ${student.name}` : `Fijar deuda total — ${student.name}`
  const help = mode === 'add'
    ? 'Suma esta cantidad al total que te debe ahora mismo.'
    : 'Establece el total exacto que te debe ahora mismo (sobrescribe).'

  return (
    <div role="dialog" aria-modal="true" className="modal">
      <div className="modal-content">
        <h3 className="modal-title">{title}</h3>
        <p style={{ marginTop: 4, color: '#6b7280' }}>{help}</p>

        <div className="form-grid">
          <label className="field">
            <span>{mode === 'add' ? 'Cantidad a sumar (€)' : 'Nuevo total (€)'}</span>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
            />
          </label>
          <div className="field">
            <span>Total actual</span>
            <div className="badge">{eur(student.debtTotal ?? 0)}</div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={!(parsedAmount > 0 || (mode === 'set' && parsedAmount >= 0))}
            onClick={() => onSave(parsedAmount)}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
