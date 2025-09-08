import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Agenda Sandra',
        short_name: 'Agenda',
        theme_color: '#f43f5e',
        background_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        description: 'Agenda, alumnos y pagos. PWA optimizada para iPhone.',
        icons: [
          { src: '/vite.svg', sizes: '192x192', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
})
