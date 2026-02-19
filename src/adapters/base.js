// BoardAdapter interface (abstract base class)
/* eslint-disable no-unused-vars */

import {
  FILES, LAST_RANK,
  WHITE_KING, WHITE_QUEEN, WHITE_ROOK, WHITE_PAWN,
  BLACK_KING, BLACK_QUEEN, BLACK_ROOK, BLACK_PAWN,
  KING_START_FILE, KINGSIDE_ROOK_FILE, QUEENSIDE_ROOK_FILE,
  WHITE_BACK_ROW, BLACK_BACK_ROW,
} from '../constants.js';

// ─── Shared detection logic ─────────────────────────────────

export function detectCastlingFromBoard(board) {
  let castling = '';
  if (board[WHITE_BACK_ROW][KING_START_FILE] === WHITE_KING) {
    if (board[WHITE_BACK_ROW][KINGSIDE_ROOK_FILE] === WHITE_ROOK) castling += WHITE_KING;
    if (board[WHITE_BACK_ROW][QUEENSIDE_ROOK_FILE] === WHITE_ROOK) castling += WHITE_QUEEN;
  }
  if (board[BLACK_BACK_ROW][KING_START_FILE] === BLACK_KING) {
    if (board[BLACK_BACK_ROW][KINGSIDE_ROOK_FILE] === BLACK_ROOK) castling += BLACK_KING;
    if (board[BLACK_BACK_ROW][QUEENSIDE_ROOK_FILE] === BLACK_ROOK) castling += BLACK_QUEEN;
  }
  return castling || '-';
}

export function detectEnPassantFromSquares(squares, board) {
  if (squares.length < 2) return '-';
  const s0 = squares[0];
  const s1 = squares[1];
  if (s0.file !== s1.file || Math.abs(s0.rank - s1.rank) !== 2) return '-';

  const p0 = board[LAST_RANK - s0.rank][s0.file];
  const p1 = board[LAST_RANK - s1.rank][s1.file];
  let toSq;
  let fromSq;
  if (p0 === WHITE_PAWN || p0 === BLACK_PAWN) {
    toSq = s0;
    fromSq = s1;
  } else if (p1 === WHITE_PAWN || p1 === BLACK_PAWN) {
    toSq = s1;
    fromSq = s0;
  } else {
    return '-';
  }

  const epRank = (fromSq.rank + toSq.rank) / 2;
  return FILES[toSq.file] + (epRank + 1);
}

// ─── Base class ─────────────────────────────────────────────

export class BoardAdapter {
  constructor() {
    this._observer = null;
    this._moveListObserver = null;
  }

  findBoard() { throw new Error('Not implemented'); }
  readPieces(boardEl) { throw new Error('Not implemented'); }
  detectTurn() { throw new Error('Not implemented'); }
  detectMoveCount() { throw new Error('Not implemented'); }
  getPanelAnchor(boardEl) { throw new Error('Not implemented'); }
  isFlipped(boardEl) { throw new Error('Not implemented'); }
  observe(boardEl, onChange) { throw new Error('Not implemented'); }

  detectCastling(board) {
    return detectCastlingFromBoard(board);
  }

  detectEnPassant(board) { throw new Error('Not implemented'); }

  // Optional methods — no-op by default, overridden by adapters that need them
  findAlternatePieceContainer() { return null; }
  exploreBoardArea() {}

  disconnect() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._moveListObserver) {
      this._moveListObserver.disconnect();
      this._moveListObserver = null;
    }
  }
}
