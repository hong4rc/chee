import { toInteger, omit } from 'lodash-es';
import { loadSettings } from './lib/settings.js';
import { applyTheme } from './lib/themes.js';
import { SETTINGS_DEFAULTS } from './constants.js';

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

  // Auto-wire all checkboxes with data-key attribute
  document.querySelectorAll('input[type="checkbox"][data-key]').forEach((cb) => {
    const { key } = cb.dataset;
    cb.checked = settings[key];
    cb.addEventListener('change', () => {
      chrome.storage.sync.set({ [key]: cb.checked });
    });
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

  // Copy debug info
  const copyDebugBtn = document.getElementById('copy-debug');
  if (copyDebugBtn) {
    copyDebugBtn.addEventListener('click', async () => {
      const current = await loadSettings();
      const changed = {};
      for (const [k, v] of Object.entries(current)) {
        if (SETTINGS_DEFAULTS[k] !== v) changed[k] = v;
      }

      const sections = [
        `Chee v${version} (${__COMMIT_HASH__})`,
        `Browser: ${navigator.userAgent}`,
        `Settings (non-default): ${JSON.stringify(changed)}`,
        `All settings: ${JSON.stringify(omit(current, ['panelLeft', 'panelTop', 'panelWidth']))}`,
      ];

      // Query active tab for page-specific info
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          const page = await chrome.tabs.sendMessage(tab.id, { type: 'chee:debug-info' });
          if (page) {
            sections.push('');
            sections.push('--- Page State ---');
            sections.push(`URL: ${page.url}`);
            sections.push(`Adapter: ${page.adapter}`);
            sections.push(`Engine: ${page.engineState}, FEN: ${page.engineFen || 'none'}`);
            sections.push(`Board: ${page.boardFound ? 'found' : 'missing'}, Ply: ${page.ply}, Turn: ${page.turn}`);
            sections.push(`Hint: ${page.isHintPage ? page.hintMatch : 'no'}, Daily: ${page.isDailyPage}`);
            sections.push(`Plugins: ${page.plugins.join(', ')}`);
            if (page.logs && page.logs.length > 0) {
              sections.push('');
              sections.push('--- Recent Logs ---');
              sections.push(...page.logs);
            }
          }
        }
      } catch { /* tab not available or no content script */ }

      await navigator.clipboard.writeText(sections.join('\n'));
      copyDebugBtn.textContent = '\u2713 Copied';
      copyDebugBtn.classList.add('copied');
      setTimeout(() => {
        copyDebugBtn.textContent = '\uD83D\uDCCB Copy debug info';
        copyDebugBtn.classList.remove('copied');
      }, 1000);
    });
  }
});
