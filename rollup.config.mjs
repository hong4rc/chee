import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/content.js',
  output: {
    file: 'dist/content.js',
    format: 'iife',
  },
  plugins: [
    resolve(),
    copy({
      targets: [
        { src: 'static/*', dest: 'dist' },
      ],
    }),
  ],
};
