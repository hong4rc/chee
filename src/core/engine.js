// Stockfish worker lifecycle (blob URL, messaging)

import createDebug from '../lib/debug.js';
import { Emitter } from '../lib/emitter.js';
import {
  WORKER_FILE, STOCKFISH_JS_FILE, STOCKFISH_WASM_FILE,
  EVT_READY, EVT_EVAL, EVT_ERROR,
  MSG_SETUP, MSG_READY, MSG_EVAL, MSG_ERROR, MSG_POSITION, MSG_STOP,
} from '../constants.js';

const log = createDebug('chee:engine');

// ─── State machine ───────────────────────────────────────────
const State = Object.freeze({
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ANALYZING: 'analyzing',
  ERROR: 'error',
});

export class Engine extends Emitter {
  constructor() {
    super();
    this._worker = null;
    this._state = State.IDLE;
    this._currentFen = null;
    this._pendingFen = null;
  }

  get state() { return this._state; }
  get currentFen() { return this._currentFen; }

  async init(settings = {}) {
    if (this._state !== State.IDLE) return;
    this._state = State.INITIALIZING;
    log.info('fetching resources...');

    try {
      const [workerCode, sfCode, wasmBuf] = await Promise.all([
        fetch(chrome.runtime.getURL(WORKER_FILE)).then((r) => r.text()),
        fetch(chrome.runtime.getURL(STOCKFISH_JS_FILE)).then((r) => r.text()),
        fetch(chrome.runtime.getURL(STOCKFISH_WASM_FILE)).then((r) => r.arrayBuffer()),
      ]);

      log(
        `resources fetched, worker=${workerCode.length}`,
        `sf=${sfCode.length} wasm=${wasmBuf.byteLength}`,
      );

      const bootstrap = [
        'self.addEventListener("message", function __h(e) {',
        `  if (e.data && e.data.type === "${MSG_SETUP}") {`,
        '    self.removeEventListener("message", __h);',
        '    self.__sfCode = e.data.sfCode;',
        '    self.__wasmBinary = e.data.wasmBinary;',
        '    self.__numLines = e.data.numLines;',
        '    self.__searchDepth = e.data.searchDepth;',
        '    try { (0, eval)(e.data.workerCode); }',
        `    catch(err) { self.postMessage({ type: "${MSG_ERROR}", message: "Worker eval failed: " + err.message }); }`,
        '  }',
        '});',
      ].join('\n');

      const blob = new Blob([bootstrap], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);

      this._worker = new Worker(blobUrl);
      URL.revokeObjectURL(blobUrl);
      log.info('blob worker created');

      this._worker.onmessage = (e) => this._handleMessage(e.data);

      this._worker.onerror = (err) => {
        log.error('worker onerror:', err.message, err);
        this._state = State.ERROR;
        this.emit(EVT_ERROR, 'Engine crashed — restarting...');
        this._autoRecover(settings);
      };

      this._worker.postMessage({
        type: MSG_SETUP,
        workerCode,
        sfCode,
        wasmBinary: wasmBuf,
        numLines: settings.numLines,
        searchDepth: settings.searchDepth,
      }, [wasmBuf]);

      log('setup message sent');
    } catch (err) {
      log.error('init failed:', err);
      this._state = State.ERROR;
      this.emit(EVT_ERROR, `Init failed: ${err.message}`);
    }
  }

  analyze(fen) {
    if (this._state === State.INITIALIZING) {
      this._pendingFen = fen;
      return;
    }
    if (!this._worker) return;
    if (fen === this._currentFen) return;

    log('analyzing:', fen);
    this._state = State.ANALYZING;
    this._currentFen = fen;
    this._worker.postMessage({ type: MSG_POSITION, fen });
  }

  stop() {
    if (this._worker) {
      this._worker.postMessage({ type: MSG_STOP });
      if (this._state === State.ANALYZING) {
        this._state = State.READY;
      }
    }
  }

  destroy() {
    this._recovering = false;
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
    this._state = State.IDLE;
  }

  _autoRecover(settings) {
    if (this._recovering) return;
    this._recovering = true;
    const fen = this._currentFen;
    log.warn('auto-recovering, will re-analyze:', fen);
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
    this._state = State.IDLE;
    this._currentFen = null;
    this._pendingFen = fen;
    setTimeout(() => {
      this._recovering = false;
      this.init(settings);
    }, 1000);
  }

  _handleMessage(msg) {
    if (msg.type === MSG_READY) {
      this._state = State.READY;
      log.info('Stockfish ready!');
      this.emit(EVT_READY);
      if (this._pendingFen) {
        const fen = this._pendingFen;
        this._pendingFen = null;
        this.analyze(fen);
      }
    } else if (msg.type === MSG_EVAL) {
      if (msg.complete) this._state = State.READY;
      this.emit(EVT_EVAL, msg);
    } else if (msg.type === MSG_ERROR) {
      log.error('worker error:', msg.message);
      this._state = State.ERROR;
      this.emit(EVT_ERROR, msg.message);
    }
  }
}
