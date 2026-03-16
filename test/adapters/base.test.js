import { describe, it, expect } from 'vitest';
import {
  detectCastlingFromBoard,
  detectEnPassantFromSquares,
  BoardAdapter,
} from '../../src/adapters/base.js';
import { boardFromFen, STARTING_BOARD, emptyBoard } from '../helpers.js';
import {
  FEN_NONE,
  WHITE_PAWN,
  BLACK_PAWN,
} from '../../src/constants.js';

// ─── Minimal subclass for detectLastMove tests ──────────────

class TestAdapter extends BoardAdapter {
  constructor(highlights, pieces) {
    super();
    this._highlights = highlights;
    this._pieces = pieces;
  }

  _getHighlightedSquares() {
    return this._highlights;
  }

  readPieces() {
    return this._pieces;
  }
}

// ─── detectCastlingFromBoard ────────────────────────────────

describe('detectCastlingFromBoard', () => {
  it('returns full castling rights for starting position', () => {
    expect(detectCastlingFromBoard(STARTING_BOARD)).toBe('KQkq');
  });

  it('returns "-" for an empty board', () => {
    expect(detectCastlingFromBoard(emptyBoard())).toBe(FEN_NONE);
  });

  it('detects white kingside only when queenside rook is missing', () => {
    const board = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/4K2R');
    expect(detectCastlingFromBoard(board)).toBe('Kkq');
  });

  it('detects white queenside only when kingside rook is missing', () => {
    const board = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R3K3');
    expect(detectCastlingFromBoard(board)).toBe('Qkq');
  });

  it('returns no white castling when white king is missing', () => {
    const board = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R6R');
    expect(detectCastlingFromBoard(board)).toBe('kq');
  });

  it('detects black kingside only when queenside rook is missing', () => {
    const board = boardFromFen('4k2r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(detectCastlingFromBoard(board)).toBe('KQk');
  });

  it('detects black queenside only when kingside rook is missing', () => {
    const board = boardFromFen('r3k3/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(detectCastlingFromBoard(board)).toBe('KQq');
  });

  it('returns no black castling when black king is missing', () => {
    const board = boardFromFen('r6r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(detectCastlingFromBoard(board)).toBe('KQ');
  });

  it('returns "-" when both kings moved off starting file', () => {
    const board = boardFromFen('r4k1r/pppppppp/8/8/8/8/PPPPPPPP/R4K1R');
    expect(detectCastlingFromBoard(board)).toBe(FEN_NONE);
  });
});

// ─── detectEnPassantFromSquares ─────────────────────────────

describe('detectEnPassantFromSquares', () => {
  it('returns "-" when fewer than 2 squares', () => {
    const board = emptyBoard();
    expect(detectEnPassantFromSquares([], board)).toBe(FEN_NONE);
    expect(detectEnPassantFromSquares([{ file: 4, rank: 3 }], board)).toBe(FEN_NONE);
  });

  it('returns "-" when squares are not on the same file', () => {
    const board = emptyBoard();
    board[7 - 3][4] = WHITE_PAWN;
    const squares = [{ file: 4, rank: 3 }, { file: 5, rank: 1 }];
    expect(detectEnPassantFromSquares(squares, board)).toBe(FEN_NONE);
  });

  it('returns "-" when rank difference is not 2', () => {
    const board = emptyBoard();
    board[7 - 2][4] = WHITE_PAWN;
    const squares = [{ file: 4, rank: 2 }, { file: 4, rank: 1 }];
    expect(detectEnPassantFromSquares(squares, board)).toBe(FEN_NONE);
  });

  it('detects white pawn double push (e2→e4)', () => {
    // White pawn on e4 (rank 3), highlight on e4 and e2
    const board = emptyBoard();
    board[7 - 3][4] = WHITE_PAWN; // e4 = file 4, rank 3
    const squares = [{ file: 4, rank: 3 }, { file: 4, rank: 1 }];
    expect(detectEnPassantFromSquares(squares, board)).toBe('e3');
  });

  it('detects black pawn double push (d7→d5)', () => {
    // Black pawn on d5 (rank 4), highlight on d5 and d7
    const board = emptyBoard();
    board[7 - 4][3] = BLACK_PAWN; // d5 = file 3, rank 4
    const squares = [{ file: 3, rank: 4 }, { file: 3, rank: 6 }];
    expect(detectEnPassantFromSquares(squares, board)).toBe('d6');
  });

  it('works when pawn square is second in array', () => {
    const board = emptyBoard();
    board[7 - 3][0] = WHITE_PAWN; // a4 = file 0, rank 3
    const squares = [{ file: 0, rank: 1 }, { file: 0, rank: 3 }];
    expect(detectEnPassantFromSquares(squares, board)).toBe('a3');
  });

  it('returns "-" when neither square has a pawn', () => {
    const board = emptyBoard();
    board[7 - 3][4] = 'N'; // knight, not a pawn
    const squares = [{ file: 4, rank: 3 }, { file: 4, rank: 1 }];
    expect(detectEnPassantFromSquares(squares, board)).toBe(FEN_NONE);
  });
});

// ─── BoardAdapter.detectLastMove ────────────────────────────

describe('BoardAdapter.detectLastMove', () => {
  it('returns null when no highlights are available', () => {
    const adapter = new TestAdapter(null, []);
    expect(adapter.detectLastMove()).toBeNull();
  });

  it('returns null when fewer than 2 highlights', () => {
    const adapter = new TestAdapter([{ file: 4, rank: 3 }], []);
    expect(adapter.detectLastMove()).toBeNull();
  });

  it('detects from/to when first square is empty and second is occupied', () => {
    const sq0 = { file: 4, rank: 1 }; // e2 — empty (piece moved away)
    const sq1 = { file: 4, rank: 3 }; // e4 — occupied (piece landed)
    const pieces = [{ file: 4, rank: 3, piece: WHITE_PAWN }];
    const adapter = new TestAdapter([sq0, sq1], pieces);

    const move = adapter.detectLastMove();
    expect(move).toEqual({ from: sq0, to: sq1 });
  });

  it('detects from/to when second square is empty and first is occupied', () => {
    const sq0 = { file: 4, rank: 3 }; // e4 — occupied (piece landed)
    const sq1 = { file: 4, rank: 1 }; // e2 — empty (piece moved away)
    const pieces = [{ file: 4, rank: 3, piece: WHITE_PAWN }];
    const adapter = new TestAdapter([sq0, sq1], pieces);

    const move = adapter.detectLastMove();
    expect(move).toEqual({ from: sq1, to: sq0 });
  });

  it('returns null when both squares are occupied (ambiguous)', () => {
    const sq0 = { file: 4, rank: 1 };
    const sq1 = { file: 4, rank: 3 };
    const pieces = [
      { file: 4, rank: 1, piece: WHITE_PAWN },
      { file: 4, rank: 3, piece: WHITE_PAWN },
    ];
    const adapter = new TestAdapter([sq0, sq1], pieces);

    expect(adapter.detectLastMove()).toBeNull();
  });

  it('returns null when both squares are empty', () => {
    const sq0 = { file: 4, rank: 1 };
    const sq1 = { file: 4, rank: 3 };
    const adapter = new TestAdapter([sq0, sq1], []);

    expect(adapter.detectLastMove()).toBeNull();
  });

  it('works with multiple pieces on the board', () => {
    const sq0 = { file: 1, rank: 0 }; // b1 — empty (knight moved away)
    const sq1 = { file: 2, rank: 2 }; // c3 — occupied (knight landed)
    const pieces = [
      { file: 0, rank: 0, piece: 'R' },
      { file: 2, rank: 2, piece: 'N' }, // knight on c3
      { file: 4, rank: 0, piece: 'K' },
    ];
    const adapter = new TestAdapter([sq0, sq1], pieces);

    const move = adapter.detectLastMove();
    expect(move).toEqual({ from: sq0, to: sq1 });
  });
});
