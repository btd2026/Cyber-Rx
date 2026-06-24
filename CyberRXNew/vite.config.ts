import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// New CyberRx app — port 5174 so it can run alongside the legacy app (5173).
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
