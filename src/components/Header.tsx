// src/components/Header.tsx
import { NavLink } from 'react-router-dom'

export default function Header() {
  return (
    <header className="school-header">
      {/* QUITADO: la franja rosa de fondo (school-header__bg) */}
      {/* <div className="school-header__bg" /> */}

      {/* Barra centrada */}
      <div className="school-bar">
        {/* Marca en “cartel de aula” */}
        <div className="school-brand" aria-label="Las clases de Sandra">
          <span className="school-brand__chalk">Las clases de Sandra</span>
        </div>

        {/* Menú con botones temáticos */}
        <nav className="school-nav" aria-label="Principal">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              'school-nav__item btn-pencil' + (isActive ? ' is-active' : '')
            }
          >
            <span className="btn-label">Agenda</span>
          </NavLink>

          <NavLink
            to="/alumnos"
            className={({ isActive }) =>
              'school-nav__item btn-ruler' + (isActive ? ' is-active' : '')
            }
          >
            <span className="btn-label">Alumnos</span>
          </NavLink>

          <NavLink
            to="/pagos"
            className={({ isActive }) =>
              'school-nav__item btn-sharpener' + (isActive ? ' is-active' : '')
            }
          >
            <span className="btn-label">Pagos</span>
          </NavLink>

          <NavLink
            to="/informes"
            className={({ isActive }) =>
              'school-nav__item btn-board' + (isActive ? ' is-active' : '')
            }
          >
            <span className="btn-label">Informes</span>
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
