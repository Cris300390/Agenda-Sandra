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

  // Campos del formulario (¡solo nombre, tarifa, estado y nota!)
  const [fName, setFName] = useState('')
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
        String(s.note || s.nota || ''),        // buscador por nota
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
  function parsePrice(txt: string): number | null {
    const clean = txt.replace(/\./g, '').replace(',', '.').trim()
    if (!clean) return null
    const n = Number(clean)
    return isNaN(n) ? null : n
  }

  function openCreate() {
    setEditing(null)
    setFName('')
    setFPrice('')
    setFNote('')
    setFActive(true)
    setOpenForm(true)
  }

  function openEdit(s: StudentAny) {
    setEditing(s)
    setFName(s.name ?? '')
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

    const priceNum = parsePrice(fPrice)
    const note = fNote.trim()

    if (editing) {
      // EDITAR
      const updates: any = {
        name,
        active: fActive,
        isActive: fActive,
        price: priceNum ?? undefined,
        note: note || undefined,
      }
      await (db as any).students.update(editing.id as number, updates)
      toast.success('Cambios guardados', name)
    } else {
      // CREAR
      const newStudent: any = {
        name,
        active: fActive,
        isActive: fActive,
        createdAt: new Date().toISOString(),
        ...(priceNum != null ? { price: priceNum } : {}),
        ...(note ? { note } : {}),
      }
      await (db as any).students.add(newStudent)
      toast.success('Alumno creado', name)
    }

    setOpenForm(false)
    await load()
  }

  // ===== estilos (ajustes de nota y layout) =====
  const css = `
    .alumnos-wrap { display:grid; gap: 16px; }

    .al-toolbar { 
      display:flex; flex-wrap:wrap; align-items:center; gap:10px;
      background:#fff; border:1px solid #eef2f7; border-radius:16px; padding:12px;
      box-shadow:0 8px 18px rgba(0,0,0,.06);
    }
    .al-toolbar-right { margin-left:auto; display:flex; gap:8px; }
    .al-muted { color:#6b7280; }

    .al-tabs { display:flex; gap:8px; }
    .al-chip { border:1px solid #e5e7eb; background:#fff; border-radius:999px; padding:8px 12px; cursor:pointer; }
    .al-chip--active { background:#f0f9ff; border-color:#bae6fd; }

    .al-search { min-width: 260px; flex: 1 1 auto; }
    .al-search input { width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:12px; }

    .btn { border:1px solid #e5e7eb; background:#fff; border-radius:12px; padding:8px 12px; cursor:pointer; }
    .btn:hover{ background:#f8fafc; }
    .btn-danger{ background:#fee2e2; color:#b91c1c; border-color:#fecaca; }
    .btn-primary{ background:linear-gradient(135deg,#f472b6 0%,#ec4899 100%); color:#fff; border-color:#f59fbc; box-shadow:0 6px 20px rgba(236,72,153,.35);}

    .al-grid { display:grid; gap:14px; grid-template-columns: repeat(2, minmax(0,1fr)); }
    @media (max-width: 900px){ .al-grid { grid-template-columns: 1fr; } }

    .al-card {
      position: relative;
      background:#fff;
      border:1px solid #eef2f7;
      border-radius:16px;
      padding:14px;
      box-shadow:0 10px 20px rgba(0,0,0,.05);
      display:grid; gap:10px;
    }
    .al-status {
      position:absolute; left:0; top:0; bottom:0; width:4px;
      background:linear-gradient(to bottom, #22c55e, #10b981);
      border-top-left-radius:16px; border-bottom-left-radius:16px;
    }
    .al-status.inactive { background:linear-gradient(to bottom, #f43f5e, #ef4444); }

    .al-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .al-name { font-weight:800; font-size:18px; }
    .al-badges { display:flex; gap:6px; flex-wrap:wrap; }
    .al-badge { padding:4px 8px; border-radius:999px; font-size:12px; font-weight:700; border:1px solid #e5e7eb; background:#fff; }
    .al-badge--active { background:#dcfce7; color:#065f46; border-color:#bbf7d0; }
    .al-badge--inactive { background:#fee2e2; color:#b91c1c; border-color:#fecaca; }

    .al-info { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:10px; }
    @media (max-width: 680px){ .al-info { grid-template-columns: 1fr; } }
    .al-info-item { background:#f9fafb; border:1px solid #eef2f7; border-radius:12px; padding:8px 10px; min-height:44px; }
    .al-info-item h5 { margin:0 0 4px; font-size:11px; color:#64748b; }
    /* 👉 la nota se muestra dentro y con saltos de línea */
    .al-info-item p { margin:0; font-weight:700; color:#0f172a; white-space:pre-wrap; overflow-wrap:break-word; word-break:break-word; }

    .al-actions { display:flex; gap:8px; flex-wrap:wrap; }

    /* Modal */
    .al-backdrop{
      position:fixed; inset:0;
      background:rgba(0,0,0,.25);
      -webkit-backdrop-filter: blur(2px);
      backdrop-filter: blur(2px);
      z-index:10020;
    }
    .al-modal{
      position:fixed; left:50%; top:50%;
      transform:translate(-50%,-50%);
      width:min(720px, 92vw);
      background:#fff; border:1px solid #eee; border-radius:16px;
      padding:16px; box-shadow:0 25px 50px rgba(0,0,0,.25);
      z-index:10030;
      display:grid; gap:12px;
    }
    .al-form-grid{ display:grid; gap:10px; grid-template-columns: 1fr 1fr; }
    .al-form-grid .full{ grid-column: 1 / -1; }
    .al-field{ display:grid; gap:6px; }
    .al-field input, .al-field textarea, .al-field select{ width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:12px; }
    .al-field textarea{ resize:vertical; min-height:96px; }
    .al-modal-actions{ display:flex; justify-content:flex-end; gap:8px; }
  `

  return (
    <div className="alumnos-wrap page--withHeader">
      <style>{css}</style>

      {/* Toolbar */}
      <div className="al-toolbar">
        <div className="al-muted">
          <strong>{counts.total}</strong> en total · <strong>{counts.activos}</strong> activos · <strong>{counts.inactivos}</strong> inactivos
        </div>

        <div className="al-search">
          <input
            placeholder="Buscar por nombre o nota…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="al-tabs">
          <button className={`al-chip ${tab==='all'?'al-chip--active':''}`} onClick={() => setTab('all')}>Todos</button>
          <button className={`al-chip ${tab==='active'?'al-chip--active':''}`} onClick={() => setTab('active')}>Activos</button>
          <button className={`al-chip ${tab==='inactive'?'al-chip--active':''}`} onClick={() => setTab('inactive')}>Inactivos</button>
        </div>

        <div className="al-toolbar-right">
          <button className="btn btn-primary" onClick={openCreate}>Nuevo alumno</button>
        </div>
      </div>

      {/* Lista */}
      <div className="al-grid">
        {filtered.map(s => {
          const active = isActive(s)
          const price = s.price ?? s.precio ?? s.tarifa
          const priceTxt = price == null || price === '' ? '—' :
            new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(price))
          const note = s.note ?? s.nota ?? '—'

          return (
            <article key={String(s.id)} className="al-card">
              <div className={`al-status ${active ? '' : 'inactive'}`} />
              <header className="al-head">
                <div className="al-name">{s.name || 'Sin nombre'}</div>
                <div className="al-badges">
                  <span className={`al-badge ${active ? 'al-badge--active':'al-badge--inactive'}`}>{active ? 'Activo' : 'Inactivo'}</span>
                </div>
              </header>

              <section className="al-info">
                <div className="al-info-item"><h5>Tarifa</h5><p>{priceTxt}</p></div>
                <div className="al-info-item"><h5>Nota</h5><p>{note}</p></div>
                <div className="al-info-item"><h5>Creado</h5><p>{s.createdAt ? new Date(s.createdAt).toLocaleDateString('es-ES') : '—'}</p></div>
              </section>

              <footer className="al-actions">
                <button className="btn" onClick={() => openEdit(s)}>Editar</button>
                <button className="btn" onClick={() => onToggleActive(s)}>{active ? 'Desactivar' : 'Activar'}</button>
                <button className="btn btn-danger" onClick={() => onDelete(s)}>Eliminar</button>
              </footer>
            </article>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="al-muted">No hay alumnos que coincidan con el filtro/búsqueda.</p>
      )}

      {/* Modal crear/editar */}
      {openForm && (
        <>
          <div className="al-backdrop" onClick={() => setOpenForm(false)} />
          <form className="al-modal" onSubmit={onSubmitForm}>
            <h3 style={{margin:0}}>{editing ? 'Editar alumno' : 'Nuevo alumno'}</h3>

            <div className="al-form-grid">
              <div className="al-field full">
                <label>Nombre *</label>
                <input
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  placeholder="Nombre y apellidos"
                  autoFocus
                />
              </div>

              <div className="al-field">
                <label>Tarifa (€ / hora)</label>
                <input
                  inputMode="decimal"
                  value={fPrice}
                  onChange={(e) => setFPrice(e.target.value)}
                  placeholder="12,00"
                />
              </div>

              <div className="al-field">
                <label>Estado</label>
                <select value={String(fActive)} onChange={(e) => setFActive(e.target.value === 'true')}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>

              <div className="al-field full">
                <label>Nota</label>
                <textarea
                  rows={4}
                  value={fNote}
                  onChange={(e) => setFNote(e.target.value)}
                  placeholder="Observaciones, objetivos, material…"
                />
              </div>
            </div>

            <div className="al-modal-actions">
              <button type="button" className="btn" onClick={() => setOpenForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Guardar cambios' : 'Guardar'}</button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
