import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/titan-dynamics/',
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } }
});