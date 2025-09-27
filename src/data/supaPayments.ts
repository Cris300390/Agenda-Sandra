import { supa } from "./supaClient"

export type MovementType = "debt" | "payment"
export type Payer = "madre" | "padre" | "alumno" | "ns"

export type Movement = {
  id?: number
  studentId?: number       // ← number como alumnos.id
  date: string             // ISO
  type: MovementType
  amount: number
  note?: string
  payer?: Payer
  monthKey?: string
}

function mapRow(r: any): Movement {
  return {
    id: r.id,
    studentId: r.student_id ?? r.studentId,
    date: r.date,
    type: r.type,
    amount: Number(r.amount ?? 0),
    note: r.note ?? undefined,
    payer: (r.payer ?? "ns") as Payer,
    monthKey: r.month_key ?? r.monthKey ?? undefined,
  }
}

export async function list(): Promise<Movement[]> {
  const { data, error } = await supa
    .from("movimientos")
    .select("*")
    .order("date", { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function add(m: Movement): Promise<Movement> {
  const payload = {
    student_id: m.studentId ?? null,
    date: m.date,
    type: m.type,
    amount: m.amount,
    note: m.note ?? null,
    payer: m.payer ?? "ns",
    month_key: m.monthKey ?? null,
  }
  const { data, error } = await supa
    .from("movimientos")
    .insert(payload)
    .select("*")
    .single()
  if (error) throw error
  return mapRow(data)
}

export async function remove(id: number): Promise<void> {
  const { error } = await supa.from("movimientos").delete().eq("id", id)
  if (error) throw error
}

export function subscribe(cb: (kind: "change") => void) {
  const ch = supa
    .channel("movs-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "movimientos" },
      () => cb("change")
    )
    .subscribe()
  return () => { try { supa.removeChannel(ch) } catch {} }
}
