// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base para GitHub Pages (repo: /Agenda-Sandra/)
// y puerto 5185 fijo en local (dev/preview)
export default defineConfig({
  plugins: [react()],
  base: '/Agenda-Sandra/',
  server: {
    host: '0.0.0.0',
    port: 5185,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5185,
    strictPort: true,
  },
})

