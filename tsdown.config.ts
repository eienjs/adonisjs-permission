import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'index.ts',
    { types: 'src/types/main.ts' },
    { 'providers/*': 'providers/*.ts' },
    { 'middleware/*': 'src/middleware/*.ts' },
    { 'commands/*': 'commands/*.ts' },
  ],
  outDir: 'build',
  clean: true,
  format: ['esm'],
  minify: 'dce-only',
  fixedExtension: false,
  dts: true,
  target: 'esnext',
  exports: {
    customExports(pkg, _context) {
      pkg['./commands'] = './build/commands/main.js';

      return pkg;
    },
  },
  unbundle: true,
  copy: [
    { from: 'stubs/**/*.stub', to: 'build/stubs', flatten: false },
  ],
});
