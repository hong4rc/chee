import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import { AnalysisCoordinator } from '../../src/core/coordinator.js';
import { AnalysisPlugin } from '../../src/core/plugin.js';
import {
  TURN_WHITE,
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
    setLoading: vi.fn(),
    setMaxDepth: vi.fn(),
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

  const boardPreview = {
    mount: vi.fn(),
    show: vi.fn(),
    clear: vi.fn(),
    destroy: vi.fn(),
  };

  const coordinator = new AnalysisCoordinator({
    engine, panel, arrow, adapter, settings, boardState, boardPreview,
  });

  return {
    coordinator, engine, panel, arrow, adapter, boardState, boardPreview, settings,
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
      expect(spy).toHaveBeenCalledWith({ showChart: false }, expect.any(Object));
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
        tagName: 'DIV',
        id: 'board',
        className: 'board',
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
        tagName: 'DIV',
        id: 'board',
        className: 'board',
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

      coordinator.applySettings({ numLines: 2 });

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

  describe('secondary analysis isolation', () => {
    const mainEval = {
      depth: 18,
      complete: true,
      lines: [
        { score: -474, mate: null, pv: ['g4h5'] },
        { score: -500, mate: null, pv: ['d4d5'] },
        { score: -520, mate: null, pv: ['c1e3'] },
      ],
    };
    const incompleteMainEval = {
      depth: 14,
      complete: false,
      lines: mainEval.lines,
    };
    const searchmovesEval = {
      depth: 8,
      complete: false,
      lines: [
        { score: -870, mate: null, pv: ['c2c4'] },
        { score: -900, mate: null, pv: ['c2c3'] },
      ],
    };
    const searchmovesComplete = {
      depth: 8,
      complete: true,
      lines: searchmovesEval.lines,
    };

    it('restores savedEval after secondary completes — not searchmoves result', () => {
      const { coordinator, engine, panel } = createCoordinator();
      coordinator._activeFen = 'testfen';
      engine.currentFen = 'testfen';
      engine.forceAnalyze = vi.fn();

      // Simulate main eval arriving
      coordinator._applyEval(mainEval);
      expect(panel.updateEval).toHaveBeenCalledWith(mainEval);
      panel.updateEval.mockClear();

      // Start secondary analysis (guard searchmoves)
      const callback = vi.fn();
      coordinator.requestSecondaryAnalysis('testfen', 8, callback, ['c2c3', 'c2c4']);

      // Secondary eval at depth 8 arrives
      coordinator._onEvalData(searchmovesEval);
      expect(callback).toHaveBeenCalledWith(searchmovesEval);

      // Panel should be restored with the original mainEval, not searchmovesEval
      expect(panel.updateEval).toHaveBeenCalledWith(mainEval);
    });

    it('drops stale searchmoves evals after secondary completes', () => {
      const { coordinator, engine, panel } = createCoordinator();
      coordinator._activeFen = 'testfen';
      engine.currentFen = 'testfen';
      engine.forceAnalyze = vi.fn();

      // Simulate main eval
      coordinator._applyEval(mainEval);
      panel.updateEval.mockClear();

      // Start and complete secondary analysis
      coordinator.requestSecondaryAnalysis('testfen', 8, vi.fn(), ['c2c3', 'c2c4']);
      coordinator._onEvalData(searchmovesEval);
      panel.updateEval.mockClear();

      // Stale searchmoves eval arrives (depth 9, in-flight before stop took effect)
      const staleEval = {
        depth: 9,
        complete: false,
        lines: [{ score: -880, mate: null, pv: ['c2c3'] }],
      };
      coordinator._onEvalData(staleEval);

      // Should be dropped — panel not updated with searchmoves data
      expect(panel.updateEval).not.toHaveBeenCalled();
    });

    it('drops bestmove from stopped searchmoves analysis', () => {
      const { coordinator, engine, panel } = createCoordinator();
      coordinator._activeFen = 'testfen';
      engine.currentFen = 'testfen';
      engine.forceAnalyze = vi.fn();

      coordinator._applyEval(mainEval);
      panel.updateEval.mockClear();

      coordinator.requestSecondaryAnalysis('testfen', 8, vi.fn(), ['c2c3', 'c2c4']);
      coordinator._onEvalData(searchmovesEval);
      panel.updateEval.mockClear();

      // bestmove (complete: true) from stopped searchmoves analysis
      coordinator._onEvalData(searchmovesComplete);

      // Should be dropped
      expect(panel.updateEval).not.toHaveBeenCalled();
    });

    it('clears drop flag on board change', () => {
      const { coordinator, engine, panel } = createCoordinator();
      coordinator._activeFen = 'testfen';
      engine.currentFen = 'testfen';
      engine.forceAnalyze = vi.fn();

      coordinator._applyEval(mainEval);
      coordinator.requestSecondaryAnalysis('testfen', 8, vi.fn(), ['c2c3', 'c2c4']);
      coordinator._onEvalData(searchmovesEval);

      // Flag is set (complete mainEval → engine not resumed)
      expect(coordinator._dropUntilNewAnalysis).toBe(true);

      // Board change clears the flag
      coordinator._dropUntilNewAnalysis = false; // simulates _onBoardChange clearing it

      // Evals flow through again
      panel.updateEval.mockClear();
      engine.currentFen = 'newfen';
      coordinator._activeFen = 'newfen';
      const newEval = {
        depth: 10,
        complete: false,
        lines: [{ score: 30, mate: null, pv: ['e2e4'] }],
      };
      coordinator._onEvalData(newEval);
      expect(panel.updateEval).toHaveBeenCalledWith(newEval);
    });

    it('cancelSecondaryAnalysis restores savedEval and drops stale evals', () => {
      const { coordinator, engine, panel } = createCoordinator();
      coordinator._activeFen = 'testfen';
      engine.currentFen = 'testfen';
      engine.forceAnalyze = vi.fn();

      coordinator._applyEval(mainEval);
      panel.updateEval.mockClear();

      coordinator.requestSecondaryAnalysis('testfen', 8, vi.fn(), ['c2c3', 'c2c4']);
      coordinator.cancelSecondaryAnalysis();

      // Panel restored with mainEval
      expect(panel.updateEval).toHaveBeenCalledWith(mainEval);

      // Stale eval after cancel is dropped (complete mainEval → engine not resumed)
      panel.updateEval.mockClear();
      coordinator._onEvalData(searchmovesComplete);
      expect(panel.updateEval).not.toHaveBeenCalled();
    });

    it('resumes engine when savedEval was incomplete', () => {
      const { coordinator, engine, panel } = createCoordinator();
      coordinator._activeFen = 'testfen';
      engine.currentFen = 'testfen';
      engine.forceAnalyze = vi.fn();

      // Simulate incomplete main eval (depth 14, still running)
      coordinator._applyEval(incompleteMainEval);
      panel.updateEval.mockClear();

      // Start and complete secondary
      coordinator.requestSecondaryAnalysis('testfen', 8, vi.fn(), ['c2c3', 'c2c4']);
      coordinator._onEvalData(searchmovesEval);

      // Panel restored with incomplete eval
      expect(panel.updateEval).toHaveBeenCalledWith(incompleteMainEval);
      // Engine resumed because eval was not complete
      expect(engine.forceAnalyze).toHaveBeenCalledTimes(2); // once for secondary, once for resume
      expect(coordinator._dropUntilNewAnalysis).toBe(false);
    });
  });
});
