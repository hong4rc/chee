import { describe, it, expect } from 'vitest';
import { boardToFen } from '../../src/core/fen.js';
import { boardFromFen, STARTING_BOARD, emptyBoard } from '../helpers.js';

describe('boardToFen', () => {
  it('generates FEN for the starting position', () => {
    const fen = boardToFen(STARTING_BOARD, 'w', 'KQkq', '-', 1);
    expect(fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  it('generates FEN for a mid-game position (after 1.e4)', () => {
    const board = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    const fen = boardToFen(board, 'b', 'KQkq', 'e3', 1);
    expect(fen).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
  });

  it('collapses consecutive empty squares', () => {
    const board = emptyBoard();
    board[0][0] = 'k'; // a8
    board[7][7] = 'K'; // h1
    const fen = boardToFen(board, 'w', '-', '-', 1);
    expect(fen).toBe('k7/8/8/8/8/8/8/7K w - - 0 1');
  });

  it('handles a rank with alternating pieces and gaps', () => {
    const board = emptyBoard();
    // Row 0 = rank 8: R . . . k . . R
    board[0][0] = 'R';
    board[0][4] = 'k';
    board[0][7] = 'R';
    const fen = boardToFen(board, 'b', '-', '-', 50);
    expect(fen.startsWith('R3k2R/8')).toBe(true);
  });
});
