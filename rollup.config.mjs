import { execSync } from 'child_process';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import copy from 'rollup-plugin-copy';

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

const shared = {
  plugins: [
    resolve(),
    replace({
      preventAssignment: true,
      __COMMIT_HASH__: JSON.stringify(commitHash),
    }),
  ],
};

export default [
  {
    input: 'src/content.js',
    output: { file: 'dist/content.js', format: 'iife' },
    plugins: [
      ...shared.plugins,
      copy({ targets: [{ src: 'static/*', dest: 'dist' }] }),
    ],
  },
  {
    input: 'src/popup.js',
    output: { file: 'dist/popup.js', format: 'iife' },
    plugins: [...shared.plugins],
  },
];
