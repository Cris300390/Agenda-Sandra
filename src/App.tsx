// src/App.tsx
import { Link, Route, Routes } from 'react-router-dom'

// Tus páginas reales
import Agenda from './pages/Agenda'
import Alumnos from './pages/Alumnos'
import Pagos from './pages/Pagos'
import Informes from './pages/Informes'
import Home from './pages/Home'   // <- H mayúscula

export default function App() {
  return (
    <div className="main">
      {/* Cabecera común */}
      <header className="header card">
        <h1 className="title">Agenda Sandra</h1>
        <nav className="actions">
          <Link className="chip chip--brand" to="/">Inicio</Link>
          <Link className="chip" to="/agenda">Agenda</Link>
          <Link className="chip" to="/alumnos">Alumnos</Link>
          <Link className="chip" to="/pagos">Pagos</Link>
          <Link className="chip" to="/informes">Informes</Link>
        </nav>
      </header>

      {/* Rutas */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/alumnos" element={<Alumnos />} />
        <Route path="/pagos" element={<Pagos />} />
        <Route path="/informes" element={<Informes />} />
        {/* 404 dentro de la app */}
        <Route
          path="*"
          element={
            <div className="card mt-6">
              <h2 style={{ marginTop: 0 }}>Página no encontrada</h2>
              <p>Usa los botones de arriba para navegar.</p>
              <div className="actions" style={{ marginTop: 8 }}>
                <Link className="btn btn--brand" to="/">Ir al inicio</Link>
                <Link className="btn" to="/agenda">Ir a Agenda</Link>
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  )
}
