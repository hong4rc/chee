// Shared test helpers for board construction

import { BOARD_SIZE } from '../src/constants.js';

/**
 * Convert a FEN placement string (e.g. 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')
 * into an 8×8 array matching the internal board format.
 */
export function boardFromFen(placement) {
  return placement.split('/').map((rank) => {
    const row = [];
    for (const ch of rank) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < Number(ch); i++) row.push(null);
      } else {
        row.push(ch);
      }
    }
    return row;
  });
}

/** Standard starting position board. */
export const STARTING_BOARD = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');

/** Empty 8×8 board (all nulls). */
export function emptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}
