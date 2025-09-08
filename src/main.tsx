import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App'
import Agenda from './pages/Agenda'
import Alumnos from './pages/Alumnos'
import Pagos from './pages/Pagos'
import Informes from './pages/Informes'
import { seedIfEmpty } from './db'

// Seed demo data on first run (non-blocking)
seedIfEmpty()

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Agenda /> },
      { path: 'alumnos', element: <Alumnos /> },
      { path: 'pagos', element: <Pagos /> },
      { path: 'informes', element: <Informes /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
