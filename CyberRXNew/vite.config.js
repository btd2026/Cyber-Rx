import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// New app — runs on a separate port (5174) so it can run alongside the
// existing `frontend/` app (5173) without colliding.
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
