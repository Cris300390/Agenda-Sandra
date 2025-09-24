// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Nombre EXACTO del repositorio en GitHub Pages
const repo = 'Agenda-Sandra'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  /**
   * base:
   * - En desarrollo: '/' (local)
   * - En build (producción): '/Agenda-Sandra/' para GitHub Pages
   *   IMPORTANTE: dejar la barra final.
   */
  base: mode === 'production' ? `/${repo}/` : '/',

  server: {
    host: true,        // 0.0.0.0 (accesible desde el móvil en la misma Wi-Fi)
    port: 5185,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 5185,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
}))
