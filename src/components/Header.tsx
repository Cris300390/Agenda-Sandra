import { NavLink } from 'react-router-dom'

export default function Header() {
  const btn = (isActive: boolean) =>
    'navpro__btn' + (isActive ? ' is-active' : '')

  return (
    <header className="navpro" style={{ display: 'block' }}>
      <div className="navpro__inner">
        <div className="navpro__brand">
          <span className="navpro__emoji" aria-hidden>🎒</span>
          <strong className="navpro__title">Las clases de Sandra</strong>
        </div>

        <nav className="navpro__menu" aria-label="Secciones">
          <NavLink to="/" end className={({isActive}) => btn(isActive)}>
            Agenda
          </NavLink>
          <NavLink to="/alumnos" className={({isActive}) => btn(isActive)}>
            Alumnos
          </NavLink>
          <NavLink to="/pagos" className={({isActive}) => btn(isActive)}>
            Pagos
          </NavLink>
          <NavLink to="/informes" className={({isActive}) => btn(isActive)}>
            Informes
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
