// AnalysisCoordinator: mediates between engine, panel, arrow, adapter, and plugins.
// Owns all orchestration state. Plugins receive lifecycle hooks for extensibility.

import {
  times, constant, forEach,
} from 'lodash-es';
import createDebug from '../lib/debug.js';
import { LruCache } from '../lib/lru.js';
import { applyTheme } from '../lib/themes.js';
import { eventToSquare } from '../lib/dom.js';
import { boardToFen } from './fen.js';
import {
  BOARD_SIZE, LAST_RANK,
  DEBOUNCE_MS, POLL_INTERVAL_MS,
  MAX_PIECE_ATTEMPTS,
  TURN_WHITE, TURN_BLACK,
  EVT_READY, EVT_EVAL, EVT_ERROR, EVT_LINE_HOVER, EVT_LINE_LEAVE, EVT_PGN_COPY,
  EVT_CLASSIFY_SHOW, EVT_CLASSIFY_CLEAR, EVT_CLASSIFY_LOCK, EVT_ACCURACY_UPDATE,
  PLUGIN_CLASSIFICATION, PLUGIN_PGN, PLUGIN_GUARD,
} from '../constants.js';

const log = createDebug('chee:coordinator');

export class AnalysisCoordinator {
  constructor({
    engine, panel, arrow, adapter, settings, boardState,
  }) {
    this._engine = engine;
    this._panel = panel;
    this._arrow = arrow;
    this._adapter = adapter;
    this._settings = settings;
    this._boardState = boardState;

    this._evalCache = new LruCache(1024);
    this._debounceTimer = null;
    this._activeFen = null;
    this._plugins = [];
    this._persistentLayers = [];
    this._secondaryAnalysis = null;
  }

  _cacheKey(fen, depth) {
    return `${fen}|${depth}`;
  }

  _cacheLookup(fen) {
    const cached = this._evalCache.get(this._cacheKey(fen, this._settings.searchDepth));
    if (cached && cached.lines && cached.lines.length >= this._settings.numLines) return cached;
    return null;
  }

  registerPlugin(plugin) {
    this._plugins.push(plugin);
  }

  start(boardEl) {
    this._boardState.setBoardEl(boardEl);
    log.info('Board found:', boardEl.tagName, boardEl.id, boardEl.className);

    this._panel.mount(this._adapter.getPanelAnchor(boardEl));
    applyTheme(this._panel.el, this._settings.theme);
    this._panel.setShowChart(this._settings.showChart);
    this._panel.restoreState(
      this._settings.panelMinimized,
      this._settings.panelHidden,
      this._settings.panelLeft,
      this._settings.panelTop,
      this._settings.panelWidth,
    );
    this._arrow.mount(boardEl);
    this._setupListeners(boardEl);
    this._bindPluginClassifierListeners();

    forEach(this._plugins, (p) => {
      const layer = p.getPersistentLayer(() => this._createRenderCtx());
      if (layer) this._persistentLayers.push(layer);
    });

    this._engine.init(this._settings);
    this._adapter.observe(boardEl, () => this._onBoardChange());

    const fen = this._readFen();
    log.info('Initial FEN:', fen);
    if (fen) {
      this._notifyPlugins('onBoardChange', this._boardState, this._createRenderCtx());
      this._activeFen = fen;
      this._engine.analyze(fen);
    } else {
      log.warn('No pieces yet, polling...');
      this._adapter.exploreBoardArea();
      this._waitForPieces();
    }
  }

  destroy() {
    clearTimeout(this._debounceTimer);
    this._adapter.disconnect();
    this._engine.destroy();
    forEach(this._plugins, (p) => p.destroy());
    this._arrow.clear();
    this._panel.destroy();
    if (this._boardState.boardEl && this._onMouseDown) {
      this._boardState.boardEl.removeEventListener('mousedown', this._onMouseDown);
    }
    if (this._onMouseUp) {
      document.removeEventListener('mouseup', this._onMouseUp);
    }
  }

  applySettings(newSettings) {
    Object.assign(this._settings, newSettings);
    log.info('settings changed:', this._settings);

    if ('debugMode' in newSettings) { // eslint-disable-line no-restricted-globals
      if (newSettings.debugMode) localStorage.debug = 'chee:*';
      else localStorage.removeItem('debug');
    }

    if (newSettings.theme && this._panel.el) applyTheme(this._panel.el, this._settings.theme);
    if ('showChart' in newSettings) this._panel.setShowChart(newSettings.showChart);

    this._notifyPlugins('onSettingsChange', newSettings);

    const engineChanged = 'numLines' in newSettings || 'searchDepth' in newSettings;
    if (!engineChanged) return;

    if ('numLines' in newSettings) this._panel.reconfigure(this._settings.numLines);

    if (this._activeFen) {
      const cached = this._cacheLookup(this._activeFen);
      if (cached) {
        this._applyEval(cached);
        return;
      }
    }

    // Cache miss — need engine work (more lines or different depth)
    this._notifyPlugins('onEngineReset');
    this._engine.reconfigure(this._settings);
    if (this._activeFen) this._engine.analyze(this._activeFen);
  }

  replayEval() {
    if (!this._activeFen) return;
    const cached = this._cacheLookup(this._activeFen);
    if (cached) this._notifyPlugins('onEval', cached, this._boardState, this._createRenderCtx());
  }

  requestSecondaryAnalysis(fen, targetDepth, callback) {
    if (this._secondaryAnalysis) return;
    this._secondaryAnalysis = {
      fen, targetDepth, callback, originalFen: this._activeFen,
    };
    this._engine.forceAnalyze(fen);
  }

  _createRenderCtx() {
    return {
      panel: this._panel,
      arrow: this._arrow,
      isFlipped: () => this._adapter.isFlipped(this._boardState.boardEl),
    };
  }

  _notifyPlugins(hook, ...args) {
    forEach(this._plugins, (p) => {
      if (typeof p[hook] === 'function') p[hook](...args);
    });
  }

  _getPgnPlugin() {
    return this._plugins.find((p) => p.name === PLUGIN_PGN);
  }

  _getGuardPlugin() {
    return this._plugins.find((p) => p.name === PLUGIN_GUARD);
  }

  _detectTurnFromHighlights(board) {
    const lastMove = this._adapter.detectLastMove(this._boardState.boardEl);
    if (!lastMove) return null;
    const piece = board[LAST_RANK - lastMove.to.rank][lastMove.to.file];
    if (!piece) return null;
    // Uppercase = white piece moved last → black's turn
    return piece === piece.toUpperCase() ? TURN_BLACK : TURN_WHITE;
  }

  _readFen() {
    if (!this._boardState.boardEl) return null;

    const pieces = this._adapter.readPieces(this._boardState.boardEl);
    if (pieces.length === 0) return null;

    const board = times(BOARD_SIZE, () => times(BOARD_SIZE, constant(null)));
    forEach(pieces, (p) => {
      board[LAST_RANK - p.rank][p.file] = p.piece;
    });

    if (this._boardState.boardEquals(board)) return null;

    const diffTurn = this._boardState.detectTurnFromDiff(board);
    const turn = diffTurn || this._detectTurnFromHighlights(board) || this._adapter.detectTurn();
    const castling = this._adapter.detectCastling(board);
    const enPassant = this._adapter.detectEnPassant(board);
    const moveCount = this._adapter.detectMoveCount();

    const fen = boardToFen(board, turn, castling, enPassant, moveCount);
    this._panel.setBoard(board, turn, fen);
    const ply = this._adapter.detectPly();
    this._boardState.update(board, ply, fen, turn);
    return fen;
  }

  _applyEval(data) {
    this._panel.updateEval(data);
    this._notifyPlugins('onEval', data, this._boardState, this._createRenderCtx());
    this._panel.recordScore(this._boardState.ply, data);
  }

  _onEvalData(data) {
    if (this._secondaryAnalysis) {
      const sa = this._secondaryAnalysis;
      if (this._engine.currentFen === sa.fen) {
        sa.callback(data);
        if (data.complete || data.depth >= sa.targetDepth) {
          this._secondaryAnalysis = null;
          // Don't resume original FEN — main analysis was already complete
        }
        return;
      }
      // Board changed during secondary — abort silently
      this._secondaryAnalysis = null;
    }

    if (this._engine.currentFen !== this._activeFen) return;
    this._applyEval(data);
    this._evalCache.set(this._cacheKey(this._activeFen, data.depth), data);
  }

  _onBoardChange() {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._secondaryAnalysis = null;
      const fen = this._readFen();
      if (!fen) return;
      this._notifyPlugins('onBoardChange', this._boardState, this._createRenderCtx());
      this._activeFen = fen;

      const cached = this._cacheLookup(fen);
      if (cached) {
        this._engine.stop();
        this._applyEval(cached);
      } else {
        this._engine.analyze(fen);
      }
    }, DEBOUNCE_MS);
  }

  _bindEngineListeners() {
    this._engine.on(EVT_READY, () => { log.info('Engine ready'); });
    this._engine.on(EVT_EVAL, (data) => this._onEvalData(data));
    this._engine.on(EVT_ERROR, (msg) => { log.error('Engine error:', msg); });
  }

  _bindPluginClassifierListeners() {
    // Find classification plugin and wire its classifier events to panel/arrow
    const classPlugin = this._plugins.find((p) => p.name === PLUGIN_CLASSIFICATION);
    if (!classPlugin || !classPlugin.classifier) return;

    const { classifier } = classPlugin;

    classifier.on(EVT_CLASSIFY_CLEAR, () => {
      this._panel.clearClassification();
      this._arrow.clearClassification();
      this._arrow.clearInsight();
    });

    classifier.on(EVT_CLASSIFY_SHOW, ({ result, insight }) => {
      this._panel.showClassification(result, insight);
    });

    classifier.on(EVT_CLASSIFY_LOCK, ({
      result, moveUci, insight, bestUci,
    }) => {
      const isFlipped = this._adapter.isFlipped(this._boardState.boardEl);
      this._panel.showClassification(result, insight);
      this._arrow.drawClassification(moveUci, isFlipped, result.color, result.symbol);
      if (bestUci) {
        this._arrow.drawInsight(bestUci, isFlipped, result.color);
      }
      const pgnPlugin = this._getPgnPlugin();
      if (pgnPlugin) pgnPlugin.receiveClassification(this._boardState.ply, result);
    });

    classifier.on(EVT_ACCURACY_UPDATE, (pct) => {
      this._panel.showAccuracy(pct);
    });
  }

  _setupListeners(boardEl) {
    this._panel.on(EVT_LINE_HOVER, (moves, turn) => {
      forEach(this._persistentLayers, (l) => l.clear());
      this._arrow.draw(moves, turn, this._adapter.isFlipped(boardEl));
    });
    this._panel.on(EVT_LINE_LEAVE, () => {
      this._arrow.clear();
      forEach(this._persistentLayers, (l) => l.restore());
    });
    this._panel.on(EVT_PGN_COPY, () => {
      const pgnPlugin = this._getPgnPlugin();
      if (!pgnPlugin) return;
      const pgn = pgnPlugin.exportPgn();
      const btn = this._panel.el && this._panel.el.querySelector('.chee-copy-pgn');
      navigator.clipboard.writeText(pgn).then(() => {
        if (btn) {
          btn.textContent = '\u2713';
          setTimeout(() => { btn.textContent = 'PGN'; }, 1000);
        }
      });
    });
    this._bindEngineListeners();

    this._onMouseDown = (e) => {
      this._arrow.clearGuard();
      const guard = this._getGuardPlugin();
      if (!guard || !this._boardState.board || !this._boardState.turn) return;

      const isFlipped = this._adapter.isFlipped(boardEl);
      const sq = eventToSquare(e, boardEl, isFlipped);
      if (!sq) return;

      if (guard.checkSquare(sq.file, sq.rank, this._boardState.board, this._boardState.turn)) {
        this._arrow.drawGuard(sq.file, sq.rank, isFlipped);
      }
    };
    this._onMouseUp = () => { this._arrow.clearGuard(); };

    boardEl.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
  }

  _waitForPieces() {
    let attempts = 0;
    const pieceInterval = setInterval(() => {
      attempts += 1;

      const alt = this._adapter.findAlternatePieceContainer(this._boardState.boardEl);
      if (alt) {
        this._boardState.setBoardEl(alt);
        this._adapter.observe(alt, () => this._onBoardChange());
      }

      const fen = this._readFen();
      if (fen) {
        log.info('Pieces appeared! FEN:', fen);
        clearInterval(pieceInterval);
        this._notifyPlugins('onBoardChange', this._boardState, this._createRenderCtx());
        this._activeFen = fen;
        this._engine.analyze(fen);
        return;
      }

      if (attempts > MAX_PIECE_ATTEMPTS) {
        clearInterval(pieceInterval);
        log.error('Gave up waiting for pieces');
      }
    }, POLL_INTERVAL_MS);
  }
}
