import { supabase } from "./supaClient"

const TABLE = "alumnos_ui"

export type StudentDb = {
  id: string
  nombre: string
  activo: boolean
  precio: number | null
  nota: string | null
  created_at: string | null
}

export type StudentApp = {
  id?: string
  name: string
  active: boolean
  price?: number | null
  note?: string | null
  createdAt?: string | null
}

// map BD -> app
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

// listar todos (ordenados por nombre)
export async function list(): Promise<StudentApp[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, nombre, activo, precio, nota, created_at")
    .order("nombre", { ascending: true })

  if (error) throw error
  return (data ?? []).map(toApp)
}

// opciones para selects (solo activos)
export type StudentOption = { value: string; label: string; active: boolean }
export async function listActiveOptions(): Promise<StudentOption[]> {
  const items = await list()
  return items
    .filter(s => s.active === true)
    .map(s => ({ value: s.id!, label: s.name, active: s.active }))
}

export type StudentOption = { value: string; label: string }

/** Opciones de alumnos activos (ordenados por nombre) */
export async function listActiveOptions(): Promise<StudentOption[]> {
  const rows = await list()
  return rows
    .filter(s => s.active)
    .sort((a,b)=>a.name.localeCompare(b.name))
    .map(s => ({ value: s.id!, label: s.name }))
}
