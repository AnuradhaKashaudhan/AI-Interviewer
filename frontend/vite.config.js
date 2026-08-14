import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy ALL /api requests to FastAPI backend.
      // This avoids CORS entirely for same-origin requests from the browser.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // Needed so that Set-Cookie headers from FastAPI are forwarded to browser
        cookieDomainRewrite: 'localhost',
      },
    },
  },
});
