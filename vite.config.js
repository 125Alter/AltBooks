import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Запросы /api/* проксируются на Express — так cookie сессии работает без CORS.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } },
});
