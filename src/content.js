// Chee - Chess Analysis Extension
// Entry point: detects site, wires modules together

import { times, constant, forEach } from 'lodash-es';
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
  DEBOUNCE_MS, POLL_INTERVAL_MS, BOARD_TIMEOUT_MS,
  MAX_PIECE_ATTEMPTS,
  EVT_READY, EVT_EVAL, EVT_ERROR, EVT_LINE_HOVER, EVT_LINE_LEAVE,
} from './constants.js';

const log = createDebug('chee:content');

(async function main() {
  log('Content script loaded on', window.location.href);

  const settings = await loadSettings();
  log('settings:', settings);

  const adapter = createAdapter();
  let engine = new Engine();
  const panel = new Panel(settings.numLines);
  const arrow = new ArrowOverlay();
  const classifier = new MoveClassifier({
    panel, arrow, adapter, settings,
  });

  let boardEl = null;
  let debounceTimer = null;

  function cleanup() {
    clearTimeout(debounceTimer);
    adapter.disconnect();
    engine.destroy();
    classifier.destroy();
    arrow.clear();
    panel.destroy();
  }

  window.addEventListener('unload', cleanup);

  function readFen() {
    if (!boardEl) return null;

    const pieces = adapter.readPieces(boardEl);
    if (pieces.length === 0) return null;

    const board = times(BOARD_SIZE, () => times(BOARD_SIZE, constant(null)));
    forEach(pieces, (p) => {
      board[LAST_RANK - p.rank][p.file] = p.piece;
    });

    const turn = adapter.detectTurn();
    const castling = adapter.detectCastling(board);
    const enPassant = adapter.detectEnPassant(board);
    const moveCount = adapter.detectMoveCount();

    const fen = boardToFen(board, turn, castling, enPassant, moveCount);
    panel.setBoard(board, turn, fen);
    return fen;
  }

  function onEvalData(data) {
    panel.updateEval(data);
    classifier.onEval(data, boardEl);
  }

  function onBoardChange() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const fen = readFen();
      if (!fen) return;
      classifier.onBoardChange(fen, boardEl);
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
      arrow.draw(moves, turn, adapter.isFlipped(el));
    });
    panel.on(EVT_LINE_LEAVE, () => { arrow.clear(); });
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
        log('Pieces appeared! FEN:', fen);
        clearInterval(pieceInterval);
        classifier.initFen(fen);
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
    log('init() called, searching for board...');

    let el;
    try {
      el = await pollUntil(() => adapter.findBoard(), POLL_INTERVAL_MS, BOARD_TIMEOUT_MS);
    } catch (err) {
      log.error(err.message);
      return;
    }

    boardEl = el;
    log('Board found:', el.tagName, el.id, el.className);

    panel.mount(adapter.getPanelAnchor(el));
    applyTheme(panel.el, settings.theme);
    arrow.mount(el);
    setupListeners(el);

    panel.updateStatus('Loading Stockfish...');
    engine.init(settings);
    adapter.observe(el, onBoardChange);

    const fen = readFen();
    log('Initial FEN:', fen);
    if (fen) {
      classifier.initFen(fen);
      engine.analyze(fen);
    } else {
      log('No pieces yet, polling...');
      adapter.exploreBoardArea();
      waitForPieces();
    }
  }

  function applySettings(newSettings) {
    Object.assign(settings, newSettings);
    log('settings changed:', settings);

    if (newSettings.theme && panel.el) applyTheme(panel.el, settings.theme);

    if ('showClassifications' in newSettings && !newSettings.showClassifications) {
      classifier.setEnabled(false);
    }

    const engineChanged = 'numLines' in newSettings || 'searchDepth' in newSettings;
    if (!engineChanged) return;

    panel.reconfigure(settings.numLines);

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
    if (Object.keys(update).length) applySettings(update);
  });

  init();
}());
