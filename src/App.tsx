// src/App.tsx
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Agenda from './pages/Agenda'
import Alumnos from './pages/Alumnos'
import PagosPage from './pages/Pagos'
import InformesPage from './pages/Informes'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="topbar topbar--center">
          {/* Título nuevo arriba de los botones */}
          <h1 className="logo">Las clases de Sandra</h1>

          {/* Menú centrado con 4 botones; Agenda va primero */}
          <nav className="nav nav--center">
            <NavItem to="/agenda" text="Agenda" />
            <NavItem to="/alumnos" text="Alumnos" />
            <NavItem to="/pagos" text="Pagos" />
            <NavItem to="/informes" text="Informes" />
          </nav>
        </header>

        <main className="content">
          <Routes>
            {/* Ruta por defecto: que se vea Agenda primero */}
            <Route path="/" element={<Navigate to="/agenda" replace />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/alumnos" element={<Alumnos />} />
            <Route path="/pagos" element={<PagosPage />} />
            <Route path="/informes" element={<InformesPage />} />
            {/* Cualquier otra ruta desconocida */}
            <Route path="*" element={<Navigate to="/agenda" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function NavItem({ to, text }: { to: string; text: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `nav-item nav-item--pro ${isActive ? 'nav-item--active' : ''}`
      }
    >
      {text}
    </NavLink>
  )
}

