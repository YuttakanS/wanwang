import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// For pure logic only. Components and gestures are checked on real devices.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../src', import.meta.url)),
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
