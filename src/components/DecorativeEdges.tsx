// src/components/DecorativeEdges.tsx
import React from 'react'

// Helper: resuelve rutas respetando el base de Vite/GitHub Pages
const asset = (path: string) => new URL(path, import.meta.env.BASE_URL).toString()

export default function DecorativeEdges() {
  // Estilo común para ambas ilustraciones
  const common: React.CSSProperties = {
    position: 'fixed',
    top: 120,
    width: 260,
    height: 'auto',
    opacity: 0.5,
    zIndex: 1,
    pointerEvents: 'none',
  }

  return (
    <div aria-hidden="true">
      {/* Izquierda: profesora */}
      <img
        src={asset('img/profesora.png')}
        alt=""
        style={{ ...common, left: 10 }}
      />

      {/* Derecha: alumnos */}
      <img
        src={asset('img/estudiantes.png')}
        alt=""
        style={{ ...common, right: 10 }}
      />
    </div>
  )
}
