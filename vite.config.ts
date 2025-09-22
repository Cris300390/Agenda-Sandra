// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// nombre del repo para GitHub Pages
const repo = 'Agenda-Sandra'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    plugins: [react()],
    // En local: '/', en build para Pages: '/Agenda-Sandra/'
    base: isProd ? `/${repo}/` : '/',

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
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})
