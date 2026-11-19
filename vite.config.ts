import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ab-test-peeking-simulator/',
  test: {
    globals: true,
    environment: 'node',
  },
});
