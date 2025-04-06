import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/taxi-game/',
  server: {
    open: true,
    port: 5173
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          cannon: ['cannon-es']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    include: ['three', 'cannon-es']
  }
}); 