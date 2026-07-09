import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'index.ts',
  ],
  outDir: 'build',
  clean: true,
  format: ['esm'],
  minify: 'dce-only',
  fixedExtension: false,
  dts: true,
  target: 'esnext',
  exports: true,
  // exports: {
  //   customExports(pkg, _context) {
  //     pkg['./commands'] = './build/commands/main.js';

  //     return pkg;
  //   },
  // }, // Add this back when need commands
  unbundle: true,
  deps: {
    skipNodeModulesBundle: true,
  },
  copy: [
    { from: 'stubs/**/*.stub', to: 'build/stubs', flatten: false },
  ],
});
