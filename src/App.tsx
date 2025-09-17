// src/App.tsx
import { Routes, Route, Navigate, NavLink } from 'react-router-dom'

// Páginas (ajusta rutas si la carpeta difiere)
import Agenda from './pages/Agenda'
import Alumnos from './pages/Alumnos'
import Pagos from './pages/Pagos'
import Informes from './pages/Informes'

export default function App() {
  return (
    <div>
      {/* Nav opcional (si ya lo tienes en otro sitio, puedes quitar esto) */}
      {/* <nav>
        <NavLink to="/">Agenda</NavLink>
        <NavLink to="/alumnos">Alumnos</NavLink>
        <NavLink to="/pagos">Pagos</NavLink>
        <NavLink to="/informes">Informes</NavLink>
      </nav> */}

      <Routes>
        <Route path="/" element={<Agenda />} />
        <Route path="/alumnos" element={<Alumnos />} />
        <Route path="/pagos" element={<Pagos />} />
        <Route path="/informes" element={<Informes />} />
        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

