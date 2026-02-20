// Board diff → UCI move detection (extracted from move-classifier.js)
// Used by both MoveClassifier and PgnPlugin.

import { find } from 'lodash-es';
import {
  BOARD_SIZE, LAST_RANK, FILES, BLACK_PAWN,
  WHITE_KING, BLACK_KING,
  WHITE_QUEEN, BLACK_QUEEN, WHITE_ROOK, BLACK_ROOK,
  WHITE_BISHOP, BLACK_BISHOP, WHITE_KNIGHT, BLACK_KNIGHT,
} from '../constants.js';

// ─── Promotion piece map (FEN char → UCI suffix) ────────────
const PROMO_SUFFIX = {
  [WHITE_QUEEN]: 'q',
  [BLACK_QUEEN]: 'q',
  [WHITE_ROOK]: 'r',
  [BLACK_ROOK]: 'r',
  [WHITE_BISHOP]: 'b',
  [BLACK_BISHOP]: 'b',
  [WHITE_KNIGHT]: 'n',
  [BLACK_KNIGHT]: 'n',
};

export function detectMoveFromBoards(prevBoard, currBoard) {
  const disappeared = [];
  const appeared = [];
  const changed = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const prev = prevBoard[row][col];
      const curr = currBoard[row][col];
      if (prev === curr) continue;

      const file = col;
      const rank = LAST_RANK - row;

      if (prev && !curr) disappeared.push({ file, rank, piece: prev });
      else if (!prev && curr) appeared.push({ file, rank, piece: curr });
      else if (prev && curr) {
        changed.push({
          file, rank, prev, curr,
        });
      }
    }
  }

  // Normal move or capture
  if (disappeared.length === 1 && appeared.length + changed.length === 1) {
    const to = appeared[0]
      ? { file: appeared[0].file, rank: appeared[0].rank, piece: appeared[0].piece }
      : { file: changed[0].file, rank: changed[0].rank, piece: changed[0].curr };
    return { from: disappeared[0], to };
  }

  // Castling
  if (disappeared.length === 2 && appeared.length === 2) {
    const king = find(disappeared, (d) => d.piece === WHITE_KING || d.piece === BLACK_KING);
    if (king) {
      const kingDest = find(appeared, (a) => a.piece === king.piece);
      if (kingDest) return { from: king, to: kingDest };
    }
  }

  // En passant
  if (disappeared.length === 2 && appeared.length === 1) {
    const dest = appeared[0];
    const mover = find(disappeared, (d) => (
      d.piece.toLowerCase() === BLACK_PAWN && Math.abs(d.file - dest.file) === 1
    ));
    if (mover) return { from: mover, to: { file: dest.file, rank: dest.rank, piece: dest.piece } };
  }

  return null;
}

export function boardDiffToUci(prevBoard, currBoard) {
  const move = detectMoveFromBoards(prevBoard, currBoard);
  if (!move) return null;

  let uci = FILES[move.from.file] + (move.from.rank + 1)
    + FILES[move.to.file] + (move.to.rank + 1);

  if (move.from.piece.toLowerCase() === BLACK_PAWN && move.to.piece.toLowerCase() !== BLACK_PAWN) {
    uci += PROMO_SUFFIX[move.to.piece] || '';
  }

  return uci;
}
