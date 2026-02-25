// Chee - Chess Analysis Extension
// Entry point: bootstrap only — loads settings, creates modules, registers plugins.

import createDebug from './lib/debug.js';
import pollUntil from './lib/poll.js';
import { loadSettings } from './lib/settings.js';
import { createAdapter } from './adapters/factory.js';
import { Engine } from './core/engine.js';
import { Panel } from './core/panel.js';
import { ArrowOverlay } from './core/arrow.js';
import { BoardState } from './core/board-state.js';
import { AnalysisCoordinator } from './core/coordinator.js';
import { ClassificationPlugin } from './core/plugins/classification-plugin.js';
import { HintPlugin } from './core/plugins/hint-plugin.js';
import { PgnPlugin } from './core/plugins/pgn-plugin.js';
import { GuardPlugin } from './core/plugins/guard-plugin.js';
import { POLL_INTERVAL_MS, BOARD_TIMEOUT_MS } from './constants.js';

const log = createDebug('chee:content');

(async function main() {
  log.info('Content script loaded on', window.location.href);

  const settings = await loadSettings();
  if (settings.debugMode) { localStorage.debug = 'chee:*'; } // eslint-disable-line no-restricted-globals
  log.info('settings:', settings);

  const isPuzzlePage = /chess\.com\/puzzles/.test(window.location.href);
  if (isPuzzlePage && !settings.enablePuzzles) {
    log.info('Puzzle page detected but enablePuzzles is off, exiting');
    return;
  }
  if (isPuzzlePage) {
    settings.numLines = 1;
    settings.showBestMove = true;
    settings.showClassifications = false;
    settings.showChart = false;
    settings.showGuard = false;
    settings.showCrazy = false;
  }

  const adapter = createAdapter();
  const engine = new Engine();
  const panel = new Panel(settings.numLines);
  const arrow = new ArrowOverlay();
  const boardState = new BoardState();

  const coordinator = new AnalysisCoordinator({
    engine, panel, arrow, adapter, settings, boardState,
  });

  if (!isPuzzlePage) {
    coordinator.registerPlugin(new ClassificationPlugin({ adapter, settings }));
    coordinator.registerPlugin(new PgnPlugin());
    coordinator.registerPlugin(new GuardPlugin({ settings }));
  }
  coordinator.registerPlugin(new HintPlugin({ settings }));

  window.addEventListener('unload', () => coordinator.destroy());

  const PUZZLE_FORCED_KEYS = ['numLines', 'showBestMove', 'showClassifications', 'showChart', 'showGuard', 'showCrazy'];
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const update = {};
    if (changes.numLines) update.numLines = changes.numLines.newValue;
    if (changes.searchDepth) update.searchDepth = changes.searchDepth.newValue;
    if (changes.theme) update.theme = changes.theme.newValue;
    if (changes.showClassifications) update.showClassifications = changes.showClassifications.newValue;
    if (changes.showBestMove) update.showBestMove = changes.showBestMove.newValue;
    if (changes.showGuard) update.showGuard = changes.showGuard.newValue;
    if (changes.showChart) update.showChart = changes.showChart.newValue;
    if (changes.debugMode) update.debugMode = changes.debugMode.newValue;
    if (isPuzzlePage) {
      PUZZLE_FORCED_KEYS.forEach((k) => { delete update[k]; });
    }
    if (Object.keys(update).length) coordinator.applySettings(update);
  });

  log.info('init() called, searching for board...');
  let boardEl;
  try {
    boardEl = await pollUntil(() => adapter.findBoard(), POLL_INTERVAL_MS, BOARD_TIMEOUT_MS);
  } catch (err) {
    log.error(err.message);
    return;
  }

  coordinator.start(boardEl);
  if (isPuzzlePage && panel.el) {
    panel.el.style.display = 'none';
  }
}());
