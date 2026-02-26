import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import { SETTINGS_DEFAULTS } from '../../src/constants.js';

describe('loadSettings', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('calls chrome.storage.sync.get with SETTINGS_DEFAULTS and resolves', async () => {
    const mockGet = vi.fn((defaults, cb) => {
      cb({ ...defaults, numLines: 5 });
    });
    vi.stubGlobal('chrome', {
      storage: { sync: { get: mockGet } },
    });

    const { loadSettings } = await import('../../src/lib/settings.js');
    const settings = await loadSettings();

    expect(mockGet).toHaveBeenCalledWith(SETTINGS_DEFAULTS, expect.any(Function));
    expect(settings.numLines).toBe(5);
    expect(settings.theme).toBe('site');
  });

  it('resolves with defaults when chrome returns unchanged values', async () => {
    const mockGet = vi.fn((defaults, cb) => { cb(defaults); });
    vi.stubGlobal('chrome', {
      storage: { sync: { get: mockGet } },
    });

    const { loadSettings } = await import('../../src/lib/settings.js');
    const settings = await loadSettings();

    expect(settings.numLines).toBe(SETTINGS_DEFAULTS.numLines);
    expect(settings.searchDepth).toBe(SETTINGS_DEFAULTS.searchDepth);
  });
});
