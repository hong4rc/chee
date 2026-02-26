import { describe, it, expect } from 'vitest';
import { lookupOpening, findBookContinuations } from '../../src/core/openings.js';
import { STARTING_BOARD, boardFromFen } from '../helpers.js';
import { TURN_WHITE, TURN_BLACK } from '../../src/constants.js';

describe('lookupOpening', () => {
  it('returns "Starting Position" for the initial FEN', () => {
    expect(lookupOpening('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'))
      .toBe('Starting Position');
  });

  it('returns opening name for a known position (Sicilian)', () => {
    expect(lookupOpening('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2'))
      .toBe('Sicilian Defense');
  });

  it('returns null for an unknown position', () => {
    expect(lookupOpening('8/8/8/8/8/8/8/8 w - - 0 1')).toBeNull();
  });
});

describe('findBookContinuations', () => {
  it('finds legal first moves from the starting position', () => {
    const continuations = findBookContinuations(STARTING_BOARD, TURN_WHITE);
    expect(continuations.length).toBeGreaterThan(0);

    const ucis = continuations.map((c) => c.uci);
    // Common first moves should be present
    expect(ucis).toContain('e2e4');
    expect(ucis).toContain('d2d4');
  });

  it('each continuation has a name', () => {
    const continuations = findBookContinuations(STARTING_BOARD, TURN_WHITE);
    for (const c of continuations) {
      expect(c.name).toBeTruthy();
      expect(typeof c.name).toBe('string');
    }
  });

  it('filters out illegal moves (no backward pawns)', () => {
    const continuations = findBookContinuations(STARTING_BOARD, TURN_WHITE);
    const ucis = continuations.map((c) => c.uci);
    // Pawns can't move backward from starting position
    for (const uci of ucis) {
      const fromRank = parseInt(uci[1], 10);
      const toRank = parseInt(uci[3], 10);
      // White pawns must move forward (increasing rank)
      if (fromRank === 2) {
        expect(toRank).toBeGreaterThan(fromRank);
      }
    }
  });

  it('returns empty array for a position with no book continuations', () => {
    // A weird board with just kings
    const board = boardFromFen('4k3/8/8/8/8/8/8/4K3');
    const continuations = findBookContinuations(board, TURN_WHITE);
    expect(continuations).toEqual([]);
  });

  it('finds black continuations after 1.e4', () => {
    const board = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    const continuations = findBookContinuations(board, TURN_BLACK);
    expect(continuations.length).toBeGreaterThan(0);
    const ucis = continuations.map((c) => c.uci);
    // Common responses that lead to known openings
    expect(ucis).toContain('c7c5'); // Sicilian
    expect(ucis).toContain('e7e6'); // French
    expect(ucis).toContain('d7d5'); // Scandinavian
  });

  it('finds white continuations after 1.e4 e5', () => {
    const board = boardFromFen('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR');
    const continuations = findBookContinuations(board, TURN_WHITE);
    expect(continuations.length).toBeGreaterThan(0);
    const ucis = continuations.map((c) => c.uci);
    // Common moves after 1.e4 e5
    expect(ucis).toContain('g1f3'); // Nf3
  });

  it('filters blocked pawn moves (piece in front)', () => {
    // Board with a piece blocking the pawn from advancing 2 squares
    // White pawn on e2, but there's a piece on e3
    const board = boardFromFen('rnbqkbnr/pppppppp/8/8/8/4N3/PPPPPPPP/R1BQKBNR');
    const continuations = findBookContinuations(board, TURN_WHITE);
    const ucis = continuations.map((c) => c.uci);
    // e2e4 should NOT be present since e3 is occupied
    expect(ucis).not.toContain('e2e4');
  });

  it('includes knight move continuations from mid-game positions', () => {
    // After 1.e4 d5 — Scandinavian. White's continuations include Nc3.
    const board = boardFromFen('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR');
    const continuations = findBookContinuations(board, TURN_WHITE);
    const ucis = continuations.map((c) => c.uci);
    expect(ucis).toContain('b1c3'); // Scandinavian Defense: Closed
  });

  it('all continuations have plausible piece at from-square', () => {
    // Verify that every continuation returned has the right color piece at the from square
    const board = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    const continuations = findBookContinuations(board, TURN_BLACK);
    for (const c of continuations) {
      const fromFile = c.uci.charCodeAt(0) - 97;
      const fromRank = parseInt(c.uci[1], 10) - 1;
      const piece = board[7 - fromRank][fromFile];
      expect(piece).not.toBeNull();
      // Black pieces are lowercase
      expect(piece).toBe(piece.toLowerCase());
    }
  });
});
