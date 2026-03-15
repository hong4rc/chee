// Board preview overlay: shows piece positions after a move sequence on hover.
// Creates an HTML overlay over the board with cloned piece images for changed squares.

import { forEach } from 'lodash-es';
import { applyUciMove } from './san.js';
import {
  BOARD_SIZE, LAST_RANK,
  PREVIEW_OVERLAY_ID, PREVIEW_OVERLAY_Z,
  PREVIEW_LIGHT_SQUARE, PREVIEW_DARK_SQUARE,
} from '../constants.js';

function squarePosition(file, rank, sqSize, isFlipped) {
  const col = isFlipped ? LAST_RANK - file : file;
  const row = isFlipped ? rank : LAST_RANK - rank;
  return { left: col * sqSize, top: row * sqSize };
}

function diffBoards(current, target) {
  const diffs = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (current[row][col] !== target[row][col]) {
        diffs.push({
          file: col,
          rank: LAST_RANK - row,
          newPiece: target[row][col],
        });
      }
    }
  }
  return diffs;
}

function movesKey(uciMoves) {
  return uciMoves.join(',');
}

export class BoardPreview {
  constructor() {
    this._overlay = null;
    this._boardEl = null;
    this._pieceImageCache = null;
    this._boardBgCache = undefined; // undefined = not computed, null = no bg found
    this._metricsCache = null;
    this._lastMovesKey = null;
  }

  mount(boardEl) {
    this._boardEl = boardEl;
    this._pieceImageCache = null;
    this._boardBgCache = undefined;
    this._metricsCache = null;
    this._lastMovesKey = null;

    const existing = document.getElementById(PREVIEW_OVERLAY_ID);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = PREVIEW_OVERLAY_ID;
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = PREVIEW_OVERLAY_Z;

    const parent = boardEl.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(overlay);
    }
    this._overlay = overlay;
  }

  show(currentBoard, uciMoves, isFlipped, adapter) {
    if (!this._overlay || !this._boardEl) return;
    if (!uciMoves || uciMoves.length === 0) { this.clear(); return; }

    // Skip redundant render when hovering the same move span
    const key = movesKey(uciMoves);
    if (key === this._lastMovesKey) return;
    this._lastMovesKey = key;

    this._overlay.innerHTML = '';

    // Apply moves to get target board state
    let targetBoard = currentBoard;
    forEach(uciMoves, (uci) => {
      targetBoard = applyUciMove(targetBoard, uci);
    });

    const diffs = diffBoards(currentBoard, targetBoard);
    if (diffs.length === 0) return;

    this._ensurePieceImages(adapter);
    const { sqSize, boardWidth, boardHeight } = this._getMetrics();
    const boardBg = this._getBoardBackground();

    forEach(diffs, ({ file, rank, newPiece }) => {
      const { left, top } = squarePosition(file, rank, sqSize, isFlipped);

      // Square mask — covers the original piece with the board square color
      const sq = document.createElement('div');
      sq.className = 'chee-preview-el';
      sq.style.position = 'absolute';
      sq.style.left = `${left}px`;
      sq.style.top = `${top}px`;
      sq.style.width = `${sqSize}px`;
      sq.style.height = `${sqSize}px`;

      if (boardBg) {
        sq.style.backgroundImage = boardBg;
        sq.style.backgroundSize = `${boardWidth}px ${boardHeight}px`;
        sq.style.backgroundPosition = `-${left}px -${top}px`;
      } else {
        const isLight = (file + rank) % 2 !== 0;
        sq.style.backgroundColor = isLight ? PREVIEW_LIGHT_SQUARE : PREVIEW_DARK_SQUARE;
      }

      this._overlay.appendChild(sq);

      // Piece image overlay — if a piece exists at this square in the new state
      if (newPiece && this._pieceImageCache) {
        const bgImage = this._pieceImageCache.get(newPiece);
        if (bgImage) {
          const piece = document.createElement('div');
          piece.className = 'chee-preview-el';
          piece.style.position = 'absolute';
          piece.style.left = `${left}px`;
          piece.style.top = `${top}px`;
          piece.style.width = `${sqSize}px`;
          piece.style.height = `${sqSize}px`;
          piece.style.backgroundImage = bgImage;
          piece.style.backgroundSize = 'cover';
          this._overlay.appendChild(piece);
        }
      }
    });
  }

  clear() {
    this._lastMovesKey = null;
    if (this._overlay) this._overlay.innerHTML = '';
  }

  /** Invalidate cached metrics (call on board resize or board change). */
  invalidate() {
    this._metricsCache = null;
  }

  destroy() {
    if (this._overlay) this._overlay.remove();
    this._overlay = null;
    this._boardEl = null;
    this._pieceImageCache = null;
    this._boardBgCache = undefined;
    this._metricsCache = null;
    this._lastMovesKey = null;
  }

  _getMetrics() {
    if (this._metricsCache) return this._metricsCache;

    const boardRect = this._boardEl.getBoundingClientRect();
    const parentRect = this._boardEl.parentElement.getBoundingClientRect();

    // Sync overlay position
    this._overlay.style.left = `${boardRect.left - parentRect.left}px`;
    this._overlay.style.top = `${boardRect.top - parentRect.top}px`;
    this._overlay.style.width = `${boardRect.width}px`;
    this._overlay.style.height = `${boardRect.height}px`;

    this._metricsCache = {
      sqSize: boardRect.width / BOARD_SIZE,
      boardWidth: boardRect.width,
      boardHeight: boardRect.height,
    };
    return this._metricsCache;
  }

  _getBoardBackground() {
    if (this._boardBgCache !== undefined) return this._boardBgCache;

    let target = this._boardEl;
    for (let i = 0; i < 4 && target; i++) {
      const style = getComputedStyle(target);
      if (style.backgroundImage && style.backgroundImage !== 'none') {
        this._boardBgCache = style.backgroundImage;
        return this._boardBgCache;
      }
      target = target.parentElement;
    }
    this._boardBgCache = null;
    return null;
  }

  _ensurePieceImages(adapter) {
    if (this._pieceImageCache) return;
    this._pieceImageCache = adapter.getPieceImageMap(this._boardEl);
  }
}
