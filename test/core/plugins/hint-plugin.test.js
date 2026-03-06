import {
  describe, it, expect, vi,
} from 'vitest';
import { HintPlugin } from '../../../src/core/plugins/hint-plugin.js';
import {
  TURN_WHITE, TURN_BLACK,
  HINT_ARROW_OPACITY,
  ARROW_COLOR_WHITE, ARROW_COLOR_BLACK,
} from '../../../src/constants.js';

function makeRenderCtx(turn = TURN_WHITE) {
  return {
    arrow: {
      clearHint: vi.fn(),
      drawHint: vi.fn(),
    },
    panel: { turn },
    isFlipped: () => false,
  };
}

function makePlugin(overrides = {}) {
  return new HintPlugin({
    settings: {
      showClassifications: true,
      showBestMove: false,
      puzzleMode: false,
      waitForComplete: false,
      ...overrides,
    },
  });
}

describe('HintPlugin', () => {
  describe('onBoardChange', () => {
    it('clears hint on board change', () => {
      const plugin = makePlugin();
      const ctx = makeRenderCtx();
      plugin.onBoardChange({}, ctx);
      expect(ctx.arrow.clearHint).toHaveBeenCalled();
      expect(plugin.currentHint).toBeNull();
    });
  });

  describe('onEval', () => {
    it('draws Brilliant hint when spread >= 200', () => {
      const plugin = makePlugin({ showClassifications: true });
      const ctx = makeRenderCtx();

      plugin.onEval({
        depth: 16,
        complete: true,
        lines: [
          { score: 300, mate: null, pv: ['e2e4'] },
          { score: 50, mate: null, pv: ['d2d4'] },
        ],
      }, {}, ctx);

      expect(ctx.arrow.drawHint).toHaveBeenCalled();
      const call = ctx.arrow.drawHint.mock.calls[0];
      expect(call[0]).toBe('e2e4');
      expect(call[2]).toBe('#1baca6'); // Brilliant teal
      expect(call[3]).toBe('!!');
    });

    it('draws Excellent hint when spread >= 80', () => {
      const plugin = makePlugin({ showClassifications: true });
      const ctx = makeRenderCtx();

      plugin.onEval({
        depth: 16,
        complete: true,
        lines: [
          { score: 150, mate: null, pv: ['e2e4'] },
          { score: 50, mate: null, pv: ['d2d4'] },
        ],
      }, {}, ctx);

      expect(ctx.arrow.drawHint).toHaveBeenCalled();
      const call = ctx.arrow.drawHint.mock.calls[0];
      expect(call[3]).toBe('\u2713'); // checkmark symbol
    });

    it('does not draw classification hint when spread < 80', () => {
      const plugin = makePlugin({ showClassifications: true, showBestMove: false });
      const ctx = makeRenderCtx();

      plugin.onEval({
        depth: 16,
        complete: true,
        lines: [
          { score: 90, mate: null, pv: ['e2e4'] },
          { score: 50, mate: null, pv: ['d2d4'] },
        ],
      }, {}, ctx);

      expect(ctx.arrow.drawHint).not.toHaveBeenCalled();
    });

    it('draws best move arrow with team color (white)', () => {
      const plugin = makePlugin({ showClassifications: false, showBestMove: true });
      const ctx = makeRenderCtx(TURN_WHITE);

      plugin.onEval({
        depth: 16,
        complete: true,
        lines: [{ score: 30, mate: null, pv: ['e2e4'] }],
      }, {}, ctx);

      expect(ctx.arrow.drawHint).toHaveBeenCalledWith('e2e4', false, ARROW_COLOR_WHITE, null, HINT_ARROW_OPACITY);
    });

    it('draws best move arrow with team color (black)', () => {
      const plugin = makePlugin({ showClassifications: false, showBestMove: true });
      const ctx = makeRenderCtx(TURN_BLACK);

      plugin.onEval({
        depth: 16,
        complete: true,
        lines: [{ score: -30, mate: null, pv: ['e7e5'] }],
      }, {}, ctx);

      expect(ctx.arrow.drawHint).toHaveBeenCalledWith('e7e5', false, ARROW_COLOR_BLACK, null, HINT_ARROW_OPACITY);
    });

    it('skips when waitForComplete=true and data.complete=false', () => {
      const plugin = makePlugin({ showBestMove: true, waitForComplete: true });
      const ctx = makeRenderCtx();

      plugin.onEval({
        depth: 16,
        complete: false,
        lines: [{ score: 30, mate: null, pv: ['e2e4'] }],
      }, {}, ctx);

      expect(ctx.arrow.drawHint).not.toHaveBeenCalled();
    });

    it('skips when puzzleMode=true and data.complete=false', () => {
      const plugin = makePlugin({ showBestMove: true, puzzleMode: true });
      const ctx = makeRenderCtx();

      plugin.onEval({
        depth: 16,
        complete: false,
        lines: [{ score: 30, mate: null, pv: ['e2e4'] }],
      }, {}, ctx);

      expect(ctx.arrow.drawHint).not.toHaveBeenCalled();
    });

    it('skips when lines are empty', () => {
      const plugin = makePlugin({ showBestMove: true });
      const ctx = makeRenderCtx();

      plugin.onEval({ depth: 16, complete: true, lines: [] }, {}, ctx);

      expect(ctx.arrow.drawHint).not.toHaveBeenCalled();
    });

    it('skips when no PV on first line', () => {
      const plugin = makePlugin({ showBestMove: true });
      const ctx = makeRenderCtx();

      plugin.onEval({
        depth: 16, complete: true, lines: [{ score: 30, mate: null, pv: null }],
      }, {}, ctx);

      expect(ctx.arrow.drawHint).not.toHaveBeenCalled();
    });

    it('handles mate vs non-mate spread', () => {
      const plugin = makePlugin({ showClassifications: true });
      const ctx = makeRenderCtx();

      plugin.onEval({
        depth: 16,
        complete: true,
        lines: [
          { score: 0, mate: 3, pv: ['e2e4'] },
          { score: 50, mate: null, pv: ['d2d4'] },
        ],
      }, {}, ctx);

      // mate vs non-mate → spread = CLASSIFICATION_MATE_LOSS (1000) → Brilliant
      expect(ctx.arrow.drawHint).toHaveBeenCalled();
    });

    it('spread=0 when both mates', () => {
      const plugin = makePlugin({ showClassifications: true, showBestMove: false });
      const ctx = makeRenderCtx();

      plugin.onEval({
        depth: 16,
        complete: true,
        lines: [
          { score: 0, mate: 3, pv: ['e2e4'] },
          { score: 0, mate: 5, pv: ['d2d4'] },
        ],
      }, {}, ctx);

      // both mate → spread = 0 → no hint (unless bestMove)
      expect(ctx.arrow.drawHint).not.toHaveBeenCalled();
    });

    it('does not draw hint when depth < HINT_MIN_DEPTH for classification mode', () => {
      const plugin = makePlugin({ showClassifications: true, showBestMove: false });
      const ctx = makeRenderCtx();

      plugin.onEval({
        depth: 10, // below HINT_MIN_DEPTH=14
        complete: true,
        lines: [
          { score: 300, mate: null, pv: ['e2e4'] },
          { score: 50, mate: null, pv: ['d2d4'] },
        ],
      }, {}, ctx);

      expect(ctx.arrow.drawHint).not.toHaveBeenCalled();
    });
  });

  describe('getPersistentLayer', () => {
    it('clear clears hint arrow', () => {
      const ctx = makeRenderCtx();
      const plugin = makePlugin();
      const layer = plugin.getPersistentLayer(() => ctx);

      layer.clear();
      expect(ctx.arrow.clearHint).toHaveBeenCalled();
    });

    it('restore redraws current hint', () => {
      const ctx = makeRenderCtx();
      const plugin = makePlugin({ showBestMove: true });
      const layer = plugin.getPersistentLayer(() => ctx);

      // Set up a hint
      plugin.onEval({
        depth: 16,
        complete: true,
        lines: [{ score: 30, mate: null, pv: ['e2e4'] }],
      }, {}, ctx);

      ctx.arrow.drawHint.mockClear();
      layer.restore();

      expect(ctx.arrow.drawHint).toHaveBeenCalled();
    });

    it('restore is a no-op when no current hint', () => {
      const ctx = makeRenderCtx();
      const plugin = makePlugin();
      const layer = plugin.getPersistentLayer(() => ctx);

      layer.restore();
      expect(ctx.arrow.drawHint).not.toHaveBeenCalled();
    });
  });

  describe('currentHint getter', () => {
    it('returns null by default', () => {
      const plugin = makePlugin();
      expect(plugin.currentHint).toBeNull();
    });

    it('returns hint after onEval sets it', () => {
      const plugin = makePlugin({ showBestMove: true });
      const ctx = makeRenderCtx();

      plugin.onEval({
        depth: 16,
        complete: true,
        lines: [{ score: 30, mate: null, pv: ['e2e4'] }],
      }, {}, ctx);

      expect(plugin.currentHint).not.toBeNull();
      expect(plugin.currentHint.uci).toBe('e2e4');
    });
  });

  describe('destroy', () => {
    it('clears current hint', () => {
      const plugin = makePlugin({ showBestMove: true });
      const ctx = makeRenderCtx();

      plugin.onEval({
        depth: 16,
        complete: true,
        lines: [{ score: 30, mate: null, pv: ['e2e4'] }],
      }, {}, ctx);

      plugin.destroy();
      expect(plugin.currentHint).toBeNull();
    });
  });
});
