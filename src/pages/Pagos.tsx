// src/pages/Pagos.tsx
import { useToast } from '../ui/Toast'
import { exportarResumenPDF, type PdfPayload } from '../util/pdf'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { format, addMonths, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  db,
  type Student,
  type Movement,
  addDebt,
  addPayment,
  getStudentBalance,
} from '../db'

/* ========= Helpers de formato ========= */
function ymFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
}
function monthKeyFromISO(iso: string) {
  const d = parseISO(iso)
  return ymFromDate(d)
}
function monthLabelFromKey(key: string) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return format(d, "LLLL 'de' yyyy", { locale: es }) // septiembre de 2025
}
function toMoney(n: number) {
  const v = Number.isFinite(n) ? n : 0
  return Math.round(v * 100) / 100
}
function eur(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0)
}

/* ========= Componente principal ========= */
export default function Pagos() {
  const toast = useToast()

  /* Estado base */
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState<number | ''>('')

  // Mes visible (por defecto, el actual)
  const [monthDate, setMonthDate] = useState<Date>(() => {
    const saved = localStorage.getItem('pagos.month')
    return saved ? new Date(saved) : new Date()
  })
  const ym = useMemo(() => ymFromDate(monthDate), [monthDate]) // YYYY-MM del mes visible
  const monthLabel = format(monthDate, "LLLL 'de' yyyy", { locale: es })

  /* Inputs rápidos */
  const [note, setNote] = useState<string>('')
  const [amountDebt, setAmountDebt] = useState<string>('') // DEUDA
  const [amountPay, setAmountPay] = useState<string>('')   // PAGO

  /* Fecha manual del movimiento (datetime-local) */
  const [whenISO, setWhenISO] = useState<string>(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })

  /* Quién paga (solo para pago) */
  const [payer, setPayer] = useState<string>('') // '', Madre, Padre, Alumna, Alumno, Otro

  /* Datos del mes visible */
  const [rows, setRows] = useState<Movement[]>([])
  const [monthTotals, setMonthTotals] = useState({ debt: 0, paid: 0, pending: 0 })
  const [globalTotals, setGlobalTotals] = useState({ debt: 0, paid: 0, pending: 0 })

  /* Resumen de meses anteriores (lista corta) */
  const [previousSummaries, setPreviousSummaries] = useState<
    Array<{ key: string; deuda: number; pagado: number; pendiente: number }>
  >([])

  /* Modal de confirmación de borrado */
  const [toDelete, setToDelete] = useState<Movement | null>(null)

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
    loadPreviousSummaries(studentId, ym)
  }, [studentId, ym])

  /* ------- Cargas ------- */
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

  // Construye la lista de meses anteriores (últimos 6, excluye el mes visible)
  async function loadPreviousSummaries(sId: number, currentYm: string) {
    const all = await db.movements.where('studentId').equals(sId).toArray()
    const byMonth = new Map<string, Movement[]>()

    for (const m of all) {
      const key = monthKeyFromISO(m.date)
      if (!byMonth.has(key)) byMonth.set(key, [])
      byMonth.get(key)!.push(m)
    }

    const keys = [...byMonth.keys()]
      .filter(k => k !== currentYm)
      .sort((a, b) => b.localeCompare(a)) // descendente
      .slice(0, 6)

    const summaries = keys.map(key => {
      const movs = byMonth.get(key) || []
      const deuda = movs.filter(r => r.type === 'debt').reduce((s, r) => s + (r.amount || 0), 0)
      const pagado = movs.filter(r => r.type === 'payment').reduce((s, r) => s + (r.amount || 0), 0)
      const pendiente = deuda - pagado
      return { key, deuda: toMoney(deuda), pagado: toMoney(pagado), pendiente: toMoney(pendiente) }
    })

    setPreviousSummaries(summaries)
  }

  /* ------- Acciones ------- */
  async function onAddDebt() {
    if (!studentId) return
    const v = toMoney(parseFloat(amountDebt))
    if (!v || v <= 0) return toast.error('Importe de DEUDA inválido')
    const when = whenISO ? new Date(whenISO) : new Date()
    await addDebt(studentId, v, note || '', when)
    setAmountDebt('')
    setNote('')
    await loadMonthData(studentId, ym)
    await loadGlobalTotals(studentId)
    await loadPreviousSummaries(studentId, ym)
    toast.success('Deuda registrada')
  }

  async function onAddPayment() {
    if (!studentId) return
    const v = toMoney(parseFloat(amountPay))
    if (!v || v <= 0) return toast.error('Importe de PAGO inválido')
    const when = whenISO ? new Date(whenISO) : new Date()
    await addPayment(studentId, v, note || '', when, payer || undefined)
    setAmountPay('')
    await loadMonthData(studentId, ym)
    await loadGlobalTotals(studentId)
    await loadPreviousSummaries(studentId, ym)
    toast.success('Pago registrado')
  }

  async function onEdit(row: Movement) {
    const newAmountStr = prompt('Nuevo importe (€):', String(row.amount))
    if (newAmountStr == null) return
    const newAmount = toMoney(parseFloat(newAmountStr))
    if (!newAmount || newAmount <= 0) return toast.error('Importe inválido')

    const newNote = prompt('Nueva nota (opcional):', row.note ?? '') ?? row.note ?? ''
    await db.movements.update(row.id!, { amount: newAmount, note: newNote })
    if (studentId) {
      await loadMonthData(studentId, ym)
      await loadGlobalTotals(studentId)
      await loadPreviousSummaries(studentId, ym)
    }
    toast.success('Movimiento actualizado')
  }

  function askDelete(row: Movement) {
    setToDelete(row)
  }

  async function confirmDelete() {
    if (!toDelete) return
    await db.movements.delete(toDelete.id!)
    setToDelete(null)
    if (studentId) {
      await loadMonthData(studentId, ym)
      await loadGlobalTotals(studentId)
      await loadPreviousSummaries(studentId, ym)
    }
    toast.success('Movimiento eliminado')
  }

  /* ------- Descargar PDF (mes actual + resumen anteriores) ------- */
  function onDescargarPDF() {
    if (!studentId) return
    const alumnoNombre = students.find(s => s.id === studentId)?.name ?? 'Alumno'

    const payload: PdfPayload = {
      alumno: alumnoNombre,
      mesActualLabel: monthLabel,
      totalsMes: {
        deuda: eur(monthTotals.debt),
        pagado: eur(monthTotals.paid),
        pendiente: eur(monthTotals.pending),
      },
      movimientosMes: rows.map(m => ({
        fecha: format(new Date(m.date), 'dd/MM/yyyy HH:mm'),
        tipo: m.type === 'debt' ? 'Deuda' : 'Pago',
        importe: eur(m.amount),
        nota: m.note ?? ''
      })),
      anteriores: previousSummaries.map(s => ({
        key: s.key,
        label: monthLabelFromKey(s.key),
        deuda: s.deuda,
        pagado: s.pagado,
        pendiente: s.pendiente
      }))
    }

    exportarResumenPDF(payload)
    toast.success('PDF generado')
  }

  /* ------- ¿Mes al corriente? ------- */
  const monthOk =
    monthTotals.pending === 0 &&
    (monthTotals.debt > 0 || monthTotals.paid > 0 || rows.length > 0)

  /* ------- Trazabilidad: saldo acumulado por fila ------- */
  const enhancedRows = useMemo(() => {
    let accDebt = 0
    let accPaid = 0
    return rows.map(r => {
      if (r.type === 'debt') accDebt += r.amount || 0
      else accPaid += r.amount || 0
      const pendiente = +(accDebt - accPaid).toFixed(2)
      return { ...r, accDebt, accPaid, pendiente }
    })
  }, [rows])

  /* ========= Render ========= */
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

      {/* Totales + Descargar PDF */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ marginTop: 0 }}>Estado del mes</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onDescargarPDF}>Descargar PDF</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Metric label="Deuda del mes" value={eur(monthTotals.debt)} />
          <Metric label="Pagado en el mes" value={eur(monthTotals.paid)} />
          <Metric
            label={monthOk ? 'Al corriente' : 'Pendiente del mes'}
            value={eur(monthTotals.pending)}
            ok={monthOk}
          />
        </div>

        <hr style={{ margin: '1rem 0' }} />

        <h4 style={{ margin: 0 }}>Estado global del alumno</h4>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Metric label="Deuda total" value={eur(globalTotals.debt)} />
          <Metric label="Pagado total" value={eur(globalTotals.paid)} />
          <Metric label="Pendiente total" value={eur(globalTotals.pending)} />
        </div>
      </div>

      {/* Movimientos del mes (detalle + saldo acumulado) */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Movimientos de {monthLabel}</h3>
        {enhancedRows.length === 0 ? (
          <p>No hay movimientos en este mes.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Fecha</th>
                  <th style={{ textAlign: 'left' }}>Movimiento</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                  <th style={{ textAlign: 'left' }}>Nota / Paga</th>
                  <th style={{ textAlign: 'left' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {enhancedRows.map(r => {
                  const isDebt = r.type === 'debt'
                  const sign = isDebt ? '+' : '−'
                  const chipStyle = {
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: 12,
                    lineHeight: '18px',
                    border: '1px solid',
                    background: isDebt ? '#fde8e8' : '#e9fce9',
                    borderColor: isDebt ? '#f8b4b4' : '#b9e6b9',
                    color: isDebt ? '#9b1c1c' : '#146c2e'
                  } as const
                  const moneyStyle = { color: isDebt ? '#c51616' : '#146c2e', fontWeight: 600 } as const

                  return (
                    <tr key={r.id}>
                      <td>{format(new Date(r.date), 'dd/MM/yyyy HH:mm')}</td>

                      <td>
                        <span style={chipStyle}>
                          {isDebt ? 'Deuda' : 'Pago'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <span style={moneyStyle}>
                          {sign} {eur(r.amount)}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {eur(r.pendiente)}
                      </td>

                      <td>
                        {r.note}
                        {r.payer ? ` — (${r.payer})` : ''}
                      </td>

                      <td>
                        <button onClick={() => onEdit(r)}>Editar</button>{' '}
                        <button onClick={() => askDelete(r)}>Eliminar</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumen meses anteriores (compacto) */}
      <div className="card" style={{ padding: '1rem' }}>
        <div className="row-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ marginTop: 0 }}>Resumen meses anteriores</h3>
        </div>

        {previousSummaries.length === 0 ? (
          <p>No hay meses anteriores con movimientos.</p>
        ) : (
          <ul className="list-compact" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {previousSummaries.map(s => (
              <li key={s.key} style={{ padding: '8px 0', borderBottom: '1px solid #f0eefd', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ textTransform: 'capitalize' }}>{monthLabelFromKey(s.key)}</span>
                <span style={{ opacity: 0.8 }}>
                  Deuda {eur(s.deuda)} · Pagado {eur(s.pagado)} · Pendiente {eur(s.pendiente)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MODAL: Confirmación de borrado */}
      <ConfirmModal
        open={!!toDelete}
        title="Eliminar movimiento"
        message="¿Seguro que quieres eliminar este movimiento? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

/* Tarjeta métrica con estado OK */
function Metric({ label, value, ok = false }: { label: string; value: string; ok?: boolean }) {
  const bg = ok ? '#e9fce9' : 'var(--slot-zebra, #faf5ff)'
  const border = ok ? '#b9e6b9' : 'var(--slot-sep, #ede9fe)'
  const valueColor = ok ? '#146c2e' : 'inherit'

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 12,
      padding: '0.75rem 1rem',
      minWidth: 180,
      boxShadow: 'var(--shadow, 0 10px 25px rgba(0,0,0,.06))'
    }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: valueColor }}>{value}</div>
    </div>
  )
}

/* ---------- Modal simple y elegante ---------- */
function ConfirmModal(props: {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!props.open) return null
  return (
    <div style={backdrop}>
      <div style={modal}>
        <h3 style={{ margin: '0 0 8px' }}>{props.title}</h3>
        <p style={{ margin: '0 0 16px', opacity: .85 }}>{props.message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={props.onCancel} style={btnSecondary}>{props.cancelText ?? 'Cancelar'}</button>
          <button onClick={props.onConfirm} style={btnDanger}>{props.confirmText ?? 'Eliminar'}</button>
        </div>
      </div>
    </div>
  )
}

/* Estilos del modal (inline para no tocar CSS global) */
const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 8, 15, 0.5)',
  display: 'grid',
  placeItems: 'center',
  zIndex: 9998
}
const modal: CSSProperties = {
  background: 'white',
  borderRadius: 16,
  padding: 20,
  width: 'min(520px, 92vw)',
  boxShadow: '0 25px 60px rgba(0,0,0,.25)',
  border: '1px solid #e5e7eb'
}
const btnSecondary: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  background: '#fff',
  cursor: 'pointer'
}
const btnDanger: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #f8b4b4',
  background: '#fde8e8',
  color: '#9b1c1c',
  cursor: 'pointer'
}
