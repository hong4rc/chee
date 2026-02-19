/* eslint-disable no-restricted-globals */
// Stockfish Web Worker (blob-compatible, single-threaded)
// Globals __sfCode and __wasmBinary are injected by the bootstrap before this runs.

// ─── Engine config (overridden by setup message) ────────────
let SEARCH_DEPTH = 22;
const HASH_SIZE_MB = 16;
let NUM_LINES = 3;

// ─── UCI tokens ──────────────────────────────────────────────
const UCI_INFO = 'info';
const UCI_BESTMOVE = 'bestmove';
const UCI_READY_OK = 'readyok';
const UCI_OK = 'uciok';
const UCI_PV = ' pv ';
const UCI_MULTIPV = 'multipv';
const UCI_DEPTH = 'depth';
const UCI_SCORE_MATE = /score mate (-?\d+)/;
const UCI_SCORE_CP = /score cp (-?\d+)/;

// ─── Message types (must match src/constants.js) ─────────────
const MSG_READY = 'ready';
const MSG_EVAL = 'eval';
const MSG_ERROR = 'error';
const MSG_POSITION = 'position';
const MSG_STOP = 'stop';

// ─── State ───────────────────────────────────────────────────
let currentLines = Array(NUM_LINES).fill(null);
let currentDepth = 0;
let analyzing = false;
let isReady = false;
let sfOnMessage = null;
let pendingFen = null;
const realPostMessage = self.postMessage.bind(self);

function sendUCI(cmd) {
  if (sfOnMessage) {
    sfOnMessage({ data: cmd });
  }
}

function extractInt(line, key) {
  const regex = new RegExp(`\\b${key}\\s+(\\d+)`);
  const match = line.match(regex);
  return match ? parseInt(match[1], 10) : null;
}

function extractPV(line) {
  const pvIndex = line.indexOf(UCI_PV);
  if (pvIndex === -1) return [];
  const pvStr = line.substring(pvIndex + UCI_PV.length).trim();
  return pvStr.split(/\s+/);
}

function parseInfoLine(line) {
  const depth = extractInt(line, UCI_DEPTH);
  const multipv = extractInt(line, UCI_MULTIPV);
  const pvMoves = extractPV(line);

  if (depth === null || multipv === null || !pvMoves.length) return;

  let score = null;
  let mate = null;

  const mateMatch = line.match(UCI_SCORE_MATE);
  const cpMatch = line.match(UCI_SCORE_CP);

  if (mateMatch) {
    mate = parseInt(mateMatch[1], 10);
  } else if (cpMatch) {
    score = parseInt(cpMatch[1], 10);
  } else {
    return;
  }

  currentDepth = Math.max(currentDepth, depth);

  const lineData = {
    depth,
    score,
    mate,
    pv: pvMoves,
  };

  if (multipv >= 1 && multipv <= NUM_LINES) {
    currentLines[multipv - 1] = lineData;
  }

  realPostMessage({
    type: MSG_EVAL,
    depth,
    lines: currentLines.filter(Boolean),
    complete: false,
  });
}

let awaitingReady = false; // waiting for readyok before starting new analysis

function startAnalysis(fen) {
  currentLines = Array(NUM_LINES).fill(null);
  currentDepth = 0;
  analyzing = true;
  awaitingReady = false;

  sendUCI(`position fen ${fen}`);
  sendUCI(`go depth ${SEARCH_DEPTH}`);
}

// After stop+bestmove, sync with isready/readyok before new analysis
function syncBeforeNext() {
  if (pendingFen) {
    awaitingReady = true;
    sendUCI('isready');
  }
}

function onStockfishMessage(line) {
  if (line === UCI_READY_OK) {
    // Initial readyok (bootstrap) or sync readyok (between analyses)
    if (!isReady) {
      isReady = true;
      realPostMessage({ type: MSG_READY });
    }

    if (awaitingReady && pendingFen) {
      awaitingReady = false;
      const readyFen = pendingFen;
      pendingFen = null;
      startAnalysis(readyFen);
    }
    return;
  }

  if (line === UCI_OK) {
    return;
  }

  if (line.indexOf(UCI_INFO) === 0 && line.indexOf(UCI_MULTIPV) !== -1 && line.indexOf(UCI_PV) !== -1) {
    parseInfoLine(line);
    return;
  }

  if (line.indexOf(UCI_BESTMOVE) === 0) {
    analyzing = false;
    realPostMessage({
      type: MSG_EVAL,
      depth: currentDepth,
      lines: currentLines.filter(Boolean),
      complete: true,
    });

    // Sync engine state before starting queued analysis
    syncBeforeNext();
  }
}

function requestStop() {
  if (analyzing) {
    sendUCI('stop');
    // Don't set analyzing = false here — wait for bestmove
  }
}

function analyzePosition(fen) {
  if (!isReady) {
    pendingFen = fen;
    return;
  }
  // If analyzing or waiting for readyok, queue and stop
  if (analyzing || awaitingReady) {
    pendingFen = fen;
    if (analyzing) sendUCI('stop');
    return;
  }
  startAnalysis(fen);
}

function stopAnalysis() {
  pendingFen = null;
  requestStop();
}

function bootstrapStockfish() {
  // Apply config from setup message
  if (self.__numLines) NUM_LINES = self.__numLines;
  if (self.__searchDepth) SEARCH_DEPTH = self.__searchDepth;
  currentLines = Array(NUM_LINES).fill(null);

  // Override fetch to serve WASM binary from memory
  const origFetch = self.fetch.bind(self);
  self.fetch = (url, opts) => {
    if (typeof url === 'string' && url.indexOf('.wasm') !== -1) {
      return Promise.resolve(new Response(self.__wasmBinary, {
        status: 200,
        headers: { 'Content-Type': 'application/wasm' },
      }));
    }
    return origFetch(url, opts);
  };

  // Override XMLHttpRequest for sync WASM fallback
  const OrigXHR = self.XMLHttpRequest;
  self.XMLHttpRequest = function XHROverride() {
    const xhr = new OrigXHR();
    let intercepted = false;
    const origOpen = xhr.open.bind(xhr);
    const origSend = xhr.send.bind(xhr);

    xhr.open = (method, url, ...rest) => {
      if (typeof url === 'string' && url.indexOf('.wasm') !== -1) {
        intercepted = true;
      }
      return origOpen(method, url, ...rest);
    };

    xhr.send = (...args) => {
      if (intercepted) {
        Object.defineProperty(xhr, 'status', { value: 200, writable: false });
        Object.defineProperty(xhr, 'readyState', { value: 4, writable: false });
        Object.defineProperty(xhr, 'response', { value: self.__wasmBinary, writable: false });
        setTimeout(() => {
          if (xhr.onreadystatechange) xhr.onreadystatechange();
          if (xhr.onload) xhr.onload();
        }, 0);
        return;
      }
      origSend(...args);
    };

    return xhr;
  };

  // Override postMessage to intercept Stockfish's string UCI output
  self.postMessage = (data) => {
    if (typeof data === 'string') {
      onStockfishMessage(data);
    } else {
      realPostMessage(data);
    }
  };

  // Clear onmessage so stockfish.js auto-init can set its handler
  self.onmessage = null;

  // Eval stockfish.js — it auto-detects Worker context and initializes
  try {
    (0, eval)(self.__sfCode); // eslint-disable-line no-eval
  } catch (err) {
    realPostMessage({ type: MSG_ERROR, message: `Failed to eval stockfish: ${err.message}` });
    return;
  }

  // Capture stockfish.js's onmessage handler
  sfOnMessage = self.onmessage;

  if (!sfOnMessage) {
    realPostMessage({ type: MSG_ERROR, message: 'stockfish.js did not set onmessage' });
    return;
  }

  // Replace with our dispatcher
  self.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === MSG_POSITION) {
      analyzePosition(msg.fen);
    } else if (msg.type === MSG_STOP) {
      stopAnalysis();
    }
  };

  // Send initial UCI commands
  sendUCI('uci');
  sendUCI(`setoption name MultiPV value ${NUM_LINES}`);
  sendUCI(`setoption name Hash value ${HASH_SIZE_MB}`);
  sendUCI('isready');
}

// Immediately bootstrap on eval
bootstrapStockfish();
