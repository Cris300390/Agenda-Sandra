import { useEffect, useState } from "react"
import {
  list as listStudents,
  create as createStudent,
  update as updateStudent,
  remove as removeStudentApi,
  type StudentApp as Student,
  type StudentRow
} from "../data/supaStudents"
import { getSupabase } from "../lib/supabaseClient"

/* ===== estilos ===== */
const btn: React.CSSProperties = { background:"var(--brand,#ec4899)", color:"#fff", border:"none", padding:"8px 12px", borderRadius:12, boxShadow:"0 2px 6px rgba(0,0,0,.08)", cursor:"pointer" }
const chip: React.CSSProperties = { background:"#eef2ff", color:"#4338ca", padding:"4px 8px", borderRadius:999, fontSize:12 }
const muted: React.CSSProperties = { color:"var(--muted,#6b7280)" }

function labelOf(s: Student) {
  return ((s as any).name ?? (s as any).nombre ?? (s as any).fullname ?? "").trim() || "Sin nombre"
}

/* ===== Modal sencillo ===== */
function Modal({open,title,onClose,children,footer}:{open:boolean;title:string;onClose:()=>void;children:React.ReactNode;footer?:React.ReactNode}) {
  if (!open) return null
  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,.3)", display:"grid", placeItems:"center", zIndex:9999}}>
      <div style={{width:"min(640px,92vw)", background:"#fff", borderRadius:16, boxShadow:"0 20px 60px rgba(0,0,0,.2)", padding:16}}>
        <header style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
          <h3 style={{margin:0}}>{title}</h3>
          <button onClick={onClose} style={{...btn, background:"#e5e7eb", color:"#111827"}}>Cerrar</button>
        </header>
        <div style={{maxHeight:"65vh", overflow:"auto", paddingRight:4}}>{children}</div>
        {footer ? <footer style={{marginTop:12}}>{footer}</footer> : null}
      </div>
    </div>
  )
}

/* ===== Formulario ===== */
type FormState = {
  name: string
  course: string
  age: string
  repeat: boolean
  subjects: string
  notes: string
  next_notes: string
  active: boolean
}
function toForm(s?: Student): FormState {
  const display = ((s as any)?.name ?? (s as any)?.nombre ?? (s as any)?.fullname ?? "") || ""
  return {
    name: display,
    course: (s as any)?.course ?? "",
    age: (s as any)?.age != null ? String((s as any).age) : "",
    repeat: Boolean((s as any)?.repeat),
    subjects: Array.isArray((s as any)?.subjects)
      ? ((s as any).subjects as string[]).join(", ")
      : (((s as any)?.subjects as string) ?? ""),
    notes: (s as any)?.notes ?? "",
    next_notes: (s as any)?.next_notes ?? "",
    active: (s as any)?.active !== false
  }
}
function fromForm(f: FormState): Partial<StudentRow> {
  return {
    nombre: f.name.trim() || null,      // guardamos en la columna real
    course: f.course.trim() || null,
    age: f.age ? Number(f.age) : null,
    repeat: Boolean(f.repeat),
    subjects: f.subjects ? f.subjects.split(",").map(x => x.trim()).filter(Boolean) : null,
    notes: f.notes.trim() || null,
    next_notes: f.next_notes.trim() || null,
    active: f.active
  }
}

/* ===== Página ===== */
export default function Alumnos() {
  const [items, setItems] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState<FormState>(toForm())
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      setLoading(true)
      const data = await listStudents()
      data.sort((a,b)=>labelOf(a).localeCompare(labelOf(b),"es",{sensitivity:"base"}))
      setItems(data)
      setError(null)
    } catch (e:any) {
      setError(e?.message ?? "Error al cargar alumnos")
    } finally { setLoading(false) }
  }
  useEffect(()=>{ load() }, [])

  function openNew(){ setEditing(null); setForm(toForm()); setOpen(true) }
  function openEdit(s: Student){ setEditing(s); setForm(toForm(s)); setOpen(true) }

  async function onSave(){
    setSaving(true)
    try{
      if (editing) await updateStudent(editing.id, fromForm(form))
      else         await createStudent(fromForm(form))
      setOpen(false)
      await load()
    }catch(e:any){
      alert(e?.message ?? "No se pudo guardar")
    }finally{ setSaving(false) }
  }

  async function toggleActive(s: Student){
    try{
      const supa = await getSupabase()
      const { error } = await supa
        .from<StudentRow, StudentRow>("alumnos")
        .update({ active: !(s.active !== false) } as Partial<StudentRow>)
        .eq("id", s.id)
      if (error) throw error
      await load()
    }catch(e:any){
      alert(e?.message ?? "No se pudo cambiar el estado")
    }
  }

  async function removeStudent(id: string){
    if (!confirm("¿Eliminar este alumno? Esta acción no se puede deshacer.")) return
    try{
      await removeStudentApi(id)
      await load()
    }catch(e:any){ alert(e?.message ?? "No se pudo eliminar") }
  }

  if (loading) return <p style={{padding:12}}>Cargando alumnos…</p>
  if (error)   return <p style={{padding:12, color:"#ef4444"}}>Error: {error}</p>

  return (
    <section>
      <header style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
        <h2 style={{margin:0}}>Alumnos</h2>
        <button onClick={openNew} style={btn}>Nuevo alumno</button>
      </header>

      {!items.length ? (
        <div style={{padding:12}}>
          <p>No hay alumnos aún.</p>
          <button onClick={openNew} style={btn}>Crear alumno</button>
        </div>
      ) : (
        <div style={{display:"grid", gap:12}}>
          {items.map((a) => {
            const nombre = labelOf(a)
            const course = (a as any).course as string || ""
            const age    = (a as any).age as number | undefined
            const repeat = (a as any).repeat as boolean | undefined
            const subjectsArr: string[] =
              Array.isArray((a as any).subjects)
                ? ((a as any).subjects as string[])
                : (a as any).subjects
                ? String((a as any).subjects).split(",").map(s=>s.trim()).filter(Boolean)
                : []
            const notes = (a as any).notes as string || ""
            const next  = (a as any).next_notes as string || ""
            const active = (a as any).active !== false

            const pills: string[] = []
            if (course) pills.push(course)
            if (typeof age === "number") pills.push(`${age} años`)
            if (repeat === true) pills.push("Repite curso")

            return (
              <article key={a.id} style={{background:"var(--card,#fff)", borderRadius:18, boxShadow:"var(--shadow,0 10px 30px rgba(17,24,39,.08))", padding:14}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:8}}>
                  <div>
                    <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
                      <strong style={{fontSize:"1.05rem", color:"var(--text,#1f2937)"}}>{nombre}</strong>
                      <span style={{padding:"2px 10px", borderRadius:999, fontSize:12, background: active ? "var(--ok,#10b981)" : "var(--danger,#ef4444)", color:"#fff"}}>
                        {active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    {pills.length ? (
                      <div style={{display:"flex", gap:6, flexWrap:"wrap", marginTop:6}}>
                        {pills.map((p, i)=> (<span key={i} style={chip}>{p}</span>))}
                      </div>
                    ) : null}
                  </div>

                  <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                    <button onClick={()=>openEdit(a)} style={btn}>Editar</button>
                    <button onClick={()=>toggleActive(a)} style={{...btn, background: active ? "var(--warn,#f59e0b)" : "var(--ok,#10b981)"}}>
                      {active ? "Desactivar" : "Activar"}
                    </button>
                    <button onClick={()=>removeStudent(a.id)} style={{...btn, background:"var(--danger,#ef4444)"}}>Eliminar</button>
                  </div>
                </div>

                {(subjectsArr.length || notes || next) ? (
                  <div style={{marginTop:10, display:"grid", gap:8}}>
                    {subjectsArr.length ? (
                      <div>
                        <small style={muted}>Materias</small>
                        <div style={{display:"flex", gap:6, flexWrap:"wrap", marginTop:4}}>
                          {subjectsArr.map((s,i)=>(<span key={i} style={chip}>{s}</span>))}
                        </div>
                      </div>
                    ) : null}
                    {notes ? (
                      <div>
                        <small style={muted}>Notas</small>
                        <p style={{margin:"4px 0 0 0"}}>{notes}</p>
                      </div>
                    ) : null}
                    {next ? (
                      <div>
                        <small style={muted}>Para la próxima clase</small>
                        <p style={{margin:"4px 0 0 0"}}>{next}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={open}
        title={editing ? "Editar alumno" : "Nuevo alumno"}
        onClose={()=>setOpen(false)}
        footer={
          <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
            <button onClick={()=>setOpen(false)} style={{...btn, background:"#e5e7eb", color:"#111827"}}>Cancelar</button>
            <button onClick={onSave} disabled={saving} style={btn}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        }
      >
        <form onSubmit={(e)=>{e.preventDefault(); onSave()}} style={{display:"grid", gap:10}}>
          <label>Nombre
            <input value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))}
                   style={{display:"block", width:"100%", padding:8, marginTop:4}} required />
          </label>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
            <label>Curso
              <input value={form.course} onChange={e=>setForm(f=>({...f, course:e.target.value}))}
                     style={{display:"block", width:"100%", padding:8, marginTop:4}} />
            </label>
            <label>Edad
              <input type="number" min={3} max={25} value={form.age}
                     onChange={e=>setForm(f=>({...f, age:e.target.value}))}
                     style={{display:"block", width:"100%", padding:8, marginTop:4}} />
            </label>
          </div>

          <label style={{display:"flex", gap:8, alignItems:"center"}}>
            <input type="checkbox" checked={form.repeat}
                   onChange={e=>setForm(f=>({...f, repeat:e.target.checked}))}/>
            Repite curso
          </label>

          <label>Materias (separadas por coma)
            <input value={form.subjects} onChange={e=>setForm(f=>({...f, subjects:e.target.value}))}
                   placeholder="Matemáticas, Lengua…" style={{display:"block", width:"100%", padding:8, marginTop:4}} />
          </label>

          <label>Notas
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))}
                      rows={3} style={{display:"block", width:"100%", padding:8, marginTop:4}} />
          </label>

          <label>Para la próxima clase
            <textarea value={form.next_notes} onChange={e=>setForm(f=>({...f, next_notes:e.target.value}))}
                      rows={3} style={{display:"block", width:"100%", padding:8, marginTop:4}} />
          </label>

          <label style={{display:"flex", gap:8, alignItems:"center"}}>
            <input type="checkbox" checked={form.active}
                   onChange={e=>setForm(f=>({...f, active:e.target.checked}))}/>
            Activo
          </label>
        </form>
      </Modal>
    </section>
  )
}
