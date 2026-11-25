import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-tanstack': ['@tanstack/react-router'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
