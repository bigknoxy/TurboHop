import { defineConfig } from 'vite';

export default defineConfig({
  base: '/turbohop/',
  build: {
    target: 'ES2020',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});
