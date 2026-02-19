// Analysis panel UI component

import {
  clamp, forEach, get, times, join, take,
} from 'lodash-es';
import createDebug from '../lib/debug.js';
import { Emitter } from '../lib/emitter.js';
import { pvToSan } from './san.js';
import {
  PANEL_ID, NUM_LINES as DEFAULT_NUM_LINES, MAX_PV_MOVES, CENTIPAWN_DIVISOR,
  EVAL_BAR_MIN_PCT, EVAL_BAR_MAX_PCT, EVAL_BAR_CENTER_PCT,
  TURN_WHITE, TURN_BLACK,
  EVT_LINE_HOVER, EVT_LINE_LEAVE,
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
    el('span', 'chee-title', 'Chee'),
    el('span', 'chee-eval-score', '0.0'),
    el('span', 'chee-depth'),
    toggle,
  );

  const bar = el('div', 'chee-eval-bar');
  const fill = el('div', 'chee-eval-fill');
  fill.style.width = `${EVAL_BAR_CENTER_PCT}%`;
  bar.appendChild(fill);

  header.append(topRow, bar);
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
  return el('div', 'chee-status chee-loading', 'Initializing...');
}

// ─── Score formatting ────────────────────────────────────────
function formatMate(wMate) {
  return (wMate > 0 ? 'M' : '-M') + Math.abs(wMate);
}

function formatCp(cp) {
  return (cp >= 0 ? '+' : '') + cp.toFixed(1);
}

// ─── Panel ───────────────────────────────────────────────────
export class Panel extends Emitter {
  constructor(numLines = DEFAULT_NUM_LINES) {
    super();
    this._el = null;
    this._board = null;
    this._turn = TURN_WHITE;
    this._numLines = numLines;
    this._lines = Array(numLines).fill(null);
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

  setBoard(board, turn) {
    this._board = board;
    this._turn = turn;
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
  }

  updateStatus(text) {
    if (!this._el) return;
    const statusEl = this._el.querySelector('.chee-status');
    if (!statusEl) return;
    statusEl.textContent = text;
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
    this._el.querySelector('.chee-hide').addEventListener('click', () => {
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
    const lineEls = this._el.querySelectorAll('.chee-line');
    forEach(lineEls, (lineEl, i) => {
      lineEl.addEventListener('mouseenter', () => {
        if (this._lines[i]) this.emit(EVT_LINE_HOVER, i, this._lines[i]);
      });
      lineEl.addEventListener('mouseleave', () => {
        this.emit(EVT_LINE_LEAVE);
      });
    });
  }

  _updateScoreDisplay(bestLine) {
    const scoreEl = this._el.querySelector('.chee-eval-score');
    const barFill = this._el.querySelector('.chee-eval-fill');

    if (bestLine.mate !== null) {
      const wMate = this._whiteMate(bestLine.mate);
      scoreEl.textContent = formatMate(wMate);
      scoreEl.className = `chee-eval-score mate-score ${wMate > 0 ? 'white-advantage' : 'black-advantage'}`;
      if (barFill) barFill.style.width = wMate > 0 ? '100%' : '0%';
      return;
    }

    const cp = this._whiteScore(bestLine.score) / CENTIPAWN_DIVISOR;
    scoreEl.textContent = formatCp(cp);
    scoreEl.className = `chee-eval-score ${cp >= 0 ? 'white-advantage' : 'black-advantage'}`;
    if (barFill) {
      const sigmoid = 2 / (1 + Math.exp(-cp / 2)) - 1;
      const pct = clamp(
        EVAL_BAR_CENTER_PCT + EVAL_BAR_CENTER_PCT * sigmoid,
        EVAL_BAR_MIN_PCT,
        EVAL_BAR_MAX_PCT,
      );
      barFill.style.width = `${pct}%`;
    }
  }

  _formatLineMoves(line) {
    if (this._board && line.pv && line.pv.length > 0) {
      return join(pvToSan(line.pv, this._board, this._turn), ' ');
    }
    if (line.pv) {
      return join(take(line.pv, MAX_PV_MOVES), ' ');
    }
    return '';
  }

  _updateLineRow(lineEl, line) {
    const movesEl = lineEl.querySelector('.chee-line-moves');

    if (!line) {
      movesEl.textContent = '';
      return null;
    }

    movesEl.textContent = this._formatLineMoves(line);
    return get(line, 'pv[0]', null);
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
