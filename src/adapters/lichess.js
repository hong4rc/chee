// Lichess adapter: chessground DOM, piece parsing, turn/EP detection

import { BoardAdapter, detectEnPassantFromSquares } from './base.js';
import {
  BOARD_SIZE, TURN_WHITE, TURN_BLACK,
  BLACK_KING, BLACK_QUEEN, BLACK_ROOK, BLACK_BISHOP, BLACK_KNIGHT, BLACK_PAWN,
} from '../constants.js';

// Chessground piece class → FEN char
const PIECE_MAP = {
  king: BLACK_KING,
  queen: BLACK_QUEEN,
  rook: BLACK_ROOK,
  bishop: BLACK_BISHOP,
  knight: BLACK_KNIGHT,
  pawn: BLACK_PAWN,
};

const TRANSFORM_RE = /translate\(\s*([\d.]+)px\s*,\s*([\d.]+)px\s*\)/;

const SEL_MOVES = 'l4x kwdb, .tview2 move';
const SEL_ACTIVE_MOVE = 'kwdb.a1t, .tview2 move.active';
const SEL_MOVE_LIST_ROOT = 'l4x, .tview2';

const ORIENT_WHITE = 'white';
const ORIENT_BLACK = 'black';
const CLS_ORIENT_WHITE = 'orientation-white';
const CLS_ORIENT_BLACK = 'orientation-black';
const CLS_PIECE_WHITE = 'white';

// ─── Helpers ─────────────────────────────────────────────────

function getOrientation(boardEl) {
  const wrap = boardEl.closest('cg-wrap') || boardEl.closest('.cg-wrap');
  if (wrap) {
    if (wrap.classList.contains(CLS_ORIENT_BLACK)) return ORIENT_BLACK;
    if (wrap.classList.contains(CLS_ORIENT_WHITE)) return ORIENT_WHITE;
  }
  return ORIENT_WHITE;
}

function getSquareSize(boardEl) {
  const container = boardEl.closest('cg-container') || boardEl;
  return container.clientWidth / BOARD_SIZE;
}

function pxToSquare(xPx, yPx, squareSize, orientation) {
  const rawFile = Math.round(xPx / squareSize);
  const rawRank = Math.round(yPx / squareSize);
  if (orientation === ORIENT_BLACK) {
    return { file: BOARD_SIZE - 1 - rawFile, rank: rawRank };
  }
  return { file: rawFile, rank: BOARD_SIZE - 1 - rawRank };
}

function parseTransform(el) {
  const style = el.getAttribute('style') || '';
  const m = TRANSFORM_RE.exec(style);
  if (!m) return null;
  return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
}

// ─── Adapter ─────────────────────────────────────────────────

export class LichessAdapter extends BoardAdapter {
  findBoard() {
    return document.querySelector('.main-board cg-board')
      || document.querySelector('cg-board');
  }

  readPieces(boardEl) {
    const pieces = boardEl.querySelectorAll('piece:not(.ghost)');
    if (pieces.length === 0) return [];

    const sqSize = getSquareSize(boardEl);
    if (sqSize <= 0) return [];

    const orientation = getOrientation(boardEl);
    const result = [];

    pieces.forEach((el) => {
      const pos = parseTransform(el);
      if (!pos) return;

      const classes = el.className.split(/\s+/);
      const isWhite = classes.includes(CLS_PIECE_WHITE);
      const type = classes.find((c) => PIECE_MAP[c]);
      if (!type) return;

      const { file, rank } = pxToSquare(pos.x, pos.y, sqSize, orientation);
      if (file < 0 || file >= BOARD_SIZE || rank < 0 || rank >= BOARD_SIZE) return;

      const piece = isWhite ? PIECE_MAP[type].toUpperCase() : PIECE_MAP[type];
      result.push({ piece, file, rank });
    });

    return result;
  }

  // Returns { index, total } where index is the 0-based active move index
  // (-1 if no active marker), total is the move count.
  _getActiveMoveIndex() {
    const allMoves = document.querySelectorAll(SEL_MOVES);
    const total = allMoves.length;
    if (total === 0) return { index: -1, total: 0 };

    const activeMove = document.querySelector(SEL_ACTIVE_MOVE);
    const index = activeMove ? Array.from(allMoves).indexOf(activeMove) : -1;
    return { index, total };
  }

  detectTurn() {
    const { index, total } = this._getActiveMoveIndex();
    if (total === 0) return TURN_WHITE;

    // Even index = white's half-move → black's turn; odd = black's → white's
    if (index >= 0) return index % 2 === 0 ? TURN_BLACK : TURN_WHITE;

    // No active marker — use total count (live game at latest move)
    return total % 2 === 0 ? TURN_WHITE : TURN_BLACK;
  }

  _getHighlightedSquares(boardEl) {
    const board = boardEl || this.findBoard();
    if (!board) return null;

    const sqSize = getSquareSize(board);
    const orientation = getOrientation(board);
    const lastMoves = board.querySelectorAll('square.last-move');
    if (lastMoves.length < 2 || sqSize <= 0) return null;

    const squares = [];
    lastMoves.forEach((sq) => {
      const pos = parseTransform(sq);
      if (pos) squares.push(pxToSquare(pos.x, pos.y, sqSize, orientation));
    });
    return squares.length >= 2 ? squares : null;
  }

  detectEnPassant(board) {
    const squares = this._getHighlightedSquares();
    if (!squares) return '-';
    return detectEnPassantFromSquares(squares, board);
  }

  detectMoveCount() {
    const { index, total } = this._getActiveMoveIndex();
    if (total === 0) return 1;
    const halfMoves = index >= 0 ? index : total - 1;
    return Math.floor(halfMoves / 2) + 1;
  }

  detectPly() {
    const { index, total } = this._getActiveMoveIndex();
    return index >= 0 ? index + 1 : total;
  }

  getPanelAnchor(boardEl) {
    // Return cg-wrap (child of .main-board) so mount() appends panel to
    // .main-board — a board-width container. This positions the panel
    // correctly via right: -240px, just to the right of the board.
    return boardEl.closest('.cg-wrap') || boardEl;
  }

  isFlipped(boardEl) {
    return getOrientation(boardEl) === ORIENT_BLACK;
  }

  observe(boardEl, onChange) {
    this.disconnect();

    this._observer = new MutationObserver(onChange);
    this._observer.observe(boardEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    // Also observe the move list so turn detection updates when moves are added
    const moveList = document.querySelector(SEL_MOVE_LIST_ROOT);
    if (moveList) {
      this._moveListObserver = new MutationObserver(onChange);
      this._moveListObserver.observe(moveList, { childList: true, subtree: true, attributes: true });
    }
  }
}
