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
import { TrapboyPlugin } from './core/plugins/trapboy-plugin.js';
import { BookPlugin } from './core/plugins/book-plugin.js';
import { POLL_INTERVAL_MS, BOARD_TIMEOUT_MS, SETTINGS_DEFAULTS } from './constants.js';

const log = createDebug('chee:content');

(async function main() {
  log.info('Content script loaded on', window.location.href);

  const settings = await loadSettings();
  if (settings.debugMode) { localStorage.debug = 'chee:*'; } // eslint-disable-line no-restricted-globals
  log.info('settings:', settings);

  const { href } = window.location;

  // Hint pages: each entry defines a URL pattern, settings key, and label.
  // To add a new hint page, just add an entry here + a toggle in popup.html + default in constants.js.
  const HINT_PAGES = [
    { pattern: /chess\.com\/puzzles\/rush/, key: 'enablePuzzleRush', label: 'Puzzle Rush' },
    { pattern: /chess\.com\/puzzles\/battle/, key: 'enablePuzzleBattle', label: 'Puzzle Battle' },
    { pattern: /chess\.com\/puzzles\/learning/, key: 'enablePuzzleLearning', label: 'Puzzle Learning' },
    { pattern: /chess\.com\/puzzles/, key: 'enablePuzzles', label: 'Puzzle page' },
    {
      pattern: /chess\.com\/daily/, key: 'enableDaily', label: 'Daily page', daily: true,
    },
    { pattern: /lichess\.org\/training/, key: 'enableLichessTraining', label: 'Lichess Training' },
    { pattern: /lichess\.org\/storm/, key: 'enableLichessStorm', label: 'Lichess Storm' },
    { pattern: /lichess\.org\/racer/, key: 'enableLichessRacer', label: 'Lichess Racer' },
    { pattern: /lichess\.org\/streak/, key: 'enableLichessStreak', label: 'Lichess Streak' },
  ];

  // First match wins (specific patterns before general ones)
  const hintMatch = HINT_PAGES.find((p) => p.pattern.test(href));
  const isHintPage = !!hintMatch;
  const isDailyPage = !!hintMatch?.daily;

  if (hintMatch && !settings[hintMatch.key]) {
    log.info(`${hintMatch.label} detected but ${hintMatch.key} is off, exiting`);
    return;
  }
  if (isHintPage) {
    settings.numLines = 1;
    settings.searchDepth = 15;
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
    coordinator.registerPlugin(new TrapboyPlugin({ settings }));
  }
  coordinator.registerPlugin(new HintPlugin({ settings }));

  window.addEventListener('unload', () => coordinator.destroy());

  const PUZZLE_FORCED_KEYS = ['numLines', 'searchDepth', 'showBestMove', 'showClassifications', 'showChart', 'showGuard', 'showCrazy'];
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const update = {};
    for (const key of Object.keys(changes)) {
      if (key in SETTINGS_DEFAULTS) update[key] = changes[key].newValue;
    }
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
