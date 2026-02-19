// Adapter factory — detects site and returns the appropriate adapter

import { find } from 'lodash-es';
import createDebug from '../lib/debug.js';
import { ChesscomAdapter } from './chesscom.js';
import { LichessAdapter } from './lichess.js';

const log = createDebug('chee:adapter-factory');

const ADAPTERS = [
  { test: () => window.location.hostname.includes('chess.com'), create: () => new ChesscomAdapter(), name: 'chess.com' },
  { test: () => window.location.hostname.includes('lichess.org'), create: () => new LichessAdapter(), name: 'lichess' },
];

export function createAdapter() {
  const match = find(ADAPTERS, (a) => a.test());
  if (match) {
    log('Detected site:', match.name);
    return match.create();
  }
  log('No adapter matched, falling back to chess.com');
  return new ChesscomAdapter();
}
