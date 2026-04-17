import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/trading/',
  plugins: [react()],
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:5649',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
      }
    }
  }
})
