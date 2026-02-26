import { describe, it, expect, vi } from 'vitest';
import { GuardPlugin } from '../../../src/core/plugins/guard-plugin.js';
import { STARTING_BOARD } from '../../helpers.js';
import { TURN_WHITE, TURN_BLACK } from '../../../src/constants.js';

function makeGuard(showGuard = true) {
  const g = new GuardPlugin({ settings: { showGuard } });
  // Simulate engine lines where PV[0] starts from e2 (file=4, rank=1)
  g.onEval({
    lines: [
      { score: 30, mate: null, pv: ['e2e4'] },
      { score: 25, mate: null, pv: ['d2d4'] },
      { score: 20, mate: null, pv: ['g1f3'] },
    ],
  });
  return g;
}

describe('GuardPlugin.checkSquare', () => {
  it('returns false when clicked piece is in a PV line', () => {
    const g = makeGuard();
    // e2 pawn is PV[0] of line 1
    expect(g.checkSquare(4, 1, STARTING_BOARD, TURN_WHITE)).toBe(false);
    // d2 pawn is PV[0] of line 2
    expect(g.checkSquare(3, 1, STARTING_BOARD, TURN_WHITE)).toBe(false);
    // g1 knight is PV[0] of line 3
    expect(g.checkSquare(6, 0, STARTING_BOARD, TURN_WHITE)).toBe(false);
  });

  it('returns true when clicked piece is NOT in any PV line', () => {
    const g = makeGuard();
    // a2 pawn — not in any engine line's PV[0]
    expect(g.checkSquare(0, 1, STARTING_BOARD, TURN_WHITE)).toBe(true);
  });

  it('returns false for empty square', () => {
    const g = makeGuard();
    // e4 is empty in starting position
    expect(g.checkSquare(4, 3, STARTING_BOARD, TURN_WHITE)).toBe(false);
  });

  it('returns false for opponent\'s piece (wrong side)', () => {
    const g = makeGuard();
    // a7 is a black pawn, but it's white's turn
    expect(g.checkSquare(0, 6, STARTING_BOARD, TURN_WHITE)).toBe(false);
  });

  it('returns false when guard is disabled', () => {
    const g = makeGuard(false);
    expect(g.checkSquare(0, 1, STARTING_BOARD, TURN_WHITE)).toBe(false);
  });

  it('returns false when no engine lines available', () => {
    const g = new GuardPlugin({ settings: { showGuard: true } });
    // No onEval called — _latestLines is null
    expect(g.checkSquare(0, 1, STARTING_BOARD, TURN_WHITE)).toBe(false);
  });

  it('onSettingsChange() updates settings', () => {
    const g = makeGuard(true);
    g.onSettingsChange({ showGuard: false });
    expect(g.checkSquare(0, 1, STARTING_BOARD, TURN_WHITE)).toBe(false);
  });

  it('onEngineReset() clears lines', () => {
    const g = makeGuard();
    g.onEngineReset();
    expect(g.checkSquare(0, 1, STARTING_BOARD, TURN_WHITE)).toBe(false);
  });

  it('destroy() clears lines', () => {
    const g = makeGuard();
    g.destroy();
    expect(g.checkSquare(0, 1, STARTING_BOARD, TURN_WHITE)).toBe(false);
  });

  it('onBoardChange() clears guard arrow', () => {
    const g = makeGuard();
    const renderCtx = { arrow: { clearGuard: vi.fn() } };
    g.onBoardChange({}, renderCtx);
    expect(renderCtx.arrow.clearGuard).toHaveBeenCalled();
  });

  it('handles line with no PV', () => {
    const g = new GuardPlugin({ settings: { showGuard: true } });
    g.onEval({
      lines: [
        { score: 30, mate: null, pv: null },
        { score: 25, mate: null, pv: [] },
      ],
    });
    // Should not throw, and should return true (no matching PV)
    expect(g.checkSquare(4, 1, STARTING_BOARD, TURN_WHITE)).toBe(true);
  });
});
