// src/data/supaPayments.ts
// CRUD de movimientos (pagos/deudas) usando student_id = UUID (string)

import supabase from './supaClient'

export type MovementType = 'debt' | 'payment'
export type Payer = 'ns' | 'madre' | 'padre' | 'alumno'

export type MovementDb = {
  id: string
  student_id: string | null        // uuid; puede quedar null si se borra el alumno
  fecha: string                    // ISO date-time en BD (si tu columna es 'date', ajusta abajo)
  tipo: MovementType               // 'debt' | 'payment' en BD (si es 'type', ajusta abajo)
  cantidad: number                 // importe en BD (si es 'amount', ajusta abajo)
  nota: string | null
  pagador: Payer | null            // 'ns' | 'madre' | 'padre' | 'alumno'
  clave_mes: string | null         // 'YYYY-MM' (si usas monthKey)
}

// Tipo de la app (nombres amigables)
export type Movement = {
  id?: string
  studentId: string                // UUID string
  date: string                     // ISO
  type: MovementType
  amount: number
  note?: string
  payer?: Payer
  monthKey?: string
}

function toApp(r: MovementDb): Movement {
  return {
    id: r.id,
    studentId: String(r.student_id ?? ''),           // siempre string
    date: r.fecha,                                   // ajusta si tu columna es 'date'
    type: r.tipo,
    amount: r.cantidad,
    note: r.nota ?? undefined,
    payer: (r.pagador ?? 'ns') as Payer,
    monthKey: r.clave_mes ?? undefined,
  }
}

function toDb(m: Partial<Movement>): Partial<MovementDb> {
  return {
    ...(m.studentId !== undefined ? { student_id: m.studentId } : {}),
    ...(m.date      !== undefined ? { fecha: m.date } : {}),
    ...(m.type      !== undefined ? { tipo: m.type } : {}),
    ...(m.amount    !== undefined ? { cantidad: m.amount } : {}),
    ...(m.note      !== undefined ? { nota: m.note ?? null } : {}),
    ...(m.payer     !== undefined ? { pagador: (m.payer ?? 'ns') as Payer } : {}),
    ...(m.monthKey  !== undefined ? { clave_mes: m.monthKey ?? null } : {}),
  }
}

// ====== LIST ======
export async function list(): Promise<Movement[]> {
  const { data, error } = await supabase
    .from('movimientos')
    .select('id, student_id, fecha, tipo, cantidad, nota, pagador, clave_mes')
    .order('fecha', { ascending: true })

  if (error) throw error
  return (data as MovementDb[] | null ?? []).map(toApp)
}

// ====== ADD ======
export async function add(m: Movement): Promise<Movement> {
  const payload = toDb(m)
  const { data, error } = await supabase
    .from('movimientos')
    .insert(payload)
    .select('id, student_id, fecha, tipo, cantidad, nota, pagador, clave_mes')
    .single()

  if (error) throw error
  return toApp(data as MovementDb)
}

// ====== REMOVE ======
export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('movimientos')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ====== Realtime opcional ======
export function subscribe(onChange: () => void): () => void {
  const channel = supabase
    .channel('rt-movimientos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos' }, () => onChange())
    .subscribe()

  return () => { try { supabase.removeChannel(channel) } catch {} }
}
