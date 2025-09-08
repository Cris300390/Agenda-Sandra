import Dexie, { type Table } from 'dexie'

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
}

export type ClassSession = {
  id?: number
  studentId: number
  title: string
  start: string // ISO
  end: string // ISO
  canceled?: boolean
  noShow?: boolean
}

export type Payment = {
  id?: number
  studentId: number
  date: string // ISO
  amount: number
  method?: 'cash' | 'card' | 'transfer'
  note?: string
  monthKey: string // YYYY-MM for quick queries
  paid: boolean
}

export class AgendaDB extends Dexie {
  students!: Table<Student, number>
  classes!: Table<ClassSession, number>
  payments!: Table<Payment, number>

  constructor() {
    super('agenda_db')
    this.version(1).stores({
      students: '++id, name, active',
      classes: '++id, studentId, start, end, noShow',
      payments: '++id, studentId, monthKey, paid',
    })
  }
}

export const db = new AgendaDB()

// Convenience helpers
export const monthKeyFromDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// Generate a visually distinct color for a new student
export async function generateUniqueColor(): Promise<string> {
  const palette = ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#14b8a6','#06b6d4','#3b82f6','#8b5cf6','#ec4899']
  const used = new Set((await db.students.toArray()).map(s => s.color))
  for (const c of palette) if (!used.has(c)) return c
  // fallback: random pastel
  const hue = Math.floor(Math.random() * 360)
  return `hsl(${hue} 85% 65%)`
}

export async function seedIfEmpty() {
  const count = await db.students.count()
  if (count > 0) return
  const studentId = await db.students.add({
    name: 'Alumno demo',
    color: '#fb7185',
    notes: 'Le duele el hombro derecho',
    nextClassNotes: 'Revisar movilidad de hombro',
    active: true,
  })
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0)
  await db.classes.add({
    studentId,
    title: 'Clase inicial',
    start: start.toISOString(),
    end: end.toISOString(),
  })
  await db.payments.add({
    studentId,
    amount: 20000,
    date: now.toISOString(),
    method: 'transfer',
    note: 'Primera clase',
    monthKey: monthKeyFromDate(now),
    paid: true,
  })
}


