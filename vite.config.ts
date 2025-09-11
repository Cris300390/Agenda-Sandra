import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Agenda Sandra',
        short_name: 'Agenda',
        description: 'Agenda, alumnos y pagos. PWA optimizada para iPhone.',
        start_url: '/',
        display: 'standalone',
        theme_color: '#ec4899',
        background_color: '#ffffff',
        icons: [
          { src: '/vite.svg', sizes: '192x192', type: 'image/svg+xml' }
        ]
      },
      devOptions: {
        // deja desactivado el modo PWA en dev para evitar confusiones de caché
        enabled: false
      }
    })
  ],
  server: {
    port: 5173,
    open: false
  },
  preview: {
    port: 5173,
    open: false
  }
})
