import { supabase } from "./supaClient"

/** Tablas: vista de lectura y tabla de escritura */
const TABLE_READ  = "alumnos_ui"
const TABLE_WRITE = "alumnos"

/** Filas BD (nombres en español) */
export type StudentDb = {
  id: string            // uuid
  nombre: string
  activo: boolean
  precio: number | null
  nota: string | null
  created_at: string | null
}

/** Tipo que usa la app (en inglés) */
export type StudentApp = {
  id?: string
  name: string
  active: boolean
  price?: number | null
  note?: string | null
  createdAt?: string | null
}

/** Mapeos */
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

function toDb(p: Partial<StudentApp>): Partial<StudentDb> {
  return {
    ...(p.name   !== undefined ? { nombre: p.name } : {}),
    ...(p.active !== undefined ? { activo: p.active } : {}),
    ...(p.price  !== undefined ? { precio: p.price ?? null } : {}),
    ...(p.note   !== undefined ? { nota: p.note ?? null } : {}),
  }
}

/** ===== CRUD ===== */

/** Lista para la app (lee de la vista) */
export async function list(): Promise<StudentApp[]> {
  const { data, error } = await supabase
    .from(TABLE_READ)
    .select("id, nombre, activo, precio, nota, created_at")
    .order("nombre", { ascending: true })

  if (error) throw error
  return (data ?? []).map(toApp)
}

/** Crear (escribe en la tabla real) */
export async function create(values: Partial<StudentApp>): Promise<StudentApp> {
  const payload = toDb(values)
  const { data, error } = await supabase
    .from(TABLE_WRITE)
    .insert(payload)
    .select("id, nombre, activo, precio, nota, created_at")
    .single()

  if (error) throw error
  return toApp(data as StudentDb)
}

/** Actualizar (tabla real) */
export async function update(id: string, values: Partial<StudentApp>): Promise<StudentApp> {
  const payload = toDb(values)
  const { data, error } = await supabase
    .from(TABLE_WRITE)
    .update(payload)
    .eq("id", id)
    .select("id, nombre, activo, precio, nota, created_at")
    .single()

  if (error) throw error
  return toApp(data as StudentDb)
}

/** Borrar (tabla real) */
export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE_WRITE)
    .delete()
    .eq("id", id)

  if (error) throw error
}

/** Opciones para selects (solo activos) */
export type StudentOption = { value: string; label: string }

export async function listActiveOptions(): Promise<StudentOption[]> {
  const { data, error } = await supabase
    .from(TABLE_READ)
    .select("id, nombre, activo")
    .eq("activo", true)
    .order("nombre", { ascending: true })

  if (error) throw error
  return (data ?? [])
    .filter((r: any) => r.activo === true)
    .map((r: any) => ({ value: r.id as string, label: r.nombre as string }))
}
