// Move list sub-renderer: two-column move list with classification labels.

import { forEach } from 'lodash-es';
import { el } from '../../lib/dom.js';
import {
  TURN_WHITE,
  LABEL_BRILLIANT, LABEL_BEST, LABEL_EXCELLENT, LABEL_GOOD,
  LABEL_INACCURACY, LABEL_MISTAKE, LABEL_BLUNDER, LABEL_CRAZY, LABEL_BOOK,
  CLASSIFICATION_BRILLIANT, CLASSIFICATION_BEST, CLASSIFICATION_CRAZY,
  CLASSIFICATION_BLUNDER, CLASSIFICATION_BOOK,
  CLASSIFICATION_THRESHOLDS,
} from '../../constants.js';

const COLOR_MAP = {
  [LABEL_BRILLIANT]: CLASSIFICATION_BRILLIANT.color,
  [LABEL_BEST]: CLASSIFICATION_BEST.color,
  [LABEL_EXCELLENT]: CLASSIFICATION_THRESHOLDS[0].color,
  [LABEL_GOOD]: CLASSIFICATION_THRESHOLDS[1].color,
  [LABEL_INACCURACY]: CLASSIFICATION_THRESHOLDS[2].color,
  [LABEL_MISTAKE]: CLASSIFICATION_THRESHOLDS[3].color,
  [LABEL_BLUNDER]: CLASSIFICATION_BLUNDER.color,
  [LABEL_CRAZY]: CLASSIFICATION_CRAZY.color,
  [LABEL_BOOK]: CLASSIFICATION_BOOK.color,
};

export class MoveListRenderer {
  constructor() {
    this._container = null;
    this._scrollEl = null;
  }

  createDOM() {
    this._container = el('div', 'chee-movelist');
    this._container.style.display = 'none';
    this._scrollEl = el('div', 'chee-movelist-scroll');
    this._container.appendChild(this._scrollEl);
    return this._container;
  }

  setVisible(show) {
    if (this._container) {
      this._container.style.display = show ? '' : 'none';
    }
  }

  bind() {}

  updateMoves(moves, classifications, currentPly) {
    if (!this._scrollEl) return;
    this._scrollEl.innerHTML = '';

    if (moves.length === 0) return;

    // Group moves into pairs (white, black)
    const rows = [];
    let row = null;

    forEach(moves, (move) => {
      if (move.turn === TURN_WHITE) {
        row = { num: Math.floor(move.ply / 2) + 1, white: move, black: null };
        rows.push(row);
      } else if (row && !row.black) {
        row.black = move;
      } else {
        // Black move without preceding white (e.g. game started mid-move)
        row = { num: Math.floor(move.ply / 2) + 1, white: null, black: move };
        rows.push(row);
      }
    });

    let activeEl = null;

    forEach(rows, (r) => {
      const rowEl = el('div', 'chee-movelist-row');
      const numEl = el('span', 'chee-movelist-num', `${r.num}.`);
      rowEl.appendChild(numEl);

      const whiteEl = this._createMoveCell(r.white, classifications, currentPly);
      rowEl.appendChild(whiteEl);

      const blackEl = this._createMoveCell(r.black, classifications, currentPly);
      rowEl.appendChild(blackEl);

      this._scrollEl.appendChild(rowEl);

      if ((r.white && r.white.ply === currentPly) || (r.black && r.black.ply === currentPly)) {
        activeEl = rowEl;
      }
    });

    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  _createMoveCell(move, classifications, currentPly) {
    const cell = el('span', 'chee-movelist-cell');

    if (!move) {
      cell.textContent = '\u2026';
      cell.classList.add('chee-movelist-empty');
      return cell;
    }

    const isActive = move.ply === currentPly;
    if (isActive) cell.classList.add('chee-movelist-active');

    const sanText = document.createTextNode(move.san);
    cell.appendChild(sanText);

    const cls = classifications.get(move.ply);
    if (cls) {
      const label = el('span', 'chee-movelist-label');
      const color = COLOR_MAP[cls.label];
      if (color) label.style.color = color;
      label.textContent = ` ${cls.label}`;
      cell.appendChild(label);
    }

    return cell;
  }

  destroy() {
    this._container = null;
    this._scrollEl = null;
  }
}
