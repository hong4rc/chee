import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: [
        'src/content.js',
        'src/popup.js',
        'src/core/renderers/**',
        'src/core/panel.js',
        'src/core/arrow.js',
        'src/adapters/**',
      ],
    },
  },
});
