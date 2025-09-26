import { supabase } from '../supabase'

/* ===== Tipo que usa la APP (camelCase) ===== */
export type Student = {
  id?: number
  name: string
  active: boolean
  price?: number | null
  note?: string | null
  notes?: string | null
  nextClassNotes?: string | null
  color?: string | null
  age?: number | null
  grade?: string | null
  subjects?: string | null
  repeated?: boolean | null
  createdAt?: string | null
}

/* ===== Conversión BD ↔ App ===== */
function fromRow(r: any): Student {
  return {
    id: r.id,
    name: r.name,
    active: r.active,
    price: r.price == null ? null : Number(r.price),
    note: r.note ?? null,
    notes: r.notes ?? null,
    nextClassNotes: r.next_class_notes ?? null,
    color: r.color ?? null,
    age: r.age ?? null,
    grade: r.grade ?? null,
    subjects: r.subjects ?? null,
    repeated: r.repeated ?? null,
    createdAt: r.created_at ?? null,
  }
}

function toRow(s: Partial<Student>): any {
  return {
    ...(s.name !== undefined ? { name: s.name } : {}),
    ...(s.active !== undefined ? { active: s.active } : {}),
    ...(s.price !== undefined ? { price: s.price } : {}),
    ...(s.note !== undefined ? { note: s.note } : {}),
    ...(s.notes !== undefined ? { notes: s.notes } : {}),
    ...(s.nextClassNotes !== undefined ? { next_class_notes: s.nextClassNotes } : {}),
    ...(s.color !== undefined ? { color: s.color } : {}),
    ...(s.age !== undefined ? { age: s.age } : {}),
    ...(s.grade !== undefined ? { grade: s.grade } : {}),
    ...(s.subjects !== undefined ? { subjects: s.subjects } : {}),
    ...(s.repeated !== undefined ? { repeated: s.repeated } : {}),
  }
}

/* ===== CRUD ===== */
export async function listStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return (data || []).map(fromRow)
}

export async function createStudent(s: Omit<Student, 'id' | 'createdAt'>) {
  const { data, error } = await supabase
    .from('students')
    .insert(toRow(s))
    .select('*')
    .single()
  if (error) throw error
  return fromRow(data)
}

export async function updateStudent(id: number, s: Partial<Student>) {
  const { data, error } = await supabase
    .from('students')
    .update(toRow(s))
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return fromRow(data)
}

export async function deleteStudent(id: number) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/* ===== Realtime (auto-refresco entre dispositivos) ===== */
export function subscribeStudents(onChange: () => void) {
  const ch = supabase
    .channel('students-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, onChange)
    .subscribe()
  return () => supabase.removeChannel(ch)
}
