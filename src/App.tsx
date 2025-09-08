import { Outlet, NavLink } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <div className="app-root">
      <header className="app-header" role="banner">
        <h1 className="app-title">Las clases de Sandra</h1>
        <nav aria-label="Principal" className="app-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Agenda
          </NavLink>
          <NavLink to="/alumnos" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Alumnos
          </NavLink>
          <NavLink to="/pagos" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Pagos
          </NavLink>
          <NavLink to="/informes" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Informes
          </NavLink>
        </nav>
      </header>
      <main className="app-main" role="main">
        <Outlet />
      </main>
    </div>
  )
}

export default App
