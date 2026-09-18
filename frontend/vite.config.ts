import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During development the frontend calls the backend via a relative "/api"
    // base path; Vite proxies it to the Spring Boot server so the browser never
    // talks to the backend (or any external API) directly.
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_PROXY_TARGET ?? 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.tsx'],
    css: false,
    // Tests must not inherit a local `.env` (e.g. VITE_DATA_SOURCE=api); the
    // provider is chosen explicitly in each test.
    env: { VITE_DATA_SOURCE: '' },
  },
});
