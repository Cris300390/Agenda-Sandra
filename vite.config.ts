// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En GitHub Pages tu app vive en /Agenda-Sandra/
export default defineConfig({
  plugins: [react()],
  base: '/Agenda-Sandra/',
})

