// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fuerza 5185 tanto en dev como en preview
export default defineConfig({
  plugins: [react()],
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

