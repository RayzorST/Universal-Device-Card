import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';

const dev = process.env.ROLLUP_WATCH === 'true';

export default {
  input: 'src/universal-device-card.ts',
  output: {
    file: 'dist/universal-device-card.js',
    format: 'es',
    sourcemap: dev,
    inlineDynamicImports: true,
  },
  plugins: [
    json(), 
    resolve({
      browser: true,
      dedupe: ['lit', 'custom-card-helpers'],
    }),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: dev,
      declaration: false,
      declarationMap: false,
    }),
    !dev && terser({
      compress: { defaults: true, drop_console: true },
      format: { comments: false },
    }),
  ],
};