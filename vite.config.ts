import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ajuste de "base" según el comando:
// - dev/preview => '/'
// - build (para GitHub Pages) => '/Agenda-Sandra/'
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Agenda-Sandra/' : '/',
  plugins: [react()],
<<<<<<< HEAD
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


=======
}))
>>>>>>> 842ad52 (style(header): fuentes y botones topnav)
