// Analysis panel UI component

import {
  forEach, times, take,
} from 'lodash-es';
import createDebug from '../lib/debug.js';
import { Emitter } from '../lib/emitter.js';
import { pvToSan, uciToSan } from './san.js';
import { lookupOpening } from './openings.js';
import {
  PANEL_ID, NUM_LINES as DEFAULT_NUM_LINES, MAX_PV_MOVES, CENTIPAWN_DIVISOR,
  TURN_WHITE, TURN_BLACK,
  EVT_LINE_HOVER, EVT_LINE_LEAVE,
  EVT_THREAT_HOVER, EVT_THREAT_LEAVE,
} from '../constants.js';

const log = createDebug('chee:panel');

// ─── DOM helpers ─────────────────────────────────────────────
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function createHeader() {
  const header = el('div', 'chee-header');
  const topRow = el('div', 'chee-header-top');
  const hide = el('button', 'chee-hide');
  hide.title = 'Hide panel';
  hide.innerHTML = '&#x2039;';
  const toggle = el('button', 'chee-toggle');
  toggle.title = 'Minimize';
  toggle.innerHTML = '&#x2212;';
  topRow.append(
    hide,
    el('span', 'chee-classification-slot'),
    el('span', 'chee-eval-score', '0.0'),
    el('span', 'chee-depth'),
    toggle,
  );

  const openingSlot = el('div', 'chee-opening-slot');
  const insightSlot = el('div', 'chee-insight-slot');

  const bar = el('div', 'chee-eval-bar');
  bar.append(
    el('div', 'chee-wdl-w'),
    el('div', 'chee-wdl-d'),
    el('div', 'chee-wdl-l'),
  );

  const wdlText = el('div', 'chee-wdl-text');
  wdlText.append(
    el('span', 'chee-wdl-w-pct', '50%'),
    el('span', 'chee-wdl-d-pct', '0%'),
    el('span', 'chee-wdl-l-pct', '50%'),
  );

  header.append(topRow, openingSlot, insightSlot, bar, wdlText);
  return header;
}

function createShowButton() {
  const btn = el('button', 'chee-show');
  btn.title = 'Show Chee';
  btn.innerHTML = '&#x203a;';
  return btn;
}

function createLine(rank) {
  const line = el('div', 'chee-line');
  line.append(
    el('span', 'chee-line-rank', String(rank)),
    el('span', 'chee-line-score'),
    el('span', 'chee-line-moves'),
  );
  return line;
}

function createLines(numLines) {
  const container = el('div', 'chee-lines');
  times(numLines, (i) => container.appendChild(createLine(i + 1)));
  return container;
}

function createStatus() {
  const status = el('div', 'chee-status chee-loading');
  const accuracy = el('span', 'chee-accuracy');
  const threat = el('span', 'chee-threat');
  const text = el('span', 'chee-status-text', 'Initializing...');
  const copyFen = el('button', 'chee-copy-fen');
  copyFen.title = 'Copy FEN';
  copyFen.textContent = 'FEN';
  status.append(accuracy, threat, text, copyFen);
  return status;
}

// ─── Score formatting ────────────────────────────────────────
function formatMate(wMate) {
  return (wMate > 0 ? 'M' : '-M') + Math.abs(wMate);
}

function formatCp(cp) {
  return (cp >= 0 ? '+' : '') + cp.toFixed(1);
}

function cpToWdl(cp) {
  const winRaw = 1 / (1 + Math.exp(-0.00368208 * cp));
  const drawMax = 0.33;
  const drawRaw = drawMax * Math.exp(-(cp * cp) / (2 * 200 * 200));
  const w = Math.round(winRaw * (1 - drawRaw) * 100);
  const l = Math.round((1 - winRaw) * (1 - drawRaw) * 100);
  const d = 100 - w - l;
  return { w, d, l };
}

// ─── Panel ───────────────────────────────────────────────────
export class Panel extends Emitter {
  constructor(numLines = DEFAULT_NUM_LINES) {
    super();
    this._el = null;
    this._board = null;
    this._turn = TURN_WHITE;
    this._fen = null;
    this._numLines = numLines;
    this._lines = Array(numLines).fill(null);
    this._threatUci = null;
  }

  mount(anchor) {
    const existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();
    const existingBtn = document.getElementById('chee-show-btn');
    if (existingBtn) existingBtn.remove();

    this._el = el('div');
    this._el.id = PANEL_ID;
    this._el.append(
      createHeader(),
      createLines(this._numLines),
      createStatus(),
    );

    this._showBtn = createShowButton();
    this._showBtn.id = 'chee-show-btn';

    const parent = anchor.parentElement;
    log('parent:', parent?.tagName, parent?.className);
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(this._el);
      parent.appendChild(this._showBtn);
    } else {
      document.body.appendChild(this._el);
      document.body.appendChild(this._showBtn);
    }

    this._attachListeners();
  }

  get el() { return this._el; }

  destroy() {
    if (this._el) { this._el.remove(); this._el = null; }
    if (this._showBtn) { this._showBtn.remove(); this._showBtn = null; }
  }

  setBoard(board, turn, fen) {
    this._board = board;
    this._turn = turn;
    this._fen = fen;
    this._updateOpening(fen);
  }

  _updateOpening(fen) {
    if (!this._el) return;
    const slot = this._el.querySelector('.chee-opening-slot');
    if (!slot) return;
    const name = lookupOpening(fen);
    if (name && name !== 'Starting Position') {
      slot.textContent = name;
    } else {
      slot.textContent = '';
    }
  }

  updateEval(data) {
    if (!this._el) return;
    const { lines } = data;
    if (!lines || lines.length === 0) return;

    const depthEl = this._el.querySelector('.chee-depth');
    if (depthEl) depthEl.textContent = `d${data.depth}`;

    const bestLine = lines[0];
    if (!bestLine) return;

    this._updateScoreDisplay(bestLine);
    this._updateLineRows(lines);
    this._updateThreat(bestLine);
  }

  _updateThreat(bestLine) {
    const threatEl = this._el.querySelector('.chee-threat');
    if (!threatEl) return;

    if (!this._board || !bestLine.pv || bestLine.pv.length === 0) {
      threatEl.textContent = '';
      this._threatUci = null;
      return;
    }

    // PV[0] is the best move for the side to move — that's the immediate threat
    const [threatMove] = bestLine.pv;
    const san = uciToSan(threatMove, this._board, this._turn);
    if (san) {
      threatEl.textContent = `Threat: ${san}`;
      this._threatUci = threatMove;
    } else {
      threatEl.textContent = '';
      this._threatUci = null;
    }
  }

  get threatUci() { return this._threatUci || null; }

  showClassification({ label, symbol, color }, insight) {
    if (!this._el) return;
    this.clearClassification();
    const slot = this._el.querySelector('.chee-classification-slot');
    if (!slot) return;
    const text = symbol ? `${symbol} ${label}` : label;
    const badge = el('span', 'chee-classification-badge', text);
    badge.style.background = color;
    slot.appendChild(badge);

    if (insight) {
      const insightSlot = this._el.querySelector('.chee-insight-slot');
      if (insightSlot) {
        const insightEl = el('div', 'chee-insight', `\u21B3 ${insight}`);
        insightSlot.appendChild(insightEl);
      }
    }
  }

  showAccuracy(pct) {
    if (!this._el) return;
    const acc = this._el.querySelector('.chee-accuracy');
    if (!acc) return;
    acc.textContent = pct !== null ? `Acc: ${pct}%` : '';
  }

  clearClassification() {
    if (!this._el) return;
    const slot = this._el.querySelector('.chee-classification-slot');
    if (slot) { slot.innerHTML = ''; }
    const insightSlot = this._el.querySelector('.chee-insight-slot');
    if (insightSlot) { insightSlot.innerHTML = ''; }
  }

  updateStatus(text) {
    if (!this._el) return;
    const statusEl = this._el.querySelector('.chee-status');
    const textEl = this._el.querySelector('.chee-status-text');
    if (!statusEl || !textEl) return;
    textEl.textContent = text;
    statusEl.className = `chee-status${text.includes('Loading') || text.includes('Initializing') ? ' chee-loading' : ''}`;
  }

  // ─── Private ─────────────────────────────────────────────
  _whiteScore(score) {
    return this._turn === TURN_BLACK ? -score : score;
  }

  _whiteMate(mate) {
    return this._turn === TURN_BLACK ? -mate : mate;
  }

  reconfigure(numLines) {
    if (numLines === this._numLines) return;
    this._numLines = numLines;
    this._lines = Array(numLines).fill(null);
    if (!this._el) return;
    const container = this._el.querySelector('.chee-lines');
    if (!container) return;
    container.innerHTML = '';
    times(numLines, (i) => container.appendChild(createLine(i + 1)));
    this._bindLineListeners();
  }

  _attachListeners() {
    this._el.querySelector('.chee-toggle').addEventListener('click', () => {
      this._el.classList.toggle('chee-minimized');
      this._el.querySelector('.chee-toggle').innerHTML = this._el.classList.contains('chee-minimized')
        ? '&#x2b;'
        : '&#x2212;';
    });
    this._el.querySelector('.chee-copy-fen').addEventListener('click', () => {
      if (!this._fen) return;
      navigator.clipboard.writeText(this._fen).then(() => {
        const btn = this._el.querySelector('.chee-copy-fen');
        btn.textContent = '\u2713';
        setTimeout(() => { btn.textContent = 'FEN'; }, 1000);
      });
    });
    this._el.querySelector('.chee-hide').addEventListener('click', () => {
      this._el.classList.add('chee-hidden');
      this._showBtn.classList.add('chee-visible');
    });
    this._showBtn.addEventListener('click', () => {
      this._el.classList.remove('chee-hidden');
      this._showBtn.classList.remove('chee-visible');
    });
    this._bindLineListeners();

    const threatEl = this._el.querySelector('.chee-threat');
    if (threatEl) {
      threatEl.addEventListener('mouseenter', () => {
        if (this._threatUci) {
          this.emit(EVT_THREAT_HOVER, this._threatUci, this._turn);
        }
      });
      threatEl.addEventListener('mouseleave', () => {
        this.emit(EVT_THREAT_LEAVE);
      });
    }
  }

  _bindLineListeners() {
    const lineEls = this._el.querySelectorAll('.chee-line');
    forEach(lineEls, (lineEl, i) => {
      lineEl.addEventListener('mouseover', (e) => {
        const moveSpan = e.target.closest('.chee-move');
        const pv = this._lines[i];
        if (!pv) return;
        if (moveSpan) {
          const m = parseInt(moveSpan.dataset.idx, 10);
          this.emit(EVT_LINE_HOVER, pv.slice(0, m + 1), this._turn);
        } else {
          this.emit(EVT_LINE_HOVER, pv.slice(0, 1), this._turn);
        }
      });
      lineEl.addEventListener('mouseleave', () => {
        this.emit(EVT_LINE_LEAVE);
      });
    });
  }

  _updateScoreDisplay(bestLine) {
    const scoreEl = this._el.querySelector('.chee-eval-score');

    if (bestLine.mate !== null) {
      const wMate = this._whiteMate(bestLine.mate);
      scoreEl.textContent = formatMate(wMate);
      scoreEl.className = `chee-eval-score mate-score ${wMate > 0 ? 'white-advantage' : 'black-advantage'}`;
      this._updateWdlBar(wMate > 0 ? 100 : 0, 0, wMate > 0 ? 0 : 100);
      return;
    }

    const cp = this._whiteScore(bestLine.score) / CENTIPAWN_DIVISOR;
    scoreEl.textContent = formatCp(cp);
    scoreEl.className = `chee-eval-score ${cp >= 0 ? 'white-advantage' : 'black-advantage'}`;
    const cpRaw = this._whiteScore(bestLine.score);
    const { w, d, l } = cpToWdl(cpRaw);
    this._updateWdlBar(w, d, l);
  }

  _updateWdlBar(w, d, l) {
    const wEl = this._el.querySelector('.chee-wdl-w');
    const dEl = this._el.querySelector('.chee-wdl-d');
    const lEl = this._el.querySelector('.chee-wdl-l');
    if (wEl) wEl.style.width = `${w}%`;
    if (dEl) dEl.style.width = `${d}%`;
    if (lEl) lEl.style.width = `${l}%`;

    const wPct = this._el.querySelector('.chee-wdl-w-pct');
    const dPct = this._el.querySelector('.chee-wdl-d-pct');
    const lPct = this._el.querySelector('.chee-wdl-l-pct');
    if (wPct) wPct.textContent = `${w}%`;
    if (dPct) dPct.textContent = `${d}%`;
    if (lPct) lPct.textContent = `${l}%`;
  }

  _formatLineMoves(line) {
    if (this._board && line.pv && line.pv.length > 0) {
      return pvToSan(line.pv, this._board, this._turn);
    }
    if (line.pv) {
      return take(line.pv, MAX_PV_MOVES);
    }
    return [];
  }

  _updateLineRow(lineEl, line) {
    const scoreEl = lineEl.querySelector('.chee-line-score');
    const movesEl = lineEl.querySelector('.chee-line-moves');

    if (!line) {
      scoreEl.textContent = '';
      scoreEl.className = 'chee-line-score';
      movesEl.textContent = '';
      return null;
    }

    // Update per-line score
    if (line.mate !== null) {
      const wMate = this._whiteMate(line.mate);
      scoreEl.textContent = formatMate(wMate);
      scoreEl.className = `chee-line-score ${wMate > 0 ? 'white-advantage' : 'black-advantage'}`;
    } else {
      const cp = this._whiteScore(line.score) / CENTIPAWN_DIVISOR;
      scoreEl.textContent = formatCp(cp);
      scoreEl.className = `chee-line-score ${cp >= 0 ? 'white-advantage' : 'black-advantage'}`;
    }

    const sanMoves = this._formatLineMoves(line);
    const pv = line.pv ? take(line.pv, MAX_PV_MOVES) : [];

    movesEl.innerHTML = '';
    forEach(sanMoves, (san, m) => {
      if (m > 0) movesEl.appendChild(document.createTextNode(' '));
      const span = el('span', 'chee-move', san);
      span.dataset.idx = m;
      movesEl.appendChild(span);
    });

    return pv.length > 0 ? pv : null;
  }

  _updateLineRows(lines) {
    const lineEls = this._el.querySelectorAll('.chee-line');
    times(this._numLines, (i) => {
      if (!lineEls[i]) return;
      const line = i < lines.length ? lines[i] : null;
      this._lines[i] = this._updateLineRow(lineEls[i], line);
    });
  }
}
