import { toInteger } from 'lodash-es';
import { loadSettings } from './lib/settings.js';
import { applyTheme } from './lib/themes.js';

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await loadSettings();
  applyTheme(document.body, settings.theme);

  // Version info
  const { version } = chrome.runtime.getManifest();
  const versionEl = document.getElementById('chee-version');
  if (versionEl) versionEl.textContent = `v${version} (${__COMMIT_HASH__})`;

  // Theme dropdown
  const themeSelect = document.getElementById('theme-select');
  themeSelect.value = settings.theme;
  themeSelect.addEventListener('change', () => {
    const val = themeSelect.value;
    chrome.storage.sync.set({ theme: val });
    applyTheme(document.body, val);
  });

  // Classification toggle
  const classifyCheckbox = document.getElementById('show-classifications');
  classifyCheckbox.checked = settings.showClassifications;
  classifyCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ showClassifications: classifyCheckbox.checked });
  });

  // Book moves toggle
  const bookMovesCheckbox = document.getElementById('show-book-moves');
  bookMovesCheckbox.checked = settings.showBookMoves;
  bookMovesCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ showBookMoves: bookMovesCheckbox.checked });
  });

  // Crazy toggle
  const crazyCheckbox = document.getElementById('show-crazy');
  crazyCheckbox.checked = settings.showCrazy;
  crazyCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ showCrazy: crazyCheckbox.checked });
  });

  // Best move toggle
  const bestMoveCheckbox = document.getElementById('show-best-move');
  bestMoveCheckbox.checked = settings.showBestMove;
  bestMoveCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ showBestMove: bestMoveCheckbox.checked });
  });

  // Guard toggle
  const guardCheckbox = document.getElementById('show-guard');
  guardCheckbox.checked = settings.showGuard;
  guardCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ showGuard: guardCheckbox.checked });
  });

  // Chart toggle
  const chartCheckbox = document.getElementById('show-chart');
  chartCheckbox.checked = settings.showChart;
  chartCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ showChart: chartCheckbox.checked });
  });

  // Wait for complete toggle
  const waitCompleteCheckbox = document.getElementById('wait-for-complete');
  waitCompleteCheckbox.checked = settings.waitForComplete;
  waitCompleteCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ waitForComplete: waitCompleteCheckbox.checked });
  });

  // Puzzle toggle
  const puzzleCheckbox = document.getElementById('enable-puzzles');
  puzzleCheckbox.checked = settings.enablePuzzles;
  puzzleCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ enablePuzzles: puzzleCheckbox.checked });
  });

  // Puzzle Rush toggle
  const puzzleRushCheckbox = document.getElementById('enable-puzzle-rush');
  puzzleRushCheckbox.checked = settings.enablePuzzleRush;
  puzzleRushCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ enablePuzzleRush: puzzleRushCheckbox.checked });
  });

  // Puzzle Battle toggle
  const puzzleBattleCheckbox = document.getElementById('enable-puzzle-battle');
  puzzleBattleCheckbox.checked = settings.enablePuzzleBattle;
  puzzleBattleCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ enablePuzzleBattle: puzzleBattleCheckbox.checked });
  });

  // Puzzle Learning toggle
  const puzzleLearningCheckbox = document.getElementById('enable-puzzle-learning');
  puzzleLearningCheckbox.checked = settings.enablePuzzleLearning;
  puzzleLearningCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ enablePuzzleLearning: puzzleLearningCheckbox.checked });
  });

  // Daily toggle
  const dailyCheckbox = document.getElementById('enable-daily');
  dailyCheckbox.checked = settings.enableDaily;
  dailyCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ enableDaily: dailyCheckbox.checked });
  });

  // Debug toggle
  const debugCheckbox = document.getElementById('debug-mode');
  debugCheckbox.checked = settings.debugMode;
  debugCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ debugMode: debugCheckbox.checked });
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelector('.tab-btn.active').classList.remove('active');
      document.querySelector('.tab-content.active').classList.remove('active');
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // Button groups (numLines, searchDepth)
  document.querySelectorAll('.btn-group').forEach((group) => {
    const { key } = group.dataset;
    const buttons = group.querySelectorAll('button');

    buttons.forEach((btn) => {
      const val = toInteger(btn.dataset.val);
      if (val === settings[key]) btn.classList.add('active');

      btn.addEventListener('click', () => {
        group.querySelector('.active')?.classList.remove('active');
        btn.classList.add('active');
        chrome.storage.sync.set({ [key]: val });
      });
    });
  });
});
