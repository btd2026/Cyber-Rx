import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // let the engine's ".js" ESM specifiers resolve to their ".ts" sources
    extensions: ['.ts', '.js', '.json'],
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
