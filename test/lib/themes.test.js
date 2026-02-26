import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

describe('themes', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function mockLocation(hostname) {
    vi.stubGlobal('window', {
      location: { hostname },
      addEventListener: vi.fn(),
    });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => ''),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  }

  async function load(hostname = 'www.chess.com') {
    mockLocation(hostname);
    return import('../../src/lib/themes.js');
  }

  describe('resolveSiteTheme', () => {
    it('returns "chesscom" for chess.com hostname', async () => {
      const { resolveSiteTheme } = await load('www.chess.com');
      expect(resolveSiteTheme()).toBe('chesscom');
    });

    it('returns "lichess" for lichess.org hostname', async () => {
      const { resolveSiteTheme } = await load('lichess.org');
      expect(resolveSiteTheme()).toBe('lichess');
    });

    it('returns "chesscom" as default for unknown hostname', async () => {
      const { resolveSiteTheme } = await load('example.com');
      expect(resolveSiteTheme()).toBe('chesscom');
    });
  });

  describe('applyTheme', () => {
    it('sets CSS custom properties on element for a named theme', async () => {
      const { applyTheme } = await load();
      const props = {};
      const el = { style: { setProperty: vi.fn((k, v) => { props[k] = v; }) } };

      applyTheme(el, 'mocha');

      expect(el.style.setProperty).toHaveBeenCalled();
      expect(props['--chee-base']).toBe('#1e1e2e');
      expect(props['--chee-text']).toBe('#cdd6f4');
    });

    it('resolves "site" theme using resolveSiteTheme', async () => {
      const { applyTheme } = await load('lichess.org');
      const props = {};
      const el = { style: { setProperty: vi.fn((k, v) => { props[k] = v; }) } };

      applyTheme(el, 'site');

      expect(props['--chee-base']).toBe('#241f1a'); // lichess base color
    });

    it('falls back to chesscom for unknown theme name', async () => {
      const { applyTheme } = await load();
      const props = {};
      const el = { style: { setProperty: vi.fn((k, v) => { props[k] = v; }) } };

      applyTheme(el, 'nonexistent');

      expect(props['--chee-base']).toBe('#302e2b'); // chesscom base
    });

    it('sets all expected CSS custom properties', async () => {
      const { applyTheme } = await load();
      const el = { style: { setProperty: vi.fn() } };

      applyTheme(el, 'latte');

      const keys = el.style.setProperty.mock.calls.map((c) => c[0]);
      expect(keys).toContain('--chee-base');
      expect(keys).toContain('--chee-mantle');
      expect(keys).toContain('--chee-crust');
      expect(keys).toContain('--chee-surface0');
      expect(keys).toContain('--chee-surface1');
      expect(keys).toContain('--chee-text');
      expect(keys).toContain('--chee-green');
      expect(keys).toContain('--chee-peach');
    });
  });
});
