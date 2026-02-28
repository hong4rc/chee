#!/usr/bin/env node
// Pre-push hook: skip tests if they already passed for the current HEAD.
// The .test-passed marker is written by posttest (see package.json).

const { readFileSync, existsSync } = require('fs');
const { execSync } = require('child_process');

const marker = '.test-passed';
const head = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

if (existsSync(marker) && readFileSync(marker, 'utf8').trim() === head) {
  console.log('Tests already passed for this commit, skipping');
  process.exit(0);
}

try {
  execSync('npm test', { stdio: 'inherit' });
} catch {
  process.exit(1);
}
