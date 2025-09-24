// src/pages/Alumnos.tsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import type { Student } from '../db'
import { useToast } from '../ui/Toast'

type FilterTab = 'all' | 'active' | 'inactive'
type StudentAny = Student & Record<string, any>

export default function AlumnosPage() {
  const toast = useToast()

  const [all, setAll] = useState<StudentAny[]>([])
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<FilterTab>('all')

  // Modal de formulario (crear/editar)
  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<StudentAny | null>(null)

  // Campos del formulario
  const [fName, setFName] = useState('')
  const [fSubjects, setFSubjects] = useState('')
  const [fPhone, setFPhone] = useState('')
  const [fContact, setFContact] = useState('')
  const [fPrice, setFPrice] = useState('')
  const [fNote, setFNote] = useState('')
  const [fActive, setFActive] = useState(true)

  async function load() {
    const rows: StudentAny[] = await (db as any).students.toArray()
    rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'))
    setAll(rows)
  }
  useEffect(() => { load() }, [])

  // Bloquea scroll del fondo al abrir el modal
  useEffect(() => {
    if (openForm) document.body.classList.add('body-lock')
    else document.body.classList.remove('body-lock')
    return () => document.body.classList.remove('body-lock')
  }, [openForm])

  const counts = useMemo(() => {
    const total = all.length
    const activos = all.filter(s => isActive(s)).length
    const inactivos = total - activos
    return { total, activos, inactivos }
  }, [all])

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase()
    return all.filter(s => {
      if (tab === 'active' && !isActive(s)) return false
      if (tab === 'inactive' && isActive(s)) return false
      if (!qn) return true
      const parts = [
        String(s.name || ''),
        ...getSubjects(s),
        String(s.note || s.nota || ''),
        String(s.contact || s.tutor || ''),
        String(s.phone || s.telefono || ''),
      ]
      return parts.join(' ').toLowerCase().includes(qn)
    })
  }, [all, tab, q])

  // ===== helpers =====
  function isActive(s: StudentAny): boolean {
    if (typeof s.active === 'boolean') return s.active
    if (typeof s.isActive === 'boolean') return s.isActive
    return true
  }
  function getSubjects(s: StudentAny): string[] {
    const subj = s.subjects ?? s.materias ?? s.materia ?? []
    if (Array.isArray(subj)) return subj.filter(Boolean)
    if (typeof subj === 'string' && subj.trim()) return subj.split(',').map((x: string) => x.trim()).filter(Boolean)
    return []
  }
  function parseSubjects(txt: string): string[] {
    return txt.split(',').map(t => t.trim()).filter(Boolean)
  }
  function getTarifa(s: StudentAny): string {
    const price = s.price ?? s.precio ?? s.tarifa
    if (price === undefined || price === null || price === '') return '—'
    try { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(price)) }
    catch { return String(price) }
  }
  function parsePrice(txt: string): number | null {
    const clean = txt.replace(/\./g, '').replace(',', '.').trim()
    if (!clean) return null
    const n = Number(clean)
    return isNaN(n) ? null : n
  }

  function openCreate() {
    setEditing(null)
    setFName('')
    setFSubjects('')
    setFPhone('')
    setFContact('')
    setFPrice('')
    setFNote('')
    setFActive(true)
    setOpenForm(true)
  }

  function openEdit(s: StudentAny) {
    setEditing(s)
    setFName(s.name ?? '')
    setFSubjects(getSubjects(s).join(', '))
    setFPhone(s.phone ?? s.telefono ?? '')
    setFContact(s.contact ?? s.tutor ?? '')
    const price = s.price ?? s.precio ?? s.tarifa
    setFPrice(price != null && price !== '' ? String(price) : '')
    setFNote(s.note ?? s.nota ?? '')
    setFActive(isActive(s))
    setOpenForm(true)
  }

  async function onToggleActive(s: StudentAny) {
    const next = !isActive(s)
    await (db as any).students.update(s.id as number, { active: next, isActive: next })
    toast.info(next ? 'Alumno activado' : 'Alumno desactivado', s.name || '')
    await load()
  }

  async function onDelete(s: StudentAny) {
    const ok = await toast.confirm({
      title: 'Eliminar alumno',
      message: `¿Eliminar a “${s.name}”? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      tone: 'danger',
    })
    if (!ok) return
    await (db as any).students.delete(s.id as number)
    toast.success('Alumno eliminado', s.name || '')
    await load()
  }

  async function onSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    const name = fName.trim()
    if (!name) { toast.error('El nombre es obligatorio'); return }

    const subjects = parseSubjects(fSubjects)
    const priceNum = parsePrice(fPrice)
    const phone = fPhone.trim()
    const contact = fContact.trim()
    const note = fNote.trim()

    if (editing) {
      const updates: any = {
        name, active: fActive, isActive: fActive,
        subjects,
        phone: phone || undefined,
        contact: contact || undefined,
        price: priceNum ?? undefined,
        note: note || undefined,
      }
      await (db as any).students.update(editing.id as number, updates)
      toast.success('Cambios guardados', name)
    } else {
      const newStudent: any = {
        name, active: fActive, isActive: fActive,
        subjects, createdAt: new Date().toISOString(),
        ...(phone ? { phone } : {}),
        ...(contact ? { contact } : {}),
        ...(priceNum != null ? { price: priceNum } : {}),
        ...(note ? { note } : {}),
      }
      await (db as any).students.add(newStudent)
      toast.success('Alumno creado', name)
    }

    setOpenForm(false)
    await load()
  }

  // ===== estilos (renombrados para no chocar con el header global) =====
  const css = `
    .alumnos-wrap { display:grid; gap: 16px; }
    .alumnos-toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:10px; }
    .alumnos-toolbar-right { margin-left:auto; display:flex; gap:8px; }
    .muted { color:#6b7280; }

    .tabs { display:flex; gap:8px; }
    .chip-tab { border:1px solid #e5e7eb; background:#fff; border-radius:999px; padding:8px 12px; cursor:pointer; }
    .chip-tab--active { background:#f0f9ff; border-color:#bae6fd; }

    .search { min-width: 260px; flex: 1 1 auto; }
    .search input { width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:12px; }

    .btn { border:1px solid #e5e7eb; background:#fff; border-radius:12px; padding:8px 12px; cursor:pointer; }
    .btn:hover{ background:#f8fafc; }
    .btn-danger{ background:#fee2e2; color:#b91c1c; border-color:#fecaca; }
    .btn-primary{ background:linear-gradient(135deg,#f472b6 0%,#ec4899 100%); color:#fff; border-color:#f59fbc; box-shadow:0 6px 20px rgba(236,72,153,.35);}

    .grid { display:grid; gap:14px; grid-template-columns: repeat(2, minmax(0,1fr)); }
    @media (max-width: 900px){ .grid { grid-template-columns: 1fr; } }

    .card {
      position: relative;
      background:#fff;
      border:1px solid #eef2f7;
      border-radius:16px;
      padding:14px;
      box-shadow:0 10px 20px rgba(0,0,0,.05);
      display:grid; gap:10px;
    }
    .status-bar {
      position:absolute; left:0; top:0; bottom:0; width:4px;
      background:linear-gradient(to bottom, #22c55e, #10b981);
      border-top-left-radius:16px; border-bottom-left-radius:16px;
    }
    .status-bar.inactive { background:linear-gradient(to bottom, #f43f5e, #ef4444); }

    .card-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .name { font-weight:800; font-size:18px; }
    .badges { display:flex; gap:6px; flex-wrap:wrap; }
    .badge { padding:4px 8px; border-radius:999px; font-size:12px; font-weight:700; border:1px solid #e5e7eb; background:#fff; }
    .badge--active { background:#dcfce7; color:#065f46; border-color:#bbf7d0; }
    .badge--inactive { background:#fee2e2; color:#b91c1c; border-color:#fecaca; }

    .subjects { display:flex; flex-wrap:wrap; gap:6px; }
    .pill { padding:6px 10px; border-radius:999px; background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe; font-weight:700; font-size:12px; }

    .info { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:10px; }
    .info-item { background:#f9fafb; border:1px solid #eef2f7; border-radius:12px; padding:8px 10px; min-height:44px; }
    .info-item h5 { margin:0 0 4px; font-size:11px; color:#64748b; }
    .info-item p { margin:0; font-weight:700; color:#0f172a; }

    .actions { display:flex; gap:8px; flex-wrap:wrap; }

    /* Modal SIEMPRE por encima */
    .backdrop{
      position:fixed; inset:0;
      background:rgba(0,0,0,.25);
      -webkit-backdrop-filter: blur(2px);
      backdrop-filter: blur(2px);
      z-index:10020;
    }
    .modal{
      position:fixed; left:50%; top:50%;
      transform:translate(-50%,-50%);
      width:min(720px, 92vw);
      background:#fff; border:1px solid #eee; border-radius:16px;
      padding:16px; box-shadow:0 25px 50px rgba(0,0,0,.25);
      z-index:10030;
      display:grid; gap:12px;
    }
    .form-grid{ display:grid; gap:10px; grid-template-columns: 1fr 1fr; }
    .form-grid .full{ grid-column: 1 / -1; }
    .field{ display:grid; gap:6px; }
    .field input, .field textarea, .field select{ width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:12px; }
    .modal-actions{ display:flex; justify-content:flex-end; gap:8px; }
  `

  return (
    <div className="alumnos-wrap">
      <style>{css}</style>

      {/* Toolbar (renombrada) */}
      <div className="alumnos-toolbar">
        <div className="muted">
          <strong>{counts.total}</strong> en total · <strong>{counts.activos}</strong> activos · <strong>{counts.inactivos}</strong> inactivos
        </div>

        <div className="search">
          <input
            placeholder="Buscar por nombre, materia, nota..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="tabs">
          <button className={`chip-tab ${tab==='all'?'chip-tab--active':''}`} onClick={() => setTab('all')}>Todos</button>
          <button className={`chip-tab ${tab==='active'?'chip-tab--active':''}`} onClick={() => setTab('active')}>Activos</button>
          <button className={`chip-tab ${tab==='inactive'?'chip-tab--active':''}`} onClick={() => setTab('inactive')}>Inactivos</button>
        </div>

        <div className="alumnos-toolbar-right">
          <button className="btn btn-primary" onClick={openCreate}>Nuevo alumno</button>
        </div>
      </div>

      {/* Lista de alumnos */}
      <div className="grid">
        {filtered.map(s => {
          const active = isActive(s)
          const subjects = getSubjects(s)
          const phone = s.phone ?? s.telefono ?? '—'
          const contact = s.contact ?? s.tutor ?? '—'
          const price = getTarifa(s)
          const note = s.note ?? s.nota ?? '—'

          return (
            <article key={String(s.id)} className="card">
              <div className={`status-bar ${active ? '' : 'inactive'}`} />
              <header className="card-head">
                <div className="name">{s.name || 'Sin nombre'}</div>
                <div className="badges">
                  <span className={`badge ${active ? 'badge--active':'badge--inactive'}`}>{active ? 'Activo' : 'Inactivo'}</span>
                </div>
              </header>

              <div className="subjects">
                {subjects.length > 0
                  ? subjects.map((subj, i) => <span key={i} className="pill">{subj}</span>)
                  : <span className="muted">Sin materias</span>}
              </div>

              <section className="info">
                <div className="info-item"><h5>Teléfono</h5><p>{phone}</p></div>
                <div className="info-item"><h5>Contacto</h5><p>{contact}</p></div>
                <div className="info-item"><h5>Tarifa</h5><p>{price}</p></div>
                <div className="info-item"><h5>Nota</h5><p>{note}</p></div>
              </section>

              <footer className="actions">
                <button className="btn" onClick={() => openEdit(s)}>Editar</button>
                <button className="btn" onClick={() => onToggleActive(s)}>{active ? 'Desactivar' : 'Activar'}</button>
                <button className="btn btn-danger" onClick={() => onDelete(s)}>Eliminar</button>
              </footer>
            </article>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="muted">No hay alumnos que coincidan con el filtro/búsqueda.</p>
      )}

      {/* Modal crear/editar */}
      {openForm && (
        <>
          <div className="backdrop" onClick={() => setOpenForm(false)} />
          <form className="modal" onSubmit={onSubmitForm}>
            <h3 style={{margin:0}}>{editing ? 'Editar alumno' : 'Nuevo alumno'}</h3>

            <div className="form-grid">
              <div className="field full">
                <label>Nombre *</label>
                <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Nombre y apellidos" autoFocus />
              </div>

              <div className="field full">
                <label>Materias</label>
                <input
                  value={fSubjects}
                  onChange={(e) => setFSubjects(e.target.value)}
                  placeholder="Matemáticas, Lengua, Inglés…"
                />
              </div>

              <div className="field">
                <label>Teléfono</label>
                <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="600 123 456" />
              </div>

              <div className="field">
                <label>Contacto (madre/padre/tutor)</label>
                <input value={fContact} onChange={(e) => setFContact(e.target.value)} placeholder="María (madre)" />
              </div>

              <div className="field">
                <label>Tarifa (€ / hora)</label>
                <input inputMode="decimal" value={fPrice} onChange={(e) => setFPrice(e.target.value)} placeholder="12,00" />
              </div>

              <div className="field">
                <label>Estado</label>
                <select value={String(fActive)} onChange={(e) => setFActive(e.target.value === 'true')}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>

              <div className="field full">
                <label>Nota</label>
                <textarea rows={3} value={fNote} onChange={(e) => setFNote(e.target.value)} placeholder="Observaciones, objetivos, material..." />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setOpenForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Guardar cambios' : 'Guardar'}</button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

