// Chee - Chess Analysis Extension
// Entry point: detects site, wires modules together

import {
  times, constant, forEach, find,
} from 'lodash-es';
import createDebug from './lib/debug.js';
import pollUntil from './lib/poll.js';
import { loadSettings } from './lib/settings.js';
import { applyTheme } from './lib/themes.js';
import { createAdapter } from './adapters/factory.js';
import { Engine } from './core/engine.js';
import { Panel } from './core/panel.js';
import { ArrowOverlay } from './core/arrow.js';
import { boardToFen } from './core/fen.js';
import { MoveClassifier } from './core/move-classifier.js';
import {
  BOARD_SIZE, LAST_RANK,
  TURN_WHITE, TURN_BLACK,
  DEBOUNCE_MS, POLL_INTERVAL_MS, BOARD_TIMEOUT_MS,
  MAX_PIECE_ATTEMPTS,
  EVT_READY, EVT_EVAL, EVT_ERROR, EVT_LINE_HOVER, EVT_LINE_LEAVE, EVT_THREAT_HOVER, EVT_THREAT_LEAVE,
  HINT_MIN_DEPTH, HINT_ARROW_OPACITY, HINT_THRESHOLDS,
  CLASSIFICATION_MATE_LOSS,
  ARROW_COLOR_WHITE, ARROW_COLOR_BLACK,
} from './constants.js';

const log = createDebug('chee:content');

(async function main() {
  log.info('Content script loaded on', window.location.href);

  const settings = await loadSettings();
  if (settings.debugMode) { localStorage.debug = 'chee:*'; } // eslint-disable-line no-restricted-globals
  log.info('settings:', settings);

  const adapter = createAdapter();
  let engine = new Engine();
  const panel = new Panel(settings.numLines);
  const arrow = new ArrowOverlay();
  const classifier = new MoveClassifier({
    panel, arrow, adapter, settings,
  });

  let boardEl = null;
  let debounceTimer = null;
  let latestBoard = null;
  let currentHint = null; // { uci, color, symbol } — pre-move hint, one object only

  function cleanup() {
    clearTimeout(debounceTimer);
    adapter.disconnect();
    engine.destroy();
    classifier.destroy();
    arrow.clear();
    panel.destroy();
  }

  window.addEventListener('unload', cleanup);

  // Detect whose turn it is by diffing two boards.
  // If a piece moved (≤4 squares changed), the arrived piece's color tells us who moved.
  // Returns the side to move NEXT, or null if the diff is ambiguous.
  function detectTurnFromDiff(prev, curr) {
    let changes = 0;
    let arrivedPiece = null;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (prev[row][col] !== curr[row][col]) {
          changes += 1;
          if (changes > 4) return null; // position jump, not a single move
          const c = curr[row][col];
          if (c && c !== prev[row][col] && !arrivedPiece) arrivedPiece = c;
        }
      }
    }
    if (!arrivedPiece) return null;
    return arrivedPiece === arrivedPiece.toUpperCase() ? TURN_BLACK : TURN_WHITE;
  }

  let latestPly = 0;

  function readFen() {
    if (!boardEl) return null;

    const pieces = adapter.readPieces(boardEl);
    if (pieces.length === 0) return null;

    const board = times(BOARD_SIZE, () => times(BOARD_SIZE, constant(null)));
    forEach(pieces, (p) => {
      board[LAST_RANK - p.rank][p.file] = p.piece;
    });

    // Prefer board-diff turn detection (reliable); fall back to adapter (DOM-based)
    const diffTurn = latestBoard ? detectTurnFromDiff(latestBoard, board) : null;
    const turn = diffTurn || adapter.detectTurn();
    const castling = adapter.detectCastling(board);
    const enPassant = adapter.detectEnPassant(board);
    const moveCount = adapter.detectMoveCount();

    const fen = boardToFen(board, turn, castling, enPassant, moveCount);
    panel.setBoard(board, turn, fen);
    latestBoard = board;
    latestPly = adapter.detectPly();
    return fen;
  }

  function updateHint(data) {
    arrow.clearHint();
    currentHint = null;

    if (!data.lines || data.lines.length === 0) return;
    const line1 = data.lines[0];
    const bestUci = line1.pv && line1.pv[0];
    if (!bestUci) return;

    // Classification-based hint (requires spread threshold)
    if (settings.showClassifications && data.lines.length >= 2 && data.depth >= HINT_MIN_DEPTH) {
      const line2 = data.lines[1];
      let spread;
      if (line1.mate !== null && line2.mate === null) {
        spread = CLASSIFICATION_MATE_LOSS;
      } else if (line1.mate === null && line2.mate === null) {
        spread = line1.score - line2.score;
      } else {
        spread = 0;
      }

      const tier = find(HINT_THRESHOLDS, (t) => spread >= t.min);
      if (tier) {
        currentHint = { uci: bestUci, color: tier.color, symbol: tier.symbol };
        arrow.drawHint(bestUci, adapter.isFlipped(boardEl), tier.color, tier.symbol, HINT_ARROW_OPACITY);
        return;
      }
    }

    // Always-on best move arrow (no badge, team color)
    if (settings.showBestMove) {
      const turn = panel._turn; // eslint-disable-line no-underscore-dangle
      const color = turn === TURN_WHITE ? ARROW_COLOR_WHITE : ARROW_COLOR_BLACK;
      currentHint = { uci: bestUci, color, symbol: null };
      arrow.drawHint(bestUci, adapter.isFlipped(boardEl), color, null, HINT_ARROW_OPACITY);
    }
  }

  function onEvalData(data) {
    panel.updateEval(data);
    classifier.onEval(data, boardEl);
    updateHint(data);
  }

  function onBoardChange() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const fen = readFen();
      if (!fen) return;
      arrow.clearHint();
      currentHint = null;
      classifier.onBoardChange(fen, boardEl, latestBoard, latestPly);
      engine.analyze(fen);
    }, DEBOUNCE_MS);
  }

  function bindEngineListeners() {
    engine.on(EVT_READY, () => { panel.updateStatus('Ready'); });
    engine.on(EVT_EVAL, onEvalData);
    engine.on(EVT_ERROR, (msg) => { panel.updateStatus(`Error: ${msg}`); });
  }

  function setupListeners(el) {
    panel.on(EVT_LINE_HOVER, (moves, turn) => {
      arrow.clearHint();
      arrow.draw(moves, turn, adapter.isFlipped(el));
    });
    panel.on(EVT_LINE_LEAVE, () => {
      arrow.clear();
      if (currentHint) {
        arrow.drawHint(
          currentHint.uci,
          adapter.isFlipped(boardEl),
          currentHint.color,
          currentHint.symbol,
          HINT_ARROW_OPACITY,
        );
      }
    });
    panel.on(EVT_THREAT_HOVER, (uci, turn) => {
      arrow.clearHint();
      const opponentTurn = turn === TURN_WHITE ? TURN_BLACK : TURN_WHITE;
      arrow.draw([uci], opponentTurn, adapter.isFlipped(el));
    });
    panel.on(EVT_THREAT_LEAVE, () => {
      arrow.clear();
      if (currentHint) {
        arrow.drawHint(
          currentHint.uci,
          adapter.isFlipped(boardEl),
          currentHint.color,
          currentHint.symbol,
          HINT_ARROW_OPACITY,
        );
      }
    });
    bindEngineListeners();
  }

  function waitForPieces() {
    let attempts = 0;
    const pieceInterval = setInterval(() => {
      attempts += 1;

      const alt = adapter.findAlternatePieceContainer(boardEl);
      if (alt) {
        boardEl = alt;
        adapter.observe(alt, onBoardChange);
      }

      const fen = readFen();
      if (fen) {
        log.info('Pieces appeared! FEN:', fen);
        clearInterval(pieceInterval);
        classifier.initFen(fen, latestBoard, latestPly);
        engine.analyze(fen);
        return;
      }

      if (attempts > MAX_PIECE_ATTEMPTS) {
        clearInterval(pieceInterval);
        log.error('Gave up waiting for pieces');
        panel.updateStatus('No pieces found — try reloading');
      }
    }, POLL_INTERVAL_MS);
  }

  async function init() {
    log.info('init() called, searching for board...');

    let el;
    try {
      el = await pollUntil(() => adapter.findBoard(), POLL_INTERVAL_MS, BOARD_TIMEOUT_MS);
    } catch (err) {
      log.error(err.message);
      return;
    }

    boardEl = el;
    log.info('Board found:', el.tagName, el.id, el.className);

    panel.mount(adapter.getPanelAnchor(el));
    applyTheme(panel.el, settings.theme);
    arrow.mount(el);
    setupListeners(el);

    panel.updateStatus('Loading Stockfish...');
    engine.init(settings);
    adapter.observe(el, onBoardChange);

    const fen = readFen();
    log.info('Initial FEN:', fen);
    if (fen) {
      classifier.initFen(fen, latestBoard, latestPly);
      engine.analyze(fen);
    } else {
      log.warn('No pieces yet, polling...');
      adapter.exploreBoardArea();
      waitForPieces();
    }
  }

  function applySettings(newSettings) {
    Object.assign(settings, newSettings);
    log.info('settings changed:', settings);

    if ('debugMode' in newSettings) { // eslint-disable-line no-restricted-globals
      if (newSettings.debugMode) localStorage.debug = 'chee:*';
      else localStorage.removeItem('debug');
    }

    if (newSettings.theme && panel.el) applyTheme(panel.el, settings.theme);

    if ('showClassifications' in newSettings && !newSettings.showClassifications) {
      classifier.setEnabled(false);
    }

    const engineChanged = 'numLines' in newSettings || 'searchDepth' in newSettings;
    if (!engineChanged) return;

    panel.reconfigure(settings.numLines);
    classifier.clearCache();

    engine.destroy();
    engine = new Engine();
    bindEngineListeners();

    if (!boardEl) return;
    engine.init(settings);

    const fen = readFen();
    if (fen) engine.analyze(fen);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const update = {};
    if (changes.numLines) update.numLines = changes.numLines.newValue;
    if (changes.searchDepth) update.searchDepth = changes.searchDepth.newValue;
    if (changes.theme) update.theme = changes.theme.newValue;
    if (changes.showClassifications) update.showClassifications = changes.showClassifications.newValue;
    if (changes.showBestMove) update.showBestMove = changes.showBestMove.newValue;
    if (changes.debugMode) update.debugMode = changes.debugMode.newValue;
    if (Object.keys(update).length) applySettings(update);
  });

  init();
}());
