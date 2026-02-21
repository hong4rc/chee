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

  // Debug toggle
  const debugCheckbox = document.getElementById('debug-mode');
  debugCheckbox.checked = settings.debugMode;
  debugCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ debugMode: debugCheckbox.checked });
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
