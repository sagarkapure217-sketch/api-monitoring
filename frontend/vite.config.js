import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'https://api-monitoring-production.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
      '/monitors': {
        target: 'https://api-monitoring-production.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
      '/health': {
        target: 'https://api-monitoring-production.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})