import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      // Audit P2-15: the scanner calls '/analyze' on the dev server, so this proxy is the hop
      // that reaches the vision service. It must carry the same internal credential Express
      // uses. Read here in the Vite (Node) config, never exposed to the client bundle.
      '/analyze': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        headers: process.env.VISION_INTERNAL_TOKEN
          ? { 'x-vision-token': process.env.VISION_INTERNAL_TOKEN }
          : {}
      },
    }
  }
})
