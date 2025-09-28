import React from 'react'
import { useToast } from '../ui/Toast'
import * as Payments from '../data/supaPayments'

type Props = {
  /** Clave del mes 'yyyy-MM' */
  monthKey: string
  /** Forzar recarga arriba (opcional) */
  onChanged?: () => void
}

/** Intenta resolver una función del helper de pagos probando varios nombres */
function pickPaymentsFn<T extends (...args: any[]) => any>(
  candidates: string[],
): T {
  const anyPay = Payments as any
  for (const name of candidates) {
    if (typeof anyPay?.[name] === 'function') {
      return anyPay[name] as T
    }
  }
  throw new Error(
    `No se encontró ninguna de estas funciones en supaPayments: ${candidates.join(
      ', ',
    )}`,
  )
}

export default function PagosCleanup({ monthKey, onChanged }: Props) {
  const toast = useToast()

  // Probar múltiples alias comunes para evitar errores de import
  // (ajusta si quieres añadir más)
  const clearMonth = React.useMemo(
    () =>
      pickPaymentsFn<(key: string) => Promise<any>>([
        'clearMonth',
        'deleteMonth',
        'purgeMonth',
        'resetMonth',
        'wipeMonth',
      ]),
    [],
  )

  const cleanOrphans = React.useMemo(
    () =>
      pickPaymentsFn<() => Promise<number | void>>([
        'cleanOrphans',
        'removeOrphans',
        'deleteOrphans',
        'purgeOrphans',
        'fixOrphans',
      ]),
    [],
  )

  async function doClearMonth() {
    const ok = await toast.confirm({
      title: 'Borrar historial del mes',
      message:
        `Se eliminarán TODOS los movimientos del mes ${monthKey}. ` +
        'Esta acción no se puede deshacer.',
      confirmText: 'Borrar',
      cancelText: 'Cancelar',
      // ✅ Tu Toast solo acepta 'primary' | 'danger'
      tone: 'danger',
    })
    if (!ok) return

    try {
      await clearMonth(monthKey)
      toast.success('Historial borrado', 'Se ha eliminado el mes seleccionado.')
      onChanged?.()
      // notificar a la página para recargar si usa este evento
      window.dispatchEvent(new Event('data:changed'))
    } catch (err: any) {
      console.error(err)
      toast.error('No se pudo borrar', err?.message ?? 'Error desconocido')
    }
  }

  async function doCleanOrphans() {
    const ok = await toast.confirm({
      title: 'Limpiar movimientos huérfanos',
      message:
        'Se eliminarán movimientos que no tengan alumno asociado. ' +
        '¿Quieres continuar?',
      confirmText: 'Limpiar',
      cancelText: 'Cancelar',
      // ✅ sin 'warning'; usa 'primary' para acción neutra
      tone: 'primary',
    })
    if (!ok) return

    try {
      const removed = (await cleanOrphans()) ?? 0
      toast.success('Limpieza completada', `${removed} movimientos eliminados.`)
      onChanged?.()
      window.dispatchEvent(new Event('data:changed'))
    } catch (err: any) {
      console.error(err)
      toast.error('No se pudo limpiar', err?.message ?? 'Error desconocido')
    }
  }

  return (
    <section
      className="block"
      aria-label="Mantenimiento de pagos"
      style={{
        position: 'relative',
        zIndex: 2,
        pointerEvents: 'auto',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Mantenimiento de pagos</h3>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={doClearMonth}
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            fontWeight: 800,
            cursor: 'pointer',
            border: '1px solid #fecaca',
            background: '#fee2e2',
            color: '#b91c1c',
          }}
        >
          Borrar historial del mes
        </button>

        <button
          type="button"
          onClick={doCleanOrphans}
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            fontWeight: 800,
            cursor: 'pointer',
            border: '1px solid #fcd34d',
            background: '#fffbeb',
            color: '#b45309',
          }}
        >
          Limpiar movimientos huérfanos
        </button>
      </div>
    </section>
  )
}
