// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repo = 'Agenda-Sandra'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // En dev: '/', en build para GitHub Pages: '/Agenda-Sandra/'
  base: mode === 'production' ? `/${repo}/` : '/',

  server: {
    host: true,        // 0.0.0.0
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
