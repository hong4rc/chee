import { SETTINGS_DEFAULTS } from '../constants.js';

export function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(SETTINGS_DEFAULTS, resolve);
  });
}
