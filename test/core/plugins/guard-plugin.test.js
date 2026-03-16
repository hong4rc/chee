import {
  describe, it, expect, vi,
} from 'vitest';
import { GuardPlugin } from '../../../src/core/plugins/guard-plugin.js';
import { STARTING_BOARD } from '../../helpers.js';
import { TURN_WHITE, GUARD_DEPTH } from '../../../src/constants.js';

function makeArrow() {
  return {
    clearGuard: vi.fn(),
    clearGuardBadges: vi.fn(),
    drawGuardBadges: vi.fn(),
  };
}

function makeRenderCtx() {
  return {
    arrow: makeArrow(),
    isFlipped: () => false,
    panel: {},
  };
}

function makeGuard(showGuard = true) {
  const requestSecondaryAnalysis = vi.fn();
  const boardState = { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', board: STARTING_BOARD };
  const g = new GuardPlugin({ settings: { showGuard } });
  g.setup({ requestSecondaryAnalysis, boardState });
  g.onEval({
    lines: [
      { score: 30, mate: null, pv: ['e2e4'] },
      { score: 25, mate: null, pv: ['d2d4'] },
      { score: 20, mate: null, pv: ['g1f3'] },
    ],
  });
  return { plugin: g, requestSecondaryAnalysis };
}

describe('GuardPlugin', () => {
  it('has name "guard"', () => {
    const { plugin } = makeGuard();
    expect(plugin.name).toBe('guard');
  });

  it('requests secondary analysis on mousedown for own piece', () => {
    const { plugin, requestSecondaryAnalysis } = makeGuard();
    const renderCtx = makeRenderCtx();

    plugin.onBoardMouseDown(
      { file: 4, rank: 1 },
      STARTING_BOARD,
      TURN_WHITE,
      renderCtx,
    );

    expect(requestSecondaryAnalysis).toHaveBeenCalledTimes(1);
    const [fen, depth, callback, searchmoves] = requestSecondaryAnalysis.mock.calls[0];
    expect(fen).toContain('rnbqkbnr');
    expect(depth).toBe(GUARD_DEPTH);
    expect(typeof callback).toBe('function');
    expect(searchmoves).toBeInstanceOf(Array);
    expect(searchmoves.length).toBeGreaterThan(0);
    // e2 pawn should have e2e3 and e2e4 as candidates
    expect(searchmoves).toContain('e2e3');
    expect(searchmoves).toContain('e2e4');
  });

  it('does not request analysis for empty square', () => {
    const { plugin, requestSecondaryAnalysis } = makeGuard();
    const renderCtx = makeRenderCtx();

    plugin.onBoardMouseDown(
      { file: 4, rank: 3 },
      STARTING_BOARD,
      TURN_WHITE,
      renderCtx,
    );

    expect(requestSecondaryAnalysis).not.toHaveBeenCalled();
  });

  it('does not request analysis for opponent piece', () => {
    const { plugin, requestSecondaryAnalysis } = makeGuard();
    const renderCtx = makeRenderCtx();

    plugin.onBoardMouseDown(
      { file: 0, rank: 6 },
      STARTING_BOARD,
      TURN_WHITE,
      renderCtx,
    );

    expect(requestSecondaryAnalysis).not.toHaveBeenCalled();
  });

  it('does not request analysis when guard is disabled', () => {
    const { plugin, requestSecondaryAnalysis } = makeGuard(false);
    const renderCtx = makeRenderCtx();

    plugin.onBoardMouseDown(
      { file: 4, rank: 1 },
      STARTING_BOARD,
      TURN_WHITE,
      renderCtx,
    );

    expect(requestSecondaryAnalysis).not.toHaveBeenCalled();
  });

  it('draws guard badges for moves exceeding cp threshold', () => {
    const { plugin, requestSecondaryAnalysis } = makeGuard();
    const renderCtx = makeRenderCtx();

    plugin.onBoardMouseDown(
      { file: 4, rank: 1 },
      STARTING_BOARD,
      TURN_WHITE,
      renderCtx,
    );

    // Simulate callback with one good and one bad move
    const callback = requestSecondaryAnalysis.mock.calls[0][2];
    callback({
      complete: true,
      depth: 8,
      lines: [
        { score: 30, mate: null, pv: ['e2e4'] }, // good (no loss)
        { score: -150, mate: null, pv: ['e2e3'] }, // bad (180cp loss)
      ],
    });

    expect(renderCtx.arrow.drawGuardBadges).toHaveBeenCalledTimes(1);
    const badSquares = renderCtx.arrow.drawGuardBadges.mock.calls[0][0];
    // e3 = file 4, rank 2
    expect(badSquares).toEqual([{ file: 4, rank: 2 }]);
  });

  it('clears badges on mouseup', () => {
    const { plugin } = makeGuard();
    const renderCtx = makeRenderCtx();
    plugin.onBoardMouseUp(renderCtx);
    expect(renderCtx.arrow.clearGuard).toHaveBeenCalled();
    expect(renderCtx.arrow.clearGuardBadges).toHaveBeenCalled();
  });

  it('clears on board change', () => {
    const { plugin } = makeGuard();
    const renderCtx = makeRenderCtx();
    plugin.onBoardChange({}, renderCtx);
    expect(renderCtx.arrow.clearGuard).toHaveBeenCalled();
    expect(renderCtx.arrow.clearGuardBadges).toHaveBeenCalled();
  });

  it('clears on settings toggle off', () => {
    const { plugin } = makeGuard();
    const renderCtx = makeRenderCtx();
    plugin.onSettingsChange({ showGuard: false }, renderCtx);
    expect(renderCtx.arrow.clearGuard).toHaveBeenCalled();
    expect(renderCtx.arrow.clearGuardBadges).toHaveBeenCalled();
  });

  it('onEngineReset clears eval state', () => {
    const { plugin, requestSecondaryAnalysis } = makeGuard();
    plugin.onEngineReset();
    const renderCtx = makeRenderCtx();

    plugin.onBoardMouseDown(
      { file: 4, rank: 1 },
      STARTING_BOARD,
      TURN_WHITE,
      renderCtx,
    );

    // No latestEval → should not request
    expect(requestSecondaryAnalysis).not.toHaveBeenCalled();
  });
});
