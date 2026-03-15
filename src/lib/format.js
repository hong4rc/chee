// Shared score formatting utilities used by panel renderers.

import { MATE_PREFIX, MATE_NEG_PREFIX } from '../constants.js';

const CLS_WHITE_ADV = 'white-advantage';
const CLS_BLACK_ADV = 'black-advantage';
export const CLS_MATE = 'mate-score';

export function advantageCls(isWhite) {
  return isWhite ? CLS_WHITE_ADV : CLS_BLACK_ADV;
}

export function formatMate(wMate) {
  const prefix = wMate > 0 ? MATE_PREFIX : MATE_NEG_PREFIX;
  return prefix + Math.abs(wMate);
}

export function formatCp(cp) {
  return (cp >= 0 ? '+' : '') + cp.toFixed(1);
}
