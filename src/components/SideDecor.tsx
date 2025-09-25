// src/components/SideDecor.tsx
import './side-decor.css'

export default function SideDecor() {
  const base = import.meta.env.BASE_URL
  return (
    <>
      <img
        className="side-ill side-ill--left"
        src={`${base}img/profesora.png`}
        alt="Maestra"
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
      <img
        className="side-ill side-ill--right"
        src={`${base}img/estudiantes.png`}
        alt="Niños"
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
    </>
  )
}
