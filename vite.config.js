import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    
    // Dynamic Base Path resolution based on environment states
    base: command === 'serve' ? '/' : '/home/titan/',
    
    build: {
      // Maps to your homepage project distribution directory folder
      outDir: path.resolve(__dirname, '../home/titan'),
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
