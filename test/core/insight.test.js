import { describe, it, expect } from 'vitest';
import { detectInsight } from '../../src/core/insight.js';
import { boardFromFen, STARTING_BOARD } from '../helpers.js';
import { TURN_WHITE, TURN_BLACK } from '../../src/constants.js';

describe('detectInsight', () => {
  it('detects right piece, wrong square', () => {
    // Played e2e3, best was e2e4 — same from-square, different to-square
    const result = detectInsight('e2e3', 'e2e4', ['e2e4', 'd7d5'], STARTING_BOARD, TURN_WHITE);
    expect(result).toContain('Right piece');
    expect(result).toContain('e4');
  });

  it('detects right square, wrong piece', () => {
    // Board with knight on b1 and pawn on d2; both can move toward d4-ish squares
    const board = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    // Played d2d4, best was b1d2 (different from-square, same to-square... wait)
    // Let's use: played g1f3, best was d2f3 (if pawn could go there — need a capture scenario)
    // Simpler: played a2a3, best was b1a3 — both go to a3
    const result = detectInsight('a2a3', 'b1a3', ['b1a3', 'e7e5'], board, TURN_WHITE);
    expect(result).toContain('Right square');
  });

  it('detects delayed move (right idea, wrong timing)', () => {
    // Played e2e4, but best was d2d4 with e2e4 at PV index 2
    const pv = ['d2d4', 'e7e5', 'e2e4'];
    const result = detectInsight('e2e4', 'd2d4', pv, STARTING_BOARD, TURN_WHITE);
    expect(result).toContain('first');
    expect(result).toContain('your idea');
  });

  it('returns null when played move is unrelated to best', () => {
    const result = detectInsight('a2a3', 'e2e4', ['e2e4', 'd7d5'], STARTING_BOARD, TURN_WHITE);
    expect(result).toBeNull();
  });

  it('returns null for missing inputs', () => {
    expect(detectInsight(null, 'e2e4', [], STARTING_BOARD, TURN_WHITE)).toBeNull();
    expect(detectInsight('e2e4', null, [], STARTING_BOARD, TURN_WHITE)).toBeNull();
    expect(detectInsight('e2', 'e2e4', [], STARTING_BOARD, TURN_WHITE)).toBeNull();
  });

  it('returns null when bestUci is too short', () => {
    expect(detectInsight('e2e4', 'e2', [], STARTING_BOARD, TURN_WHITE)).toBeNull();
  });

  it('detects delayed move at PV index 4 (not just index 2)', () => {
    // Played e2e4, best was d2d4, and e2e4 appears at PV[4] (not PV[2])
    const pv = ['d2d4', 'e7e5', 'g1f3', 'd7d6', 'e2e4'];
    const result = detectInsight('e2e4', 'd2d4', pv, STARTING_BOARD, TURN_WHITE);
    expect(result).toContain('first');
    expect(result).toContain('your idea');
  });

  it('returns null when delayed move not found in PV', () => {
    const pv = ['d2d4', 'e7e5', 'g1f3', 'd7d6'];
    const result = detectInsight('a2a3', 'd2d4', pv, STARTING_BOARD, TURN_WHITE);
    expect(result).toBeNull();
  });

  it('returns null when PV is too short for delayed move detection', () => {
    const pv = ['d2d4', 'e7e5']; // length 2, needs > 2
    const result = detectInsight('a2a4', 'd2d4', pv, STARTING_BOARD, TURN_WHITE);
    expect(result).toBeNull();
  });

  it('returns null when PV is null', () => {
    const result = detectInsight('a2a4', 'd2d4', null, STARTING_BOARD, TURN_WHITE);
    expect(result).toBeNull();
  });
});
