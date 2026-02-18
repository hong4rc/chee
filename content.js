// Chee - Chess.com Live Analysis
// Content script injected into chess.com game pages

(function () {
  'use strict';

  console.log('[Chee] Content script loaded on', window.location.href);

  // ─── State ──────────────────────────────────────────────────────
  let worker = null;
  let panel = null;
  let currentFen = null;
  let pendingFen = null;
  let boardObserver = null;
  let debounceTimer = null;
  let stockfishReady = false;
  let lastBoard = null;
  let boardEl = null;

  const PIECE_MAP = {
    'wp': 'P', 'wn': 'N', 'wb': 'B', 'wr': 'R', 'wq': 'Q', 'wk': 'K',
    'bp': 'p', 'bn': 'n', 'bb': 'b', 'br': 'r', 'bq': 'q', 'bk': 'k'
  };

  const FILES = 'abcdefgh';

  // ─── Initialize ─────────────────────────────────────────────────
  function init() {
    console.log('[Chee] init() called, searching for board...');

    waitForBoard(function (el) {
      boardEl = el;
      console.log('[Chee] Board found:', el.tagName, el.id, el.className);
      console.log('[Chee] Board has shadowRoot:', !!el.shadowRoot);

      createPanel(el);
      initWorker();
      startObserving(el);

      const fen = readFen();
      console.log('[Chee] Initial FEN:', fen);
      if (fen) {
        sendPosition(fen);
      } else {
        // Pieces not found yet — explore the broader page to find them
        console.log('[Chee] No pieces in board element, exploring page...');
        exploreBoardArea();
        // Keep polling for pieces to appear
        let pieceAttempts = 0;
        const pieceInterval = setInterval(function () {
          pieceAttempts++;
          // Re-check: maybe pieces loaded into a different container
          const container = findPieceContainer();
          if (container && container !== boardEl) {
            console.log('[Chee] Piece container found (different from board):', container.tagName, container.id, container.className);
            boardEl = container;
            startObserving(container);
          }
          const fen = readFen();
          if (fen) {
            console.log('[Chee] Pieces appeared! FEN:', fen);
            clearInterval(pieceInterval);
            sendPosition(fen);
          } else if (pieceAttempts % 5 === 0) {
            console.log('[Chee] Still no pieces, attempt', pieceAttempts);
            if (pieceAttempts === 5) exploreBoardArea();
          }
          if (pieceAttempts > 60) {
            clearInterval(pieceInterval);
            console.error('[Chee] Gave up waiting for pieces');
          }
        }, 500);
      }
    });
  }

  function waitForBoard(callback) {
    function tryFind() {
      // Strategy 1: find element that actually contains pieces
      const pieceContainer = findPieceContainer();
      if (pieceContainer) {
        console.log('[Chee] Found piece container:', pieceContainer.tagName, pieceContainer.id, pieceContainer.className);
        return pieceContainer;
      }

      // Strategy 2: known board selectors
      const selectors = [
        'wc-chess-board#board-single',
        'wc-chess-board',
        'chess-board',
        '#board-single'
      ];
      for (let i = 0; i < selectors.length; i++) {
        const el = document.querySelector(selectors[i]);
        if (el) {
          console.log('[Chee] Board found with selector:', selectors[i]);
          return el;
        }
      }
      return null;
    }

    const found = tryFind();
    if (found) { callback(found); return; }

    console.log('[Chee] Board not found yet, polling...');
    let attempts = 0;
    const interval = setInterval(function () {
      attempts++;
      const found = tryFind();
      if (found) { clearInterval(interval); callback(found); return; }
      if (attempts === 5) {
        // One-time broad DOM exploration to help debug
        console.log('[Chee] Exploring full page for board clues...');
        exploreBoardArea();
      }
      if (attempts % 10 === 0) {
        console.log('[Chee] Still waiting... attempt', attempts);
      }
    }, 500);

    setTimeout(function () {
      clearInterval(interval);
      console.error('[Chee] Gave up waiting for board after 60s');
    }, 60000);
  }

  // Search the entire document for elements that look like chess pieces
  function findPieceContainer() {
    // Look for elements with chess piece classes anywhere on the page
    // chess.com uses: class="piece XX square-YY"
    const pieceEl = document.querySelector('.piece[class*="square-"]');
    if (pieceEl) {
      // Walk up to find the board container
      let container = pieceEl.parentElement;
      // The container should have many .piece children
      while (container && container.querySelectorAll('.piece').length < 2) {
        container = container.parentElement;
      }
      return container;
    }

    // Also check shadow DOMs of custom elements
    const customs = document.querySelectorAll('wc-chess-board, chess-board');
    for (let i = 0; i < customs.length; i++) {
      const sr = customs[i].shadowRoot;
      if (sr && sr.querySelectorAll('.piece').length > 0) {
        return customs[i];
      }
    }

    return null;
  }

  // Log broad page structure to find where pieces live
  function exploreBoardArea() {
    // Search for any element with piece-related data or classes
    const searches = [
      { q: '[class*="piece"]', label: 'class*=piece' },
      { q: '[data-piece]', label: 'data-piece' },
      { q: '[data-square]', label: 'data-square' },
      { q: '.board-layout-chessboard *', label: 'board-layout children' },
      { q: 'wc-chess-board', label: 'wc-chess-board' },
      { q: 'chess-board', label: 'chess-board' },
      { q: 'canvas', label: 'canvas' },
    ];

    searches.forEach(function (s) {
      const els = document.querySelectorAll(s.q);
      if (els.length > 0) {
        console.log('[Chee] Found', els.length, 'elements for:', s.label);
        for (let i = 0; i < Math.min(3, els.length); i++) {
          const el = els[i];
          console.log('[Chee]   ', el.tagName, el.id || '', (el.className && typeof el.className === 'string') ? el.className.substring(0, 80) : '', el.getAttribute('data-piece') || '', el.getAttribute('data-square') || '');
        }
      }
    });

    // Explore board-layout-chessboard children
    const layout = document.querySelector('.board-layout-chessboard');
    if (layout) {
      console.log('[Chee] board-layout-chessboard children:');
      exploreDOM(layout, 0, 4);
    }

    // Check for shadow roots in custom elements near the board
    document.querySelectorAll('*').forEach(function (el) {
      if (el.shadowRoot) {
        const pieces = el.shadowRoot.querySelectorAll('.piece, [class*="piece"]');
        if (pieces.length > 0) {
          console.log('[Chee] Found', pieces.length, 'pieces in shadowRoot of', el.tagName, el.id, el.className);
        }
      }
    });
  }

  // ─── Worker (blob URL approach) ─────────────────────────────────
  async function initWorker() {
    console.log('[Chee] initWorker: fetching resources...');
    updateStatus('Loading Stockfish...');

    try {
      // Fetch all resources from extension URLs
      const [workerCode, sfCode, wasmBuf] = await Promise.all([
        fetch(chrome.runtime.getURL('stockfish-worker.js')).then(function (r) { return r.text(); }),
        fetch(chrome.runtime.getURL('stockfish.js')).then(function (r) { return r.text(); }),
        fetch(chrome.runtime.getURL('stockfish.wasm')).then(function (r) { return r.arrayBuffer(); })
      ]);

      console.log('[Chee] Resources fetched: worker=' + workerCode.length + ' sf=' + sfCode.length + ' wasm=' + wasmBuf.byteLength);

      // Create a blob worker with a bootstrap that receives code + WASM
      const bootstrap = [
        'self.addEventListener("message", function __h(e) {',
        '  if (e.data && e.data.type === "__setup") {',
        '    self.removeEventListener("message", __h);',
        '    self.__sfCode = e.data.sfCode;',
        '    self.__wasmBinary = e.data.wasmBinary;',
        '    try { (0, eval)(e.data.workerCode); }',
        '    catch(err) { self.postMessage({ type: "error", message: "Worker eval failed: " + err.message }); }',
        '  }',
        '});'
      ].join('\n');

      const blob = new Blob([bootstrap], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);

      worker = new Worker(blobUrl);
      URL.revokeObjectURL(blobUrl);
      console.log('[Chee] Blob worker created');

      worker.onmessage = function (e) {
        const msg = e.data;
        if (msg.type === 'ready') {
          stockfishReady = true;
          console.log('[Chee] Stockfish ready!');
          updateStatus('Ready');
          if (pendingFen) {
            const fen = pendingFen;
            pendingFen = null;
            currentFen = fen;
            console.log('[Chee] Sending pending FEN:', fen);
            worker.postMessage({ type: 'position', fen: fen });
          }
        } else if (msg.type === 'eval') {
          updatePanel(msg);
        } else if (msg.type === 'error') {
          console.error('[Chee] Worker error:', msg.message);
          updateStatus('Error: ' + msg.message);
        }
      };

      worker.onerror = function (err) {
        console.error('[Chee] Worker onerror:', err.message, err);
        updateStatus('Worker crashed');
      };

      // Send setup data (transfer the WASM buffer for efficiency)
      worker.postMessage({
        type: '__setup',
        workerCode: workerCode,
        sfCode: sfCode,
        wasmBinary: wasmBuf
      }, [wasmBuf]);

      console.log('[Chee] Setup message sent to worker');

    } catch (err) {
      console.error('[Chee] initWorker failed:', err);
      updateStatus('Init failed: ' + err.message);
    }
  }

  function sendPosition(fen) {
    if (!worker) return;
    if (fen === currentFen) return;

    if (!stockfishReady) {
      pendingFen = fen;
      return;
    }

    console.log('[Chee] Analyzing:', fen);
    currentFen = fen;
    worker.postMessage({ type: 'position', fen: fen });
  }

  // ─── Board Reading ──────────────────────────────────────────────
  function readFen() {
    const el = boardEl;
    if (!el) return null;

    const board = Array.from({ length: 8 }, function () { return Array(8).fill(null); });
    const root = el.shadowRoot || el;

    // Strategy 1: Look for .piece elements (classic chess.com DOM)
    let pieces = root.querySelectorAll('.piece');

    // Strategy 2: If no .piece found, look deeper in child elements
    if (pieces.length === 0) {
      pieces = root.querySelectorAll('[class*="piece"]');
    }

    // Strategy 3: Look in all descendant elements for piece-like classes
    if (pieces.length === 0) {
      const allEls = root.querySelectorAll('*');
      const found = [];
      allEls.forEach(function (child) {
        const cls = child.getAttribute('class') || '';
        // chess.com piece classes: "piece XX square-YY" or similar
        if (/\b[wb][rnbqkp]\b/.test(cls) && /\bsquare-\d\d\b/.test(cls)) {
          found.push(child);
        }
      });
      if (found.length > 0) {
        pieces = found;
        console.log('[Chee] Found pieces via regex scan:', found.length);
      }
    }

    if (pieces.length === 0) {
      // Debug: explore DOM structure to figure out piece representation
      console.log('[Chee] No pieces found. Exploring board DOM...');
      exploreDOM(root, 0, 3);
      return null;
    }

    let parsedCount = 0;
    pieces.forEach(function (pieceEl) {
      const classes = (pieceEl.getAttribute('class') || '').split(/\s+/);
      let pieceType = null;
      let file = null;
      let rank = null;

      for (let i = 0; i < classes.length; i++) {
        const cls = classes[i];

        if (cls.length === 2 && PIECE_MAP[cls]) {
          pieceType = PIECE_MAP[cls];
        }

        if (cls.startsWith('square-') && cls.length >= 9) {
          const sq = cls.substring(7);
          file = parseInt(sq[0], 10) - 1;
          rank = parseInt(sq[1], 10) - 1;
        }
      }

      if (pieceType && file !== null && rank !== null && file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        board[7 - rank][file] = pieceType;
        parsedCount++;
      }
    });

    if (parsedCount === 0) {
      console.log('[Chee] Found', pieces.length, 'piece-like elements but parsed 0. Sample classes:');
      for (let i = 0; i < Math.min(3, pieces.length); i++) {
        console.log('[Chee]  ', pieces[i].getAttribute('class'));
      }
      return null;
    }

    lastBoard = board;

    const fenRanks = [];
    for (let r = 0; r < 8; r++) {
      let rankStr = '';
      let emptyCount = 0;
      for (let f = 0; f < 8; f++) {
        if (board[r][f]) {
          if (emptyCount > 0) { rankStr += emptyCount; emptyCount = 0; }
          rankStr += board[r][f];
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) rankStr += emptyCount;
      fenRanks.push(rankStr);
    }

    const placement = fenRanks.join('/');
    const turn = detectTurn();
    const castling = detectCastling(board);
    const enPassant = detectEnPassant(board);
    const moveCount = detectMoveCount();

    return placement + ' ' + turn + ' ' + castling + ' ' + enPassant + ' 0 ' + moveCount;
  }

  function exploreDOM(root, depth, maxDepth) {
    if (depth > maxDepth) return;
    const indent = '  '.repeat(depth);
    const children = root.children;
    if (!children) return;

    for (let i = 0; i < Math.min(children.length, 30); i++) {
      const child = children[i];
      const tag = child.tagName.toLowerCase();
      const id = child.id ? '#' + child.id : '';
      const cls = child.className && typeof child.className === 'string'
        ? '.' + child.className.split(' ').slice(0, 4).join('.')
        : (child.className && child.className.baseVal ? '.' + child.className.baseVal : '');
      const attrs = [];
      // Check all attributes for useful info
      for (let j = 0; j < child.attributes.length; j++) {
        const a = child.attributes[j];
        if (['class', 'id', 'xmlns'].indexOf(a.name) === -1) {
          const val = a.value.length > 40 ? a.value.substring(0, 40) + '...' : a.value;
          attrs.push(a.name + '=' + val);
        }
      }
      const attrStr = attrs.length ? ' [' + attrs.join(', ') + ']' : '';
      const childCount = child.children ? child.children.length : 0;
      const hasShadow = child.shadowRoot ? ' (SHADOW ROOT)' : '';

      console.log('[Chee] ' + indent + tag + id + cls + attrStr + hasShadow + (childCount > 0 ? ' (' + childCount + ' children)' : ''));

      if (child.shadowRoot && depth < maxDepth) {
        console.log('[Chee] ' + indent + '  [shadow-root]:');
        exploreDOM(child.shadowRoot, depth + 1, maxDepth);
      }

      if (childCount > 0 && depth < maxDepth) {
        exploreDOM(child, depth + 1, maxDepth);
      }
    }
  }

  function detectTurn() {
    const turnIndicators = document.querySelectorAll('.clock-player-turn');
    if (turnIndicators.length === 0) {
      return detectTurnFromMoveList();
    }

    for (let i = 0; i < turnIndicators.length; i++) {
      const clockEl = turnIndicators[i].closest('[class*="clock"]');
      if (clockEl) {
        const cls = clockEl.className || '';
        if (cls.indexOf('black') !== -1) return 'b';
        if (cls.indexOf('white') !== -1) return 'w';
      }
    }

    return detectTurnFromMoveList();
  }

  function detectTurnFromMoveList() {
    const moveNodes = document.querySelectorAll('wc-simple-move-list .node');
    if (moveNodes.length === 0) return 'w';

    const lastMove = moveNodes[moveNodes.length - 1];
    if (lastMove) {
      if (lastMove.classList.contains('white-move')) return 'b';
      if (lastMove.classList.contains('black-move')) return 'w';
    }

    return moveNodes.length % 2 === 0 ? 'w' : 'b';
  }

  function detectCastling(board) {
    let castling = '';
    if (board[7][4] === 'K') {
      if (board[7][7] === 'R') castling += 'K';
      if (board[7][0] === 'R') castling += 'Q';
    }
    if (board[0][4] === 'k') {
      if (board[0][7] === 'r') castling += 'k';
      if (board[0][0] === 'r') castling += 'q';
    }
    return castling || '-';
  }

  function detectEnPassant(board) {
    const highlights = document.querySelectorAll('.highlight');
    if (highlights.length < 2) return '-';

    const squares = [];
    highlights.forEach(function (el) {
      const cls = (el.className || '').split(/\s+/);
      for (let i = 0; i < cls.length; i++) {
        if (cls[i].startsWith('square-') && cls[i].length >= 9) {
          const sq = cls[i].substring(7);
          squares.push({ file: parseInt(sq[0], 10) - 1, rank: parseInt(sq[1], 10) - 1 });
        }
      }
    });

    if (squares.length < 2) return '-';
    const s0 = squares[0], s1 = squares[1];
    if (s0.file !== s1.file || Math.abs(s0.rank - s1.rank) !== 2) return '-';

    const p0 = board[7 - s0.rank][s0.file];
    const p1 = board[7 - s1.rank][s1.file];
    let toSq, fromSq;
    if (p0 === 'P' || p0 === 'p') { toSq = s0; fromSq = s1; }
    else if (p1 === 'P' || p1 === 'p') { toSq = s1; fromSq = s0; }
    else return '-';

    const epRank = (fromSq.rank + toSq.rank) / 2;
    return FILES[toSq.file] + (epRank + 1);
  }

  function detectMoveCount() {
    const moveNodes = document.querySelectorAll('wc-simple-move-list .node');
    return Math.floor(moveNodes.length / 2) + 1;
  }

  // ─── Board Observation ──────────────────────────────────────────
  function startObserving(el) {
    if (boardObserver) boardObserver.disconnect();

    const onMutation = function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        const fen = readFen();
        if (fen && fen !== currentFen) {
          sendPosition(fen);
        }
      }, 100);
    };

    boardObserver = new MutationObserver(onMutation);
    const observeTarget = el.shadowRoot || el;
    boardObserver.observe(observeTarget, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'transform']
    });

    const moveList = document.querySelector('wc-simple-move-list');
    if (moveList) {
      new MutationObserver(onMutation).observe(moveList, { childList: true, subtree: true });
    }
  }

  // ─── UCI to SAN Converter ───────────────────────────────────────
  function uciToSan(uciMove, board, turn) {
    if (!uciMove || uciMove.length < 4) return uciMove;

    const fromFile = uciMove.charCodeAt(0) - 97;
    const fromRank = parseInt(uciMove[1], 10) - 1;
    const toFile = uciMove.charCodeAt(2) - 97;
    const toRank = parseInt(uciMove[3], 10) - 1;
    const promotion = uciMove.length === 5 ? uciMove[4] : null;

    const piece = board[7 - fromRank][fromFile];
    if (!piece) return uciMove;

    const targetPiece = board[7 - toRank][toFile];
    const isCapture = targetPiece !== null;
    const pieceUpper = piece.toUpperCase();

    if (pieceUpper === 'K' && Math.abs(toFile - fromFile) === 2) {
      return toFile > fromFile ? 'O-O' : 'O-O-O';
    }

    let san = '';
    if (pieceUpper === 'P') {
      if (isCapture || fromFile !== toFile) {
        san = FILES[fromFile] + 'x' + FILES[toFile] + (toRank + 1);
      } else {
        san = FILES[toFile] + (toRank + 1);
      }
      if (promotion) san += '=' + promotion.toUpperCase();
    } else {
      san = pieceUpper;
      san += getDisambiguation(board, pieceUpper, fromFile, fromRank, toFile, toRank, turn);
      if (isCapture) san += 'x';
      san += FILES[toFile] + (toRank + 1);
    }
    return san;
  }

  function getDisambiguation(board, pieceType, fromFile, fromRank, toFile, toRank, turn) {
    const pieceCh = turn === 'w' ? pieceType : pieceType.toLowerCase();
    const candidates = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        if (board[7 - r][f] === pieceCh && !(f === fromFile && r === fromRank)) {
          if (canPieceReach(pieceType, f, r, toFile, toRank, board)) {
            candidates.push({ file: f, rank: r });
          }
        }
      }
    }
    if (candidates.length === 0) return '';
    if (!candidates.some(function (c) { return c.file === fromFile; })) return FILES[fromFile];
    if (!candidates.some(function (c) { return c.rank === fromRank; })) return '' + (fromRank + 1);
    return FILES[fromFile] + (fromRank + 1);
  }

  function canPieceReach(pt, ff, fr, tf, tr, board) {
    const adf = Math.abs(tf - ff), adr = Math.abs(tr - fr);
    switch (pt) {
      case 'N': return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
      case 'B': return adf === adr && adf > 0 && isPathClear(ff, fr, tf, tr, board);
      case 'R': return (tf === ff || tr === fr) && (adf + adr > 0) && isPathClear(ff, fr, tf, tr, board);
      case 'Q': return ((adf === adr && adf > 0) || tf === ff || tr === fr) && (adf + adr > 0) && isPathClear(ff, fr, tf, tr, board);
      case 'K': return adf <= 1 && adr <= 1 && (adf + adr > 0);
      default: return false;
    }
  }

  function isPathClear(ff, fr, tf, tr, board) {
    const sf = Math.sign(tf - ff), sr = Math.sign(tr - fr);
    let f = ff + sf, r = fr + sr;
    while (f !== tf || r !== tr) {
      if (board[7 - r][f] !== null) return false;
      f += sf; r += sr;
    }
    return true;
  }

  function applyUciMove(board, uciMove) {
    const nb = board.map(function (row) { return row.slice(); });
    const ff = uciMove.charCodeAt(0) - 97, fr = parseInt(uciMove[1], 10) - 1;
    const tf = uciMove.charCodeAt(2) - 97, tr = parseInt(uciMove[3], 10) - 1;
    const promo = uciMove.length === 5 ? uciMove[4] : null;

    const piece = nb[7 - fr][ff];
    if (!piece) return nb;
    const pu = piece.toUpperCase();

    if (pu === 'P' && ff !== tf && nb[7 - tr][tf] === null) {
      nb[7 - fr][tf] = null; // en passant
    }

    nb[7 - fr][ff] = null;
    if (promo) {
      nb[7 - tr][tf] = piece === piece.toUpperCase() ? promo.toUpperCase() : promo.toLowerCase();
    } else {
      nb[7 - tr][tf] = piece;
    }

    if (pu === 'K' && Math.abs(tf - ff) === 2) {
      if (tf > ff) { nb[7 - fr][5] = nb[7 - fr][7]; nb[7 - fr][7] = null; }
      else { nb[7 - fr][3] = nb[7 - fr][0]; nb[7 - fr][0] = null; }
    }
    return nb;
  }

  function pvToSan(pvMoves, board, startTurn) {
    const sanMoves = [];
    let cb = board.map(function (row) { return row.slice(); });
    let turn = startTurn;
    for (let i = 0; i < pvMoves.length && i < 8; i++) {
      sanMoves.push(uciToSan(pvMoves[i], cb, turn));
      cb = applyUciMove(cb, pvMoves[i]);
      turn = turn === 'w' ? 'b' : 'w';
    }
    return sanMoves;
  }

  // ─── Panel UI ───────────────────────────────────────────────────
  function createPanel(el) {
    const existing = document.getElementById('chee-analysis-panel');
    if (existing) existing.remove();

    panel = document.createElement('div');
    panel.id = 'chee-analysis-panel';

    panel.innerHTML =
      '<div class="chee-header">' +
        '<span class="chee-title">Chee</span>' +
        '<span class="chee-depth"></span>' +
        '<button class="chee-toggle" title="Minimize">&#x2212;</button>' +
      '</div>' +
      '<div class="chee-eval-section">' +
        '<div class="chee-eval-bar"><div class="chee-eval-fill" style="height:50%"></div></div>' +
        '<div class="chee-eval-score">0.0</div>' +
      '</div>' +
      '<div class="chee-lines">' +
        '<div class="chee-line"><span class="chee-line-rank">1</span><span class="chee-line-eval">...</span><span class="chee-line-moves"></span></div>' +
        '<div class="chee-line"><span class="chee-line-rank">2</span><span class="chee-line-eval">...</span><span class="chee-line-moves"></span></div>' +
        '<div class="chee-line"><span class="chee-line-rank">3</span><span class="chee-line-eval">...</span><span class="chee-line-moves"></span></div>' +
      '</div>' +
      '<div class="chee-status chee-loading">Initializing...</div>';

    const parent = el.parentElement;
    console.log('[Chee] Panel parent:', parent?.tagName, parent?.className);
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(panel);
    } else {
      document.body.appendChild(panel);
    }

    const verify = document.getElementById('chee-analysis-panel');
    if (verify) {
      const rect = verify.getBoundingClientRect();
      console.log('[Chee] Panel rect:', JSON.stringify({ top: Math.round(rect.top), left: Math.round(rect.left), w: Math.round(rect.width), h: Math.round(rect.height) }));
    }

    panel.querySelector('.chee-toggle').addEventListener('click', function () {
      panel.classList.toggle('chee-minimized');
      this.innerHTML = panel.classList.contains('chee-minimized') ? '&#x2b;' : '&#x2212;';
    });
  }

  function updatePanel(data) {
    if (!panel) return;
    const lines = data.lines;
    if (!lines || lines.length === 0) return;

    const depthEl = panel.querySelector('.chee-depth');
    if (depthEl) depthEl.textContent = 'd' + data.depth + (data.complete ? '' : '...');

    const bestLine = lines[0];
    if (!bestLine) return;

    const scoreEl = panel.querySelector('.chee-eval-score');
    const barFill = panel.querySelector('.chee-eval-fill');

    if (bestLine.mate !== null) {
      scoreEl.textContent = bestLine.mate > 0 ? 'M' + bestLine.mate : '-M' + Math.abs(bestLine.mate);
      scoreEl.className = 'chee-eval-score mate-score';
      barFill.style.height = bestLine.mate > 0 ? '100%' : '0%';
    } else {
      const cp = bestLine.score / 100;
      scoreEl.textContent = (cp >= 0 ? '+' : '') + cp.toFixed(1);
      scoreEl.className = 'chee-eval-score ' + (cp >= 0 ? 'white-advantage' : 'black-advantage');
      barFill.style.height = Math.max(2, Math.min(98, 50 + 50 * (2 / (1 + Math.exp(-cp / 2)) - 1))) + '%';
    }

    const lineEls = panel.querySelectorAll('.chee-line');
    const board = lastBoard;
    const turn = currentFen ? currentFen.split(' ')[1] : 'w';

    for (let i = 0; i < 3; i++) {
      if (!lineEls[i]) continue;
      const evalEl = lineEls[i].querySelector('.chee-line-eval');
      const movesEl = lineEls[i].querySelector('.chee-line-moves');

      if (i < lines.length && lines[i]) {
        const line = lines[i];
        if (line.mate !== null) {
          evalEl.textContent = (line.mate > 0 ? 'M' : '-M') + Math.abs(line.mate);
          evalEl.className = 'chee-line-eval mate';
        } else {
          const cp = line.score / 100;
          evalEl.textContent = (cp >= 0 ? '+' : '') + cp.toFixed(1);
          evalEl.className = 'chee-line-eval ' + (cp >= 0 ? 'positive' : 'negative');
        }
        if (board && line.pv && line.pv.length > 0) {
          movesEl.textContent = pvToSan(line.pv, board, turn).join(' ');
        } else if (line.pv) {
          movesEl.textContent = line.pv.slice(0, 8).join(' ');
        }
      } else {
        evalEl.textContent = '...';
        evalEl.className = 'chee-line-eval';
        movesEl.textContent = '';
      }
    }
  }

  function updateStatus(text) {
    if (!panel) return;
    const el = panel.querySelector('.chee-status');
    if (el) {
      el.textContent = text;
      el.className = 'chee-status' + (text.includes('Loading') || text.includes('Initializing') ? ' chee-loading' : '');
    }
  }

  // ─── Start ──────────────────────────────────────────────────────
  init();
})();
