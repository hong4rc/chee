// Encapsulates move classification state and logic.
// Compares eval before/after each board change to label the played move.

import createDebug from '../lib/debug.js';
import { LruCache } from '../lib/lru.js';
import { classify } from './classify.js';
import { detectInsight } from './insight.js';
import {
  BOARD_SIZE, LAST_RANK, FILES, CHAR_CODE_A,
  CLASSIFICATION_MIN_DEPTH, CLASSIFICATION_LOCK_DEPTH,
  TURN_WHITE, TURN_BLACK,
} from '../constants.js';

const CLASSIFICATION_CACHE_SIZE = 512;

const log = createDebug('chee:classify');

// ─── Promotion piece map (FEN char → UCI suffix) ────────────
const PROMO_SUFFIX = {
  Q: 'q', q: 'q', R: 'r', r: 'r', B: 'b', b: 'b', N: 'n', n: 'n',
};

// ─── Board diff → UCI move detection ────────────────────────
function detectMoveFromBoards(prevBoard, currBoard) {
  const disappeared = []; // had piece, now empty
  const appeared = []; // was empty, now has piece
  const changed = []; // had piece A, now has piece B (capture onto occupied square)

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const prev = prevBoard[row][col];
      const curr = currBoard[row][col];
      if (prev === curr) continue;

      const file = col;
      const rank = LAST_RANK - row;

      if (prev && !curr) disappeared.push({ file, rank, piece: prev });
      else if (!prev && curr) appeared.push({ file, rank, piece: curr });
      else if (prev && curr) {
        changed.push({
          file, rank, prev, curr,
        });
      }
    }
  }

  // Normal move: piece leaves one square, arrives on empty square
  // Normal capture via "changed": piece leaves, replaces opponent piece
  if (disappeared.length === 1 && appeared.length + changed.length === 1) {
    const to = appeared[0]
      ? { file: appeared[0].file, rank: appeared[0].rank, piece: appeared[0].piece }
      : { file: changed[0].file, rank: changed[0].rank, piece: changed[0].curr };
    return { from: disappeared[0], to };
  }

  // Castling: king + rook both move (2 disappear, 2 appear)
  if (disappeared.length === 2 && appeared.length === 2) {
    const king = disappeared.find((d) => d.piece === 'K' || d.piece === 'k');
    if (king) {
      const kingDest = appeared.find((a) => a.piece === king.piece);
      if (kingDest) return { from: king, to: kingDest };
    }
  }

  // En passant: pawn moves diagonally, captured pawn disappears (2 disappear, 1 appears)
  if (disappeared.length === 2 && appeared.length === 1) {
    const dest = appeared[0];
    const mover = disappeared.find((d) => (
      d.piece.toLowerCase() === 'p' && Math.abs(d.file - dest.file) === 1
    ));
    if (mover) return { from: mover, to: { file: dest.file, rank: dest.rank, piece: dest.piece } };
  }

  return null;
}

function boardDiffToUci(prevBoard, currBoard) {
  const move = detectMoveFromBoards(prevBoard, currBoard);
  if (!move) return null;

  let uci = FILES[move.from.file] + (move.from.rank + 1)
    + FILES[move.to.file] + (move.to.rank + 1);

  // Promotion: pawn arrived but piece type changed
  if (move.from.piece.toLowerCase() === 'p' && move.to.piece.toLowerCase() !== 'p') {
    uci += PROMO_SUFFIX[move.to.piece] || '';
  }

  return uci;
}

// ─── Classifier ─────────────────────────────────────────────

export class MoveClassifier {
  constructor({
    panel, arrow, adapter, settings,
  }) {
    this._panel = panel;
    this._arrow = arrow;
    this._adapter = adapter;
    this._settings = settings;

    this._latestEval = null;
    this._prevEval = null;
    this._prevFen = null;
    this._prevBoard = null;
    this._boardBeforeMove = null;
    this._prevPly = 0;
    this._locked = false;
    this._playedMoveUci = null;
    this._cache = new LruCache(CLASSIFICATION_CACHE_SIZE);
  }

  initFen(fen, board, ply) {
    this._prevFen = fen;
    this._prevBoard = board || null;
    this._prevPly = ply || 0;
    log('initFen:', fen, 'ply:', this._prevPly);
  }

  onEval(data, boardEl) {
    if (!data.lines || data.lines.length === 0) return;

    this._latestEval = {
      score: data.lines[0].score,
      mate: data.lines[0].mate,
      pv: data.lines[0].pv ? [...data.lines[0].pv] : null,
      depth: data.depth,
    };

    if (!this._settings.showClassifications) return;
    if (!this._prevEval || !this._playedMoveUci || this._locked) return;
    if (data.depth < CLASSIFICATION_MIN_DEPTH) return;

    const result = classify(this._prevEval, data.lines[0], this._playedMoveUci);
    log.info(
      'classify:',
      result.label,
      'cpLoss:',
      result.cpLoss,
      'd:',
      data.depth,
      'move:',
      this._playedMoveUci,
      'prev:',
      { cp: this._prevEval.score, m: this._prevEval.mate },
      'curr:',
      { cp: data.lines[0].score, m: data.lines[0].mate },
    );

    let insight = null;
    if ((result.label === 'Mistake' || result.label === 'Blunder')
      && this._boardBeforeMove && this._prevEval.pv && this._prevEval.pv.length > 0) {
      const fromFile = this._playedMoveUci.charCodeAt(0) - CHAR_CODE_A;
      const fromRank = parseInt(this._playedMoveUci[1], 10) - 1;
      const piece = this._boardBeforeMove[LAST_RANK - fromRank][fromFile];
      const turn = piece && piece === piece.toUpperCase() ? TURN_WHITE : TURN_BLACK;
      insight = detectInsight(
        this._playedMoveUci,
        this._prevEval.pv[0],
        this._prevEval.pv,
        this._boardBeforeMove,
        turn,
      );
    }

    this._panel.showClassification(result, insight);

    if (data.depth >= CLASSIFICATION_LOCK_DEPTH) {
      this._arrow.drawClassification(
        this._playedMoveUci,
        this._adapter.isFlipped(boardEl),
        result.color,
        result.symbol,
      );
      this._cache.set(this._prevPly, { result, moveUci: this._playedMoveUci, insight });
      log.info('locked at depth', data.depth, 'cached ply:', this._prevPly);
      this._locked = true;
    }
  }

  onBoardChange(fen, boardEl, board, ply) {
    if (fen === this._prevFen) return;

    const isForward = ply > this._prevPly;

    this._prevEval = this._latestEval ? { ...this._latestEval } : null;
    this._boardBeforeMove = this._prevBoard;
    // Only detect a played move when ply advances (new move, not revert/navigation)
    this._playedMoveUci = isForward && this._prevBoard && board
      ? boardDiffToUci(this._prevBoard, board)
      : null;
    this._locked = false;
    this._panel.clearClassification();
    this._arrow.clearClassification();
    this._prevFen = fen;
    this._prevBoard = board || null;
    this._prevPly = ply || 0;

    // Restore cached classification when navigating (revert/forward through history)
    if (!isForward && this._settings.showClassifications) {
      const cached = this._cache.get(ply);
      if (cached) {
        this._panel.showClassification(cached.result, cached.insight);
        this._arrow.drawClassification(
          cached.moveUci,
          this._adapter.isFlipped(boardEl),
          cached.result.color,
          cached.result.symbol,
        );
        this._locked = true;
        log.info('restored cached classification for ply:', ply, cached.result.label);
      }
    }

    log(
      'board changed',
      'ply:',
      ply,
      'forward:',
      isForward,
      'enabled:',
      this._settings.showClassifications,
      'move:',
      this._playedMoveUci,
    );
  }

  setEnabled(enabled) {
    if (!enabled) {
      this._panel.clearClassification();
      this._arrow.clearClassification();
    }
  }

  clearCache() {
    this._cache.clear();
  }

  destroy() {
    this._arrow.clearClassification();
    this._latestEval = null;
    this._prevEval = null;
    this._prevFen = null;
    this._prevBoard = null;
    this._boardBeforeMove = null;
    this._prevPly = 0;
    this._locked = false;
    this._playedMoveUci = null;
    this._cache.clear();
  }
}
