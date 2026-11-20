import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev proxy: the browser calls /api on the same origin (localhost:5173) and Vite forwards it
    // to the backend. Same origin = no CORS, and the SameSite=Strict refresh cookie just works.
    // In production, Nginx does the same job as a reverse proxy.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: false },
    },
  },
})
