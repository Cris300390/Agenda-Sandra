// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 👇 MUY IMPORTANTE para GitHub Pages
  base: '/Agenda-Sandra/',
  // 👇 Construir directamente a /docs (Pages lo sirve solo)
  build: { outDir: 'docs' }
})
