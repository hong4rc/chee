// BoardState value object: encapsulates board array, ply, FEN, turn, and board element.
// Owns diff-based turn detection and board equality checks.

import { BOARD_SIZE, TURN_WHITE, TURN_BLACK } from '../constants.js';

export class BoardState {
  constructor() {
    this._board = null;
    this._ply = 0;
    this._fen = null;
    this._turn = null;
    this._boardEl = null;
  }

  get board() { return this._board; }
  get ply() { return this._ply; }
  get fen() { return this._fen; }
  get turn() { return this._turn; }
  get boardEl() { return this._boardEl; }
  get isValid() { return this._board !== null && this._fen !== null; }

  update(board, ply, fen, turn) {
    this._board = board;
    this._ply = ply;
    this._fen = fen;
    this._turn = turn;
  }

  setBoardEl(el) {
    this._boardEl = el;
  }

  boardEquals(other) {
    if (!this._board || !other) return false;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (this._board[row][col] !== other[row][col]) return false;
      }
    }
    return true;
  }

  // Detect whose turn it is by diffing current board against a new board.
  // If a piece moved (<=4 squares changed), the arrived piece's color tells us who moved.
  // Returns the side to move NEXT, or null if the diff is ambiguous.
  detectTurnFromDiff(newBoard) {
    if (!this._board) return null;
    let changes = 0;
    let arrivedPiece = null;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (this._board[row][col] !== newBoard[row][col]) {
          changes += 1;
          if (changes > 4) return null;
          const c = newBoard[row][col];
          if (c && c !== this._board[row][col] && !arrivedPiece) arrivedPiece = c;
        }
      }
    }
    if (!arrivedPiece) return null;
    return arrivedPiece === arrivedPiece.toUpperCase() ? TURN_BLACK : TURN_WHITE;
  }
}
