import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Em desenvolvimento, as chamadas para /api vão para o servidor Node (npm run dev:api).
    proxy: {
      '/api': `http://localhost:${process.env.SESFA_PORTA ?? 3333}`,
    },
  },
});
