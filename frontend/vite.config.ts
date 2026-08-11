import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '')
  const backendUrl = env.BACKEND_URL || 'http://localhost:8000'
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: { '/api': { target: backendUrl, changeOrigin: true } },
      watch: { usePolling: true },
    },
  }
})
