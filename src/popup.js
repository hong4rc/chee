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
