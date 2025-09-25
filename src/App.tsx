// src/App.tsx
import { NavLink, Route, Routes, Navigate } from "react-router-dom"

// Ilustraciones laterales (opcional)
import SideDecor from "./components/SideDecor"

// Páginas
import Agenda from "./pages/Agenda"
import Alumnos from "./pages/Alumnos"
import Pagos from "./pages/Pagos"
import Informes from "./pages/Informes"
import Home from "./pages/Home" // si no lo usas, puedes borrarlo

export default function App() {
  return (
    <>
      {/* ENCABEZADO NUEVO (profesional) */}
      <div className="topbar-wrap">
        <div className="topbar">
          <h1 className="brand">Las clases de Sandra</h1>

          <nav className="tabs">
            <NavLink
              to="/agenda"
              className={({ isActive }) =>
                "pill pill--agenda" + (isActive ? " is-active" : "")
              }
            >
              Agenda
            </NavLink>

            <NavLink
              to="/alumnos"
              className={({ isActive }) =>
                "pill pill--alumnos" + (isActive ? " is-active" : "")
              }
            >
              Alumnos
            </NavLink>

            <NavLink
              to="/pagos"
              className={({ isActive }) =>
                "pill pill--pagos" + (isActive ? " is-active" : "")
              }
            >
              Pagos
            </NavLink>

            <NavLink
              to="/informes"
              className={({ isActive }) =>
                "pill pill--informes" + (isActive ? " is-active" : "")
              }
            >
              Informes
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Ilustraciones laterales (no bloquean clics) */}
      <SideDecor />

      {/* Contenido principal */}
      <main className="main">
        <Routes>
          {/* Si alguien entra a / o a /home, lo mandamos a Agenda */}
          <Route path="/" element={<Navigate to="/agenda" replace />} />
          <Route path="/home" element={<Navigate to="/agenda" replace />} />

          <Route path="/agenda" element={<Agenda />} />
          <Route path="/alumnos" element={<Alumnos />} />
          <Route path="/pagos" element={<Pagos />} />
          <Route path="/informes" element={<Informes />} />

          {/* 404 simple */}
          <Route
            path="*"
            element={
              <div className="card mt-6">
                <h2 className="mt-0">Página no encontrada</h2>
                <p>Usa las pestañas de arriba para navegar.</p>
              </div>
            }
          />
        </Routes>
      </main>
    </>
  )
}
