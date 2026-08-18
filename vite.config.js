import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    
    // Default base URL fallback for local configurations
    base: command === 'serve' ? '/' : './',
    
    build: {
      // 🚨 FIXED: Changed from your home path to your clean local dist folder!
      outDir: 'dist',
      emptyOutDir: true,
    },
    
    server: {
      port: 5174,
      strictPort: true,
      proxy: { 
        '/api': 'http://localhost:3000' 
      }
    }
  };
});
