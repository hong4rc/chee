import { FlatCompat } from '@eslint/eslintrc';
import globals from 'globals';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends('airbnb-base'),
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        chrome: 'readonly',
      },
    },
    rules: {
      'no-console': 'error',
      'no-underscore-dangle': 'off',
      'class-methods-use-this': 'off',
      'no-plusplus': 'off',
      'no-continue': 'off',
      'no-param-reassign': ['error', { props: false }],
      'no-restricted-syntax': 'off',
      'import/extensions': ['error', 'always'],
      'import/prefer-default-export': 'off',
      'max-len': ['error', { code: 120, ignoreUrls: true, ignoreStrings: true }],
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    },
  },
  {
    files: ['static/stockfish-worker.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.worker,
        self: 'readonly',
      },
    },
    rules: {
      'no-eval': 'off',
      'import/extensions': 'off',
      'no-console': 'off',
      strict: 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'static/stockfish.js', 'static/stockfish.wasm'],
  },
];
