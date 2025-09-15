import { useEffect, useMemo, useState } from 'react'
import { format, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  db,
  type Student,
  type Movement,
  addDebt,
  addPayment,
  getStudentBalance,
} from '../db'

function ymFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function toMoney(n: number) {
  const v = Number.isFinite(n) ? n : 0
  return Math.round(v * 100) / 100
}
function eur(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0)
}

export default function Pagos() {
  // Estado UI
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState<number | ''>('')
  const [monthDate, setMonthDate] = useState<Date>(() => {
    const saved = localStorage.getItem('pagos.month')
    return saved ? new Date(saved) : new Date()
  })
  const [amountDebt, setAmountDebt] = useState<string>('')   // input para DEUDA
  const [amountPay, setAmountPay] = useState<string>('')    // input para PAGO
  const [note, setNote] = useState<string>('')              // nota opcional
  const [rows, setRows] = useState<Movement[]>([])          // movimientos (mes del alumno)
  const [monthTotals, setMonthTotals] = useState({ debt: 0, paid: 0, pending: 0 })
  const [globalTotals, setGlobalTotals] = useState({ debt: 0, paid: 0, pending: 0 })
  const ym = useMemo(() => ymFromDate(monthDate), [monthDate])

  // Cargar alumnos una vez
  useEffect(() => {
    db.students.toArray().then(list => {
      const ordered = list.sort((a, b) => a.name.localeCompare(b.name))
      setStudents(ordered)
      if (!studentId && ordered.length > 0) {
        setStudentId(ordered[0].id!)
      }
    })
  }, [])

  // Cargar movimientos y totales cada vez que cambie alumno o mes
  useEffect(() => {
    if (!studentId) return
    localStorage.setItem('pagos.month', monthDate.toISOString())
    loadMonthData(studentId, ym)
    loadGlobalTotals(studentId)
  }, [studentId, ym])

  async function loadMonthData(sId: number, ymKey: string) {
    // traemos TODOS los movimientos del alumno y filtramos por mes YYYY-MM
    const all = await db.movements.where('studentId').equals(sId).toArray()
    const monthRows = all
      .filter(r => (r.date ?? '').slice(0, 7) === ymKey)
      .sort((a, b) => a.date.localeCompare(b.date))

    const debt = monthRows.filter(r => r.type === 'debt').reduce((s, r) => s + (r.amount || 0), 0)
    const paid = monthRows.filter(r => r.type === 'payment').reduce((s, r) => s + (r.amount || 0), 0)
    const pending = debt - paid

    setRows(monthRows)
    setMonthTotals({ debt: toMoney(debt), paid: toMoney(paid), pending: toMoney(pending) })
  }

  async function loadGlobalTotals(sId: number) {
    const t = await getStudentBalance(sId)
    setGlobalTotals(t)
  }

  // Acciones UI
  async function onAddDebt() {
    if (!studentId) return
    const v = toMoney(parseFloat(amountDebt))
    if (!v || v <= 0) return alert('Importe de DEUDA inválido')
    await addDebt(studentId, v, note || '', new Date())
    setAmountDebt('')
    setNote('')
    await loadMonthData(studentId, ym)
    await loadGlobalTotals(studentId)
  }

  async function onAddPayment() {
    if (!studentId) return
    const v = toMoney(parseFloat(amountPay))
    if (!v || v <= 0) return alert('Importe de PAGO inválido')
    await addPayment(studentId, v, note || '', new Date())
    setAmountPay('')
    setNote('')
    await loadMonthData(studentId, ym)
    await loadGlobalTotals(studentId)
  }

  async function onEdit(row: Movement) {
    const newAmountStr = prompt('Nuevo importe (€):', String(row.amount))
    if (newAmountStr == null) return
    const newAmount = toMoney(parseFloat(newAmountStr))
    if (!newAmount || newAmount <= 0) return alert('Importe inválido')

    const newNote = prompt('Nueva nota (opcional):', row.note ?? '') ?? row.note ?? ''
    await db.movements.update(row.id!, { amount: newAmount, note: newNote })
    if (studentId) {
      await loadMonthData(studentId, ym)
      await loadGlobalTotals(studentId)
    }
  }

  async function onDelete(row: Movement) {
    if (!confirm('¿Eliminar este movimiento?')) return
    await db.movements.delete(row.id!)
    if (studentId) {
      await loadMonthData(studentId, ym)
      await loadGlobalTotals(studentId)
    }
  }

  const monthLabel = format(monthDate, "LLLL 'de' yyyy", { locale: es })

  return (
    <div className="page pagos">
      <h2>Pagos</h2>

      {/* Fila de controles */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div><strong>Mes</strong></div>
          <select
            value={monthLabel}
            onChange={() => {}}
            style={{ display: 'none' }}
            aria-hidden
          />
          <button onClick={() => setMonthDate(addMonths(monthDate, -1))}>Anterior</button>
          <div style={{ minWidth: 180, textTransform: 'capitalize' }}>{monthLabel}</div>
          <button onClick={() => setMonthDate(addMonths(monthDate, 1))}>Siguiente</button>

          <div style={{ marginLeft: 'auto' }} />

          <label>
            <span style={{ marginRight: 8 }}>Seleccionar alumno</span>
            <select
              value={studentId}
              onChange={e => setStudentId(Number(e.target.value))}
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Acciones rápidas: añadir DEUDA y añadir PAGO */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'grid', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <label>
            <span style={{ marginRight: 6 }}>Nota</span>
            <input
              placeholder="clases de esta semana / transferencia / etc."
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ minWidth: 240 }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <label>
            <span style={{ marginRight: 6 }}>Deuda (€)</span>
            <input
              type="number"
              step="0.5"
              inputMode="decimal"
              placeholder="0,00"
              value={amountDebt}
              onChange={e => setAmountDebt(e.target.value)}
            />
          </label>
          <button onClick={onAddDebt}>Añadir deuda</button>

          <span style={{ width: 16 }} />

          <label>
            <span style={{ marginRight: 6 }}>Pago (€)</span>
            <input
              type="number"
              step="0.5"
              inputMode="decimal"
              placeholder="0,00"
              value={amountPay}
              onChange={e => setAmountPay(e.target.value)}
            />
          </label>
          <button onClick={onAddPayment}>Registrar pago</button>
        </div>
      </div>

      {/* Totales */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Estado del mes</h3>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Metric label="Deuda del mes" value={eur(monthTotals.debt)} />
          <Metric label="Pagado en el mes" value={eur(monthTotals.paid)} />
          <Metric label="Pendiente del mes" value={eur(monthTotals.pending)} />
        </div>

        <hr style={{ margin: '1rem 0' }} />

        <h4 style={{ margin: 0 }}>Estado global del alumno</h4>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Metric label="Deuda total" value={eur(globalTotals.debt)} />
          <Metric label="Pagado total" value={eur(globalTotals.paid)} />
          <Metric label="Pendiente total" value={eur(globalTotals.pending)} />
        </div>
      </div>

      {/* Lista de movimientos del mes */}
      <div className="card" style={{ padding: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Movimientos del mes</h3>
        {rows.length === 0 ? (
          <p>No hay movimientos en este mes.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Fecha</th>
                  <th style={{ textAlign: 'left' }}>Tipo</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                  <th style={{ textAlign: 'left' }}>Nota</th>
                  <th style={{ textAlign: 'left' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>{format(new Date(r.date), "dd/MM/yyyy HH:mm")}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {r.type === 'debt' ? 'Deuda' : 'Pago'}
                    </td>
                    <td style={{ textAlign: 'right' }}>{eur(r.amount)}</td>
                    <td>{r.note}</td>
                    <td>
                      <button onClick={() => onEdit(r)}>Editar</button>{' '}
                      <button onClick={() => onDelete(r)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--slot-zebra, #faf5ff)',
      border: '1px solid var(--slot-sep, #ede9fe)',
      borderRadius: 12,
      padding: '0.75rem 1rem',
      minWidth: 180,
      boxShadow: 'var(--shadow, 0 10px 25px rgba(0,0,0,.06))'
    }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
