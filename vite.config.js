import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    
    // 🚀 FIXED: Use '/' for local dev, and '/titan-dynamics/' for production builds
    base: command === 'serve' ? '/' : '/titan-dynamics/',
    
    build: {
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
