// src/data/supaClasses.ts
import { getSupabase } from '../lib/supabaseClient'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ClaseRow = {
  id: number
  student_id: string
  title: string
  start: string
  end: string
  created_at: string
}

export type NewClase = {
  student_id: string
  title?: string
  start: Date | string
  end: Date | string
}

const TABLE = 'clases'

function iso(x: Date | string) {
  return (x instanceof Date) ? x.toISOString() : x
}

/** Listado por día (UTC rango abierto/cerrado) */
export async function listByDay(day: Date) {
  const sb = await getSupabase()
  if (!sb) return []
  const supabase: SupabaseClient = sb

  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const end   = new Date(start); end.setDate(end.getDate() + 1)

  const { data, error } = await supabase
    .from(TABLE)
    .select<'*', ClaseRow>('*')
    .gte('start', start.toISOString())
    .lt('start', end.toISOString())
    .order('start', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Listado por mes (para pintar el calendario superior) */
export async function listByMonth(anyDateInMonth: Date) {
  const sb = await getSupabase()
  if (!sb) return []
  const supabase: SupabaseClient = sb

  const first = new Date(anyDateInMonth.getFullYear(), anyDateInMonth.getMonth(), 1)
  const nextM = new Date(first); nextM.setMonth(nextM.getMonth() + 1)

  const { data, error } = await supabase
    .from(TABLE)
    .select<'*', ClaseRow>('*')
    .gte('start', first.toISOString())
    .lt('start', nextM.toISOString())

  if (error) throw error
  return data ?? []
}

/** Crear clase */
export async function createClase(input: NewClase) {
  const sb = await getSupabase()
  if (!sb) throw new Error('Base de datos no configurada.')
  const supabase: SupabaseClient = sb

  const payload = {
    student_id: input.student_id,
    title: input.title ?? 'Clase',
    start: iso(input.start),
    end: iso(input.end),
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select<'*', ClaseRow>('*')
    .single()

  if (error) throw error
  return data
}

/** Actualizar clase */
export async function updateClase(id: number, patch: Partial<NewClase>) {
  const sb = await getSupabase()
  if (!sb) throw new Error('Base de datos no configurada.')
  const supabase: SupabaseClient = sb

  const payload: Partial<ClaseRow> = {}
  if (patch.student_id != null) payload.student_id = patch.student_id
  if (patch.title != null)      payload.title = patch.title
  if (patch.start != null)      payload.start = iso(patch.start)
  if (patch.end != null)        payload.end   = iso(patch.end)

  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq('id', id)
    .select<'*', ClaseRow>('*')
    .single()

  if (error) throw error
  return data
}

/** Borrar clase */
export async function deleteClase(id: number) {
  const sb = await getSupabase()
  if (!sb) throw new Error('Base de datos no configurada.')
  const supabase: SupabaseClient = sb

  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

/** Suscripción realtime */
export function onClassesChanged(
  handler: (e: { type: 'INSERT' | 'UPDATE' | 'DELETE'; row: ClaseRow }) => void
) {
  let unsub = () => {}

  ;(async () => {
    const sb = await getSupabase()
    if (!sb) return
    const supabase: SupabaseClient = sb

    const channel = supabase
      .channel('realtime:public:clases')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE },
        (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: any; old: any }) => {
          handler({
            type: payload.eventType,
            row: (payload.new ?? payload.old) as ClaseRow,
          })
        }
      )
      .subscribe()

    unsub = () => { supabase.removeChannel(channel) }
  })()

  return () => unsub()
}
