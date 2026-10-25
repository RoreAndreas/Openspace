import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, Vite sert le bureau (port 5174) et passe les appels /api au Worker lancé avec
// « npx wrangler dev » (port 8787).
const api = { '/api': { target: 'http://127.0.0.1:8787' } };

export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true, proxy: api },
  preview: { port: 4173, proxy: api },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
});
