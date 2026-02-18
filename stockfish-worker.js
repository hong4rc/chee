// Stockfish Web Worker (blob-compatible, single-threaded)
// Globals __sfCode and __wasmBinary are injected by the bootstrap before this runs.

var currentLines = [null, null, null];
var currentDepth = 0;
var analyzing = false;
var isReady = false;
var sfOnMessage = null;
var pendingFen = null;
var realPostMessage = self.postMessage.bind(self);

// Immediately bootstrap on eval
bootstrapStockfish();

function bootstrapStockfish() {
  // Override fetch to serve WASM binary from memory
  var origFetch = self.fetch.bind(self);
  self.fetch = function (url, opts) {
    if (typeof url === 'string' && url.indexOf('.wasm') !== -1) {
      return Promise.resolve(new Response(self.__wasmBinary, {
        status: 200,
        headers: { 'Content-Type': 'application/wasm' }
      }));
    }
    return origFetch(url, opts);
  };

  // Override XMLHttpRequest for sync WASM fallback
  var OrigXHR = self.XMLHttpRequest;
  self.XMLHttpRequest = function () {
    var xhr = new OrigXHR();
    var _intercepted = false;
    var _origOpen = xhr.open.bind(xhr);
    var _origSend = xhr.send.bind(xhr);

    xhr.open = function (method, url) {
      if (typeof url === 'string' && url.indexOf('.wasm') !== -1) {
        _intercepted = true;
      }
      return _origOpen.apply(xhr, arguments);
    };

    xhr.send = function () {
      if (_intercepted) {
        // Simulate a successful response with the WASM binary
        Object.defineProperty(xhr, 'status', { value: 200, writable: false });
        Object.defineProperty(xhr, 'readyState', { value: 4, writable: false });
        Object.defineProperty(xhr, 'response', { value: self.__wasmBinary, writable: false });
        setTimeout(function () {
          if (xhr.onreadystatechange) xhr.onreadystatechange();
          if (xhr.onload) xhr.onload();
        }, 0);
        return;
      }
      return _origSend.apply(xhr, arguments);
    };

    return xhr;
  };

  // Override postMessage to intercept Stockfish's string UCI output
  self.postMessage = function (data) {
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
    (0, eval)(self.__sfCode);
  } catch (err) {
    realPostMessage({ type: 'error', message: 'Failed to eval stockfish: ' + err.message });
    return;
  }

  // Capture stockfish.js's onmessage handler
  sfOnMessage = self.onmessage;

  if (!sfOnMessage) {
    realPostMessage({ type: 'error', message: 'stockfish.js did not set onmessage' });
    return;
  }

  // Replace with our dispatcher
  self.onmessage = function (e) {
    var msg = e.data;
    if (msg.type === 'position') {
      analyzePosition(msg.fen);
    } else if (msg.type === 'stop') {
      stopAnalysis();
    }
  };

  // Send initial UCI commands
  sendUCI('uci');
  sendUCI('setoption name MultiPV value 3');
  sendUCI('setoption name Hash value 32');
  sendUCI('isready');
}

function sendUCI(cmd) {
  if (sfOnMessage) {
    sfOnMessage({ data: cmd });
  }
}

function onStockfishMessage(line) {
  if (line === 'readyok') {
    isReady = true;
    realPostMessage({ type: 'ready' });

    if (pendingFen) {
      var fen = pendingFen;
      pendingFen = null;
      doAnalyze(fen);
    }
    return;
  }

  if (line === 'uciok') {
    return;
  }

  // Parse "info" lines with multipv and pv
  if (line.indexOf('info') === 0 && line.indexOf('multipv') !== -1 && line.indexOf(' pv ') !== -1) {
    parseInfoLine(line);
    return;
  }

  // bestmove signals analysis complete
  if (line.indexOf('bestmove') === 0) {
    analyzing = false;
    realPostMessage({
      type: 'eval',
      depth: currentDepth,
      lines: currentLines.filter(Boolean),
      complete: true
    });
  }
}

function parseInfoLine(line) {
  var depth = extractInt(line, 'depth');
  var multipv = extractInt(line, 'multipv');
  var pvMoves = extractPV(line);

  if (depth === null || multipv === null || !pvMoves.length) return;

  var score = null;
  var mate = null;

  var mateMatch = line.match(/score mate (-?\d+)/);
  var cpMatch = line.match(/score cp (-?\d+)/);

  if (mateMatch) {
    mate = parseInt(mateMatch[1], 10);
  } else if (cpMatch) {
    score = parseInt(cpMatch[1], 10);
  } else {
    return;
  }

  currentDepth = Math.max(currentDepth, depth);

  var lineData = {
    depth: depth,
    score: score,
    mate: mate,
    pv: pvMoves
  };

  if (multipv >= 1 && multipv <= 3) {
    currentLines[multipv - 1] = lineData;
  }

  realPostMessage({
    type: 'eval',
    depth: depth,
    lines: currentLines.filter(Boolean),
    complete: false
  });
}

function extractInt(line, key) {
  var regex = new RegExp('\\b' + key + '\\s+(\\d+)');
  var match = line.match(regex);
  return match ? parseInt(match[1], 10) : null;
}

function extractPV(line) {
  var pvIndex = line.indexOf(' pv ');
  if (pvIndex === -1) return [];
  var pvStr = line.substring(pvIndex + 4).trim();
  return pvStr.split(/\s+/);
}

function analyzePosition(fen) {
  if (!isReady) {
    pendingFen = fen;
    return;
  }
  doAnalyze(fen);
}

function doAnalyze(fen) {
  currentLines = [null, null, null];
  currentDepth = 0;
  analyzing = true;

  sendUCI('stop');
  sendUCI('position fen ' + fen);
  sendUCI('go depth 22');
}

function stopAnalysis() {
  if (analyzing) {
    sendUCI('stop');
    analyzing = false;
  }
}
