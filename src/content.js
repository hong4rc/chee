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
import { BookPlugin } from './core/plugins/book-plugin.js';
import { POLL_INTERVAL_MS, BOARD_TIMEOUT_MS } from './constants.js';

const log = createDebug('chee:content');

(async function main() {
  log.info('Content script loaded on', window.location.href);

  const settings = await loadSettings();
  if (settings.debugMode) { localStorage.debug = 'chee:*'; } // eslint-disable-line no-restricted-globals
  log.info('settings:', settings);

  const { href } = window.location;
  const isPuzzleRush = /chess\.com\/puzzles\/rush/.test(href);
  const isPuzzleBattle = /chess\.com\/puzzles\/battle/.test(href);
  const isPuzzleLearning = /chess\.com\/puzzles\/learning/.test(href);
  const isPuzzleRated = !isPuzzleRush && !isPuzzleBattle && !isPuzzleLearning && /chess\.com\/puzzles/.test(href);
  const isDailyPage = /chess\.com\/daily/.test(href);
  const isPuzzlePage = isPuzzleRated || isPuzzleRush || isPuzzleBattle || isPuzzleLearning;
  const isHintPage = isPuzzlePage || isDailyPage;
  if (isPuzzleRated && !settings.enablePuzzles) {
    log.info('Puzzle page detected but enablePuzzles is off, exiting');
    return;
  }
  if (isPuzzleRush && !settings.enablePuzzleRush) {
    log.info('Puzzle Rush detected but enablePuzzleRush is off, exiting');
    return;
  }
  if (isPuzzleBattle && !settings.enablePuzzleBattle) {
    log.info('Puzzle Battle detected but enablePuzzleBattle is off, exiting');
    return;
  }
  if (isPuzzleLearning && !settings.enablePuzzleLearning) {
    log.info('Puzzle Learning detected but enablePuzzleLearning is off, exiting');
    return;
  }
  if (isDailyPage && !settings.enableDaily) {
    log.info('Daily page detected but enableDaily is off, exiting');
    return;
  }
  if (isHintPage) {
    settings.numLines = 1;
    settings.searchDepth = settings.puzzleDepth;
    settings.showBestMove = true;
    settings.showClassifications = false;
    settings.showChart = false;
    settings.showGuard = false;
    settings.showCrazy = false;
    settings.puzzleMode = true;
  }

  const adapter = createAdapter();
  const engine = new Engine();
  const panel = new Panel(settings.numLines);
  const arrow = new ArrowOverlay();
  const boardState = new BoardState();

  const coordinator = new AnalysisCoordinator({
    engine, panel, arrow, adapter, settings, boardState,
  });

  if (!isHintPage) {
    coordinator.registerPlugin(new ClassificationPlugin({ adapter, settings }));
    coordinator.registerPlugin(new BookPlugin({ settings }));
    coordinator.registerPlugin(new PgnPlugin());
    coordinator.registerPlugin(new GuardPlugin({ settings }));
  }
  coordinator.registerPlugin(new HintPlugin({ settings }));

  window.addEventListener('unload', () => coordinator.destroy());

  const PUZZLE_FORCED_KEYS = ['numLines', 'searchDepth', 'showBestMove', 'showClassifications', 'showChart', 'showGuard', 'showCrazy'];
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const update = {};
    if (changes.numLines) update.numLines = changes.numLines.newValue;
    if (changes.searchDepth) update.searchDepth = changes.searchDepth.newValue;
    if (changes.theme) update.theme = changes.theme.newValue;
    if (changes.showClassifications) update.showClassifications = changes.showClassifications.newValue;
    if (changes.showBookMoves) update.showBookMoves = changes.showBookMoves.newValue;
    if (changes.showBestMove) update.showBestMove = changes.showBestMove.newValue;
    if (changes.showGuard) update.showGuard = changes.showGuard.newValue;
    if (changes.showChart) update.showChart = changes.showChart.newValue;
    if (changes.waitForComplete) update.waitForComplete = changes.waitForComplete.newValue;
    if (changes.debugMode) update.debugMode = changes.debugMode.newValue;
    if (isDailyPage && changes.enableDaily) {
      settings.showBestMove = changes.enableDaily.newValue;
      if (changes.enableDaily.newValue) {
        coordinator.replayEval();
      } else {
        arrow.clearHint();
      }
    }
    if (isHintPage) {
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
  if (isHintPage && panel.el) {
    panel.el.style.display = 'none';
  }
}());
