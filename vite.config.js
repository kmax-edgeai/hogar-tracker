import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change 'hogar-tracker' to your GitHub repository name
export default defineConfig({
  plugins: [react()],
  base: '/hogar-tracker/',
})
