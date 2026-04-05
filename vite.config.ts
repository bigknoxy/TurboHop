import { defineConfig } from 'vite';

export default defineConfig({
  base: '/TurboHop/',
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
