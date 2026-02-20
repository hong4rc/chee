// Line sub-renderer: analysis lines, SAN conversion, DOM diff, hover events.

import { forEach, times, take } from 'lodash-es';
import { el } from '../../lib/dom.js';
import { Emitter } from '../../lib/emitter.js';
import { pvToSan } from '../san.js';
import {
  MAX_PV_MOVES, CENTIPAWN_DIVISOR,
  TURN_BLACK,
  EVT_LINE_HOVER, EVT_LINE_LEAVE,
} from '../../constants.js';

const CLS_WHITE_ADV = 'white-advantage';
const CLS_BLACK_ADV = 'black-advantage';

function advantageCls(isWhite) {
  return isWhite ? CLS_WHITE_ADV : CLS_BLACK_ADV;
}

function formatMate(wMate) {
  return (wMate > 0 ? 'M' : '-M') + Math.abs(wMate);
}

function formatCp(cp) {
  return (cp >= 0 ? '+' : '') + cp.toFixed(1);
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

export class LineRenderer extends Emitter {
  constructor(numLines) {
    super();
    this._numLines = numLines;
    this._lines = Array(numLines).fill(null);
    this._board = null;
    this._turn = null;
    this._lineEls = null;
    this._lineScoreEls = [];
    this._lineMovesEls = [];
  }

  setBoard(board, turn) {
    this._board = board;
    this._turn = turn;
  }

  createDOM() {
    const container = el('div', 'chee-lines');
    times(this._numLines, (i) => container.appendChild(createLine(i + 1)));
    return container;
  }

  bind(panelEl) {
    this._bindLineListeners(panelEl);
  }

  reconfigure(numLines, panelEl) {
    if (numLines === this._numLines) return;
    this._numLines = numLines;
    this._lines = Array(numLines).fill(null);
    if (!panelEl) return;
    const container = panelEl.querySelector('.chee-lines');
    if (!container) return;
    container.innerHTML = '';
    times(numLines, (i) => container.appendChild(createLine(i + 1)));
    this._bindLineListeners(panelEl);
  }

  _whiteScore(score) {
    return this._turn === TURN_BLACK ? -score : score;
  }

  _whiteMate(mate) {
    return this._turn === TURN_BLACK ? -mate : mate;
  }

  updateLines(lines) {
    const lineEls = this._lineEls;
    times(this._numLines, (i) => {
      if (!lineEls[i]) return;
      const line = i < lines.length ? lines[i] : null;
      this._lines[i] = this._updateLineRow(lineEls[i], line, i);
    });
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

  _bindLineListeners(panelEl) {
    this._lineEls = panelEl.querySelectorAll('.chee-line');
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

  destroy() {
    this._lineEls = null;
    this._lineScoreEls = [];
    this._lineMovesEls = [];
    this.removeAllListeners();
  }
}
