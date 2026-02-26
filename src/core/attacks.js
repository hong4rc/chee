// Pure utility: check if a board square is attacked by a given color.
// Uses the same board indexing as san.js: board[LAST_RANK - rank][file].

import {
  BOARD_SIZE, LAST_RANK,
  WHITE_PAWN, WHITE_KNIGHT, WHITE_BISHOP, WHITE_ROOK, WHITE_QUEEN, WHITE_KING,
  TURN_WHITE,
} from '../constants.js';

const KNIGHT_OFFSETS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

const KING_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function inBounds(f, r) {
  return f >= 0 && f < BOARD_SIZE && r >= 0 && r < BOARD_SIZE;
}

function isColor(piece, byWhite) {
  if (!piece) return false;
  return byWhite ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
}

function pieceType(piece) {
  return piece ? piece.toUpperCase() : null;
}

function slidingAttack(board, file, rank, dirs, types, byWhite) {
  for (let d = 0; d < dirs.length; d++) {
    const [df, dr] = dirs[d];
    let f = file + df;
    let r = rank + dr;
    while (inBounds(f, r)) {
      const p = board[LAST_RANK - r][f];
      if (p) {
        if (isColor(p, byWhite) && types.includes(pieceType(p))) return true;
        break; // blocked
      }
      f += df;
      r += dr;
    }
  }
  return false;
}

/**
 * Check whether a square is attacked by the given color.
 * @param {Array<Array<string|null>>} board - 8x8 board array
 * @param {number} file - 0-7
 * @param {number} rank - 0-7
 * @param {string} byColor - TURN_WHITE or TURN_BLACK
 * @returns {boolean}
 */
export function isSquareAttacked(board, file, rank, byColor) {
  const byWhite = byColor === TURN_WHITE;

  // Pawn attacks (pawns attack diagonally forward from their perspective)
  if (byWhite) {
    // White pawns attack upward: a white pawn on (f, rank-1) attacks (file, rank)
    if (inBounds(file - 1, rank - 1) && board[LAST_RANK - (rank - 1)][file - 1] === WHITE_PAWN) return true;
    if (inBounds(file + 1, rank - 1) && board[LAST_RANK - (rank - 1)][file + 1] === WHITE_PAWN) return true;
  } else {
    // Black pawns attack downward: a black pawn on (f, rank+1) attacks (file, rank)
    const bp = WHITE_PAWN.toLowerCase();
    if (inBounds(file - 1, rank + 1) && board[LAST_RANK - (rank + 1)][file - 1] === bp) return true;
    if (inBounds(file + 1, rank + 1) && board[LAST_RANK - (rank + 1)][file + 1] === bp) return true;
  }

  // Knight attacks
  for (let i = 0; i < KNIGHT_OFFSETS.length; i++) {
    const [df, dr] = KNIGHT_OFFSETS[i];
    const f = file + df;
    const r = rank + dr;
    if (inBounds(f, r)) {
      const p = board[LAST_RANK - r][f];
      if (p && isColor(p, byWhite) && pieceType(p) === WHITE_KNIGHT) return true;
    }
  }

  // King adjacency
  for (let i = 0; i < KING_OFFSETS.length; i++) {
    const [df, dr] = KING_OFFSETS[i];
    const f = file + df;
    const r = rank + dr;
    if (inBounds(f, r)) {
      const p = board[LAST_RANK - r][f];
      if (p && isColor(p, byWhite) && pieceType(p) === WHITE_KING) return true;
    }
  }

  // Bishop / Queen (diagonal)
  if (slidingAttack(board, file, rank, BISHOP_DIRS, [WHITE_BISHOP, WHITE_QUEEN], byWhite)) return true;

  // Rook / Queen (orthogonal)
  if (slidingAttack(board, file, rank, ROOK_DIRS, [WHITE_ROOK, WHITE_QUEEN], byWhite)) return true;

  return false;
}
