import { toInteger } from 'lodash-es';
import { loadSettings } from './lib/settings.js';

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await loadSettings();

  document.querySelectorAll('.btn-group').forEach((group) => {
    const key = group.dataset.key;
    const buttons = group.querySelectorAll('button');

    buttons.forEach((btn) => {
      if (toInteger(btn.dataset.val) === settings[key]) btn.classList.add('active');

      btn.addEventListener('click', () => {
        group.querySelector('.active')?.classList.remove('active');
        btn.classList.add('active');
        chrome.storage.sync.set({ [key]: toInteger(btn.dataset.val) });
      });
    });
  });
});
