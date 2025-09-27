import './supabase'   // asegura que se ejecuta y crea window.supaTest en DEV
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './app.css'

// 👇 importa el proveedor de toasts
import { ToastProvider } from './ui/Toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 👇 monta el provider arriba del router para que TODA la app tenga contexto */}
    <ToastProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </ToastProvider>
  </React.StrictMode>
)
