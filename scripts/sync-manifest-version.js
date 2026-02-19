#!/usr/bin/env node
// Syncs the version from package.json (bumped by release-it) into manifest.json

const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const version = process.argv[2];
if (!version) {
  console.error('Usage: sync-manifest-version.js <version>');
  process.exit(1);
}

const manifestPath = resolve(__dirname, '..', 'static', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.version = version;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`manifest.json version → ${version}`);
