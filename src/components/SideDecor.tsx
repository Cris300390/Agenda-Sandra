// src/components/SideDecor.tsx
/**
 * Componente puramente visual: pinta dos capas fijas (izquierda/derecha)
 * con las ilustraciones que pusimos en public/img/.
 *
 * Conceptos:
 * - Componente: pieza reutilizable de UI.
 * - aria-hidden: indica que es decorativo y no debe anunciarse a lectores de pantalla.
 */
export default function SideDecor() {
  return (
    <>
      <div className="decor decor--left" aria-hidden="true" />
      <div className="decor decor--right" aria-hidden="true" />
    </>
  )
}
