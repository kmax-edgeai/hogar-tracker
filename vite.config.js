import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/hogar-tracker/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — casi nunca cambia, se cachea por mucho tiempo
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase — grande (~300 KB), chunk propio
          'vendor-supabase': ['@supabase/supabase-js'],
          // Recharts + dependencias D3 — chunk propio, solo lo descarga quien visita Dashboard
          'vendor-recharts': ['recharts'],
          // Utilidades pequeñas
          'vendor-utils': ['date-fns', 'react-hook-form'],
        },
      },
    },
    // Avisa si algún chunk supera 500 KB
    chunkSizeWarningLimit: 500,
  },
})
