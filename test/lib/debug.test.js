import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

// We need to reset the module cache before each test to avoid stale state
let createDebug;

describe('createDebug', () => {
  beforeEach(async () => {
    vi.resetModules();

    // Mock localStorage
    const storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => storage[key] || ''),
      setItem: vi.fn((key, val) => { storage[key] = val; }),
      removeItem: vi.fn((key) => { delete storage[key]; }),
    });

    // Mock window.addEventListener
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      location: { hostname: 'chess.com' },
    });
  });

  async function loadModule(debugFlag = '') {
    localStorage.getItem = vi.fn(() => debugFlag);
    const mod = await import('../../src/lib/debug.js');
    createDebug = mod.default;
    return createDebug;
  }

  it('returns a function with info/warn/error/enabled methods', async () => {
    await loadModule('chee:*');
    const log = createDebug('chee:test');
    expect(typeof log).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.enabled).toBe('function');
  });

  it('caches same namespace — returns same function', async () => {
    await loadModule('chee:*');
    const a = createDebug('chee:engine');
    const b = createDebug('chee:engine');
    expect(a).toBe(b);
  });

  it('enabled() returns true when debug flag matches', async () => {
    await loadModule('chee:*');
    const log = createDebug('chee:engine');
    expect(log.enabled()).toBe(true);
  });

  it('enabled() returns false when debug flag is empty', async () => {
    await loadModule('');
    const log = createDebug('chee:engine');
    expect(log.enabled()).toBe(false);
  });

  it('enabled() returns true for wildcard *', async () => {
    await loadModule('*');
    const log = createDebug('chee:engine');
    expect(log.enabled()).toBe(true);
  });

  it('enabled() returns true for specific namespace match', async () => {
    await loadModule('chee:engine');
    const log = createDebug('chee:engine');
    expect(log.enabled()).toBe(true);
  });

  it('enabled() returns false for non-matching namespace', async () => {
    await loadModule('chee:panel');
    const log = createDebug('chee:engine');
    expect(log.enabled()).toBe(false);
  });

  it('log functions call console methods when enabled', async () => {
    await loadModule('chee:*');
    const consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    const log = createDebug('chee:test2');
    log('msg1');
    log.info('msg2');
    log.warn('msg3');
    log.error('msg4');

    expect(consoleSpy.log).toHaveBeenCalledWith('[chee:test2]', 'msg1');
    expect(consoleSpy.info).toHaveBeenCalledWith('[chee:test2]', 'msg2');
    expect(consoleSpy.warn).toHaveBeenCalledWith('[chee:test2]', 'msg3');
    expect(consoleSpy.error).toHaveBeenCalledWith('[chee:test2]', 'msg4');

    consoleSpy.log.mockRestore();
    consoleSpy.info.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  it('log functions are no-ops when disabled', async () => {
    await loadModule('');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const log = createDebug('chee:noop');
    log('should not appear');

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles comma-separated namespaces', async () => {
    await loadModule('chee:engine,chee:panel');
    const engine = createDebug('chee:engine');
    const panel = createDebug('chee:panel');
    const arrow = createDebug('chee:arrow');
    expect(engine.enabled()).toBe(true);
    expect(panel.enabled()).toBe(true);
    expect(arrow.enabled()).toBe(false);
  });
});
