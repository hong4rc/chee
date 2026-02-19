// Shared UCI move parsing utility

import { CHAR_CODE_A, UCI_PROMO_LEN } from '../constants.js';

/**
 * Parse a UCI move string (e.g. 'e2e4', 'e7e8q') into components.
 * @param {string} uciMove - UCI move string (4-5 chars)
 * @returns {{ fromFile: number, fromRank: number, toFile: number, toRank: number, promotion: string|null }}
 */
export function parseUci(uciMove) {
  return {
    fromFile: uciMove.charCodeAt(0) - CHAR_CODE_A,
    fromRank: parseInt(uciMove[1], 10) - 1,
    toFile: uciMove.charCodeAt(2) - CHAR_CODE_A,
    toRank: parseInt(uciMove[3], 10) - 1,
    promotion: uciMove.length === UCI_PROMO_LEN ? uciMove[4] : null,
  };
}
