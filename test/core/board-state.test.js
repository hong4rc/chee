import { describe, it, expect } from 'vitest';
import { BoardState } from '../../src/core/board-state.js';
import { boardFromFen, STARTING_BOARD, emptyBoard } from '../helpers.js';
import { TURN_WHITE, TURN_BLACK } from '../../src/constants.js';

describe('BoardState', () => {
  it('starts with null/default values', () => {
    const bs = new BoardState();
    expect(bs.board).toBeNull();
    expect(bs.fen).toBeNull();
    expect(bs.turn).toBeNull();
    expect(bs.ply).toBe(0);
    expect(bs.isValid).toBe(false);
  });

  it('update() sets all fields', () => {
    const bs = new BoardState();
    bs.update(STARTING_BOARD, 0, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', TURN_WHITE);
    expect(bs.board).toBe(STARTING_BOARD);
    expect(bs.ply).toBe(0);
    expect(bs.turn).toBe(TURN_WHITE);
    expect(bs.isValid).toBe(true);
  });

  it('boardEquals() returns true for identical boards', () => {
    const bs = new BoardState();
    bs.update(STARTING_BOARD, 0, 'fen', TURN_WHITE);
    const copy = STARTING_BOARD.map((row) => [...row]);
    expect(bs.boardEquals(copy)).toBe(true);
  });

  it('boardEquals() returns false for different boards', () => {
    const bs = new BoardState();
    bs.update(STARTING_BOARD, 0, 'fen', TURN_WHITE);
    const different = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    expect(bs.boardEquals(different)).toBe(false);
  });

  it('boardEquals() returns false when board is null', () => {
    const bs = new BoardState();
    expect(bs.boardEquals(STARTING_BOARD)).toBe(false);
  });

  it('boardEquals() returns false when other is null', () => {
    const bs = new BoardState();
    bs.update(STARTING_BOARD, 0, 'fen', TURN_WHITE);
    expect(bs.boardEquals(null)).toBe(false);
  });

  it('isValid returns false when only board is set (no FEN)', () => {
    const bs = new BoardState();
    // Directly set board without full update — not exposed, but testing initial state
    expect(bs.isValid).toBe(false);
  });

  it('setBoardEl() and boardEl getter', () => {
    const bs = new BoardState();
    const mockEl = { id: 'board' };
    bs.setBoardEl(mockEl);
    expect(bs.boardEl).toBe(mockEl);
  });
});

describe('detectTurnFromDiff', () => {
  it('white piece moved → black\'s turn', () => {
    const bs = new BoardState();
    bs.update(STARTING_BOARD, 0, 'fen', TURN_WHITE);
    const after = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    expect(bs.detectTurnFromDiff(after)).toBe(TURN_BLACK);
  });

  it('black piece moved → white\'s turn', () => {
    const before = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    const bs = new BoardState();
    bs.update(before, 1, 'fen', TURN_BLACK);
    const after = boardFromFen('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR');
    expect(bs.detectTurnFromDiff(after)).toBe(TURN_WHITE);
  });

  it('returns null when more than 4 squares changed (e.g. board reset)', () => {
    const bs = new BoardState();
    bs.update(STARTING_BOARD, 0, 'fen', TURN_WHITE);
    const empty = emptyBoard();
    expect(bs.detectTurnFromDiff(empty)).toBeNull();
  });

  it('returns null when no board is set', () => {
    const bs = new BoardState();
    expect(bs.detectTurnFromDiff(STARTING_BOARD)).toBeNull();
  });
});
