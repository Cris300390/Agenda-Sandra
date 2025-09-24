// src/components/Header.tsx
import { NavLink } from 'react-router-dom'

export default function Header() {
  return (
    <header className="topbar topbar--center app-header">
      <h1 className="logo">Las clases de Sandra</h1>

      <nav className="nav nav--center" aria-label="Principal">
        <NavLink
          to="/"
          end
          className={({ isActive }) => 'nav-item' + (isActive ? ' nav-item--active' : '')}
        >
          Agenda
        </NavLink>

        <NavLink
          to="/alumnos"
          className={({ isActive }) => 'nav-item' + (isActive ? ' nav-item--active' : '')}
        >
          Alumnos
        </NavLink>

        <NavLink
          to="/pagos"
          className={({ isActive }) => 'nav-item' + (isActive ? ' nav-item--active' : '')}
        >
          Pagos
        </NavLink>

        <NavLink
          to="/informes"
          className={({ isActive }) => 'nav-item' + (isActive ? ' nav-item--active' : '')}
        >
          Informes
        </NavLink>
      </nav>
    </header>
  )
}
