import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Express server owns /api, /coa, /media and /sample.csv; during `npm run dev:web` they are proxied to it.
const api = 'http://localhost:3000';
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
  server: {
    port: 5173,
    proxy: { '/api': api, '/coa': api, '/media': api, '/sample.csv': api },
  },
});
