import { describe, it, expect } from 'vitest';
import { detectMoveFromBoards, boardDiffToUci } from '../../src/core/board-diff.js';
import { boardFromFen, STARTING_BOARD } from '../helpers.js';

describe('detectMoveFromBoards', () => {
  it('detects a normal pawn move (e2→e4)', () => {
    const after = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    const move = detectMoveFromBoards(STARTING_BOARD, after);
    expect(move).not.toBeNull();
    expect(move.from).toMatchObject({ file: 4, rank: 1, piece: 'P' });
    expect(move.to).toMatchObject({ file: 4, rank: 3, piece: 'P' });
  });

  it('detects a capture (piece replaces opponent piece)', () => {
    // White knight on f3 captures black pawn on e5
    const before = boardFromFen('rnbqkbnr/pppp1ppp/8/4p3/8/5N2/PPPPPPPP/RNBQKB1R');
    const after = boardFromFen('rnbqkbnr/pppp1ppp/8/4N3/8/8/PPPPPPPP/RNBQKB1R');
    const move = detectMoveFromBoards(before, after);
    expect(move).not.toBeNull();
    expect(move.from.piece).toBe('N');
    expect(move.to).toMatchObject({ file: 4, rank: 4, piece: 'N' });
  });

  it('detects kingside castling (white)', () => {
    const before = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQK2R');
    const after = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1RK1');
    const move = detectMoveFromBoards(before, after);
    expect(move).not.toBeNull();
    expect(move.from.piece).toBe('K');
    expect(move.to.piece).toBe('K');
    expect(move.to.file).toBe(6); // g1
  });

  it('detects queenside castling (white)', () => {
    const before = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R3KBNR');
    const after = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/2KR1BNR');
    const move = detectMoveFromBoards(before, after);
    expect(move).not.toBeNull();
    expect(move.from.piece).toBe('K');
    expect(move.to.file).toBe(2); // c1
  });

  it('detects en passant', () => {
    // White pawn on e5, black pawn just moved d7→d5
    const before = boardFromFen('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR');
    const after = boardFromFen('rnbqkbnr/ppp1pppp/3P4/8/8/8/PPPP1PPP/RNBQKBNR');
    const move = detectMoveFromBoards(before, after);
    expect(move).not.toBeNull();
    expect(move.from.piece).toBe('P');
    expect(move.to).toMatchObject({ file: 3, rank: 5 }); // d6
  });

  it('returns null when boards are identical', () => {
    expect(detectMoveFromBoards(STARTING_BOARD, STARTING_BOARD)).toBeNull();
  });

  it('detects capture via changed array (piece replaced by different piece)', () => {
    // White knight captures black pawn: pawn on d5, knight on f3 → Nxd5
    const before = boardFromFen('rnbqkbnr/ppp1pppp/8/3p4/8/5N2/PPPPPPPP/RNBQKB1R');
    // f3 disappears, d5 changes from p to N
    const after = boardFromFen('rnbqkbnr/ppp1pppp/8/3N4/8/8/PPPPPPPP/RNBQKB1R');
    const move = detectMoveFromBoards(before, after);
    expect(move).not.toBeNull();
    expect(move.from.piece).toBe('N');
    expect(move.to).toMatchObject({ file: 3, rank: 4, piece: 'N' });
  });

  it('returns null for ambiguous diff (>2 disappeared, >2 appeared that is not castling)', () => {
    // Completely different boards with many pieces moved
    const before = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    const after = boardFromFen('8/8/8/8/8/8/PPPPPPPP/RNBQKBNR');
    const move = detectMoveFromBoards(before, after);
    // Many pieces disappeared, no matching pattern
    expect(move).toBeNull();
  });
});

describe('boardDiffToUci', () => {
  it('returns UCI string for a normal move', () => {
    const after = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    expect(boardDiffToUci(STARTING_BOARD, after)).toBe('e2e4');
  });

  it('returns UCI string for kingside castling', () => {
    const before = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQK2R');
    const after = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1RK1');
    expect(boardDiffToUci(before, after)).toBe('e1g1');
  });

  it('returns null when boards are identical', () => {
    expect(boardDiffToUci(STARTING_BOARD, STARTING_BOARD)).toBeNull();
  });

  it('appends promotion suffix', () => {
    // White pawn on e7 promotes to queen on e8
    const before = boardFromFen('rnbqkbnr/ppppPppp/8/8/8/8/PPPP1PPP/RNBQKBNR');
    const after = boardFromFen('rnbqQbnr/pppp1ppp/8/8/8/8/PPPP1PPP/RNBQKBNR');
    expect(boardDiffToUci(before, after)).toBe('e7e8q');
  });
});
