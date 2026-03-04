import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages deploys under /vut-fisheries-geospatial/
// Set VITE_BASE=/ for local dev or custom domain
const base = process.env.VITE_BASE || '/vut-fisheries-geospatial/';

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
  },
});
