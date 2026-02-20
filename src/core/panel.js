// Analysis panel UI component

import {
  forEach, times, take, sortedIndex,
} from 'lodash-es';
import createDebug from '../lib/debug.js';
import { Emitter } from '../lib/emitter.js';
import { pvToSan } from './san.js';
import { lookupOpening, STARTING_POSITION } from './openings.js';
import {
  PANEL_ID, NUM_LINES as DEFAULT_NUM_LINES, MAX_PV_MOVES, CENTIPAWN_DIVISOR,
  TURN_WHITE, TURN_BLACK,
  EVT_LINE_HOVER, EVT_LINE_LEAVE,
} from '../constants.js';

const log = createDebug('chee:panel');

const SVG_NS = 'http://www.w3.org/2000/svg';
const CHART_VB_W = 200;
const CHART_VB_H = 40;
const CHART_MAX_CP = 500;

// ─── DOM helpers ─────────────────────────────────────────────
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
  }
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

function createChart() {
  const container = el('div', 'chee-chart');
  const svg = svgEl('svg', {
    viewBox: `0 0 ${CHART_VB_W} ${CHART_VB_H}`,
    preserveAspectRatio: 'none',
  });
  // Background (black's territory)
  svg.appendChild(svgEl('rect', {
    width: CHART_VB_W, height: CHART_VB_H, fill: '#2a2a2a',
  }));
  // White area path (filled from bottom up to score line)
  const whitePath = svgEl('path', { class: 'chee-chart-white', d: '' });
  svg.appendChild(whitePath);
  // Zero line
  svg.appendChild(svgEl('line', {
    class: 'chee-chart-zero',
    x1: 0,
    y1: CHART_VB_H / 2,
    x2: CHART_VB_W,
    y2: CHART_VB_H / 2,
  }));
  // Current ply cursor
  svg.appendChild(svgEl('line', {
    class: 'chee-chart-cursor',
    x1: 0,
    y1: 0,
    x2: 0,
    y2: CHART_VB_H,
  }));
  container.appendChild(svg);
  return container;
}

function createStatus() {
  const status = el('div', 'chee-status');
  const accuracy = el('span', 'chee-accuracy');
  const copyFen = el('button', 'chee-copy-fen');
  copyFen.title = 'Copy FEN';
  copyFen.textContent = 'FEN';
  status.append(accuracy, copyFen);
  return status;
}

// ─── Score formatting ────────────────────────────────────────
const CLS_WHITE_ADV = 'white-advantage';
const CLS_BLACK_ADV = 'black-advantage';
const CLS_MATE = 'mate-score';

function advantageCls(isWhite) {
  return isWhite ? CLS_WHITE_ADV : CLS_BLACK_ADV;
}

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
    this._scores = new Map();
    this._sortedPlies = [];
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
      createChart(),
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
  get turn() { return this._turn; }

  destroy() {
    if (this._el) { this._el.remove(); this._el = null; }
    if (this._showBtn) { this._showBtn.remove(); this._showBtn = null; }
    this._scores.clear();
    this._sortedPlies = [];
    this._scoreEl = null;
    this._depthEl = null;
    this._openingSlot = null;
    this._classSlot = null;
    this._insightSlot = null;
    this._accuracyEl = null;
    this._toggleEl = null;
    this._copyFenEl = null;
    this._hideEl = null;
    this._wdl = null;
    this._wdlPct = null;
    this._chartSvg = null;
    this._chartWhite = null;
    this._chartCursor = null;
    this._lineEls = null;
    this._lineScoreEls = null;
    this._lineMovesEls = null;
    this.removeAllListeners();
  }

  setBoard(board, turn, fen) {
    this._board = board;
    this._turn = turn;
    this._fen = fen;
    this._updateOpening(fen);
  }

  _updateOpening(fen) {
    if (!this._openingSlot) return;
    const name = lookupOpening(fen);
    if (name && name !== STARTING_POSITION) {
      this._openingSlot.textContent = name;
    } else {
      this._openingSlot.textContent = '';
    }
  }

  updateEval(data) {
    if (!this._el) return;
    const { lines } = data;
    if (!lines || lines.length === 0) return;

    if (this._depthEl) this._depthEl.textContent = `d${data.depth}`;

    const bestLine = lines[0];
    if (!bestLine) return;

    this._updateScoreDisplay(bestLine);
    this._updateLineRows(lines);
  }

  showClassification({ label, symbol, color }, insight) {
    if (!this._el) return;
    this.clearClassification();
    if (!this._classSlot) return;
    const text = symbol ? `${symbol} ${label}` : label;
    const badge = el('span', 'chee-classification-badge', text);
    badge.style.background = color;
    this._classSlot.appendChild(badge);

    if (insight && this._insightSlot) {
      const insightEl = el('div', 'chee-insight', `\u21B3 ${insight}`);
      this._insightSlot.appendChild(insightEl);
    }
  }

  showAccuracy(pct) {
    if (!this._accuracyEl) return;
    this._accuracyEl.textContent = pct !== null ? `Acc: ${pct}%` : '';
  }

  clearClassification() {
    if (!this._el) return;
    if (this._classSlot) { this._classSlot.innerHTML = ''; }
    if (this._insightSlot) { this._insightSlot.innerHTML = ''; }
  }

  recordScore(ply, data) {
    if (!data.lines || data.lines.length === 0) return;
    const line = data.lines[0];
    let whiteScore;
    if (line.mate !== null) {
      const wMate = this._turn === TURN_BLACK ? -line.mate : line.mate;
      whiteScore = wMate > 0 ? CHART_MAX_CP : -CHART_MAX_CP;
    } else {
      whiteScore = this._turn === TURN_BLACK ? -line.score : line.score;
    }
    const isNew = !this._scores.has(ply);
    this._scores.set(ply, whiteScore);
    if (isNew) this._insertSortedPly(ply);
    this._renderChart(ply);
  }

  clearScores() {
    this._scores.clear();
    this._sortedPlies = [];
    this._renderChart(0);
  }

  _insertSortedPly(ply) {
    const idx = sortedIndex(this._sortedPlies, ply);
    this._sortedPlies.splice(idx, 0, ply);
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
    this._scoreEl = this._el.querySelector('.chee-eval-score');
    this._depthEl = this._el.querySelector('.chee-depth');
    this._openingSlot = this._el.querySelector('.chee-opening-slot');
    this._classSlot = this._el.querySelector('.chee-classification-slot');
    this._insightSlot = this._el.querySelector('.chee-insight-slot');
    this._accuracyEl = this._el.querySelector('.chee-accuracy');
    this._toggleEl = this._el.querySelector('.chee-toggle');
    this._copyFenEl = this._el.querySelector('.chee-copy-fen');
    this._hideEl = this._el.querySelector('.chee-hide');
    this._wdl = {
      w: this._el.querySelector('.chee-wdl-w'),
      d: this._el.querySelector('.chee-wdl-d'),
      l: this._el.querySelector('.chee-wdl-l'),
    };
    this._wdlPct = {
      w: this._el.querySelector('.chee-wdl-w-pct'),
      d: this._el.querySelector('.chee-wdl-d-pct'),
      l: this._el.querySelector('.chee-wdl-l-pct'),
    };
    this._chartSvg = this._el.querySelector('.chee-chart svg');
    this._chartWhite = this._chartSvg?.querySelector('.chee-chart-white');
    this._chartCursor = this._chartSvg?.querySelector('.chee-chart-cursor');

    this._toggleEl.addEventListener('click', () => {
      this._el.classList.toggle('chee-minimized');
      this._toggleEl.innerHTML = this._el.classList.contains('chee-minimized')
        ? '&#x2b;'
        : '&#x2212;';
    });
    this._copyFenEl.addEventListener('click', () => {
      if (!this._fen) return;
      navigator.clipboard.writeText(this._fen).then(() => {
        this._copyFenEl.textContent = '\u2713';
        setTimeout(() => { this._copyFenEl.textContent = 'FEN'; }, 1000);
      });
    });
    this._hideEl.addEventListener('click', () => {
      this._el.classList.add('chee-hidden');
      this._showBtn.classList.add('chee-visible');
    });
    this._showBtn.addEventListener('click', () => {
      this._el.classList.remove('chee-hidden');
      this._showBtn.classList.remove('chee-visible');
    });
    this._bindLineListeners();
  }

  _bindLineListeners() {
    this._lineEls = this._el.querySelectorAll('.chee-line');
    this._lineScoreEls = [];
    this._lineMovesEls = [];
    const lineEls = this._lineEls;
    forEach(lineEls, (lineEl, i) => {
      this._lineScoreEls[i] = lineEl.querySelector('.chee-line-score');
      this._lineMovesEls[i] = lineEl.querySelector('.chee-line-moves');
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

  _renderChart(currentPly) {
    if (!this._chartSvg) return;

    const plies = this._sortedPlies;
    if (plies.length === 0) {
      if (this._chartWhite) this._chartWhite.setAttribute('d', '');
      if (this._chartCursor) {
        this._chartCursor.setAttribute('x1', 0);
        this._chartCursor.setAttribute('x2', 0);
      }
      return;
    }

    const minPly = plies[0];
    const maxPly = Math.max(plies[plies.length - 1], minPly + 1);
    const plyRange = maxPly - minPly;
    const centerY = CHART_VB_H / 2;

    const xPos = (ply) => ((ply - minPly) / plyRange) * CHART_VB_W;
    const yPos = (cp) => {
      const clamped = Math.max(-CHART_MAX_CP, Math.min(CHART_MAX_CP, cp));
      return centerY - (clamped / CHART_MAX_CP) * centerY;
    };

    // White area: bottom → score line → bottom
    const first = this._scores.get(plies[0]);
    let d = `M 0 ${CHART_VB_H} L 0 ${yPos(first)}`;
    forEach(plies, (ply) => {
      d += ` L ${xPos(ply)} ${yPos(this._scores.get(ply))}`;
    });
    const last = this._scores.get(plies[plies.length - 1]);
    d += ` L ${CHART_VB_W} ${yPos(last)} L ${CHART_VB_W} ${CHART_VB_H} Z`;
    if (this._chartWhite) this._chartWhite.setAttribute('d', d);

    // Cursor at current ply
    if (this._chartCursor && currentPly !== undefined) {
      const cx = plies.length === 1 ? CHART_VB_W / 2 : xPos(currentPly);
      this._chartCursor.setAttribute('x1', cx);
      this._chartCursor.setAttribute('x2', cx);
    }
  }

  _updateScoreDisplay(bestLine) {
    if (bestLine.mate !== null) {
      const wMate = this._whiteMate(bestLine.mate);
      this._scoreEl.textContent = formatMate(wMate);
      this._scoreEl.className = `chee-eval-score ${CLS_MATE} ${advantageCls(wMate > 0)}`;
      this._updateWdlBar(wMate > 0 ? 100 : 0, 0, wMate > 0 ? 0 : 100);
      return;
    }

    const cp = this._whiteScore(bestLine.score) / CENTIPAWN_DIVISOR;
    this._scoreEl.textContent = formatCp(cp);
    this._scoreEl.className = `chee-eval-score ${advantageCls(cp >= 0)}`;
    const cpRaw = this._whiteScore(bestLine.score);
    const { w, d, l } = cpToWdl(cpRaw);
    this._updateWdlBar(w, d, l);
  }

  _updateWdlBar(w, d, l) {
    if (this._wdl.w) this._wdl.w.style.width = `${w}%`;
    if (this._wdl.d) this._wdl.d.style.width = `${d}%`;
    if (this._wdl.l) this._wdl.l.style.width = `${l}%`;
    if (this._wdlPct.w) this._wdlPct.w.textContent = `${w}%`;
    if (this._wdlPct.d) this._wdlPct.d.textContent = `${d}%`;
    if (this._wdlPct.l) this._wdlPct.l.textContent = `${l}%`;
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

  _updateLineRow(lineEl, line, lineIdx) {
    const scoreEl = this._lineScoreEls[lineIdx];
    const movesEl = this._lineMovesEls[lineIdx];

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
      scoreEl.className = `chee-line-score ${advantageCls(wMate > 0)}`;
    } else {
      const cp = this._whiteScore(line.score) / CENTIPAWN_DIVISOR;
      scoreEl.textContent = formatCp(cp);
      scoreEl.className = `chee-line-score ${advantageCls(cp >= 0)}`;
    }

    const sanMoves = this._formatLineMoves(line);
    const pv = line.pv ? take(line.pv, MAX_PV_MOVES) : [];

    const existing = movesEl.querySelectorAll('.chee-move');
    forEach(sanMoves, (san, m) => {
      if (m < existing.length) {
        if (existing[m].textContent !== san) existing[m].textContent = san;
      } else {
        if (movesEl.childNodes.length > 0) movesEl.appendChild(document.createTextNode(' '));
        const span = el('span', 'chee-move', san);
        span.dataset.idx = m;
        movesEl.appendChild(span);
      }
    });
    // Remove excess spans (+ preceding text node separators)
    const excess = existing.length - sanMoves.length;
    times(excess, () => {
      const last = movesEl.lastElementChild;
      if (last && last.previousSibling && last.previousSibling.nodeType === Node.TEXT_NODE) {
        movesEl.removeChild(last.previousSibling);
      }
      if (last) movesEl.removeChild(last);
    });

    return pv.length > 0 ? pv : null;
  }

  _updateLineRows(lines) {
    const lineEls = this._lineEls;
    times(this._numLines, (i) => {
      if (!lineEls[i]) return;
      const line = i < lines.length ? lines[i] : null;
      this._lines[i] = this._updateLineRow(lineEls[i], line, i);
    });
  }
}
