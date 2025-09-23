import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import parsejson from 'vite-plugin-parse-js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), parsejson()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    // Define environment variables for client-side
    'process.env.NEXT_PUBLIC_ENABLE_TESTNETS': JSON.stringify(process.env.NEXT_PUBLIC_ENABLE_TESTNETS || 'false'),
  },
})