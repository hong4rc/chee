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

  const adapter = createAdapter();
  const engine = new Engine();
  const panel = new Panel(settings.numLines);
  const arrow = new ArrowOverlay();
  const boardState = new BoardState();

  const coordinator = new AnalysisCoordinator({
    engine, panel, arrow, adapter, settings, boardState,
  });

  coordinator.registerPlugin(new ClassificationPlugin({ adapter, settings }));
  coordinator.registerPlugin(new HintPlugin({ settings }));
  coordinator.registerPlugin(new PgnPlugin());
  coordinator.registerPlugin(new GuardPlugin({ settings }));

  window.addEventListener('unload', () => coordinator.destroy());

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const update = {};
    if (changes.numLines) update.numLines = changes.numLines.newValue;
    if (changes.searchDepth) update.searchDepth = changes.searchDepth.newValue;
    if (changes.theme) update.theme = changes.theme.newValue;
    if (changes.showClassifications) update.showClassifications = changes.showClassifications.newValue;
    if (changes.showBestMove) update.showBestMove = changes.showBestMove.newValue;
    if (changes.showGuard) update.showGuard = changes.showGuard.newValue;
    if (changes.debugMode) update.debugMode = changes.debugMode.newValue;
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
}());
