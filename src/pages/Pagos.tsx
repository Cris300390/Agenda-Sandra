// src/pages/Pagos.tsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type { Student } from '../db'
import {
  format, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfYear, endOfYear
} from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '../ui/Toast'   // 👈 Notificaciones profesionales

type MovementType = 'debt' | 'payment'
type Payer = 'madre' | 'padre' | 'alumno' | 'ns'

type Movement = {
  id?: number
  studentId?: number
  date: string             // ISO
  type: MovementType
  amount: number
  note?: string
  payer?: Payer
  monthKey?: string        // YYYY-MM (para control mensual)
}

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0)

const toInputDateTime = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const yyyyMM = (d: Date) => format(d, 'yyyy-MM')

export default function PagosPage() {
  const toast = useToast() // 👈 hook de toasts/confirm

  // Alumnos
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)

  // Formulario (sin ceros por defecto)
  const [when, setWhen] = useState<string>(() => toInputDateTime(new Date()))
  const [note, setNote] = useState('')
  const [debtAmount, setDebtAmount] = useState<string>('') // vacío
  const [payAmount, setPayAmount] = useState<string>('')   // vacío
  const [payer, setPayer] = useState<Payer>('ns')

  // Datos
  const [items, setItems] = useState<Movement[]>([])

  async function load() {
    const allMovs: Movement[] = await (db as any).movements.toArray()
    allMovs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setItems(allMovs)

    const sts: Student[] = await (db as any).students.toArray()
    sts.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    setStudents(sts)
  }
  useEffect(() => { load() }, [])

  const nameById = useMemo(() => {
    const m = new Map<number, string>()
    students.forEach(s => { if (typeof s.id === 'number') m.set(s.id, s.name) })
    return m
  }, [students])

  const canCreate = studentId != null

  // Rango del mes
  const range = useMemo(() => {
    const base = new Date(when)
    return { start: startOfMonth(base), end: endOfMonth(base) }
  }, [when])

  // Movimientos del mes por alumno seleccionado
  const monthItems = useMemo(() => {
    return items.filter(m =>
      studentId != null &&
      m.studentId === studentId &&
      isWithinInterval(parseISO(m.date), { start: range.start, end: range.end })
    )
  }, [items, studentId, range])

  // Totales del mes (alumno)
  const totals = useMemo(() => {
    const deuda = monthItems.filter(m => m.type === 'debt').reduce((a, m) => a + (m.amount || 0), 0)
    const pagado = monthItems.filter(m => m.type === 'payment').reduce((a, m) => a + (m.amount || 0), 0)
    const pendiente = deuda - pagado
    return { deuda, pagado, pendiente }
  }, [monthItems])

  // Saldo fila a fila (alumno + mes)
  const rowsWithBalance = useMemo(() => {
    let balance = 0
    return monthItems.map(m => {
      balance += m.type === 'debt' ? m.amount : -m.amount
      return { ...m, balance }
    })
  }, [monthItems])

  // Resumen mensual de TODOS los alumnos (para el mes visible)
  const perStudentMonth = useMemo(() => {
    const inMonth = items.filter(m =>
      isWithinInterval(parseISO(m.date), { start: range.start, end: range.end })
    )
    const acc = new Map<number, { id: number, name: string, deuda: number, pagado: number, pendiente: number }>()
    for (const m of inMonth) {
      if (typeof m.studentId !== 'number') continue
      const id = m.studentId
      const name = nameById.get(id) ?? `Alumno ${id}`
      if (!acc.has(id)) acc.set(id, { id, name, deuda: 0, pagado: 0, pendiente: 0 })
      const row = acc.get(id)!
      if (m.type === 'debt') row.deuda += m.amount
      else row.pagado += m.amount
    }
    for (const v of acc.values()) v.pendiente = v.deuda - v.pagado
    const list = Array.from(acc.values()).filter(v => v.deuda > 0 || v.pagado > 0)
    list.sort((a, b) => b.pendiente - a.pendiente || a.name.localeCompare(b.name, 'es'))
    return list
  }, [items, range, nameById])

  // Historial mensual del alumno seleccionado (año en curso)
  const historyByMonth = useMemo(() => {
    if (studentId == null) return []
    const base = new Date(when)
    const yearRange = { start: startOfYear(base), end: endOfYear(base) }
    const arr = items.filter(m =>
      m.studentId === studentId &&
      isWithinInterval(parseISO(m.date), yearRange)
    )
    const acc = new Map<string, { key: string, deuda: number, pagado: number, pendiente: number }>()
    for (const m of arr) {
      const key = yyyyMM(new Date(m.date))
      if (!acc.has(key)) acc.set(key, { key, deuda: 0, pagado: 0, pendiente: 0 })
      const row = acc.get(key)!
      if (m.type === 'debt') row.deuda += m.amount
      else row.pagado += m.amount
    }
    for (const v of acc.values()) v.pendiente = v.deuda - v.pagado
    // ordenar desc por mes
    return Array.from(acc.values()).sort((a, b) => b.key.localeCompare(a.key))
  }, [items, studentId, when])

  function parseEuro(txt: string) {
    const clean = txt.replace(/\./g, '').replace(',', '.').trim()
    const n = Number(clean)
    return isNaN(n) ? 0 : n
  }

  // ===== altas con toast =====
  async function addDebt() {
    if (!canCreate) { toast.error('Selecciona un alumno'); return }
    const amount = parseEuro(debtAmount)
    if (amount <= 0) { toast.warning('Importe inválido', 'La deuda debe ser mayor que cero.'); return }
    await (db as any).movements.add({
      studentId: studentId!, date: new Date(when).toISOString(),
      monthKey: yyyyMM(new Date(when)),
      type: 'debt', amount, note: note?.trim() || undefined, payer
    } as Movement)
    setDebtAmount(''); setNote('')
    toast.success('Deuda añadida', `${eur(amount)} asignado correctamente.`)
    await load()
  }

  async function addPayment() {
    if (!canCreate) { toast.error('Selecciona un alumno'); return }
    const amount = parseEuro(payAmount)
    if (amount <= 0) { toast.warning('Importe inválido', 'El pago debe ser mayor que cero.'); return }
    await (db as any).movements.add({
      studentId: studentId!, date: new Date(when).toISOString(),
      monthKey: yyyyMM(new Date(when)),
      type: 'payment', amount, note: note?.trim() || undefined, payer
    } as Movement)
    setPayAmount(''); setNote('')
    toast.success('Pago registrado', `${eur(amount)} guardado correctamente.`)
    await load()
  }

  // ===== deshacer última del mes (con confirm elegante) =====
  async function undoLast(kind: MovementType) {
    if (studentId == null) return
    const base = new Date(when)
    const monthStart = startOfMonth(base), monthEnd = endOfMonth(base)
    // buscamos el último del tipo en ese mes
    const list = items
      .filter(m => m.studentId === studentId &&
                   m.type === kind &&
                   isWithinInterval(parseISO(m.date), { start: monthStart, end: monthEnd }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const target = list[0]
    if (!target || !target.id) { toast.info('Nada que deshacer'); return }
    const fecha = format(new Date(target.date), 'dd/MM/yyyy HH:mm', { locale: es })

    const ok = await toast.confirm({
      title: kind === 'debt' ? 'Deshacer última deuda' : 'Deshacer último pago',
      message: `${eur(target.amount)} del ${fecha}. Esta acción no se puede deshacer.`,
      confirmText: 'Deshacer',
      cancelText: 'Cancelar',
      tone: 'danger',
    })
    if (!ok) return

    await (db as any).movements.delete(target.id)
    toast.success('Operación deshecha')
    await load()
  }

  // ===== eliminar fila concreta (con confirm elegante) =====
  async function remove(item: Movement) {
    if (!item.id) return
    const fecha = format(new Date(item.date), 'dd/MM/yyyy HH:mm', { locale: es })
    const tipo = item.type === 'debt' ? 'deuda' : 'pago'

    const ok = await toast.confirm({
      title: `Eliminar ${tipo}`,
      message: `${eur(item.amount)} del ${fecha}. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      tone: 'danger',
    })
    if (!ok) return

    await (db as any).movements.delete(item.id)
    toast.success('Eliminado', `${tipo} borrado correctamente.`)
    await load()
  }

  // Estilos locales
  const scoped = `
    .stack { display: grid; gap: 16px; }
    .block { background:#fff; border:1px solid #eee; border-radius:16px; padding:14px; box-shadow:0 10px 24px rgba(0,0,0,.05); }
    .row { display:grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr; gap:12px; align-items:end; }
    .field { display:grid; gap:6px; }
    .field label { font-size:12px; color:#6b7280; }
    .select-student { grid-column: span 2; }

    .actions-inline { display:flex; gap: 8px; align-items: end; }

    .stats { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px; }
    .stat { border:1px solid #eee; border-radius:14px; padding:14px; background:#fbfbfe; }
    .stat h4 { margin:0 0 6px; font-size:12px; color:#6b7280; }
    .stat .big { font-size:22px; font-weight:800; }
    .stat--danger { background:#fff1f2; border-color:#ffe4e6; }
    .stat--danger .big { color:#e11d48; }
    .stat--ok { background:#f0f9ff; border-color:#e0f2fe; }
    .stat--ok .big { color:#0ea5e9; }
    .money--neg { color:#dc2626; font-weight:700; }
    .money--pos { color:#16a34a; font-weight:700; }
    .money--muted { color:#334155; font-weight:700; }

    table { width:100%; border-collapse:separate; border-spacing:0 8px; }
    thead th { text-align:left; font-size:12px; color:#64748b; padding:8px 10px; }
    tbody td { background:#fff; border:1px solid #eef2f7; padding:10px 12px; border-radius:12px; vertical-align:top; }
    .chip { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; font-weight:700; font-size:12px; }
    .chip--debt { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }
    .chip--pay  { background:#dcfce7; color:#065f46; border:1px solid #bbf7d0; }
    .actions { display:flex; gap:8px; }
    .btn-s { padding:6px 10px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; font-size:14px; cursor:pointer; }
    .btn-s:hover { background:#f8fafc; }

    /* Resumen de alumnos (con encabezado claro) */
    .summary { display: grid; gap: 10px; }
    .summary-grid { display:grid; grid-template-columns: 1fr 140px 140px 140px; gap:12px; align-items:center; }
    .summary-header { color:#475569; font-size:12px; font-weight:700; padding: 0 2px; }
    .summary-row {
      background:#fff; border:1px solid #eee; border-radius:12px; padding:10px 12px;
      box-shadow:0 6px 14px rgba(0,0,0,.04);
    }
    .summary-name { display:flex; align-items:center; gap:10px; font-weight:700; }
    .avatar { width:28px; height:28px; border-radius:50%; background:#eef2ff; color:#4f46e5; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12px; }
    .summary-money { text-align:right; font-weight:800; }
    .summary-neg { color:#dc2626; } /* pendiente > 0 */
    .summary-pos { color:#16a34a; } /* pendiente < 0 (a favor) */
    .summary-ok { display:inline-flex; align-items:center; gap:6px; background:#dcfce7; color:#065f46; border:1px solid #bbf7d0; padding:4px 8px; border-radius:999px; font-weight:700; font-size:12px; }

    /* Historial mensual del alumno */
    .history { display:grid; gap:10px; }
    .history-row { display:grid; grid-template-columns: 120px 1fr 1fr 1fr; gap:12px; align-items:center; background:#fff; border:1px solid #eee; border-radius:12px; padding:10px 12px; }
    .history-header { color:#475569; font-size:12px; font-weight:700; padding: 0 2px; }

    @media (max-width: 1100px) {
      .summary-grid { grid-template-columns: 1fr 120px 120px 120px; }
    }
    @media (max-width: 960px){
      .row { grid-template-columns:1fr 1fr 1fr; } .select-student { grid-column: span 1; }
    }
    @media (max-width: 720px){
      .row { grid-template-columns:1fr; }
      .summary-grid { grid-template-columns: 1fr; }
      .summary-money { text-align:left; }
      .history-row { grid-template-columns: 1fr; row-gap:6px; }
    }
  `

  const selected = students.find(s => s.id === studentId)
  const initials = (name?: string) =>
    (name || '?').trim().split(/\s+/).map(p => p[0]).slice(0,2).join('').toUpperCase()

  return (
    <div className="stack">
      <style>{scoped}</style>

      {/* Alumno + formulario + botones deshacer */}
      <section className="block">
        <div className="row">
          <div className="field select-student">
            <label>Alumno (obligatorio)</label>
            <select
              value={studentId ?? ''}
              onChange={(e) => setStudentId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Elige un alumno —</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Fecha</label>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>

          <div className="field">
            <label>Quién paga</label>
            <select value={payer} onChange={(e) => setPayer(e.target.value as Payer)}>
              <option value="ns">(sin especificar)</option>
              <option value="madre">Madre</option>
              <option value="padre">Padre</option>
              <option value="alumno">Alumno</option>
            </select>
          </div>

          <div className="field">
            <label>Nota</label>
            <input
              type="text"
              placeholder="clases de esta semana / transf."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="row" style={{ marginTop: 10 }}>
          <div className="field">
            <label>Deuda (€)</label>
            <input inputMode="decimal" placeholder="0,00" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} />
          </div>
          <div className="actions-inline">
            <button className="btn btn-primary" onClick={addDebt} disabled={!canCreate}>Añadir deuda</button>
            <button className="btn" onClick={() => undoLast('debt')} disabled={!canCreate}>Deshacer última deuda</button>
          </div>

          <div className="field">
            <label>Pago (€)</label>
            <input inputMode="decimal" placeholder="0,00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </div>
          <div className="actions-inline">
            <button className="btn btn-success" onClick={addPayment} disabled={!canCreate}>Registrar pago</button>
            <button className="btn" onClick={() => undoLast('payment')} disabled={!canCreate}>Deshacer último pago</button>
          </div>
        </div>

        {selected && (
          <p className="muted" style={{ marginTop: 8 }}>
            Trabajando con: <strong>{selected.name}</strong>
          </p>
        )}
      </section>

      {/* Estado del mes (alumno) */}
      <section className="block">
        <div className="stats">
          <div className="stat stat--danger">
            <h4>Deuda del mes</h4>
            <div className="big">{eur(totals.deuda)}</div>
          </div>
          <div className="stat stat--ok">
            <h4>Pagado en el mes</h4>
            <div className="big">{eur(totals.pagado)}</div>
          </div>
          <div className="stat">
            <h4>Pendiente del mes</h4>
            <div className={'big ' + (totals.pendiente > 0 ? 'money--neg' : totals.pendiente < 0 ? 'money--pos' : 'money--muted')}>
              {eur(totals.pendiente)}
            </div>
          </div>
        </div>
      </section>

      {/* Movimientos del mes (alumno) — sin botón Editar */}
      <section className="block">
        <h3 style={{ margin: '0 0 10px' }}>
          Movimientos de {format(new Date(when), 'MMMM yyyy', { locale: es })}
          {selected ? ` — ${selected.name}` : ''}
        </h3>

        <table>
          <thead>
            <tr>
              <th style={{ width: 170 }}>Fecha</th>
              <th style={{ width: 120 }}>Movimiento</th>
              <th style={{ width: 140 }}>Importe</th>
              <th style={{ width: 120 }}>Saldo</th>
              <th>Nota / Paga</th>
              <th style={{ width: 120 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rowsWithBalance.length === 0 && (
              <tr><td colSpan={6} className="muted">Elige un alumno y/o no hay movimientos en este mes.</td></tr>
            )}

            {rowsWithBalance.map(m => {
              const d = new Date(m.date)
              const isDebt = m.type === 'debt'
              return (
                <tr key={m.id}>
                  <td>{format(d, 'dd/MM/yyyy HH:mm')}</td>
                  <td><span className={`chip ${isDebt ? 'chip--debt' : 'chip--pay'}`}>{isDebt ? 'Deuda' : 'Pago'}</span></td>
                  <td className={isDebt ? 'money--neg' : 'money--pos'}>
                    {isDebt ? '+ ' : '− '}{eur(m.amount)}
                  </td>
                  <td className="money--muted">{eur((m as any).balance)}</td>
                  <td>{m.note ? m.note : <span className="muted">—</span>}{m.payer && m.payer !== 'ns' ? `  ·  ${m.payer}` : ''}</td>
                  <td>
                    <div className="actions">
                      <button className="btn-s" onClick={() => remove(m)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {/* Resumen de TODOS los alumnos (mes) — con encabezado claro */}
      {perStudentMonth.length >= 2 && (
        <section className="block">
          <h3 style={{ margin: '0 0 10px' }}>
            Resumen de alumnos — {format(new Date(when), 'MMMM yyyy', { locale: es })}
          </h3>

          {/* Encabezado */}
          <div className="summary summary-grid">
            <div className="summary-header">Alumno</div>
            <div className="summary-header" style={{ textAlign:'right' }}>Deuda</div>
            <div className="summary-header" style={{ textAlign:'right' }}>Pagado</div>
            <div className="summary-header" style={{ textAlign:'right' }}>Pendiente</div>
          </div>

          {/* Filas */}
          <div className="summary">
            {perStudentMonth.map(s => (
              <div key={s.id} className="summary-row summary-grid">
                <div className="summary-name">
                  <div className="avatar">{initials(s.name)}</div>
                  {s.name}
                </div>
                <div className="summary-money money--neg">{eur(s.deuda)}</div>
                <div className="summary-money money--pos">{eur(s.pagado)}</div>
                <div className="summary-money">
                  {s.pendiente > 0
                    ? <span className="summary-neg">{eur(s.pendiente)}</span>
                    : s.pendiente < 0
                      ? <span className="summary-pos">{eur(s.pendiente)}</span>
                      : <span className="summary-ok">Al día</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Historial mensual del alumno (año en curso) */}
      {selected && (
        <section className="block">
          <h3 style={{ margin: '0 0 10px' }}>
            Historial mensual — {selected.name} (año {format(new Date(when), 'yyyy')})
          </h3>

          {/* Encabezado */}
          <div className="history">
            <div className="history-row history-header">
              <div>Mes</div>
              <div style={{ textAlign:'right' }}>Deuda</div>
              <div style={{ textAlign:'right' }}>Pagado</div>
              <div style={{ textAlign:'right' }}>Pendiente</div>
            </div>

            {historyByMonth.length === 0 && (
              <div className="muted">No hay movimientos registrados este año.</div>
            )}

            {historyByMonth.map(m => {
              const label = format(new Date(m.key + '-01'), 'LLLL yyyy', { locale: es })
              return (
                <div key={m.key} className="history-row">
                  <div><strong style={{ textTransform:'capitalize' }}>{label}</strong></div>
                  <div className="summary-money money--neg">{eur(m.deuda)}</div>
                  <div className="summary-money money--pos">{eur(m.pagado)}</div>
                  <div className="summary-money">
                    {m.pendiente > 0
                      ? <span className="summary-neg">{eur(m.pendiente)}</span>
                      : m.pendiente < 0
                        ? <span className="summary-pos">{eur(m.pendiente)}</span>
                        : <span className="summary-ok">Al día</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
