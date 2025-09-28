// src/data/supaStudents.ts
// Helper Supabase para CRUD de alumnos (vista: public.alumnos_ui)

import { supabase } from './supaClient'   // 👈 reutilizamos el cliente único

const TABLE = 'alumnos_ui'

// ---- Tipos locales (mapeamos BD -> app) ----
// OJO: el id en Supabase es UUID => string
export type StudentDb = {
  id: string
  nombre: string
  activo: boolean
  precio: number | null
  nota: string | null
  created_at: string | null
}

// lo que usa la app
export type StudentApp = {
  id?: string
  name: string
  active: boolean
  price?: number | null
  note?: string | null
  createdAt?: string | null
}

// mapear fila de BD -> app
function toApp(r: StudentDb): StudentApp {
  return {
    id: r.id,
    name: r.nombre,
    active: r.activo,
    price: r.precio,
    note: r.nota,
    createdAt: r.created_at,
  }
}

// mapear app -> fila de BD (para insert/update)
function toDb(p: Partial<StudentApp>): Partial<StudentDb> {
  return {
    ...(p.name   !== undefined ? { nombre: p.name } : {}),
    ...(p.active !== undefined ? { activo: p.active } : {}),
    ...(p.price  !== undefined ? { precio: p.price ?? null } : {}),
    ...(p.note   !== undefined ? { nota: p.note ?? null } : {}),
  } as Partial<StudentDb>
}

// ========= CRUD =========

export async function list(): Promise<StudentApp[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, nombre, activo, precio, nota, created_at')
    .order('nombre', { ascending: true })

  if (error) throw error
  return (data ?? []).map(toApp)
}

export async function create(values: Partial<StudentApp>): Promise<StudentApp> {
  const payload = toDb(values)
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select('id, nombre, activo, precio, nota, created_at')
    .single()

  if (error) throw error
  return toApp(data as StudentDb)
}

export async function update(id: string, values: Partial<StudentApp>): Promise<StudentApp> {
  const payload = toDb(values)
  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq('id', id)
    .select('id, nombre, activo, precio, nota, created_at')
    .single()

  if (error) throw error
  return toApp(data as StudentDb)
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ========= Realtime (opcional) =========
export function subscribe(onChange: () => void) {
  const channel = supabase
    .channel('realtime-alumnos')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => onChange())
    .subscribe()

  return () => { try { supabase.removeChannel(channel) } catch {} }
}
