import {
  describe, it, expect, vi,
} from 'vitest';
import { ClassificationPlugin } from '../../../src/core/plugins/classification-plugin.js';
import { STARTING_BOARD, boardFromFen } from '../../helpers.js';
// constants imported for potential future use

function makePlugin(overrides = {}) {
  return new ClassificationPlugin({
    adapter: {},
    settings: {
      showClassifications: true,
      showCrazy: false,
      showBookMoves: false,
      ...overrides,
    },
  });
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const AFTER_E4_BOARD = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');

describe('ClassificationPlugin', () => {
  it('has name "classification"', () => {
    const plugin = makePlugin();
    expect(plugin.name).toBe('classification');
  });

  it('exposes classifier getter', () => {
    const plugin = makePlugin();
    expect(plugin.classifier).toBeDefined();
    expect(typeof plugin.classifier.on).toBe('function');
  });

  describe('onBoardChange', () => {
    it('calls initFen on first call', () => {
      const plugin = makePlugin();
      const spy = vi.spyOn(plugin.classifier, 'initFen');

      plugin.onBoardChange({ fen: STARTING_FEN, board: STARTING_BOARD, ply: 0 });

      expect(spy).toHaveBeenCalledWith(STARTING_FEN, STARTING_BOARD, 0);
    });

    it('calls classifier.onBoardChange on subsequent calls', () => {
      const plugin = makePlugin();
      plugin.onBoardChange({ fen: STARTING_FEN, board: STARTING_BOARD, ply: 0 });

      const spy = vi.spyOn(plugin.classifier, 'onBoardChange');
      plugin.onBoardChange({ fen: AFTER_E4_FEN, board: AFTER_E4_BOARD, ply: 1 });

      expect(spy).toHaveBeenCalledWith(AFTER_E4_FEN, AFTER_E4_BOARD, 1);
    });
  });

  describe('onEval', () => {
    it('delegates to classifier', () => {
      const plugin = makePlugin();
      const spy = vi.spyOn(plugin.classifier, 'onEval');

      const data = { depth: 10, lines: [{ score: 30, mate: null, pv: ['e2e4'] }] };
      plugin.onEval(data);

      expect(spy).toHaveBeenCalledWith(data);
    });
  });

  describe('onSettingsChange', () => {
    it('disables classifier when showClassifications=false and showCrazy=false', () => {
      const settings = { showClassifications: true, showCrazy: false, showBookMoves: false };
      const plugin = new ClassificationPlugin({ adapter: {}, settings });
      const spy = vi.spyOn(plugin.classifier, 'setEnabled');

      // Simulate coordinator: update shared settings before notifying
      settings.showClassifications = false;
      plugin.onSettingsChange({ showClassifications: false });
      expect(spy).toHaveBeenCalledWith(false);
    });

    it('does not disable when showClassifications is not in settings', () => {
      const plugin = makePlugin();
      const spy = vi.spyOn(plugin.classifier, 'setEnabled');

      plugin.onSettingsChange({ theme: 'mocha' });
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not disable when showCrazy is still true', () => {
      const plugin = makePlugin({ showCrazy: true });
      const spy = vi.spyOn(plugin.classifier, 'setEnabled');

      plugin.onSettingsChange({ showClassifications: false, showCrazy: true });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('onEngineReset', () => {
    it('clears cache and resets initialised flag', () => {
      const plugin = makePlugin();
      const spy = vi.spyOn(plugin.classifier, 'clearCache');

      plugin.onBoardChange({ fen: STARTING_FEN, board: STARTING_BOARD, ply: 0 });
      plugin.onEngineReset();

      expect(spy).toHaveBeenCalled();

      // After reset, next onBoardChange should call initFen again
      const initSpy = vi.spyOn(plugin.classifier, 'initFen');
      plugin.onBoardChange({ fen: STARTING_FEN, board: STARTING_BOARD, ply: 0 });
      expect(initSpy).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('destroys classifier', () => {
      const plugin = makePlugin();
      const spy = vi.spyOn(plugin.classifier, 'destroy');

      plugin.destroy();
      expect(spy).toHaveBeenCalled();
    });
  });
});
