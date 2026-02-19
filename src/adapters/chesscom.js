// chess.com adapter: selectors, piece parsing, turn/EP detection

import {
  find, forEach, includes, filter, map, take, reduce, compact,
} from 'lodash-es';
import createDebug from '../lib/debug.js';
import { BoardAdapter, detectEnPassantFromSquares } from './base.js';
import {
  BOARD_SIZE, TURN_WHITE, TURN_BLACK,
  WHITE_KING, WHITE_QUEEN, WHITE_ROOK, WHITE_BISHOP, WHITE_KNIGHT, WHITE_PAWN,
  BLACK_KING, BLACK_QUEEN, BLACK_ROOK, BLACK_BISHOP, BLACK_KNIGHT, BLACK_PAWN,
  SQUARE_PREFIX, SQUARE_CLASS_MIN_LEN,
  MAX_EXPLORE_CHILDREN, MAX_EXPLORE_DEPTH, MAX_EXPLORE_DEPTH_LAYOUT,
  MAX_LOG_SAMPLES, MAX_ATTR_DISPLAY_LEN, MAX_CLASS_DISPLAY_LEN,
  MIN_PIECE_CONTAINER_COUNT,
} from '../constants.js';

const log = createDebug('chee:chesscom');

const PIECE_MAP = {
  wp: WHITE_PAWN,
  wn: WHITE_KNIGHT,
  wb: WHITE_BISHOP,
  wr: WHITE_ROOK,
  wq: WHITE_QUEEN,
  wk: WHITE_KING,
  bp: BLACK_PAWN,
  bn: BLACK_KNIGHT,
  bb: BLACK_BISHOP,
  br: BLACK_ROOK,
  bq: BLACK_QUEEN,
  bk: BLACK_KING,
};

const BOARD_SELECTORS = [
  'wc-chess-board#board-single',
  'wc-chess-board',
  'chess-board',
  '#board-single',
];

const SEL_PIECE = '.piece';
const SEL_PIECE_ATTR = '[class*="piece"]';
const SEL_PIECE_SQUARE = '.piece[class*="square-"]';
const SEL_CUSTOM_BOARDS = 'wc-chess-board, chess-board';
const SEL_CLOCK_TURN = '.clock-player-turn';
const SEL_MOVE_LIST = 'wc-simple-move-list .node';
const SEL_HIGHLIGHT = '.highlight';
const SEL_MOVE_LIST_EL = 'wc-simple-move-list';
const SEL_BOARD_LAYOUT = '.board-layout-chessboard';

const CLS_WHITE_MOVE = 'white-move';
const CLS_BLACK_MOVE = 'black-move';
const CLS_CLOCK_BLACK = 'black';
const CLS_CLOCK_WHITE = 'white';

const PIECE_REGEX = /\b[wb][rnbqkp]\b/;
const SQUARE_REGEX = /\bsquare-\d\d\b/;

const MAX_CLASS_PARTS = 4;

const EXPLORE_SEARCHES = [
  { q: SEL_PIECE_ATTR, label: 'class*=piece' },
  { q: '[data-piece]', label: 'data-piece' },
  { q: '[data-square]', label: 'data-square' },
  { q: '.board-layout-chessboard *', label: 'board-layout children' },
  { q: 'wc-chess-board', label: 'wc-chess-board' },
  { q: 'chess-board', label: 'chess-board' },
  { q: 'canvas', label: 'canvas' },
];

const EXCLUDED_ATTRS = ['class', 'id', 'xmlns'];

// ─── Shared utilities ─────────────────────────────────────────
function parseSquareClass(cls) {
  if (!cls.startsWith(SQUARE_PREFIX) || cls.length < SQUARE_CLASS_MIN_LEN) return null;
  const sq = cls.substring(SQUARE_PREFIX.length);
  const file = parseInt(sq[0], 10) - 1;
  const rank = parseInt(sq[1], 10) - 1;
  if (file < 0 || file >= BOARD_SIZE || rank < 0 || rank >= BOARD_SIZE) return null;
  return { file, rank };
}

function extractSquares(element) {
  const classes = (element.className || element.getAttribute('class') || '').split(/\s+/);
  return compact(map(classes, parseSquareClass));
}

function getClassName(element) {
  if (element.className && typeof element.className === 'string') return element.className;
  if (element.className && element.className.baseVal) return element.className.baseVal;
  return '';
}

// ─── Piece discovery ──────────────────────────────────────────
function discoverPieceElements(root) {
  const pieces = root.querySelectorAll(SEL_PIECE);
  if (pieces.length > 0) return pieces;

  const byAttr = root.querySelectorAll(SEL_PIECE_ATTR);
  if (byAttr.length > 0) return byAttr;

  const allEls = root.querySelectorAll('*');
  const found = filter(Array.from(allEls), (child) => {
    const cls = child.getAttribute('class') || '';
    return PIECE_REGEX.test(cls) && SQUARE_REGEX.test(cls);
  });
  if (found.length > 0) {
    log('Found pieces via regex scan:', found.length);
    return found;
  }

  return [];
}

function parsePieceElement(pieceEl) {
  const classes = (pieceEl.getAttribute('class') || '').split(/\s+/);
  const pieceCls = find(classes, (cls) => cls.length === 2 && PIECE_MAP[cls]);
  const sqCls = find(classes, (cls) => parseSquareClass(cls) !== null);
  if (!pieceCls || !sqCls) return null;

  const { file, rank } = parseSquareClass(sqCls);
  return { piece: PIECE_MAP[pieceCls], file, rank };
}

// ─── DOM formatting ───────────────────────────────────────────
function formatElementAttrs(element) {
  const attrs = reduce(
    Array.from(element.attributes),
    (acc, a) => {
      if (includes(EXCLUDED_ATTRS, a.name)) return acc;
      const val = a.value.length > MAX_ATTR_DISPLAY_LEN
        ? `${a.value.substring(0, MAX_ATTR_DISPLAY_LEN)}...`
        : a.value;
      acc.push(`${a.name}=${val}`);
      return acc;
    },
    [],
  );
  return attrs.length ? ` [${attrs.join(', ')}]` : '';
}

function formatElementSummary(element) {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const cn = getClassName(element);
  const cls = cn ? `.${cn.split(' ').slice(0, MAX_CLASS_PARTS).join('.')}` : '';
  const attrStr = formatElementAttrs(element);
  const childCount = element.children ? element.children.length : 0;
  const shadow = element.shadowRoot ? ' (SHADOW ROOT)' : '';
  const children = childCount > 0 ? ` (${childCount} children)` : '';
  return `${tag}${id}${cls}${attrStr}${shadow}${children}`;
}

export class ChesscomAdapter extends BoardAdapter {
  findBoard() {
    const pieceContainer = this._findPieceContainer();
    if (pieceContainer) {
      log('Found piece container:', pieceContainer.tagName, pieceContainer.id, pieceContainer.className);
      return pieceContainer;
    }

    const sel = find(BOARD_SELECTORS, (s) => document.querySelector(s));
    if (!sel) return null;
    log('Board found with selector:', sel);
    return document.querySelector(sel);
  }

  readPieces(boardEl) {
    const root = boardEl.shadowRoot || boardEl;
    const elements = discoverPieceElements(root);

    if (elements.length === 0) {
      log('No pieces found. Exploring board DOM...');
      this._exploreDOM(root, 0, MAX_EXPLORE_DEPTH);
      return [];
    }

    const result = compact(map(Array.from(elements), parsePieceElement));

    if (result.length === 0 && elements.length > 0) {
      log('Found', elements.length, 'piece-like elements but parsed 0. Sample classes:');
      forEach(take(Array.from(elements), MAX_LOG_SAMPLES), (el) => {
        log(' ', el.getAttribute('class'));
      });
    }

    return result;
  }

  detectTurn() {
    const turnIndicators = document.querySelectorAll(SEL_CLOCK_TURN);
    const clockMatch = find(Array.from(turnIndicators), (indicator) => {
      const clockEl = indicator.closest('[class*="clock"]');
      return clockEl && (
        includes(clockEl.className, CLS_CLOCK_BLACK)
        || includes(clockEl.className, CLS_CLOCK_WHITE)
      );
    });

    if (clockMatch) {
      const cls = clockMatch.closest('[class*="clock"]').className || '';
      if (includes(cls, CLS_CLOCK_BLACK)) return TURN_BLACK;
      return TURN_WHITE;
    }

    return this._detectTurnFromMoveList();
  }

  detectEnPassant(board) {
    const highlights = document.querySelectorAll(SEL_HIGHLIGHT);
    if (highlights.length < 2) return '-';

    const squares = reduce(
      Array.from(highlights),
      (acc, el) => acc.concat(extractSquares(el)),
      [],
    );

    return detectEnPassantFromSquares(squares, board);
  }

  detectMoveCount() {
    const moveNodes = document.querySelectorAll(SEL_MOVE_LIST);
    return Math.floor(moveNodes.length / 2) + 1;
  }

  getPanelAnchor(boardEl) {
    return boardEl;
  }

  isFlipped(boardEl) {
    if (boardEl.hasAttribute('flipped')) return true;
    if (boardEl.classList && boardEl.classList.contains('flipped')) return true;
    const style = window.getComputedStyle(boardEl);
    return !!(style.transform && includes(style.transform, 'rotate(180deg)'));
  }

  observe(boardEl, onChange) {
    this.disconnect();

    this._observer = new MutationObserver(onChange);
    const observeTarget = boardEl.shadowRoot || boardEl;
    this._observer.observe(observeTarget, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'transform'],
    });

    const moveList = document.querySelector(SEL_MOVE_LIST_EL);
    if (moveList) {
      this._moveListObserver = new MutationObserver(onChange);
      this._moveListObserver.observe(moveList, { childList: true, subtree: true });
    }
  }

  findAlternatePieceContainer(boardEl) {
    const container = this._findPieceContainer();
    if (!container || container === boardEl) return null;
    log(
      'Piece container found (different from board):',
      container.tagName,
      container.id,
      container.className,
    );
    return container;
  }

  exploreBoardArea() {
    forEach(EXPLORE_SEARCHES, (s) => {
      const els = document.querySelectorAll(s.q);
      if (els.length === 0) return;
      log('Found', els.length, 'elements for:', s.label);
      forEach(take(Array.from(els), MAX_LOG_SAMPLES), (el) => {
        const cls = getClassName(el).substring(0, MAX_CLASS_DISPLAY_LEN);
        log(
          ' ',
          el.tagName,
          el.id || '',
          cls,
          el.getAttribute('data-piece') || '',
          el.getAttribute('data-square') || '',
        );
      });
    });

    const layout = document.querySelector(SEL_BOARD_LAYOUT);
    if (layout) {
      log('board-layout-chessboard children:');
      this._exploreDOM(layout, 0, MAX_EXPLORE_DEPTH_LAYOUT);
    }

    forEach(document.querySelectorAll('*'), (el) => {
      if (!el.shadowRoot) return;
      const pieces = el.shadowRoot.querySelectorAll(`${SEL_PIECE}, ${SEL_PIECE_ATTR}`);
      if (pieces.length > 0) {
        log('Found', pieces.length, 'pieces in shadowRoot of', el.tagName, el.id, el.className);
      }
    });
  }

  _findPieceContainer() {
    const pieceEl = document.querySelector(SEL_PIECE_SQUARE);
    if (pieceEl) {
      let container = pieceEl.parentElement;
      while (container && container.querySelectorAll(SEL_PIECE).length < MIN_PIECE_CONTAINER_COUNT) {
        container = container.parentElement;
      }
      return container;
    }

    return find(
      Array.from(document.querySelectorAll(SEL_CUSTOM_BOARDS)),
      (el) => el.shadowRoot && el.shadowRoot.querySelectorAll(SEL_PIECE).length > 0,
    ) || null;
  }

  _detectTurnFromMoveList() {
    const moveNodes = document.querySelectorAll(SEL_MOVE_LIST);
    if (moveNodes.length === 0) return TURN_WHITE;

    const lastMove = moveNodes[moveNodes.length - 1];
    if (lastMove) {
      if (lastMove.classList.contains(CLS_WHITE_MOVE)) return TURN_BLACK;
      if (lastMove.classList.contains(CLS_BLACK_MOVE)) return TURN_WHITE;
    }

    return moveNodes.length % 2 === 0 ? TURN_WHITE : TURN_BLACK;
  }

  _exploreDOM(root, depth, maxDepth) {
    if (depth > maxDepth) return;
    const { children } = root;
    if (!children) return;

    const indent = '  '.repeat(depth);
    forEach(take(Array.from(children), MAX_EXPLORE_CHILDREN), (child) => {
      log(`${indent}${formatElementSummary(child)}`);

      if (child.shadowRoot && depth < maxDepth) {
        log(`${indent}  [shadow-root]:`);
        this._exploreDOM(child.shadowRoot, depth + 1, maxDepth);
      }

      if (child.children && child.children.length > 0 && depth < maxDepth) {
        this._exploreDOM(child, depth + 1, maxDepth);
      }
    });
  }
}
