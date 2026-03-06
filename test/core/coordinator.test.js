import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import { AnalysisCoordinator } from '../../src/core/coordinator.js';
import { AnalysisPlugin } from '../../src/core/plugin.js';
import { STARTING_BOARD, boardFromFen } from '../helpers.js';
import {
  TURN_WHITE, TURN_BLACK,
  EVT_READY, EVT_EVAL, EVT_ERROR, EVT_LINE_HOVER, EVT_LINE_LEAVE, EVT_PGN_COPY,
} from '../../src/constants.js';

// Mock globals needed by coordinator dependencies
beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => ''),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    location: { hostname: 'chess.com' },
  });
  vi.stubGlobal('document', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

function makeEngine() {
  return {
    init: vi.fn(),
    analyze: vi.fn(),
    stop: vi.fn(),
    reconfigure: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    currentFen: null,
  };
}

function makePanel() {
  return {
    mount: vi.fn(),
    el: { querySelector: vi.fn(), style: { setProperty: vi.fn() } },
    setShowChart: vi.fn(),
    restoreState: vi.fn(),
    setBoard: vi.fn(),
    updateEval: vi.fn(),
    reconfigure: vi.fn(),
    recordScore: vi.fn(),
    clearClassification: vi.fn(),
    showClassification: vi.fn(),
    showAccuracy: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    turn: TURN_WHITE,
  };
}

function makeArrow() {
  return {
    mount: vi.fn(),
    draw: vi.fn(),
    clear: vi.fn(),
    clearGuard: vi.fn(),
    drawGuard: vi.fn(),
    clearClassification: vi.fn(),
    drawClassification: vi.fn(),
    clearInsight: vi.fn(),
    drawInsight: vi.fn(),
    clearHint: vi.fn(),
    drawHint: vi.fn(),
    clearLayer: vi.fn(),
    drawLayer: vi.fn(),
  };
}

function makeAdapter() {
  return {
    findBoard: vi.fn(),
    readPieces: vi.fn(() => []),
    isFlipped: vi.fn(() => false),
    detectTurn: vi.fn(() => TURN_WHITE),
    detectCastling: vi.fn(() => 'KQkq'),
    detectEnPassant: vi.fn(() => '-'),
    detectMoveCount: vi.fn(() => 1),
    detectPly: vi.fn(() => 0),
    detectLastMove: vi.fn(() => null),
    getPanelAnchor: vi.fn(() => ({})),
    observe: vi.fn(),
    disconnect: vi.fn(),
    exploreBoardArea: vi.fn(),
    findAlternatePieceContainer: vi.fn(() => null),
  };
}

function makeBoardState() {
  return {
    board: null,
    ply: 0,
    fen: null,
    turn: null,
    boardEl: null,
    isValid: false,
    setBoardEl: vi.fn(function setBoardEl(el) { this.boardEl = el; }),
    update: vi.fn(function update(board, ply, fen, turn) {
      this.board = board;
      this.ply = ply;
      this.fen = fen;
      this.turn = turn;
    }),
    boardEquals: vi.fn(() => false),
    detectTurnFromDiff: vi.fn(() => null),
  };
}

function createCoordinator(overrides = {}) {
  const engine = makeEngine();
  const panel = makePanel();
  const arrow = makeArrow();
  const adapter = makeAdapter();
  const boardState = makeBoardState();
  const settings = {
    numLines: 3,
    searchDepth: 22,
    theme: 'site',
    showChart: true,
    showClassifications: false,
    showCrazy: false,
    panelMinimized: false,
    panelHidden: false,
    panelLeft: null,
    panelTop: null,
    panelWidth: null,
    ...overrides,
  };

  const coordinator = new AnalysisCoordinator({
    engine, panel, arrow, adapter, settings, boardState,
  });

  return {
    coordinator, engine, panel, arrow, adapter, boardState, settings,
  };
}

describe('AnalysisCoordinator', () => {
  describe('registerPlugin', () => {
    it('adds plugin to internal list', () => {
      const { coordinator } = createCoordinator();
      const plugin = new AnalysisPlugin('test');
      coordinator.registerPlugin(plugin);
      // Verify by calling destroy which iterates plugins
      expect(() => coordinator.destroy()).not.toThrow();
    });
  });

  describe('applySettings', () => {
    it('applies theme to panel', () => {
      const { coordinator, panel } = createCoordinator();
      panel.el = { style: { setProperty: vi.fn() } };

      coordinator.applySettings({ theme: 'mocha' });

      expect(panel.el.style.setProperty).toHaveBeenCalled();
    });

    it('sets showChart on panel', () => {
      const { coordinator, panel } = createCoordinator();
      coordinator.applySettings({ showChart: false });
      expect(panel.setShowChart).toHaveBeenCalledWith(false);
    });

    it('reconfigures engine when numLines changes', () => {
      const { coordinator, engine, panel } = createCoordinator();
      coordinator.applySettings({ numLines: 5 });
      expect(panel.reconfigure).toHaveBeenCalledWith(5);
      expect(engine.reconfigure).toHaveBeenCalled();
    });

    it('reconfigures engine when searchDepth changes', () => {
      const { coordinator, engine } = createCoordinator();
      coordinator.applySettings({ searchDepth: 18 });
      expect(engine.reconfigure).toHaveBeenCalled();
    });

    it('notifies plugins of settings change', () => {
      const { coordinator } = createCoordinator();
      const plugin = new AnalysisPlugin('test');
      const spy = vi.spyOn(plugin, 'onSettingsChange');
      coordinator.registerPlugin(plugin);

      coordinator.applySettings({ showChart: false });
      expect(spy).toHaveBeenCalledWith({ showChart: false });
    });

    it('handles debugMode setting', () => {
      const { coordinator } = createCoordinator();
      coordinator.applySettings({ debugMode: true });
      expect(localStorage.debug).toBe('chee:*');

      coordinator.applySettings({ debugMode: false });
      expect(localStorage.removeItem).toHaveBeenCalledWith('debug');
    });
  });

  describe('replayEval', () => {
    it('is a no-op when no active FEN', () => {
      const { coordinator } = createCoordinator();
      expect(() => coordinator.replayEval()).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('cleans up everything', () => {
      const {
        coordinator, engine, panel, arrow, adapter,
      } = createCoordinator();
      coordinator.destroy();

      expect(adapter.disconnect).toHaveBeenCalled();
      expect(engine.destroy).toHaveBeenCalled();
      expect(arrow.clear).toHaveBeenCalled();
      expect(panel.destroy).toHaveBeenCalled();
    });

    it('destroys all plugins', () => {
      const { coordinator } = createCoordinator();
      const plugin = new AnalysisPlugin('test');
      const spy = vi.spyOn(plugin, 'destroy');
      coordinator.registerPlugin(plugin);

      coordinator.destroy();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('_cacheKey', () => {
    it('formats as fen|depth', () => {
      const { coordinator } = createCoordinator();
      // Access private method
      expect(coordinator._cacheKey('testfen', 22)).toBe('testfen|22');
    });
  });

  describe('_cacheLookup', () => {
    it('returns null when cache is empty', () => {
      const { coordinator } = createCoordinator();
      expect(coordinator._cacheLookup('testfen')).toBeNull();
    });
  });

  describe('_notifyPlugins', () => {
    it('calls hook on all plugins', () => {
      const { coordinator } = createCoordinator();
      const p1 = new AnalysisPlugin('p1');
      const p2 = new AnalysisPlugin('p2');
      const spy1 = vi.spyOn(p1, 'onSettingsChange');
      const spy2 = vi.spyOn(p2, 'onSettingsChange');

      coordinator.registerPlugin(p1);
      coordinator.registerPlugin(p2);
      coordinator._notifyPlugins('onSettingsChange', { theme: 'mocha' });

      expect(spy1).toHaveBeenCalledWith({ theme: 'mocha' });
      expect(spy2).toHaveBeenCalledWith({ theme: 'mocha' });
    });
  });

  describe('start', () => {
    it('mounts panel and arrow, initializes engine, and starts observing', () => {
      const {
        coordinator, engine, panel, arrow, adapter, boardState,
      } = createCoordinator();

      adapter.readPieces.mockReturnValue([
        { file: 4, rank: 1, piece: 'P' },
        { file: 4, rank: 6, piece: 'p' },
        { file: 4, rank: 0, piece: 'K' },
        { file: 4, rank: 7, piece: 'k' },
      ]);

      const boardEl = {
        tagName: 'DIV', id: 'board', className: 'board',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      coordinator.start(boardEl);

      expect(boardState.setBoardEl).toHaveBeenCalledWith(boardEl);
      expect(panel.mount).toHaveBeenCalled();
      expect(arrow.mount).toHaveBeenCalledWith(boardEl);
      expect(engine.init).toHaveBeenCalled();
      expect(adapter.observe).toHaveBeenCalled();
      coordinator.destroy();
    });

    it('polls for pieces when readPieces returns empty', () => {
      const {
        coordinator, adapter,
      } = createCoordinator();

      adapter.readPieces.mockReturnValue([]);

      const boardEl = {
        tagName: 'DIV', id: 'board', className: 'board',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      coordinator.start(boardEl);

      expect(adapter.exploreBoardArea).toHaveBeenCalled();
      coordinator.destroy();
    });
  });

  describe('_createRenderCtx', () => {
    it('returns object with panel, arrow, and isFlipped', () => {
      const { coordinator, panel, arrow } = createCoordinator();
      const ctx = coordinator._createRenderCtx();
      expect(ctx.panel).toBe(panel);
      expect(ctx.arrow).toBe(arrow);
      expect(typeof ctx.isFlipped).toBe('function');
    });
  });

  describe('applySettings with cached eval', () => {
    it('uses cache when available on engine reconfigure', () => {
      const { coordinator, engine, panel } = createCoordinator();

      // Set activeFen and add to cache
      coordinator._activeFen = 'testfen';
      coordinator._evalCache.set('testfen|22', {
        lines: [{ score: 30, mate: null, pv: ['e2e4'] }, { score: 20 }, { score: 10 }],
        depth: 22,
      });

      coordinator.applySettings({ numLines: 3 });

      // Should use cached eval instead of reconfiguring engine
      expect(panel.updateEval).toHaveBeenCalled();
      expect(engine.reconfigure).not.toHaveBeenCalled();
    });

    it('reconfigures engine on cache miss', () => {
      const { coordinator, engine } = createCoordinator();
      coordinator._activeFen = 'testfen';
      // No cache entry

      coordinator.applySettings({ numLines: 5 });

      expect(engine.reconfigure).toHaveBeenCalled();
    });

    it('re-analyzes after reconfigure when activeFen exists', () => {
      const { coordinator, engine } = createCoordinator();
      coordinator._activeFen = 'testfen';

      coordinator.applySettings({ searchDepth: 18 });

      expect(engine.analyze).toHaveBeenCalledWith('testfen');
    });
  });

  describe('replayEval with cache', () => {
    it('notifies plugins with cached eval', () => {
      const { coordinator } = createCoordinator();
      const plugin = new AnalysisPlugin('test');
      const spy = vi.spyOn(plugin, 'onEval');
      coordinator.registerPlugin(plugin);

      coordinator._activeFen = 'testfen';
      coordinator._evalCache.set('testfen|22', {
        lines: [{ score: 30, mate: null, pv: ['e2e4'] }, { score: 20 }, { score: 10 }],
        depth: 22,
      });

      coordinator.replayEval();
      expect(spy).toHaveBeenCalled();
    });
  });
});
