// Analysis panel UI component — delegates to sub-renderers

import createDebug from '../lib/debug.js';
import { el } from '../lib/dom.js';
import { Emitter } from '../lib/emitter.js';
import { HeaderRenderer } from './renderers/header-renderer.js';
import { ChartRenderer } from './renderers/chart-renderer.js';
import { LineRenderer } from './renderers/line-renderer.js';
import {
  PANEL_ID, NUM_LINES as DEFAULT_NUM_LINES,
  EVT_LINE_HOVER, EVT_LINE_LEAVE, EVT_PGN_COPY,
} from '../constants.js';

const log = createDebug('chee:panel');

function createShowButton() {
  const btn = el('button', 'chee-show');
  btn.title = 'Show Chee';
  btn.innerHTML = '&#x203a;';
  return btn;
}

function createStatus() {
  const status = el('div', 'chee-status');
  const accuracy = el('span', 'chee-accuracy');
  const copyPgn = el('button', 'chee-copy-pgn');
  copyPgn.title = 'Copy PGN';
  copyPgn.textContent = 'PGN';
  const copyFen = el('button', 'chee-copy-fen');
  copyFen.title = 'Copy FEN';
  copyFen.textContent = 'FEN';
  status.append(accuracy, copyPgn, copyFen);
  return status;
}

// ─── Panel ───────────────────────────────────────────────────
export class Panel extends Emitter {
  constructor(numLines = DEFAULT_NUM_LINES) {
    super();
    this._el = null;
    this._fen = null;
    this._numLines = numLines;

    this._header = new HeaderRenderer();
    this._chart = new ChartRenderer();
    this._lineRenderer = new LineRenderer(numLines);
  }

  mount(anchor) {
    const existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();
    const existingBtn = document.getElementById('chee-show-btn');
    if (existingBtn) existingBtn.remove();

    this._el = el('div');
    this._el.id = PANEL_ID;
    this._el.append(
      this._header.createDOM(),
      this._lineRenderer.createDOM(),
      this._chart.createDOM(),
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

    this._header.bind(this._el);
    this._chart.bind(this._el);
    this._lineRenderer.bind(this._el);
    this._attachListeners();
  }

  get el() { return this._el; }
  get turn() { return this._header.turn; }

  destroy() {
    if (this._el) { this._el.remove(); this._el = null; }
    if (this._showBtn) { this._showBtn.remove(); this._showBtn = null; }
    this._header.destroy();
    this._chart.destroy();
    this._lineRenderer.destroy();
    this._toggleEl = null;
    this._copyFenEl = null;
    this._copyPgnEl = null;
    this._hideEl = null;
    this.removeAllListeners();
  }

  setBoard(board, turn, fen) {
    this._fen = fen;
    this._header.setTurn(turn);
    this._header.updateOpening(fen);
    this._lineRenderer.setBoard(board, turn);
  }

  updateEval(data) {
    if (!this._el) return;
    const { lines } = data;
    if (!lines || lines.length === 0) return;

    this._header.updateEval(lines[0], data.depth);
    this._lineRenderer.updateLines(lines);
  }

  showClassification(result, insight) {
    if (!this._el) return;
    this._header.showClassification(result, insight);
  }

  showAccuracy(pct) {
    this._header.showAccuracy(pct);
  }

  clearClassification() {
    if (!this._el) return;
    this._header.clearClassification();
  }

  recordScore(ply, data) {
    this._chart.recordScore(ply, data, this._header.turn);
  }

  clearScores() {
    this._chart.clearScores();
  }

  reconfigure(numLines) {
    if (numLines === this._numLines) return;
    this._numLines = numLines;
    this._lineRenderer.reconfigure(numLines, this._el);
  }

  // ─── Private ─────────────────────────────────────────────
  _attachListeners() {
    this._toggleEl = this._el.querySelector('.chee-toggle');
    this._copyFenEl = this._el.querySelector('.chee-copy-fen');
    this._copyPgnEl = this._el.querySelector('.chee-copy-pgn');
    this._hideEl = this._el.querySelector('.chee-hide');

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
    this._copyPgnEl.addEventListener('click', () => {
      this.emit(EVT_PGN_COPY);
    });
    this._hideEl.addEventListener('click', () => {
      this._el.classList.add('chee-hidden');
      this._showBtn.classList.add('chee-visible');
    });
    this._showBtn.addEventListener('click', () => {
      this._el.classList.remove('chee-hidden');
      this._showBtn.classList.remove('chee-visible');
    });

    // Forward line events
    this._lineRenderer.on(EVT_LINE_HOVER, (...args) => this.emit(EVT_LINE_HOVER, ...args));
    this._lineRenderer.on(EVT_LINE_LEAVE, () => this.emit(EVT_LINE_LEAVE));
  }
}
