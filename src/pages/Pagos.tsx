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

/* Utilidades simples */
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

/* CSV helpers */
function csvEscape(v: string) {
  const needs = /[",;\n]/.test(v)
  const escaped = v.replaceAll('"', '""')
  return needs ? `"${escaped}"` : escaped
}
function toCsvLines(data: Array<{ fecha: string; tipo: string; importe: number; nota: string; paga: string }>) {
  const header = ['Fecha', 'Tipo', 'Importe', 'Nota', 'Quién paga']
  const rows = data.map(r => [
    csvEscape(r.fecha),
    csvEscape(r.tipo),
    String(r.importe).replace('.', ','), // coma decimal para Excel ES
    csvEscape(r.nota),
    csvEscape(r.paga),
  ])
  return [header, ...rows].map(arr => arr.join(';')) // separador ;
}

export default function Pagos() {
  /* Estado base */
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState<number | ''>('')
  const [monthDate, setMonthDate] = useState<Date>(() => {
    const saved = localStorage.getItem('pagos.month')
    return saved ? new Date(saved) : new Date()
  })
  const ym = useMemo(() => ymFromDate(monthDate), [monthDate])

  /* Inputs rápidos */
  const [note, setNote] = useState<string>('')
  const [amountDebt, setAmountDebt] = useState<string>('') // para DEUDA
  const [amountPay, setAmountPay] = useState<string>('') // para PAGO

  /* Fecha manual del movimiento (datetime-local) */
  const [whenISO, setWhenISO] = useState<string>(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })

  /* Quién paga (solo para pago) */
  const [payer, setPayer] = useState<string>('') // '', Madre, Padre, Alumna, Alumno, Otro

  /* Datos del mes */
  const [rows, setRows] = useState<Movement[]>([])
  const [monthTotals, setMonthTotals] = useState({ debt: 0, paid: 0, pending: 0 })
  const [globalTotals, setGlobalTotals] = useState({ debt: 0, paid: 0, pending: 0 })

  /* Cargar alumnos una vez */
  useEffect(() => {
    db.students.toArray().then(list => {
      const ordered = list.sort((a, b) => a.name.localeCompare(b.name))
      setStudents(ordered)
      if (!studentId && ordered.length > 0) {
        setStudentId(ordered[0].id!)
      }
    })
  }, [])

  /* Cargar datos cuando cambie alumno o mes */
  useEffect(() => {
    if (!studentId) return
    localStorage.setItem('pagos.month', monthDate.toISOString())
    loadMonthData(studentId, ym)
    loadGlobalTotals(studentId)
  }, [studentId, ym])

  async function loadMonthData(sId: number, ymKey: string) {
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

  /* Acciones: añadir deuda/pago, editar, eliminar */
  async function onAddDebt() {
    if (!studentId) return
    const v = toMoney(parseFloat(amountDebt))
    if (!v || v <= 0) return alert('Importe de DEUDA inválido')
    const when = whenISO ? new Date(whenISO) : new Date()
    await addDebt(studentId, v, note || '', when)
    setAmountDebt('')
    setNote('')
    await loadMonthData(studentId, ym)
    await loadGlobalTotals(studentId)
  }

  async function onAddPayment() {
    if (!studentId) return
    const v = toMoney(parseFloat(amountPay))
    if (!v || v <= 0) return alert('Importe de PAGO inválido')
    const when = whenISO ? new Date(whenISO) : new Date()
    await addPayment(studentId, v, note || '', when, payer || undefined)
    setAmountPay('')
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

  /* Exportar CSV del mes (alumno seleccionado) */
  async function exportMonthCSV() {
    if (!studentId) return
    const studentName = students.find(s => s.id === studentId)?.name ?? 'alumno'
    const data = rows.map(r => ({
      fecha: format(new Date(r.date), 'dd/MM/yyyy HH:mm'),
      tipo: r.type === 'debt' ? 'Deuda' : 'Pago',
      importe: toMoney(r.amount),
      nota: r.note ?? '',
      paga: r.payer ?? '',
    }))

    // Fila de totales del mes (dejamos pendiente en "Importe")
    data.push({
      fecha: '',
      tipo: 'Totales del mes',
      importe: toMoney(monthTotals.pending),
      nota: `Deuda=${toMoney(monthTotals.debt)}; Pagado=${toMoney(monthTotals.paid)}`,
      paga: '',
    })

    const lines = toCsvLines(data)
    const bom = '\uFEFF'
    const csv = bom + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const filename = `pagos_${studentName.replaceAll(' ', '_')}_${ym}.csv`

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const monthLabel = format(monthDate, "LLLL 'de' yyyy", { locale: es })

  return (
    <div className="page pagos">
      <h2>Pagos</h2>

      {/* Barra superior: mes y alumno */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div><strong>Mes</strong></div>
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

      {/* Controles de entrada */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', display: 'grid', gap: '0.75rem' }}>
        {/* Fecha del movimiento */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <label>
            <span style={{ marginRight: 6 }}>Fecha</span>
            <input
              type="datetime-local"
              value={whenISO}
              onChange={(e) => setWhenISO(e.target.value)}
            />
          </label>
        </div>

        {/* Nota */}
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

        {/* Deuda y Pago */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* DEUDA */}
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

          {/* PAGO */}
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

          <label>
            <span style={{ margin: '0 6px' }}>Quién paga</span>
            <select value={payer} onChange={(e) => setPayer(e.target.value)}>
              <option value="">(sin especificar)</option>
              <option value="Madre">Madre</option>
              <option value="Padre">Padre</option>
              <option value="Alumna">Alumna</option>
              <option value="Alumno">Alumno</option>
              <option value="Otro">Otro</option>
            </select>
          </label>

          <button onClick={onAddPayment}>Registrar pago</button>
        </div>
      </div>

      {/* Totales y botón Exportar CSV */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ marginTop: 0 }}>Estado del mes</h3>
          <button onClick={exportMonthCSV}>Exportar CSV</button>
        </div>

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
                  <th style={{ textAlign: 'left' }}>Nota / Paga</th>
                  <th style={{ textAlign: 'left' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>{format(new Date(r.date), 'dd/MM/yyyy HH:mm')}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {r.type === 'debt' ? 'Deuda' : 'Pago'}
                    </td>
                    <td style={{ textAlign: 'right' }}>{eur(r.amount)}</td>
                    <td>
                      {r.note}
                      {r.payer ? ` — (${r.payer})` : ''}
                    </td>
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
