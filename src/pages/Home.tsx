import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Agenda Sandra</h2>
      <p>Usa los botones de arriba para navegar.</p>
      <div className="actions" style={{ marginTop: 12 }}>
        <Link className="btn btn--brand" to="/agenda">Ir a Agenda</Link>
      </div>
    </div>
  )
}
