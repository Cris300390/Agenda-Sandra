import { Routes, Route, NavLink, Navigate } from "react-router-dom"
import Home from "./pages/Home"
import Alumnos from "./pages/Alumnos"
import Pagos from "./pages/Pagos"
import Agenda from "./pages/Agenda"
import Informes from "./pages/Informes"
import "./app.css"

function LinkItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "nav-link" + (isActive ? " nav-link--active" : "")
      }
      end
    >
      {children}
    </NavLink>
  )
}

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <h1 className="brand">Agenda Sandra</h1>
        <nav className="nav">
          <LinkItem to="/">Inicio</LinkItem>
          <LinkItem to="/alumnos">Alumnos</LinkItem>
          <LinkItem to="/pagos">Pagos</LinkItem>
          <LinkItem to="/agenda">Agenda</LinkItem>
          <LinkItem to="/informes">Informes</LinkItem>
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/alumnos" element={<Alumnos />} />
          <Route path="/pagos" element={<Pagos />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/informes" element={<Informes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
