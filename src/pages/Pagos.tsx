import { useEffect, useMemo, useState } from 'react'
import { db, monthKeyFromDate } from '../db'
import type { Payment } from '../db'

function monthKeyToLabel(monthKey: string) {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

export default function Pagos() {
  const [monthKey, setMonthKey] = useState(monthKeyFromDate(new Date()))
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<{ id?: number; name: string }[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const list = await db.payments.where('monthKey').equals(monthKey).toArray()
      if (mounted) setPayments(list)
    })()
    return () => { mounted = false }
  }, [monthKey])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const list = await db.students.orderBy('name').toArray()
      if (mounted) setStudents(list)
    })()
    return () => { mounted = false }
  }, [])

  const knownMonths = useMemo(() => {
    const now = new Date()
    // 24 meses: 12 pasados y 12 futuros, siempre dinámico
    const arr: string[] = []
    for (let i = -12; i <= 12; i++) {
      arr.push(monthKeyFromDate(new Date(now.getFullYear(), now.getMonth() + i, 1)))
    }
    return arr
  }, [])

  async function addPayment(studentId: number, amount: number) {
    const now = new Date()
    const record: Payment = {
      studentId,
      amount,
      date: now.toISOString(),
      method: 'transfer',
      note: '',
      monthKey,
      paid: true,
    }
    const id = await db.payments.add(record)
    setPayments((prev) => prev.concat({ ...record, id }))
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Pagos</h2>
      <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
        <label>
          Mes
          <select value={monthKey} onChange={(e) => setMonthKey(e.target.value)}>
            {knownMonths.map(mk => (
              <option key={mk} value={mk}>{monthKeyToLabel(mk)}</option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => {
            const [y, m] = monthKey.split('-').map(Number)
            setMonthKey(monthKeyFromDate(new Date(y, m - 2, 1)))
          }}>Anterior</button>
          <button onClick={() => {
            const [y, m] = monthKey.split('-').map(Number)
            setMonthKey(monthKeyFromDate(new Date(y, m, 1)))
          }}>Siguiente</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginTop: 8 }}>
        <select id="alumno" aria-label="Alumno" defaultValue="">
          <option value="" disabled>Seleccionar alumno</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input id="monto" type="number" placeholder="Monto" aria-label="Monto" />
        <button className="btn-primary" onClick={() => {
          const sid = Number((document.getElementById('alumno') as HTMLSelectElement).value)
          const amt = Number((document.getElementById('monto') as HTMLInputElement).value)
          if (!sid || !amt) return
          addPayment(sid, amt)
        }}>Registrar pago</button>
      </div>

      <h3 style={{ marginBottom: 4 }}>Estado del mes</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {payments.map(p => (
          <li key={p.id} style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
            <strong>{students.find(s => s.id === p.studentId)?.name}</strong> — ${p.amount.toLocaleString('es-AR')} — {new Date(p.date).toLocaleDateString('es-ES')}
          </li>
        ))}
      </ul>
    </div>
  )
}


