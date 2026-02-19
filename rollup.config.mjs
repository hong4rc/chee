import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';

const shared = { plugins: [resolve()] };

export default [
  {
    ...shared,
    input: 'src/content.js',
    output: { file: 'dist/content.js', format: 'iife' },
    plugins: [
      resolve(),
      copy({ targets: [{ src: 'static/*', dest: 'dist' }] }),
    ],
  },
  {
    ...shared,
    input: 'src/popup.js',
    output: { file: 'dist/popup.js', format: 'iife' },
  },
];
