import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command }) => {
  // 1. Detect if we are deploying live to GitHub Pages via your command line build process
  const isGitHubDeploy = process.env.npm_lifecycle_event === 'deploy' || process.env.npm_lifecycle_event === 'predeploy';

  return {
    plugins: [react()],
    
    // 2. SMART BASE URL RESOLUTION:
    // - Local dev sandbox uses: '/'
    // - GitHub deployment uses your exact repo folder name: '/titan-dynamics/'
    // - Local home build copy uses your workspace path: '/home/titan/'
    base: command === 'serve' 
      ? '/' 
      : (isGitHubDeploy ? '/titan-dynamics/' : '/home/titan/'),
    
    build: {
      // 3. Keep output pointing to your local homepage app project space
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
