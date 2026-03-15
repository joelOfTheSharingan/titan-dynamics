import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/titan-dynamics/', // important for GitHub Pages
  plugins: [react()],
});