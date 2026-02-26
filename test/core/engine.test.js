import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import { Engine } from '../../src/core/engine.js';
import {
  EVT_READY, EVT_EVAL, EVT_ERROR,
  MSG_READY, MSG_EVAL, MSG_ERROR, MSG_POSITION, MSG_STOP, MSG_RECONFIGURE,
} from '../../src/constants.js';

let latestWorker;

beforeEach(() => {
  latestWorker = null;

  vi.stubGlobal('chrome', {
    runtime: { getURL: vi.fn((f) => `chrome-extension://abc/${f}`) },
  });

  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
    text: () => Promise.resolve('worker-code'),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  })));

  vi.stubGlobal('Blob', class MockBlob {
    constructor(parts, opts) { this.parts = parts; this.opts = opts; }
  });

  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  });

  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => ''),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    location: { hostname: 'chess.com' },
  });

  // Worker constructor captures the instance
  vi.stubGlobal('Worker', vi.fn(function MockWorker() {
    this.postMessage = vi.fn();
    this.terminate = vi.fn();
    this.onmessage = null;
    this.onerror = null;
    latestWorker = this;
  }));
});

describe('Engine', () => {
  describe('init', () => {
    it('transitions from IDLE to INITIALIZING to READY', async () => {
      const engine = new Engine();
      expect(engine.state).toBe('idle');

      await engine.init({ numLines: 3, searchDepth: 22 });
      expect(engine.state).not.toBe('idle');

      latestWorker.onmessage({ data: { type: MSG_READY } });
      expect(engine.state).toBe('ready');
      engine.destroy();
    });

    it('emits EVT_READY when worker sends MSG_READY', async () => {
      const engine = new Engine();
      const fn = vi.fn();
      engine.on(EVT_READY, fn);

      await engine.init();
      latestWorker.onmessage({ data: { type: MSG_READY } });

      expect(fn).toHaveBeenCalled();
      engine.destroy();
    });

    it('is a no-op if not in IDLE state', async () => {
      const engine = new Engine();
      await engine.init();
      const fetchCount = fetch.mock.calls.length;
      await engine.init(); // should be a no-op
      expect(fetch.mock.calls.length).toBe(fetchCount);
      engine.destroy();
    });

    it('handles init failure gracefully', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network'))));

      const engine = new Engine();
      const fn = vi.fn();
      engine.on(EVT_ERROR, fn);

      await engine.init();

      expect(engine.state).toBe('error');
      expect(fn).toHaveBeenCalled();
      engine.destroy();
    });
  });

  describe('analyze', () => {
    it('posts MSG_POSITION and sets state to analyzing', async () => {
      const engine = new Engine();
      await engine.init();
      latestWorker.onmessage({ data: { type: MSG_READY } });

      engine.analyze('fen1');

      expect(engine.state).toBe('analyzing');
      expect(engine.currentFen).toBe('fen1');
      expect(latestWorker.postMessage).toHaveBeenCalledWith({ type: MSG_POSITION, fen: 'fen1' });
      engine.destroy();
    });

    it('is a no-op for same FEN', async () => {
      const engine = new Engine();
      await engine.init();
      latestWorker.onmessage({ data: { type: MSG_READY } });

      engine.analyze('fen1');
      const count = latestWorker.postMessage.mock.calls.length;
      engine.analyze('fen1');
      expect(latestWorker.postMessage.mock.calls.length).toBe(count);
      engine.destroy();
    });

    it('queues FEN as pending when INITIALIZING', () => {
      const engine = new Engine();
      engine.init(); // don't await — stays in initializing
      engine.analyze('pendingFen');
      expect(engine.currentFen).toBeNull();
      engine.destroy();
    });

    it('analyzes pending FEN after MSG_READY', async () => {
      const engine = new Engine();
      await engine.init();
      engine.analyze('pendingFen');
      latestWorker.onmessage({ data: { type: MSG_READY } });

      expect(engine.currentFen).toBe('pendingFen');
      engine.destroy();
    });

    it('is a no-op when no worker', () => {
      const engine = new Engine();
      engine.analyze('test');
      expect(engine.currentFen).toBeNull();
    });
  });

  describe('stop', () => {
    it('posts MSG_STOP and sets state to ready', async () => {
      const engine = new Engine();
      await engine.init();
      latestWorker.onmessage({ data: { type: MSG_READY } });
      engine.analyze('fen1');

      engine.stop();

      expect(latestWorker.postMessage).toHaveBeenCalledWith({ type: MSG_STOP });
      expect(engine.state).toBe('ready');
      engine.destroy();
    });

    it('does not change state if not analyzing', async () => {
      const engine = new Engine();
      await engine.init();
      latestWorker.onmessage({ data: { type: MSG_READY } });

      engine.stop();
      expect(engine.state).toBe('ready');
      engine.destroy();
    });
  });

  describe('reconfigure', () => {
    it('posts MSG_RECONFIGURE and clears currentFen', async () => {
      const engine = new Engine();
      await engine.init();
      latestWorker.onmessage({ data: { type: MSG_READY } });
      engine.analyze('fen1');

      engine.reconfigure({ numLines: 5, searchDepth: 20 });

      expect(latestWorker.postMessage).toHaveBeenCalledWith({
        type: MSG_RECONFIGURE,
        numLines: 5,
        searchDepth: 20,
      });
      expect(engine.currentFen).toBeNull();
      engine.destroy();
    });

    it('is a no-op when state is IDLE', () => {
      const engine = new Engine();
      engine.reconfigure({ numLines: 3 });
      expect(engine.state).toBe('idle');
    });

    it('is a no-op when state is INITIALIZING', async () => {
      const engine = new Engine();
      await engine.init();
      // state is initializing (waiting for MSG_READY), not READY
      engine.reconfigure({ numLines: 3 });
      const reconfigCalls = latestWorker.postMessage.mock.calls.filter((c) => c[0] && c[0].type === MSG_RECONFIGURE);
      expect(reconfigCalls.length).toBe(0);
      engine.destroy();
    });
  });

  describe('_handleMessage', () => {
    it('MSG_EVAL emits EVT_EVAL', async () => {
      const engine = new Engine();
      const fn = vi.fn();
      engine.on(EVT_EVAL, fn);

      await engine.init();
      latestWorker.onmessage({ data: { type: MSG_READY } });
      engine.analyze('fen1');

      // First low-depth to clear guard
      latestWorker.onmessage({ data: { type: MSG_EVAL, depth: 1, lines: [] } });
      latestWorker.onmessage({ data: { type: MSG_EVAL, depth: 15, lines: [{ score: 30 }] } });

      expect(fn).toHaveBeenCalledTimes(2);
      engine.destroy();
    });

    it('drops stale eval (high depth before low-depth reset)', async () => {
      const engine = new Engine();
      const fn = vi.fn();
      engine.on(EVT_EVAL, fn);

      await engine.init();
      latestWorker.onmessage({ data: { type: MSG_READY } });
      engine.analyze('fen1');

      latestWorker.onmessage({ data: { type: MSG_EVAL, depth: 20, lines: [] } });
      expect(fn).not.toHaveBeenCalled();

      latestWorker.onmessage({ data: { type: MSG_EVAL, depth: 1, lines: [] } });
      expect(fn).toHaveBeenCalledTimes(1);
      engine.destroy();
    });

    it('MSG_EVAL with complete=true sets state to ready', async () => {
      const engine = new Engine();
      await engine.init();
      latestWorker.onmessage({ data: { type: MSG_READY } });
      engine.analyze('fen1');

      latestWorker.onmessage({ data: { type: MSG_EVAL, depth: 1, complete: true } });

      expect(engine.state).toBe('ready');
      engine.destroy();
    });

    it('MSG_ERROR emits EVT_ERROR and sets state to error', async () => {
      const engine = new Engine();
      const fn = vi.fn();
      engine.on(EVT_ERROR, fn);

      await engine.init();
      latestWorker.onmessage({ data: { type: MSG_ERROR, message: 'crash' } });

      expect(engine.state).toBe('error');
      expect(fn).toHaveBeenCalledWith('crash');
      engine.destroy();
    });
  });

  describe('_autoRecover', () => {
    it('emits EVT_ERROR and attempts recovery on worker error', async () => {
      const engine = new Engine();
      const errFn = vi.fn();
      engine.on(EVT_ERROR, errFn);

      await engine.init();
      latestWorker.onmessage({ data: { type: MSG_READY } });
      engine.analyze('fen1');

      latestWorker.onerror({ message: 'crash' });

      // autoRecover transitions state to idle and schedules re-init
      expect(errFn).toHaveBeenCalled();
      expect(engine.state).toBe('idle');
      engine.destroy();
    });

    it('gives up after MAX_RECOVER_ATTEMPTS for same FEN', async () => {
      vi.useFakeTimers();
      const engine = new Engine();
      const errFn = vi.fn();
      engine.on(EVT_ERROR, errFn);

      await engine.init();
      latestWorker.onmessage({ data: { type: MSG_READY } });
      engine.analyze('fen1');

      // First crash + recovery
      latestWorker.onerror({ message: 'crash1' });
      await vi.advanceTimersByTimeAsync(1100);

      // After recovery, init is called again → new worker created
      const w2 = latestWorker;
      w2.onmessage({ data: { type: MSG_READY } });
      // pendingFen should be analyzed
      // Second crash
      w2.onerror({ message: 'crash2' });
      await vi.advanceTimersByTimeAsync(1100);

      // Third attempt
      const w3 = latestWorker;
      w3.onmessage({ data: { type: MSG_READY } });
      // This crash should give up (attempt 3 > MAX_RECOVER_ATTEMPTS=2)
      w3.onerror({ message: 'crash3' });

      // errFn should have been called multiple times
      expect(errFn.mock.calls.length).toBeGreaterThanOrEqual(2);

      vi.useRealTimers();
      engine.destroy();
    });
  });

  describe('destroy', () => {
    it('terminates worker and resets state', async () => {
      const engine = new Engine();
      await engine.init();
      const w = latestWorker;
      w.onmessage({ data: { type: MSG_READY } });

      engine.destroy();

      expect(w.terminate).toHaveBeenCalled();
      expect(engine.state).toBe('idle');
      expect(engine.currentFen).toBeNull();
    });

    it('clears recovery timer', async () => {
      vi.useFakeTimers();
      const engine = new Engine();
      await engine.init();
      latestWorker.onmessage({ data: { type: MSG_READY } });
      engine.analyze('fen1');
      latestWorker.onerror({ message: 'crash' });

      engine.destroy();

      expect(engine.state).toBe('idle');
      vi.useRealTimers();
    });
  });
});
