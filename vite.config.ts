import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, Vite sert le bureau (port 5174) et passe la connexion /ws au pont (port 4848).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: { '/ws': { target: 'ws://127.0.0.1:4848', ws: true }, '/apercu': { target: 'http://127.0.0.1:4848' } },
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
});
