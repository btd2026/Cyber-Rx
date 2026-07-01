import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// The React app's HTML entry is app.html (served at /app in production), so the
// static prototype can own the root index.html. Port 5174 for local dev.
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spa-fallback-app-html',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url && req.url.startsWith('/app') && !req.url.includes('.')) {
            req.url = '/app.html'
          }
          next()
        })
      },
    },
  ],
  server: {
    port: 5174,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // don't ship source/comments to the client (security review)
    rollupOptions: {
      input: fileURLToPath(new URL('./app.html', import.meta.url)),
    },
  },
})
