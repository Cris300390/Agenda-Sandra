import { NavLink } from 'react-router-dom'

export default function Header() {
  return (
    <div className="topbar-wrap">
      <div className="topbar">
        <h1 className="brand">Las clases de Sandra</h1>

        <nav className="tabs" aria-label="Secciones">
          <NavLink
            to="/agenda"
            className={({ isActive }) => 'pill pill--agenda' + (isActive ? ' is-active' : '')}
          >
            Agenda
          </NavLink>

          <NavLink
            to="/alumnos"
            className={({ isActive }) => 'pill pill--alumnos' + (isActive ? ' is-active' : '')}
          >
            Alumnos
          </NavLink>

          <NavLink
            to="/pagos"
            className={({ isActive }) => 'pill pill--pagos' + (isActive ? ' is-active' : '')}
          >
            Pagos
          </NavLink>

          <NavLink
            to="/informes"
            className={({ isActive }) => 'pill pill--informes' + (isActive ? ' is-active' : '')}
          >
            Informes
          </NavLink>
        </nav>
      </div>
    </div>
  )
}
