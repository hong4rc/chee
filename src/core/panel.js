// Analysis panel UI component — delegates to sub-renderers

import { el } from '../lib/dom.js';
import { Emitter } from '../lib/emitter.js';
import { HeaderRenderer } from './renderers/header-renderer.js';
import { ChartRenderer } from './renderers/chart-renderer.js';
import { LineRenderer } from './renderers/line-renderer.js';
import {
  PANEL_ID, NUM_LINES as DEFAULT_NUM_LINES,
  EVT_LINE_HOVER, EVT_LINE_LEAVE, EVT_PGN_COPY,
} from '../constants.js';

function createShowButton() {
  const btn = el('button', 'chee-show');
  btn.title = 'Show panel';
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

    this._anchor = anchor;
    this._dragged = false;

    this._el = el('div');
    this._el.id = PANEL_ID;
    const resizeHandle = el('div', 'chee-resize');
    this._el.append(
      this._header.createDOM(),
      this._lineRenderer.createDOM(),
      this._chart.createDOM(),
      createStatus(),
      resizeHandle,
    );

    this._showBtn = createShowButton();
    this._showBtn.id = 'chee-show-btn';

    document.body.appendChild(this._el);
    document.body.appendChild(this._showBtn);

    this._header.bind(this._el);
    this._chart.bind(this._el);
    this._lineRenderer.bind(this._el);
    this._attachListeners();
    this._positionDefault();
    this._startPositionTracking();
  }

  get el() { return this._el; }
  get turn() { return this._header.turn; }

  destroy() {
    this._stopPositionTracking();
    this._teardownDrag();
    this._teardownResize();
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

  setShowChart(show) {
    this._chart.setVisible(show);
  }

  reconfigure(numLines) {
    if (numLines === this._numLines) return;
    this._numLines = numLines;
    this._lineRenderer.reconfigure(numLines, this._el);
  }

  restoreState(minimized, hidden, left, top, width) {
    this._setMinimized(minimized);
    this._setHidden(hidden);
    if (left !== null && top !== null) {
      this._dragged = true;
      const clamped = this._clampToViewport(left, top);
      this._el.style.left = `${clamped.left}px`;
      this._el.style.top = `${clamped.top}px`;
    }
    if (width !== null) {
      this._el.style.width = `${width}px`;
    }
  }

  // ─── Private ─────────────────────────────────────────────

  _setMinimized(minimized) {
    if (!this._el) return;
    this._el.classList.toggle('chee-minimized', minimized);
    const toggle = this._toggleEl || this._el.querySelector('.chee-toggle');
    if (toggle) toggle.innerHTML = minimized ? '&#x2b;' : '&#x2212;';
  }

  _setHidden(hidden) {
    if (!this._el) return;
    if (hidden && this._hideEl && this._showBtn) {
      // Capture hide button's screen position before hiding
      const rect = this._hideEl.getBoundingClientRect();
      this._showBtn.style.position = 'fixed';
      this._showBtn.style.left = `${rect.left}px`;
      this._showBtn.style.top = `${rect.top}px`;
      this._showBtn.style.right = 'auto';
    }
    this._el.classList.toggle('chee-hidden', hidden);
    if (this._showBtn) this._showBtn.classList.toggle('chee-visible', hidden);
  }

  _positionDefault() {
    if (!this._anchor || !this._el || this._dragged) return;
    const rect = this._anchor.getBoundingClientRect();
    this._el.style.left = `${rect.right + 20}px`;
    this._el.style.top = `${rect.top}px`;
  }

  _clampCurrentPosition() {
    if (!this._el) return;
    const left = parseFloat(this._el.style.left) || 0;
    const top = parseFloat(this._el.style.top) || 0;
    const clamped = this._clampToViewport(left, top);
    this._el.style.left = `${clamped.left}px`;
    this._el.style.top = `${clamped.top}px`;
  }

  _startPositionTracking() {
    this._onScroll = () => {
      if (this._dragged || !this._el) return;
      if (this._posRafId) return;
      this._posRafId = requestAnimationFrame(() => {
        this._posRafId = null;
        this._positionDefault();
      });
    };
    this._onWindowResize = () => {
      if (!this._el) return;
      if (this._posRafId) return;
      this._posRafId = requestAnimationFrame(() => {
        this._posRafId = null;
        if (this._dragged) {
          this._clampCurrentPosition();
        } else {
          this._positionDefault();
        }
      });
    };
    window.addEventListener('scroll', this._onScroll, true);
    window.addEventListener('resize', this._onWindowResize);
  }

  _stopPositionTracking() {
    if (this._onScroll) {
      window.removeEventListener('scroll', this._onScroll, true);
      this._onScroll = null;
    }
    if (this._onWindowResize) {
      window.removeEventListener('resize', this._onWindowResize);
      this._onWindowResize = null;
    }
    if (this._posRafId) {
      cancelAnimationFrame(this._posRafId);
      this._posRafId = null;
    }
  }

  _clampToViewport(left, top) {
    const rect = this._el.getBoundingClientRect();
    const w = rect.width || 220;
    const h = rect.height || 100;
    return {
      left: Math.max(0, Math.min(left, window.innerWidth - w)),
      top: Math.max(0, Math.min(top, window.innerHeight - h)),
    };
  }

  _initDrag() {
    const header = this._el.querySelector('.chee-header');
    if (!header) return;

    this._onDragMouseDown = (e) => {
      // Skip if clicking a button inside the header
      if (e.target.closest('button')) return;
      e.preventDefault();

      const rect = this._el.getBoundingClientRect();
      this._dragOffsetX = e.clientX - rect.left;
      this._dragOffsetY = e.clientY - rect.top;

      this._el.classList.add('chee-dragging');
      document.body.classList.add('chee-dragging');

      document.addEventListener('mousemove', this._onDragMouseMove);
      document.addEventListener('mouseup', this._onDragMouseUp);
    };

    this._onDragMouseMove = (e) => {
      const left = e.clientX - this._dragOffsetX;
      const top = e.clientY - this._dragOffsetY;
      const clamped = this._clampToViewport(left, top);
      this._el.style.left = `${clamped.left}px`;
      this._el.style.top = `${clamped.top}px`;
    };

    this._onDragMouseUp = () => {
      this._el.classList.remove('chee-dragging');
      document.body.classList.remove('chee-dragging');

      document.removeEventListener('mousemove', this._onDragMouseMove);
      document.removeEventListener('mouseup', this._onDragMouseUp);

      this._dragged = true;
      const panelLeft = parseFloat(this._el.style.left);
      const panelTop = parseFloat(this._el.style.top);
      chrome.storage.sync.set({ panelLeft, panelTop });
    };

    this._onDragDblClick = (e) => {
      if (e.target.closest('button')) return;
      this._dragged = false;
      this._positionDefault();
      chrome.storage.sync.set({ panelLeft: null, panelTop: null });
    };

    header.addEventListener('mousedown', this._onDragMouseDown);
    header.addEventListener('dblclick', this._onDragDblClick);
    this._dragHeader = header;
  }

  _teardownDrag() {
    if (this._dragHeader) {
      this._dragHeader.removeEventListener('mousedown', this._onDragMouseDown);
      this._dragHeader.removeEventListener('dblclick', this._onDragDblClick);
      this._dragHeader = null;
    }
    document.removeEventListener('mousemove', this._onDragMouseMove);
    document.removeEventListener('mouseup', this._onDragMouseUp);
    document.body.classList.remove('chee-dragging');
  }

  _initResize() {
    const handle = this._el.querySelector('.chee-resize');
    if (!handle) return;

    this._onResizeMouseDown = (e) => {
      e.preventDefault();
      const rect = this._el.getBoundingClientRect();
      this._resizeStartX = e.clientX;
      this._resizeStartW = rect.width;

      document.body.classList.add('chee-resizing');
      document.addEventListener('mousemove', this._onResizeMouseMove);
      document.addEventListener('mouseup', this._onResizeMouseUp);
    };

    this._onResizeMouseMove = (e) => {
      const w = Math.max(150, Math.min(315, this._resizeStartW + (e.clientX - this._resizeStartX)));
      this._el.style.width = `${w}px`;
      // Keep panel within viewport
      const rect = this._el.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        this._el.style.left = `${window.innerWidth - w}px`;
      }
      if (rect.bottom > window.innerHeight) {
        this._el.style.top = `${window.innerHeight - rect.height}px`;
      }
    };

    this._onResizeMouseUp = () => {
      document.body.classList.remove('chee-resizing');
      document.removeEventListener('mousemove', this._onResizeMouseMove);
      document.removeEventListener('mouseup', this._onResizeMouseUp);

      const panelWidth = parseFloat(this._el.style.width);
      const panelLeft = parseFloat(this._el.style.left);
      const panelTop = parseFloat(this._el.style.top);
      this._dragged = true;
      chrome.storage.sync.set({ panelWidth, panelLeft, panelTop });
    };

    this._onResizeDblClick = () => {
      this._el.style.width = '';
      chrome.storage.sync.set({ panelWidth: null });
    };

    handle.addEventListener('mousedown', this._onResizeMouseDown);
    handle.addEventListener('dblclick', this._onResizeDblClick);
    this._resizeHandle = handle;
  }

  _teardownResize() {
    if (this._resizeHandle) {
      this._resizeHandle.removeEventListener('mousedown', this._onResizeMouseDown);
      this._resizeHandle.removeEventListener('dblclick', this._onResizeDblClick);
      this._resizeHandle = null;
    }
    document.removeEventListener('mousemove', this._onResizeMouseMove);
    document.removeEventListener('mouseup', this._onResizeMouseUp);
    document.body.classList.remove('chee-resizing');
  }

  _attachListeners() {
    this._toggleEl = this._el.querySelector('.chee-toggle');
    this._copyFenEl = this._el.querySelector('.chee-copy-fen');
    this._copyPgnEl = this._el.querySelector('.chee-copy-pgn');
    this._hideEl = this._el.querySelector('.chee-hide');
    this._toggleEl.addEventListener('click', () => {
      const minimized = !this._el.classList.contains('chee-minimized');
      this._setMinimized(minimized);
      chrome.storage.sync.set({ panelMinimized: minimized });
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
      this._setHidden(true);
      chrome.storage.sync.set({ panelHidden: true });
    });
    this._showBtn.addEventListener('click', () => {
      this._setHidden(false);
      chrome.storage.sync.set({ panelHidden: false });
    });

    // Forward line events
    this._lineRenderer.on(EVT_LINE_HOVER, (...args) => this.emit(EVT_LINE_HOVER, ...args));
    this._lineRenderer.on(EVT_LINE_LEAVE, () => this.emit(EVT_LINE_LEAVE));

    this._initDrag();
    this._initResize();
  }
}
