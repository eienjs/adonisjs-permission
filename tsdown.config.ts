import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['index.ts'],
    shims: true,
    format: ['esm'],
    target: 'esnext',
    platform: 'node',
    exports: true,
    unbundle: true,
  },
]);
