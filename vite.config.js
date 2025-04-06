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
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'three': resolve(__dirname, 'node_modules/three'),
      'cannon-es': resolve(__dirname, 'node_modules/cannon-es')
    }
  },
  optimizeDeps: {
    include: ['three', 'cannon-es']
  }
}); 