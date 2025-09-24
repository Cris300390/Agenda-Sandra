// src/components/DecorativeEdges.tsx
export default function DecorativeEdges() {
  return (
    <div aria-hidden="true">
      {/* Ambas comparten el mismo tamaño mediante la clase edge-img */}
      <img className="edge-img edge-left"  src="/img/profesora.png"   alt="" />
      <img className="edge-img edge-right" src="/img/estudiantes.png" alt="" />
    </div>
  )
}
