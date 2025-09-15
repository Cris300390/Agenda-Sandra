import Dexie, { type Table } from 'dexie'

/** Alumno */
export type Student = {
  id?: number
  name: string
  color: string
  notes?: string
  nextClassNotes?: string
  active: boolean
  age?: number
  grade?: string
  subjects?: string
  repeated?: boolean
  /**
   * (Opcional) Total que te debe actualmente.
   * Lo mantenemos por compatibilidad, pero el saldo real lo
   * calcularemos a partir de "movements".
   */
  debtTotal?: number
}

/** Clase / sesión */
export type ClassSession = {
  id?: number
  studentId: number
  title: string
  start: string // ISO
  end: string   // ISO
  canceled?: boolean
  noShow?: boolean
}

/** Pago (tabla existente; la mantenemos por compatibilidad) */
export type Payment = {
  id?: number
  studentId: number
  date: string // ISO
  amount: number
  method?: 'cash' | 'card' | 'transfer'
  note?: string
  monthKey?: string // YYYY-MM
  paid?: boolean
  /** quién paga: Madre, Padre, Abuela, Abuelo, Alumna, Alumno, Otro… */
  payer?: string
}

/** Movimiento genérico: DEUDA o PAGO */
export type MovementType = 'debt' | 'payment'
export interface Movement {
  id?: number
  studentId: number
  type: MovementType    // 'debt' (deuda) o 'payment' (pago)
  amount: number        // importe positivo
  date: string          // ISO: new Date().toISOString()
  note?: string
  payer?: string        // NUEVO (opcional): quién paga
}

export class AgendaDB extends Dexie {
  students!: Table<Student, number>
  classes!: Table<ClassSession, number>
  payments!: Table<Payment, number>
  movements!: Table<Movement, number> // NUEVO

  constructor() {
    super('agenda_db')

    // Esquema inicial (v1)
    this.version(1).stores({
      students: '++id, name, active',
      classes: '++id, studentId, start, end, noShow',
      payments: '++id, studentId, monthKey, paid'
    })

    // v2: añadimos la tabla "movements" (libro de deudas y pagos)
    this.version(2).stores({
      students: '++id, name, active',
      classes: '++id, studentId, start, end, noShow',
      payments: '++id, studentId, monthKey, paid',
      movements: '++id, studentId, date, type'
    }).upgrade(async (tx) => {
      // Migración suave: copia pagos antiguos a movements (type='payment')
      try {
        const pTable = tx.table('payments') as Table<Payment, number>
        const mTable = tx.table('movements') as Table<Movement, number>
        const old = await pTable.toArray()
        for (const p of old) {
          await mTable.add({
            studentId: p.studentId,
            type: 'payment',
            amount: Math.max(0, Number(p.amount) || 0),
            date: p.date ?? new Date().toISOString(),
            note: p.note,
            payer: p.payer
          })
        }
      } catch {
        // si falla la copia, seguimos sin bloquear la app
      }
    })
  }
}

export const db = new AgendaDB()

/** "YYYY-MM" a partir de una fecha */
export const monthKeyFromDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Genera un color distinto para cada alumno nuevo */
export async function generateUniqueColor(): Promise<string> {
  const palette = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
  ]
  const used = new Set((await db.students.toArray()).map(s => s.color))
  for (const c of palette) if (!used.has(c)) return c
  // fallback: pastel aleatorio
  const hue = Math.floor(Math.random() * 360)
  return `hsl(${hue} 85% 65%)`
}

/** Semilla de ejemplo si está vacío */
export async function seedIfEmpty() {
  const count = await db.students.count()
  if (count > 0) return

  const studentId = await db.students.add({
    name: 'Alumno demo',
    color: '#fb7185',
    notes: 'Le duele el hombro derecho',
    nextClassNotes: 'Revisar movilidad de hombro',
    active: true,
    debtTotal: 0
  })

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0)

  await db.classes.add({
    studentId,
    title: 'Clase inicial',
    start: start.toISOString(),
    end: end.toISOString()
  })

  // Ejemplo: pago inicial (tabla antigua)
  await db.payments.add({
    studentId,
    amount: 20,
    date: now.toISOString(),
    method: 'transfer',
    note: 'Primera clase',
    monthKey: monthKeyFromDate(now),
    paid: true,
    payer: 'Madre'
  })

  // Reflejo en movements
  await db.movements.add({
    studentId,
    type: 'payment',
    amount: 20,
    date: now.toISOString(),
    note: 'Primera clase (migrado)',
    payer: 'Madre'
  })
}

/* ==============================
   Helpers para Pagos/Deudas
   ============================== */

/** Añade DEUDA (por ejemplo, nuevas clases facturadas) */
export async function addDebt(
  studentId: number,
  amount: number,
  note = '',
  when: Date = new Date()
) {
  return db.movements.add({
    studentId,
    type: 'debt',
    amount: toMoney(amount),
    date: when.toISOString(),
    note
  })
}

/** Registra un PAGO (parcial o total) */
export async function addPayment(
  studentId: number,
  amount: number,
  note = '',
  when: Date = new Date(),
  payer?: string          // NUEVO: quién paga (opcional)
) {
  return db.movements.add({
    studentId,
    type: 'payment',
    amount: toMoney(amount),
    date: when.toISOString(),
    note,
    payer
  })
}

/** Lista de movimientos por alumno (ordenados por fecha asc) */
export async function listMovementsByStudent(studentId: number) {
  const rows = await db.movements.where('studentId').equals(studentId).toArray()
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}

/** Saldos de un alumno a partir de movements (globales) */
export async function getStudentBalance(studentId: number) {
  const rows = await db.movements.where('studentId').equals(studentId).toArray()
  const debt = rows.filter(r => r.type === 'debt').reduce((s, r) => s + (r.amount || 0), 0)
  const paid = rows.filter(r => r.type === 'payment').reduce((s, r) => s + (r.amount || 0), 0)
  const pending = debt - paid
  return {
    debt: toMoney(debt),
    paid: toMoney(paid),
    pending: toMoney(pending)
  }
}

/** Saldos por mes (YYYY-MM) para un alumno */
export async function getStudentMonthBalance(studentId: number, ym: string) {
  const rows = await db.movements.where('studentId').equals(studentId).toArray()
  const monthRows = rows.filter(r => (r.date ?? '').slice(0, 7) === ym)
  const debt = monthRows.filter(r => r.type === 'debt').reduce((s, r) => s + (r.amount || 0), 0)
  const paid = monthRows.filter(r => r.type === 'payment').reduce((s, r) => s + (r.amount || 0), 0)
  const pending = debt - paid
  return {
    debt: toMoney(debt),
    paid: toMoney(paid),
    pending: toMoney(pending)
  }
}

/** Redondeo monetario simple */
function toMoney(n: number) {
  const v = Number.isFinite(n) ? n : 0
  return Math.round(v * 100) / 100
}
