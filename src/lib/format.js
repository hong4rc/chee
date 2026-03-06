// Shared score formatting utilities used by panel renderers.

const CLS_WHITE_ADV = 'white-advantage';
const CLS_BLACK_ADV = 'black-advantage';
export const CLS_MATE = 'mate-score';

export function advantageCls(isWhite) {
  return isWhite ? CLS_WHITE_ADV : CLS_BLACK_ADV;
}

export function formatMate(wMate) {
  return (wMate > 0 ? 'M' : '-M') + Math.abs(wMate);
}

export function formatCp(cp) {
  return (cp >= 0 ? '+' : '') + cp.toFixed(1);
}
