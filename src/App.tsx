// src/App.tsx
import { Suspense, lazy } from 'react'
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'

// Carga diferida (mejor rendimiento)
const Agenda   = lazy(() => import('./pages/Agenda'))
const Alumnos  = lazy(() => import('./pages/Alumnos'))
const Pagos    = lazy(() => import('./pages/Pagos'))
const Informes = lazy(() => import('./pages/Informes'))

export default function App() {
  return (
    <div>
      {/* Cabecero profesional (centrado) */}
      <header className="app-header">
        <div className="app-header__inner">
          <h1 className="app-title">Las clases de Sandra</h1>

          <nav className="topnav">
            <TopNav to="/"          end  label="Agenda"   />
            <TopNav to="/alumnos"        label="Alumnos"  />
            <TopNav to="/pagos"          label="Pagos"    />
            <TopNav to="/informes"       label="Informes" />
          </nav>
        </div>
      </header>

      {/* Contenido */}
      <main style={mainStyles}>
        <Suspense fallback={<div style={fallbackStyles}>Cargando…</div>}>
          <Routes>
            <Route path="/" element={<Agenda />} />
            <Route path="/alumnos" element={<Alumnos />} />
            <Route path="/pagos" element={<Pagos />} />
            <Route path="/informes" element={<Informes />} />
            {/* Cualquier ruta desconocida vuelve a Agenda */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

/* ---------- Botón de navegación ---------- */
function TopNav({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => 'topnav-btn' + (isActive ? ' active' : '')}
    >
      {label}
    </NavLink>
  )
}

/* ---------- Estilos mínimos del contenedor ---------- */
const mainStyles: React.CSSProperties = {
  maxWidth: 1200,
  margin: '16px auto',
  padding: '0 12px 24px',
}

const fallbackStyles: React.CSSProperties = {
  padding: 20,
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #f1f5f9',
}
