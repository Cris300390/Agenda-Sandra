// src/components/NavBar.tsx
import { NavLink } from 'react-router-dom'

export default function NavBar() {
  return (
    <header className="navpro">
      <div className="navpro__inner">
        <div className="navpro__brand">
          <span className="navpro__emoji" role="img" aria-label="mochila">🎒</span>
          <span className="navpro__title">Las clases de Sandra</span>
        </div>

        <nav className="navpro__menu" aria-label="Navegación principal">
          <NavLink to="/" end className={({isActive})=>'navpro__btn'+(isActive?' is-active':'')}>Agenda</NavLink>
          <NavLink to="/alumnos" className={({isActive})=>'navpro__btn'+(isActive?' is-active':'')}>Alumnos</NavLink>
          <NavLink to="/pagos" className={({isActive})=>'navpro__btn'+(isActive?' is-active':'')}>Pagos</NavLink>
          <NavLink to="/informes" className={({isActive})=>'navpro__btn'+(isActive?' is-active':'')}>Informes</NavLink>
        </nav>
      </div>
    </header>
  )
}
