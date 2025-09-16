// src/App.tsx
import Pagos from './pages/Pagos'
// src/App.tsx
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'

// Páginas (ajusta los imports si tuvieran otra ruta/nombre)
import Pagos from './pages/Pagos'
import Alumnos from './pages/Alumnos'
import Agenda from './pages/Agenda'
import Informes from './pages/Informes'

export default function App() {
  return (
    <BrowserRouter>
      {/* Barra de navegación simple */}
      <header className="nav">
        <div className="nav-inner">
          <strong className="brand">Agenda Sandra</strong>

          <nav className="nav-links">
            <NavLink to="/agenda" className={({ isActive }) => isActive ? 'active' : ''}>
              Agenda
            </NavLink>
            <NavLink to="/alumnos" className={({ isActive }) => isActive ? 'active' : ''}>
              Alumnos
            </NavLink>
            <NavLink to="/pagos" className={({ isActive }) => isActive ? 'active' : ''}>
              Pagos
            </NavLink>
            <NavLink to="/informes" className={({ isActive }) => isActive ? 'active' : ''}>
              Informes
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Contenido */}
      <main className="main">
        <Routes>
          {/* Redirige la raíz a Pagos (puedes cambiarla a Agenda si prefieres) */}
          <Route path="/" element={<Navigate to="/pagos" replace />} />

          <Route path="/pagos" element={<Pagos />} />
          <Route path="/alumnos" element={<Alumnos />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/informes" element={<Informes />} />

          {/* 404 */}
          <Route path="*" element={<NoMatch />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

function NoMatch() {
  return (
    <div style={{ padding: 20 }}>
      <h2>404</h2>
      <p>Página no encontrada.</p>
    </div>
  )
}
