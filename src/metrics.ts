import { db } from './db'
import type { Payment, ClassSession } from './db'

export type MonthlyIncome = { monthKey: string; total: number }
export type StudentCount = { studentId: number; count: number }

export async function getMonthlyIncome(): Promise<MonthlyIncome[]> {
  const records: Payment[] = await db.payments.toArray()
  const map = new Map<string, number>()
  for (const p of records) {
    map.set(p.monthKey, (map.get(p.monthKey) || 0) + (p.paid ? p.amount : 0))
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([monthKey, total]) => ({ monthKey, total }))
}

export async function getTopStudentsByIncome(limit = 5) {
  const payments = await db.payments.toArray()
  const byStudent = new Map<number, number>()
  for (const p of payments) byStudent.set(p.studentId, (byStudent.get(p.studentId) || 0) + (p.paid ? p.amount : 0))
  return Array.from(byStudent.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit)
}

export async function getClassesByMonth(): Promise<{ monthKey: string; count: number }[]> {
  const classes: ClassSession[] = await db.classes.toArray()
  const map = new Map<string, number>()
  for (const c of classes) {
    const d = new Date(c.start)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map.set(key, (map.get(key) || 0) + 1)
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([monthKey, count]) => ({ monthKey, count }))
}

export async function getNoShowRanking(limit = 5) {
  const classes: ClassSession[] = await db.classes.toArray()
  const map = new Map<number, { total: number; noShows: number }>()
  for (const c of classes) {
    const entry = map.get(c.studentId) || { total: 0, noShows: 0 }
    entry.total += 1
    entry.noShows += c.noShow ? 1 : 0
    map.set(c.studentId, entry)
  }
  const ranking = Array.from(map.entries())
    .map(([studentId, { total, noShows }]) => ({ studentId, rate: total ? noShows / total : 0, noShows, total }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, limit)
  return ranking
}


