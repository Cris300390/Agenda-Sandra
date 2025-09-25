// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

// Si tienes estilos globales, déjalo:
import './app.css'  // o './index.css' si es tu caso

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* En GitHub Pages, la app vive en /Agenda-Sandra/ */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

