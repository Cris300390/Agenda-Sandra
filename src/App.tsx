// src/App.tsx
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'

// Carga diferida (mejor rendimiento)
const Agenda   = lazy(() => import('./pages/Agenda'))
const Alumnos  = lazy(() => import('./pages/Alumnos'))
const Pagos    = lazy(() => import('./pages/Pagos'))
const Informes = lazy(() => import('./pages/Informes'))

export default function App() {
  return (
    <div>
      {/* Cabecera y pestañas */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.title}>Las clases de Sandra</h1>

          <nav style={styles.tabs}>
            <Tab to="/"          end     text="Agenda"  />
            <Tab to="/alumnos"           text="Alumnos" />
            <Tab to="/pagos"             text="Pagos"   />
            <Tab to="/informes"          text="Informes"/>
          </nav>
        </div>
      </header>

      {/* Contenido de páginas */}
      <main style={styles.main}>
        <Suspense fallback={<div style={styles.fallback}>Cargando…</div>}>
          <Routes>
            <Route path="/" element={<Agenda />} />
            <Route path="/alumnos" element={<Alumnos />} />
            <Route path="/pagos" element={<Pagos />} />
            <Route path="/informes" element={<Informes />} />
            {/* Cualquier ruta desconocida vuelve a Agenda */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

/* ---------- Tab (píldoras) ---------- */
function Tab({ to, text, end }: { to: string; text: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        ...styles.tab,
        ...(isActive ? styles.tabActive : null),
      })}
    >
      {text}
    </NavLink>
  )
}

/* ---------- Estilos mínimos (mantiene el look general) ---------- */
const styles: Record<string, React.CSSProperties> = {
  header: {
    background: 'linear-gradient(135deg,#fce7f3 0%,#fbcfe8 60%,#f9a8d4 100%)',
    padding: '12px 16px',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  headerInner: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(22px, 4vw, 30px)',
    fontWeight: 800,
    color: '#0f172a',
  },
  tabs: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    borderRadius: 999,
    background: 'white',
    border: '2px solid #e9d5ff',
    color: '#334155',
    fontWeight: 700,
    textDecoration: 'none',
    boxShadow: '0 3px 8px rgba(0,0,0,.05)',
  },
  tabActive: {
    background: '#ec4899',
    color: 'white',
    borderColor: '#ec4899',
  },
  main: {
    maxWidth: 1200,
    margin: '16px auto',
    padding: '0 12px 24px',
  },
  fallback: {
    padding: 20,
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #f1f5f9',
  },
}
