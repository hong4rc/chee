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

// ─── Helpers ─────────────────────────────────────────────────

function getOrientation(boardEl) {
  const wrap = boardEl.closest('cg-wrap') || boardEl.closest('.cg-wrap');
  if (wrap) {
    if (wrap.classList.contains('orientation-black')) return 'black';
    if (wrap.classList.contains('orientation-white')) return 'white';
  }
  return 'white';
}

function getSquareSize(boardEl) {
  const container = boardEl.closest('cg-container') || boardEl;
  return container.clientWidth / BOARD_SIZE;
}

function pxToSquare(xPx, yPx, squareSize, orientation) {
  const rawFile = Math.round(xPx / squareSize);
  const rawRank = Math.round(yPx / squareSize);
  if (orientation === 'black') {
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
      const isWhite = classes.includes('white');
      const type = classes.find((c) => PIECE_MAP[c]);
      if (!type) return;

      const { file, rank } = pxToSquare(pos.x, pos.y, sqSize, orientation);
      if (file < 0 || file >= BOARD_SIZE || rank < 0 || rank >= BOARD_SIZE) return;

      const piece = isWhite ? PIECE_MAP[type].toUpperCase() : PIECE_MAP[type];
      result.push({ piece, file, rank });
    });

    return result;
  }

  detectTurn() {
    // Primary: move list — count half-moves up to the active move
    const allMoves = document.querySelectorAll('l4x kwdb, .tview2 move');
    if (allMoves.length > 0) {
      const activeMove = document.querySelector('kwdb.a1t, .tview2 move.active');
      if (activeMove) {
        const index = Array.from(allMoves).indexOf(activeMove);
        if (index >= 0) {
          // Even index = white's half-move → black's turn; odd = black's → white's
          return index % 2 === 0 ? TURN_BLACK : TURN_WHITE;
        }
      }
      // No active marker — use total count (live game at latest move)
      return allMoves.length % 2 === 0 ? TURN_WHITE : TURN_BLACK;
    }

    // Fallback: no move list yet (game just started, no moves played)
    return TURN_WHITE;
  }

  detectEnPassant(board) {
    const boardEl = this.findBoard();
    if (!boardEl) return '-';

    const sqSize = getSquareSize(boardEl);
    const orientation = getOrientation(boardEl);
    const lastMoves = boardEl.querySelectorAll('square.last-move');
    if (lastMoves.length < 2 || sqSize <= 0) return '-';

    const squares = [];
    lastMoves.forEach((sq) => {
      const pos = parseTransform(sq);
      if (pos) squares.push(pxToSquare(pos.x, pos.y, sqSize, orientation));
    });

    return detectEnPassantFromSquares(squares, board);
  }

  detectMoveCount() {
    const moves = document.querySelectorAll('l4x kwdb, .tview2 move');
    if (moves.length > 0) return Math.floor(moves.length / 2) + 1;
    return 1;
  }

  getPanelAnchor(boardEl) {
    // Return cg-wrap (child of .main-board) so mount() appends panel to
    // .main-board — a board-width container. This positions the panel
    // correctly via right: -240px, just to the right of the board.
    return boardEl.closest('.cg-wrap') || boardEl;
  }

  isFlipped(boardEl) {
    return getOrientation(boardEl) === 'black';
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
    const moveList = document.querySelector('l4x, .tview2');
    if (moveList) {
      this._moveListObserver = new MutationObserver(onChange);
      this._moveListObserver.observe(moveList, { childList: true, subtree: true, attributes: true });
    }
  }
}
