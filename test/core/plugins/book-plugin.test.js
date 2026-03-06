import {
  describe, it, expect, vi,
} from 'vitest';
import { BookPlugin } from '../../../src/core/plugins/book-plugin.js';
import { STARTING_BOARD, boardFromFen } from '../../helpers.js';
import { TURN_WHITE } from '../../../src/constants.js';

function makeRenderCtx() {
  return {
    arrow: {
      clearLayer: vi.fn(),
      drawLayer: vi.fn(),
    },
    isFlipped: () => false,
  };
}

function makeBoardState(board, turn) {
  return { board, turn };
}

describe('BookPlugin', () => {
  describe('onBoardChange', () => {
    it('draws book arrows for starting position', () => {
      const plugin = new BookPlugin({ settings: { showBookMoves: true } });
      const ctx = makeRenderCtx();

      plugin.onBoardChange(makeBoardState(STARTING_BOARD, TURN_WHITE), ctx);

      expect(ctx.arrow.clearLayer).toHaveBeenCalledWith('book');
      expect(ctx.arrow.drawLayer).toHaveBeenCalled();
      const call = ctx.arrow.drawLayer.mock.calls[0];
      expect(call[0]).toBe('book');
      expect(call[1].length).toBeGreaterThan(0); // UCI moves array
    });

    it('does not draw when showBookMoves=false', () => {
      const plugin = new BookPlugin({ settings: { showBookMoves: false } });
      const ctx = makeRenderCtx();

      plugin.onBoardChange(makeBoardState(STARTING_BOARD, TURN_WHITE), ctx);

      expect(ctx.arrow.clearLayer).toHaveBeenCalledWith('book');
      expect(ctx.arrow.drawLayer).not.toHaveBeenCalled();
    });

    it('does not draw when board is null', () => {
      const plugin = new BookPlugin({ settings: { showBookMoves: true } });
      const ctx = makeRenderCtx();

      plugin.onBoardChange(makeBoardState(null, TURN_WHITE), ctx);

      expect(ctx.arrow.drawLayer).not.toHaveBeenCalled();
    });

    it('does not draw when position has no book continuations', () => {
      const plugin = new BookPlugin({ settings: { showBookMoves: true } });
      const ctx = makeRenderCtx();

      // A weird position with just kings
      const board = boardFromFen('4k3/8/8/8/8/8/8/4K3');
      plugin.onBoardChange(makeBoardState(board, TURN_WHITE), ctx);

      expect(ctx.arrow.drawLayer).not.toHaveBeenCalled();
    });
  });

  describe('onSettingsChange', () => {
    it('clears arrows when showBookMoves turned off', () => {
      const plugin = new BookPlugin({ settings: { showBookMoves: true } });
      const ctx = makeRenderCtx();

      // Register persistent layer to set _getRenderCtx
      plugin.getPersistentLayer(() => ctx);

      plugin.onBoardChange(makeBoardState(STARTING_BOARD, TURN_WHITE), ctx);

      plugin.onSettingsChange({ showBookMoves: false });
      expect(ctx.arrow.clearLayer).toHaveBeenCalledWith('book');
    });

    it('redraws arrows when showBookMoves turned on', () => {
      const plugin = new BookPlugin({ settings: { showBookMoves: false } });
      const ctx = makeRenderCtx();

      plugin.getPersistentLayer(() => ctx);
      plugin.onBoardChange(makeBoardState(STARTING_BOARD, TURN_WHITE), ctx);

      ctx.arrow.drawLayer.mockClear();
      plugin.onSettingsChange({ showBookMoves: true });
      expect(ctx.arrow.drawLayer).toHaveBeenCalled();
    });

    it('does nothing when showBookMoves is not in settings', () => {
      const plugin = new BookPlugin({ settings: { showBookMoves: true } });
      const ctx = makeRenderCtx();

      plugin.getPersistentLayer(() => ctx);
      plugin.onBoardChange(makeBoardState(STARTING_BOARD, TURN_WHITE), ctx);

      ctx.arrow.drawLayer.mockClear();
      plugin.onSettingsChange({ theme: 'mocha' });
      expect(ctx.arrow.drawLayer).not.toHaveBeenCalled();
    });

    it('does nothing when _getRenderCtx is null', () => {
      const plugin = new BookPlugin({ settings: { showBookMoves: true } });
      // Don't call getPersistentLayer — _getRenderCtx stays null
      expect(() => plugin.onSettingsChange({ showBookMoves: false })).not.toThrow();
    });
  });

  describe('getPersistentLayer', () => {
    it('clear clears book layer', () => {
      const ctx = makeRenderCtx();
      const plugin = new BookPlugin({ settings: { showBookMoves: true } });
      const layer = plugin.getPersistentLayer(() => ctx);

      layer.clear();
      expect(ctx.arrow.clearLayer).toHaveBeenCalledWith('book');
    });

    it('restore redraws current hints', () => {
      const ctx = makeRenderCtx();
      const plugin = new BookPlugin({ settings: { showBookMoves: true } });
      const layer = plugin.getPersistentLayer(() => ctx);

      // Set up hints
      plugin.onBoardChange(makeBoardState(STARTING_BOARD, TURN_WHITE), ctx);
      ctx.arrow.drawLayer.mockClear();

      layer.restore();
      expect(ctx.arrow.drawLayer).toHaveBeenCalled();
    });

    it('restore is a no-op when no current hints', () => {
      const ctx = makeRenderCtx();
      const plugin = new BookPlugin({ settings: { showBookMoves: false } });
      const layer = plugin.getPersistentLayer(() => ctx);

      plugin.onBoardChange(makeBoardState(STARTING_BOARD, TURN_WHITE), ctx);
      layer.restore();
      expect(ctx.arrow.drawLayer).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('clears all state', () => {
      const plugin = new BookPlugin({ settings: { showBookMoves: true } });
      const ctx = makeRenderCtx();
      plugin.getPersistentLayer(() => ctx);
      plugin.onBoardChange(makeBoardState(STARTING_BOARD, TURN_WHITE), ctx);

      plugin.destroy();

      // After destroy, internal state should be null
      expect(() => plugin.destroy()).not.toThrow();
    });
  });
});
