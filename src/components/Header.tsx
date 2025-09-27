import { NavLink } from 'react-router-dom'

export default function Header() {
  return (
    <div className="topbar-wrap">
      {/* Fuerza estilo del título: negro + cursiva elegante */}
      <style>{`
        .topbar .brand{
          font-family: "Playfair Display", serif !important;
          font-style: italic !important;
          font-weight: 700 !important;
          color: #111827 !important;                 /* negro profesional */
          -webkit-text-fill-color: #111827 !important; /* Safari/iOS */
          background: none !important;                 /* quita degradados heredados */
          -webkit-background-clip: initial !important;
          font-size: clamp(28px, 4vw, 44px) !important;
          line-height: 1.1 !important;
          letter-spacing: .5px !important;
          text-align: center !important;
          margin: 16px 0 10px !important;
          text-shadow: 0 1px 0 rgba(255,255,255,0.5);  /* sutil, opcional */
        }
        @media (max-width:520px){
          .topbar .brand{ font-size: clamp(24px, 6vw, 36px) !important; }
        }
      `}</style>

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
