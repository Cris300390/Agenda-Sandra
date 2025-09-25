// src/pages/Home.tsx
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <section className="card card-lg mt-6">
      {/* 2 dibujos */}
      <div className="grid grid-2 center mb-6" style={{gap:16}}>
        <div style={{fontSize:64, lineHeight:1}}>📒</div>
        <div style={{fontSize:64, lineHeight:1}}>✏️</div>
      </div>

      {/* 4 botones */}
      <div className="grid grid-2" style={{gap:12}}>
        <Link className="btn btn--brand" to="/agenda">🗓️ Agenda</Link>
        <Link className="btn" to="/alumnos">👩‍🏫 Alumnos</Link>
        <Link className="btn" to="/pagos">💶 Pagos</Link>
        <Link className="btn" to="/informes">📊 Informes</Link>
      </div>
    </section>
  )
}
