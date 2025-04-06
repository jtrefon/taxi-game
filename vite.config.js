import { defineConfig } from 'vite';

export default defineConfig({
  base: '/taxi-game/',
  server: {
    open: true,
    port: 5173
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  resolve: {
    alias: {
      'three': 'three'
    }
  },
  optimizeDeps: {
    include: ['three', 'cannon-es']
  }
}); 