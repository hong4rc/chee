import { describe, it, expect } from 'vitest';
import { isSquareAttacked } from '../../src/core/attacks.js';
import { STARTING_BOARD, emptyBoard, boardFromFen } from '../helpers.js';
import { TURN_WHITE, TURN_BLACK } from '../../src/constants.js';

describe('isSquareAttacked', () => {
  describe('pawn attacks', () => {
    it('white pawn attacks diagonally forward', () => {
      const board = emptyBoard();
      board[7 - 1][4] = 'P'; // white pawn on e2
      // White pawn on e2 attacks d3 and f3
      expect(isSquareAttacked(board, 3, 2, TURN_WHITE)).toBe(true); // d3
      expect(isSquareAttacked(board, 5, 2, TURN_WHITE)).toBe(true); // f3
      // Does not attack e3 (straight ahead)
      expect(isSquareAttacked(board, 4, 2, TURN_WHITE)).toBe(false);
    });

    it('black pawn attacks diagonally downward', () => {
      const board = emptyBoard();
      board[7 - 6][4] = 'p'; // black pawn on e7
      // Black pawn on e7 attacks d6 and f6
      expect(isSquareAttacked(board, 3, 5, TURN_BLACK)).toBe(true); // d6
      expect(isSquareAttacked(board, 5, 5, TURN_BLACK)).toBe(true); // f6
      // Does not attack e6 (straight ahead)
      expect(isSquareAttacked(board, 4, 5, TURN_BLACK)).toBe(false);
    });

    it('pawn at edge of board does not go out of bounds', () => {
      const board = emptyBoard();
      board[7 - 1][0] = 'P'; // white pawn on a2
      expect(isSquareAttacked(board, 1, 2, TURN_WHITE)).toBe(true); // b3
      // Should not crash for file -1
      expect(isSquareAttacked(board, 0, 2, TURN_WHITE)).toBe(false);
    });
  });

  describe('knight attacks', () => {
    it('knight attacks L-shapes', () => {
      const board = emptyBoard();
      board[7 - 3][3] = 'N'; // white knight on d4
      // All 8 knight targets from d4 (file=3, rank=3)
      const targets = [
        [1, 2], [1, 4], [2, 1], [2, 5],
        [4, 1], [4, 5], [5, 2], [5, 4],
      ];
      for (const [f, r] of targets) {
        expect(isSquareAttacked(board, f, r, TURN_WHITE)).toBe(true);
      }
      // Center not attacked
      expect(isSquareAttacked(board, 3, 3, TURN_WHITE)).toBe(false);
    });

    it('black knight attacks', () => {
      const board = emptyBoard();
      board[7 - 4][4] = 'n'; // black knight on e5
      expect(isSquareAttacked(board, 3, 2, TURN_BLACK)).toBe(true); // d3
      expect(isSquareAttacked(board, 5, 6, TURN_BLACK)).toBe(true); // f7
    });
  });

  describe('bishop attacks', () => {
    it('bishop attacks diagonals', () => {
      const board = emptyBoard();
      board[7 - 3][3] = 'B'; // white bishop on d4
      expect(isSquareAttacked(board, 5, 5, TURN_WHITE)).toBe(true); // f6
      expect(isSquareAttacked(board, 1, 1, TURN_WHITE)).toBe(true); // b2
      expect(isSquareAttacked(board, 0, 0, TURN_WHITE)).toBe(true); // a1
    });

    it('bishop is blocked by pieces', () => {
      const board = emptyBoard();
      board[7 - 3][3] = 'B'; // white bishop on d4
      board[7 - 4][4] = 'p'; // blocker on e5
      // f6 should NOT be attacked (blocked by e5)
      expect(isSquareAttacked(board, 5, 5, TURN_WHITE)).toBe(false);
      // e5 itself IS attacked
      expect(isSquareAttacked(board, 4, 4, TURN_WHITE)).toBe(true);
    });
  });

  describe('rook attacks', () => {
    it('rook attacks orthogonally', () => {
      const board = emptyBoard();
      board[7 - 3][3] = 'R'; // white rook on d4
      expect(isSquareAttacked(board, 3, 7, TURN_WHITE)).toBe(true); // d8
      expect(isSquareAttacked(board, 0, 3, TURN_WHITE)).toBe(true); // a4
      expect(isSquareAttacked(board, 7, 3, TURN_WHITE)).toBe(true); // h4
    });

    it('rook is blocked', () => {
      const board = emptyBoard();
      board[7 - 3][3] = 'R'; // white rook on d4
      board[7 - 5][3] = 'p'; // blocker on d6
      expect(isSquareAttacked(board, 3, 5, TURN_WHITE)).toBe(true); // d6 attacked
      expect(isSquareAttacked(board, 3, 6, TURN_WHITE)).toBe(false); // d7 blocked
    });
  });

  describe('queen attacks', () => {
    it('queen attacks diagonals and orthogonals', () => {
      const board = emptyBoard();
      board[7 - 3][3] = 'Q'; // white queen on d4
      expect(isSquareAttacked(board, 3, 7, TURN_WHITE)).toBe(true); // d8 (orthogonal)
      expect(isSquareAttacked(board, 6, 6, TURN_WHITE)).toBe(true); // g7 (diagonal)
      expect(isSquareAttacked(board, 0, 3, TURN_WHITE)).toBe(true); // a4 (orthogonal)
    });
  });

  describe('king attacks', () => {
    it('king attacks adjacent squares', () => {
      const board = emptyBoard();
      board[7 - 3][3] = 'K'; // white king on d4
      expect(isSquareAttacked(board, 3, 4, TURN_WHITE)).toBe(true); // d5
      expect(isSquareAttacked(board, 4, 4, TURN_WHITE)).toBe(true); // e5
      expect(isSquareAttacked(board, 2, 2, TURN_WHITE)).toBe(true); // c3
      // Two squares away: not attacked
      expect(isSquareAttacked(board, 3, 5, TURN_WHITE)).toBe(false); // d6
    });
  });

  describe('empty board', () => {
    it('no square is attacked on an empty board', () => {
      const board = emptyBoard();
      expect(isSquareAttacked(board, 4, 4, TURN_WHITE)).toBe(false);
      expect(isSquareAttacked(board, 4, 4, TURN_BLACK)).toBe(false);
    });
  });

  describe('starting position', () => {
    it('e3 is attacked by white pawns', () => {
      // d2 and f2 pawns attack e3
      expect(isSquareAttacked(STARTING_BOARD, 4, 2, TURN_WHITE)).toBe(true);
    });

    it('e6 is attacked by black pawns', () => {
      // d7 and f7 pawns attack e6
      expect(isSquareAttacked(STARTING_BOARD, 4, 5, TURN_BLACK)).toBe(true);
    });

    it('e4 is not attacked by white in starting position', () => {
      // No white piece attacks e4 initially
      expect(isSquareAttacked(STARTING_BOARD, 4, 3, TURN_WHITE)).toBe(false);
    });

    it('d1 is attacked by white (queen + king)', () => {
      expect(isSquareAttacked(STARTING_BOARD, 3, 0, TURN_WHITE)).toBe(true);
    });
  });
});
