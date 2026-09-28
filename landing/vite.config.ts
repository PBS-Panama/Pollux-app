import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // React + router + state in a stable vendor chunk → cache survives app deploys.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand', 'axios'],
        },
      },
    },
  },
})
