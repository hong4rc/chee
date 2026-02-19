// Lichess adapter: chessground DOM, piece parsing, turn/EP detection

import createDebug from '../lib/debug.js';
import { BoardAdapter } from './base.js';
import {
  FILES, BOARD_SIZE, LAST_RANK, TURN_WHITE, TURN_BLACK,
  WHITE_KING, WHITE_ROOK,
  KING_START_FILE, KINGSIDE_ROOK_FILE, QUEENSIDE_ROOK_FILE,
  WHITE_BACK_ROW, BLACK_BACK_ROW,
} from '../constants.js';

const log = createDebug('chee:lichess');

// Chessground piece class → FEN char
const PIECE_MAP = {
  king: 'k', queen: 'q', rook: 'r', bishop: 'b', knight: 'n', pawn: 'p',
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
  constructor() {
    super();
    this._observer = null;
    this._moveListObserver = null;
  }

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

  detectCastling(board) {
    let castling = '';
    if (board[WHITE_BACK_ROW][KING_START_FILE] === WHITE_KING) {
      if (board[WHITE_BACK_ROW][KINGSIDE_ROOK_FILE] === WHITE_ROOK) castling += 'K';
      if (board[WHITE_BACK_ROW][QUEENSIDE_ROOK_FILE] === WHITE_ROOK) castling += 'Q';
    }
    if (board[BLACK_BACK_ROW][KING_START_FILE] === 'k') {
      if (board[BLACK_BACK_ROW][KINGSIDE_ROOK_FILE] === 'r') castling += 'k';
      if (board[BLACK_BACK_ROW][QUEENSIDE_ROOK_FILE] === 'r') castling += 'q';
    }
    return castling || '-';
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
    if (squares.length < 2) return '-';

    const s0 = squares[0];
    const s1 = squares[1];
    if (s0.file !== s1.file || Math.abs(s0.rank - s1.rank) !== 2) return '-';

    const p0 = board[LAST_RANK - s0.rank][s0.file];
    const p1 = board[LAST_RANK - s1.rank][s1.file];
    let toSq;
    let fromSq;
    if (p0 === 'P' || p0 === 'p') {
      toSq = s0;
      fromSq = s1;
    } else if (p1 === 'P' || p1 === 'p') {
      toSq = s1;
      fromSq = s0;
    } else {
      return '-';
    }

    const epRank = (fromSq.rank + toSq.rank) / 2;
    return FILES[toSq.file] + (epRank + 1);
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

  disconnect() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._moveListObserver) {
      this._moveListObserver.disconnect();
      this._moveListObserver = null;
    }
  }
}
