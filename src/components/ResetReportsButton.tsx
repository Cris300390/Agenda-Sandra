import { useState } from 'react'
import { db } from '../db'
import { useToast } from '../ui/Toast'

type Props = {
  /** Llamado cuando termina el reseteo para que el padre recargue datos */
  onDone?: () => void
  /** Si también quieres borrar clases/eventos, pasa true (opcional) */
  alsoClasses?: boolean
}

export default function ResetReportsButton({ onDone, alsoClasses = false }: Props) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function handleReset() {
    const ok = await toast.confirm({
      title: 'Resetear informes',
      message:
        'Vas a borrar TODO el historial de pagos y deudas (informes a cero). ' +
        (alsoClasses ? 'También se borrarán todas las clases/eventos. ' : '') +
        'Esta acción es permanente. ¿Seguro que quieres continuar?',
      confirmText: 'Borrar todo',
      cancelText: 'Cancelar',
      tone: 'danger',
    })
    if (!ok) return

    setBusy(true)
    try {
      await db.transaction('rw', db.movements, db.classes, async () => {
        await db.movements.clear()
        if (alsoClasses && db.classes) {
          await db.classes.clear()
        }
      })

      // Limpia caches locales que pudiera usar Informes
      Object.keys(localStorage).forEach((k) => {
        if (
          k.startsWith('informes.') ||
          k.startsWith('reports.') ||
          k.startsWith('dashboard.')
        ) {
          localStorage.removeItem(k)
        }
      })

      toast.success('Informes reseteados', 'Los gráficos se han puesto a cero.')
      onDone?.()
    } catch (err: any) {
      toast.error('No se pudo resetear', String(err?.message || err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      className="btn btn-danger"
      onClick={handleReset}
      disabled={busy}
      title="Borra pagos/deudas y pone los gráficos a 0"
    >
      {busy ? 'Borrando…' : 'Resetear informes'}
    </button>
  )
}
