import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/bin/vited-create.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
});
