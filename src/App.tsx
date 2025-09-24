import { Routes, Route, Link, Navigate } from 'react-router-dom'

export default function App() {
  return (
    <div className="main">
      <h1>Agenda Sandra</h1>
      <p>Despliegue correcto. Ahora conectamos tus pantallas reales.</p>
      <nav style={{ display:'flex', gap:12, margin:'12px 0' }}>
        <Link to="/agenda">Agenda</Link>
        <Link to="/alumnos">Alumnos</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/agenda" replace />} />
        <Route path="/agenda" element={<div>📅 Agenda OK</div>} />
        <Route path="/alumnos" element={<div>👩‍🎓 Alumnos OK</div>} />
        <Route path="*" element={<div>404 (ruta desconocida)</div>} />
      </Routes>
    </div>
  )
}
