import { supabase } from '../supabaseClient'

export type ClaseRow = {
  id: number
  student_id: string        // uuid
  title: string
  start: string             // ISO (timestamptz)
  end: string               // ISO (timestamptz)
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
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const end   = new Date(start); end.setDate(end.getDate() + 1)

  const { data, error } = await supabase
    .from<ClaseRow>(TABLE)
    .select('*')
    .gte('start', start.toISOString())
    .lt('start', end.toISOString())
    .order('start', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Listado por mes (para pintar el calendario superior) */
export async function listByMonth(anyDateInMonth: Date) {
  const first = new Date(anyDateInMonth.getFullYear(), anyDateInMonth.getMonth(), 1)
  const nextM = new Date(first); nextM.setMonth(nextM.getMonth() + 1)

  const { data, error } = await supabase
    .from<ClaseRow>(TABLE)
    .select('*')
    .gte('start', first.toISOString())
    .lt('start', nextM.toISOString())

  if (error) throw error
  return data ?? []
}

/** Crear clase */
export async function createClase(input: NewClase) {
  const payload = {
    student_id: input.student_id,
    title: input.title ?? 'Clase',
    start: iso(input.start),
    end: iso(input.end),
  }
  const { data, error } = await supabase
    .from<ClaseRow>(TABLE)
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Actualizar clase */
export async function updateClase(id: number, patch: Partial<NewClase>) {
  const payload: any = {}
  if (patch.student_id != null) payload.student_id = patch.student_id
  if (patch.title != null)      payload.title = patch.title
  if (patch.start != null)      payload.start = iso(patch.start)
  if (patch.end != null)        payload.end   = iso(patch.end)

  const { data, error } = await supabase
    .from<ClaseRow>(TABLE)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Borrar clase */
export async function deleteClase(id: number) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

/** Suscripción realtime a inserciones/updates/deletes */
export function onClassesChanged(handler: (e: {type:'INSERT'|'UPDATE'|'DELETE', row: ClaseRow}) => void) {
  const channel = supabase
    .channel('realtime:public:clases')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload: any) => {
      handler({ type: payload.eventType, row: payload.new ?? payload.old })
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
