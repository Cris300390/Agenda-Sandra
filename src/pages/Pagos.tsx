// src/pages/Pagos.tsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type { Student } from '../db'
import {
  format, startOfMonth, endOfMonth, isWithinInterval, parseISO,
  startOfYear, endOfYear
} from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '../ui/Toast'          // toasts + confirm
import PagosCleanup from '../components/PagosCleanup' // mantenimiento (borrar mes / huérfanos)

/* ===== Tipos ===== */
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

/* ===== Utiles ===== */
const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0)

const toInputDateTime = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const yyyyMM = (d: Date) => format(d, 'yyyy-MM')

/* ===== Página ===== */
export default function PagosPage() {
  const toast = useToast()

  // Alumnos
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)

  // Formulario
  const [when, setWhen] = useState<string>(() => toInputDateTime(new Date()))
  const [note, setNote] = useState('')
  const [debtAmount, setDebtAmount] = useState<string>('') // vacío por defecto
  const [payAmount, setPayAmount] = useState<string>('')   // vacío por defecto
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

  // refresco automático cuando otros componentes limpian datos
  useEffect(() => {
    const h = () => load()
    window.addEventListener('data:changed', h as any)
    return () => window.removeEventListener('data:changed', h as any)
  }, [])

  const nameById = useMemo(() => {
    const m = new Map<number, string>()
    students.forEach(s => { if (typeof s.id === 'number') m.set(s.id, s.name) })
    return m
  }, [students])

  const canCreate = studentId != null

  // Rango del mes seleccionado
  const range = useMemo(() => {
    const base = new Date(when)
    return { start: startOfMonth(base), end: endOfMonth(base) }
  }, [when])

  // Movimientos del mes por alumno
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

  // Resumen del mes de TODOS los alumnos
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

  // Buckets “al día” y “con deuda” del mes
  const statusBuckets = useMemo(() => {
    const ok = perStudentMonth
      .filter(s => s.pendiente <= 0)
      .map(s => ({ id: s.id, name: s.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    const debt = perStudentMonth
      .filter(s => s.pendiente > 0)
      .map(s => ({ id: s.id, name: s.name, amount: s.pendiente }))
      .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'es'))
    return { ok, debt }
  }, [perStudentMonth])

  // Historial mensual del alumno (año en curso)
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
    return Array.from(acc.values()).sort((a, b) => b.key.localeCompare(a.key))
  }, [items, studentId, when])

  function parseEuro(txt: string) {
    const clean = txt.replace(/\./g, '').replace(',', '.').trim()
    const n = Number(clean)
    return isNaN(n) ? 0 : n
  }

  /* ===== Alta de movimientos ===== */
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

  /* ===== Deshacer / Eliminar ===== */
  async function undoLast(kind: MovementType) {
    if (studentId == null) return
    const base = new Date(when)
    const monthStart = startOfMonth(base), monthEnd = endOfMonth(base)
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

  /* ===== Estilos (incluye responsive móvil) ===== */
  const scoped = `
    .stack { display: grid; gap: 16px; }
    .block { background:#fff; border:1px solid #eee; border-radius:16px; padding:14px; box-shadow:0 10px 24px rgba(0,0,0,.05); }
    .row { display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:12px; align-items:end; }
    .field { display:grid; gap:6px; }
    .field label { font-size:12px; color:#6b7280; }
    .select-student { grid-column: span 2; }
    .actions-inline { display:flex; gap: 8px; align-items: end; flex-wrap: wrap; }

    .btn { padding:10px 14px; border-radius:12px; border:1px solid #e5e7eb; background:#fff; font-weight:800; cursor:pointer; }
    .btn:hover { background:#f8fafc; }
    .btn-primary{ background:#fee2e2; border-color:#fecaca; color:#991b1b }
    .btn-success{ background:#dcfce7; border-color:#bbf7d0; color:#065f46 }

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

    .table-wrap { overflow: hidden; }
    table { width:100%; border-collapse:separate; border-spacing:0 8px; }
    thead th { text-align:left; font-size:12px; color:#64748b; padding:8px 10px; }
    tbody td { background:#fff; border:1px solid #eef2f7; padding:10px 12px; border-radius:12px; vertical-align:top; }
    .chip { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; font-weight:700; font-size:12px; }
    .chip--debt { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }
    .chip--pay  { background:#dcfce7; color:#065f46; border:1px solid #bbf7d0; }
    .actions { display:flex; gap:8px; flex-wrap: wrap; }
    .btn-s { padding:6px 10px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; font-size:14px; cursor:pointer; }
    .btn-s:hover { background:#f8fafc; }

    /* Resumen de alumnos */
    .summary { display: grid; gap: 10px; }
    .summary-grid { display:grid; grid-template-columns: 1fr 140px 140px 140px; gap:12px; align-items:center; }
    .summary-header { color:#475569; font-size:12px; font-weight:700; padding: 0 2px; }
    .summary-row { background:#fff; border:1px solid #eee; border-radius:12px; padding:10px 12px; box-shadow:0 6px 14px rgba(0,0,0,.04); }
    .summary-name { display:flex; align-items:center; gap:10px; font-weight:700; }
    .avatar { width:28px; height:28px; border-radius:50%; background:#eef2ff; color:#4f46e5; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12px; }
    .summary-money { text-align:right; font-weight:800; }
    .summary-neg { color:#dc2626; }
    .summary-pos { color:#16a34a; }
    .summary-ok { display:inline-flex; align-items:center; gap:6px; background:#dcfce7; color:#065f46; border:1px solid #bbf7d0; padding:4px 8px; border-radius:999px; font-weight:700; font-size:12px; }

    /* Estado mes: al día vs con deuda */
    .status { display:grid; gap: 10px; }
    .status-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .status-badges { display:flex; gap:8px; flex-wrap:wrap; }
    .badge-ok { background:#dcfce7; color:#065f46; border:1px solid #bbf7d0; padding:6px 10px; border-radius:999px; font-weight:800; font-size:12px; }
    .badge-debt { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; padding:6px 10px; border-radius:999px; font-weight:800; font-size:12px; }
    .status-list { display:flex; flex-wrap:wrap; gap:8px; }
    .status-pill { display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:9999px; font-weight:800; font-size:13px; border:1px solid #e5e7eb; background:#fff; box-shadow:0 4px 12px rgba(0,0,0,.04); }
    .status-pill.ok { border-color:#bbf7d0; }
    .status-pill.debt { border-color:#fecaca; }

    /* Historial mensual del alumno */
    .history { display:grid; gap:10px; }
    .history-row { display:grid; grid-template-columns: 120px 1fr 1fr 1fr; gap:12px; align-items:center; background:#fff; border:1px solid #eee; border-radius:12px; padding:10px 12px; }
    .history-header { color:#475569; font-size:12px; font-weight:700; padding: 0 2px; }

    /* --------- MÓVIL --------- */
    @media (max-width: 960px){
      .row { grid-template-columns:1fr 1fr 1fr; } .select-student { grid-column: span 1; }
    }
    @media (max-width: 720px){
      .row { grid-template-columns:1fr; }
      .stats { grid-template-columns: 1fr; }
      .summary-grid { grid-template-columns: 1fr; }
      .summary-money { text-align:left; }
      .history-row { grid-template-columns: 1fr; row-gap:6px; }
    }
    @media (max-width: 520px){
      .field label { font-size:13px; }
      select, input, .btn, .btn-s { min-height:44px; font-size:16px; border-radius:14px; }
      .actions-inline { align-items: stretch; }
      .actions-inline .btn, .actions-inline .btn-s { flex: 1 1 auto; }

      .table-wrap { overflow: visible; }
      table { border-spacing: 0; }
      thead { display: none; }
      tbody { display:block; }
      tbody tr {
        display:block;
        background: #fff;
        border: 1px solid #eef2f7;
        border-radius: 14px;
        padding: 10px;
        box-shadow: 0 6px 16px rgba(0,0,0,.05);
        margin-bottom: 10px;
      }
      tbody td {
        display:flex;
        justify-content: space-between;
        align-items: center;
        border: none;
        border-radius: 10px;
        padding: 10px 8px;
        background: transparent;
      }
      tbody td::before {
        content: attr(data-label);
        font-weight: 700;
        color: #64748b;
        margin-right: 12px;
      }
      .actions { justify-content: flex-end; }
    }
  `

  const selected = students.find(s => s.id === studentId)
  const initials = (name?: string) =>
    (name || '?').trim().split(/\s+/).map(p => p[0]).slice(0,2).join('').toUpperCase()

  return (
    <div className="stack page--withHeader">
      <style>{scoped}</style>

      {/* Alumno + formulario + deshacer */}
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

      {/* Estado general del mes */}
      <section className="block">
        <div className="status">
          <div className="status-head">
            <strong>Estado de alumnos (mes)</strong>
            <div className="status-badges">
              <span className="badge-ok">Al día: {statusBuckets.ok.length}</span>
              <span className="badge-debt">Con deuda: {statusBuckets.debt.length}</span>
            </div>
          </div>

          {statusBuckets.debt.length > 0 && (
            <>
              <div className="muted">Con deuda</div>
              <div className="status-list">
                {statusBuckets.debt.map(s => (
                  <span key={s.id} className="status-pill debt">
                    🔴 {s.name} · {eur(s.amount)}
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="muted" style={{ marginTop: 6 }}>Al día</div>
          <div className="status-list">
            {statusBuckets.ok.length > 0
              ? statusBuckets.ok.map(s => (
                  <span key={s.id} className="status-pill ok">✅ {s.name}</span>
                ))
              : <span className="muted">—</span>}
          </div>
        </div>
      </section>

      {/* Movimientos del mes (alumno) */}
      <section className="block">
        <h3 style={{ margin: '0 0 10px' }}>
          Movimientos de {format(new Date(when), 'MMMM yyyy', { locale: es })}
          {selected ? ` — ${selected.name}` : ''}
        </h3>

        <div className="table-wrap">
          <table className="mobile-table">
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
                    <td data-label="Fecha">{format(d, 'dd/MM/yyyy HH:mm')}</td>
                    <td data-label="Movimiento"><span className={`chip ${isDebt ? 'chip--debt' : 'chip--pay'}`}>{isDebt ? 'Deuda' : 'Pago'}</span></td>
                    <td data-label="Importe" className={isDebt ? 'money--neg' : 'money--pos'}>
                      {isDebt ? '+ ' : '− '}{eur(m.amount)}
                    </td>
                    <td data-label="Saldo" className="money--muted">{eur((m as any).balance)}</td>
                    <td data-label="Nota / Paga">
                      {m.note ? m.note : <span className="muted">—</span>}
                      {m.payer && m.payer !== 'ns' ? `  ·  ${m.payer}` : ''}
                    </td>
                    <td data-label="Acciones">
                      <div className="actions">
                        <button className="btn-s" onClick={() => remove(m)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Resumen de TODOS los alumnos (mes) */}
      {perStudentMonth.length >= 2 && (
        <section className="block">
          <h3 style={{ margin: '0 0 10px' }}>
            Resumen de alumnos — {format(new Date(when), 'MMMM yyyy', { locale: es })}
          </h3>

          <div className="summary summary-grid">
            <div className="summary-header">Alumno</div>
            <div className="summary-header" style={{ textAlign:'right' }}>Deuda</div>
            <div className="summary-header" style={{ textAlign:'right' }}>Pagado</div>
            <div className="summary-header" style={{ textAlign:'right' }}>Pendiente</div>
          </div>

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

      {/* Historial por meses del alumno (año en curso) */}
      {selected && (
        <section className="block">
          <h3 style={{ margin: '0 0 10px' }}>
            Historial mensual — {selected.name} (año {format(new Date(when), 'yyyy')})
          </h3>

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

      {/* Panel de mantenimiento (borrar mes / huérfanos) */}
      <PagosCleanup />
    </div>
  )
}
