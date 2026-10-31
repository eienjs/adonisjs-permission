import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'index.ts',
    { 'providers/*': 'providers/*.ts' },
    { 'commands/*': 'commands/*.ts' },
    { 'middleware/*': 'src/middleware/*.ts' },
  ],
  outDir: 'build',
  clean: true,
  format: ['esm'],
  minify: 'dce-only',
  fixedExtension: false,
  dts: true,
  target: 'esnext',
  unbundle: true,
  copy: [
    { from: 'stubs/**/*.stub', to: 'build/stubs', flatten: false },
  ],
});
