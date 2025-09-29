import { getSupabase } from "../lib/supabaseClient"

/** Esquema REAL en BD (usa "nombre") */
export type StudentRow = {
  id: string
  nombre: string | null
  fullname: string | null
  course: string | null
  age: number | null
  repeat: boolean | null
  subjects: string[] | string | null
  notes: string | null
  next_notes: string | null
  active: boolean | null
  created_at: string | null
}

/** Tipo para la app (acepta también "name") */
export type StudentApp = Partial<StudentRow> & { id: string } & { name?: string | null }

const TABLE = "alumnos"

/** Normaliza: copia name -> nombre y quita name antes de enviar a BD */
function normalizePayload(p: any): Partial<StudentRow> {
  const out: any = { ...p }
  if (out.nombre == null && out.name != null) out.nombre = out.name
  delete out.name
  return out as Partial<StudentRow>
}

/** Listar TODOS */
export async function list(): Promise<StudentApp[]> {
  const supa = await getSupabase()
  const { data, error } = await supa.from<StudentRow, StudentRow>(TABLE).select("*")
  if (error) throw error
  return (data ?? []).map(r => ({ ...r, name: r.nombre })) as StudentApp[]
}

/** Listar SOLO activos (true o null) */
export async function listActive(): Promise<StudentApp[]> {
  const supa = await getSupabase()
  const { data, error } = await supa
    .from<StudentRow, StudentRow>(TABLE)
    .select("*")
    .or("active.is.null,active.eq.true")
  if (error) throw error
  return (data ?? []).map(r => ({ ...r, name: r.nombre })) as StudentApp[]
}

/** Crear */
export async function create(payload: Partial<StudentRow> | { name?: string | null }) {
  const supa = await getSupabase()
  const clean = normalizePayload(payload)
  const { error } = await supa.from<StudentRow, StudentRow>(TABLE).insert([clean as StudentRow])
  if (error) throw error
}

/** Actualizar por id */
export async function update(id: string, changes: Partial<StudentRow> | { name?: string | null }) {
  const supa = await getSupabase()
  const clean = normalizePayload(changes)
  const { error } = await supa
    .from<StudentRow, StudentRow>(TABLE)
    .update(clean as Partial<StudentRow>)
    .eq("id", id)
  if (error) throw error
}

/** Eliminar por id */
export async function remove(id: string) {
  const supa = await getSupabase()
  const { error } = await supa.from<StudentRow, StudentRow>(TABLE).delete().eq("id", id)
  if (error) throw error
}
