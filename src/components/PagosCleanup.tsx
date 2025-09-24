import { useMemo, useState } from 'react'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { db } from '../db'

type Mode = 'month' | 'orphans'

export default function PagosCleanup({ forDate }: { forDate?: Date }) {
  const [open, setOpen] = useState<Mode | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const now = useMemo(() => forDate ?? new Date(), [forDate])
  const monthLabel = useMemo(
    () => format(now, "LLLL yyyy", { locale: es }),
    [now]
  )

  async function doResetMonth() {
    const s = startOfMonth(now)
    const e = endOfMonth(now)
    const sStr = format(s, 'yyyy-MM-dd')
    const eStr = format(e, 'yyyy-MM-dd')

    setBusy(true)
    try {
      const ids: number[] = await (db as any).movements
        .where('date')
        .between(sStr, eStr, true, true)
        .primaryKeys()

      if (ids.length) {
        await db.transaction('rw', (db as any).movements, async () => {
          for (const id of ids) await (db as any).movements.delete(id)
        })
      }
      setMsg(`Historial del mes (${monthLabel}) borrado correctamente.`)
    } catch (err: any) {
      setMsg(`No se pudo borrar: ${err?.message || err}`)
    } finally {
      setBusy(false)
      setOpen(null)
      window.dispatchEvent(new CustomEvent('data:changed', { detail: { source: 'pagos/reset-month' } }))
    }
  }

  async function doPurgeOrphans() {
    setBusy(true)
    try {
      const students = await (db as any).students.toArray()
      const valid = new Set<number>(students.filter((s: any) => typeof s.id === 'number').map((s: any) => s.id as number))

      const movs = await (db as any).movements.toArray()
      const orphans = movs.filter((m: any) => typeof m.studentId === 'number' && !valid.has(m.studentId as number))

      if (orphans.length) {
        await db.transaction('rw', (db as any).movements, async () => {
          for (const m of orphans) await (db as any).movements.delete(m.id)
        })
      }
      setMsg(`${orphans.length} movimiento(s) huérfano(s) eliminado(s).`)
    } catch (err: any) {
      setMsg(`No se pudo limpiar: ${err?.message || err}`)
    } finally {
      setBusy(false)
      setOpen(null)
      window.dispatchEvent(new CustomEvent('data:changed', { detail: { source: 'pagos/purge-orphans' } }))
    }
  }

  return (
    <div className="pc-card">
      <style>{css}</style>

      <div className="pc-head">
        <div className="pc-title">Mantenimiento de pagos</div>
        <div className="pc-actions">
          <button
            className="pc-btn pc-btn--danger"
            onClick={() => setOpen('month')}
            disabled={busy}
            title="Borrar TODO el historial del mes actual (todos los alumnos)"
          >
            Borrar historial del mes
          </button>

          <button
            className="pc-btn pc-btn--warning"
            onClick={() => setOpen('orphans')}
            disabled={busy}
            title="Eliminar movimientos que quedaron sin alumno"
          >
            Limpiar movimientos huérfanos
          </button>
        </div>
      </div>

      {msg && <div className="pc-toast" onAnimationEnd={() => setMsg(null)}>{msg}</div>}

      {open && (
        <div className="pc-modal-backdrop" onClick={() => busy ? null : setOpen(null)}>
          <div className="pc-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="pc-modal-title">
              {open === 'month' ? 'Borrar historial del mes' : 'Limpiar movimientos huérfanos'}
            </h3>
            <p className="pc-modal-text">
              {open === 'month'
                ? <>Se eliminarán <strong>todos los movimientos</strong> del mes <strong>{monthLabel}</strong> (deudas y pagos de todos los alumnos). Esta acción es irreversible.</>
                : <>Se eliminarán los movimientos (deudas/pagos) vinculados a alumnos que ya no existen. Esta acción es irreversible.</>
              }
            </p>

            <div className="pc-modal-actions">
              <button className="pc-btn" onClick={() => setOpen(null)} disabled={busy}>Cancelar</button>
              <button
                className={open === 'month' ? 'pc-btn pc-btn--danger' : 'pc-btn pc-btn--warning'}
                onClick={open === 'month' ? doResetMonth : doPurgeOrphans}
                disabled={busy}
              >
                {busy ? 'Procesando…' : 'Sí, continuar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const css = `
.pc-card{margin-top:12px;background:#fff;border:1px solid #eef2f7;border-radius:14px;padding:12px;box-shadow:0 6px 16px rgba(0,0,0,.05)}
.pc-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.pc-title{font-weight:900;color:#0f172a}
.pc-actions{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap}
.pc-btn{appearance:none;border:1px solid #e5e7eb;background:#fff;color:#0f172a;border-radius:12px;padding:8px 12px;font-weight:800;cursor:pointer}
.pc-btn:hover{background:#f8fafc}
.pc-btn:disabled{opacity:.6;cursor:not-allowed}
.pc-btn--danger{background:#fee2e2;border-color:#fecaca;color:#991b1b}
.pc-btn--danger:hover{background:#fecaca}
.pc-btn--warning{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
.pc-btn--warning:hover{background:#ffedd5}

.pc-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:10000}
.pc-modal{width:min(560px,calc(100% - 24px));background:#fff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 20px 50px rgba(0,0,0,.3);padding:16px}
.pc-modal-title{margin:0 0 6px}
.pc-modal-text{margin:0 0 12px;color:#374151}
.pc-modal-actions{display:flex;gap:8px;justify-content:flex-end}

.pc-toast{margin-top:10px;background:#0f172a;color:#fff;padding:8px 10px;border-radius:10px;animation:pcfade 2.3s forwards}
@keyframes pcfade{0%{opacity:0;transform:translateY(-3px)}10%{opacity:1;transform:none}90%{opacity:1}100%{opacity:0}}
`
