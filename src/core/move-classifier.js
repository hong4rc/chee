// Encapsulates move classification state and logic.
// Compares eval before/after each board change to label the played move.
// Emits events instead of calling panel/arrow directly.

import { find } from 'lodash-es';
import createDebug from '../lib/debug.js';
import { LruCache } from '../lib/lru.js';
import { Emitter } from '../lib/emitter.js';
import { parseUci } from '../lib/uci.js';
import { classify } from './classify.js';
import { detectInsight } from './insight.js';
import {
  BOARD_SIZE, LAST_RANK, FILES,
  CLASSIFICATION_MIN_DEPTH, CLASSIFICATION_LOCK_DEPTH,
  LABEL_MISTAKE, LABEL_BLUNDER,
  TURN_WHITE, TURN_BLACK, BLACK_PAWN,
  WHITE_KING, BLACK_KING,
  WHITE_QUEEN, BLACK_QUEEN, WHITE_ROOK, BLACK_ROOK,
  WHITE_BISHOP, BLACK_BISHOP, WHITE_KNIGHT, BLACK_KNIGHT,
  EVT_CLASSIFY_SHOW, EVT_CLASSIFY_CLEAR, EVT_CLASSIFY_LOCK, EVT_ACCURACY_UPDATE,
} from '../constants.js';

const CLASSIFICATION_CACHE_SIZE = 512;

const log = createDebug('chee:classify');

// ─── Promotion piece map (FEN char → UCI suffix) ────────────
const PROMO_SUFFIX = {
  [WHITE_QUEEN]: 'q',
  [BLACK_QUEEN]: 'q',
  [WHITE_ROOK]: 'r',
  [BLACK_ROOK]: 'r',
  [WHITE_BISHOP]: 'b',
  [BLACK_BISHOP]: 'b',
  [WHITE_KNIGHT]: 'n',
  [BLACK_KNIGHT]: 'n',
};

// ─── Board diff → UCI move detection ────────────────────────
function detectMoveFromBoards(prevBoard, currBoard) {
  const disappeared = [];
  const appeared = [];
  const changed = [];

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

  // Normal move or capture
  if (disappeared.length === 1 && appeared.length + changed.length === 1) {
    const to = appeared[0]
      ? { file: appeared[0].file, rank: appeared[0].rank, piece: appeared[0].piece }
      : { file: changed[0].file, rank: changed[0].rank, piece: changed[0].curr };
    return { from: disappeared[0], to };
  }

  // Castling
  if (disappeared.length === 2 && appeared.length === 2) {
    const king = find(disappeared, (d) => d.piece === WHITE_KING || d.piece === BLACK_KING);
    if (king) {
      const kingDest = find(appeared, (a) => a.piece === king.piece);
      if (kingDest) return { from: king, to: kingDest };
    }
  }

  // En passant
  if (disappeared.length === 2 && appeared.length === 1) {
    const dest = appeared[0];
    const mover = find(disappeared, (d) => (
      d.piece.toLowerCase() === BLACK_PAWN && Math.abs(d.file - dest.file) === 1
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

  if (move.from.piece.toLowerCase() === BLACK_PAWN && move.to.piece.toLowerCase() !== BLACK_PAWN) {
    uci += PROMO_SUFFIX[move.to.piece] || '';
  }

  return uci;
}

// ─── Classifier ─────────────────────────────────────────────

export class MoveClassifier extends Emitter {
  constructor({ adapter, settings }) {
    super();
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
    this._totalCpLoss = 0;
    this._moveCount = 0;
    this._lockedLabel = null;
  }

  get isBlunderLocked() {
    return this._lockedLabel === LABEL_MISTAKE || this._lockedLabel === LABEL_BLUNDER;
  }

  initFen(fen, board, ply) {
    this._prevFen = fen;
    this._prevBoard = board || null;
    this._prevPly = ply || 0;
    log('initFen:', fen, 'ply:', this._prevPly);
  }

  onEval(data) {
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
    if (this._prevEval.depth < CLASSIFICATION_MIN_DEPTH) return;

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

    const insight = this._detectInsight(result);
    this.emit(EVT_CLASSIFY_SHOW, { result, insight });

    if (data.depth >= CLASSIFICATION_LOCK_DEPTH) {
      this._lockClassification(result, insight, data.depth);
    }
  }

  _detectInsight(result) {
    if (result.label !== LABEL_MISTAKE && result.label !== LABEL_BLUNDER) return null;
    if (!this._boardBeforeMove || !this._prevEval.pv || this._prevEval.pv.length === 0) return null;

    const { fromFile, fromRank } = parseUci(this._playedMoveUci);
    const piece = this._boardBeforeMove[LAST_RANK - fromRank][fromFile];
    const turn = piece && piece === piece.toUpperCase() ? TURN_WHITE : TURN_BLACK;
    return detectInsight(
      this._playedMoveUci,
      this._prevEval.pv[0],
      this._prevEval.pv,
      this._boardBeforeMove,
      turn,
    );
  }

  _lockClassification(result, insight, depth) {
    const isBlunder = result.label === LABEL_MISTAKE || result.label === LABEL_BLUNDER;
    const bestUci = isBlunder && this._prevEval.pv && this._prevEval.pv[0]
      ? this._prevEval.pv[0] : null;

    this._cache.set(this._prevPly, {
      result, moveUci: this._playedMoveUci, insight, bestUci,
    });
    this._totalCpLoss += Math.max(0, result.cpLoss);
    this._moveCount += 1;
    this._lockedLabel = result.label;
    log.info('locked at depth', depth, 'cached ply:', this._prevPly);
    this._locked = true;

    this.emit(EVT_CLASSIFY_LOCK, {
      result, moveUci: this._playedMoveUci, insight, bestUci,
    });
    this.emit(EVT_ACCURACY_UPDATE, this.getAccuracy());
  }

  _getCachedClassification(ply) {
    return this._cache.get(ply);
  }

  // Accuracy formula: chess.com ACPL model
  getAccuracy() {
    if (this._moveCount === 0) return null;
    const acpl = this._totalCpLoss / this._moveCount;
    const raw = 103.1668 * Math.exp(-0.04354 * acpl) - 3.1668;
    return Math.round(Math.min(100, Math.max(0, raw)));
  }

  onBoardChange(fen, board, ply) {
    if (fen === this._prevFen) return;

    this._lockedLabel = null;
    const isForward = ply > this._prevPly;

    this._prevEval = this._latestEval ? { ...this._latestEval } : null;
    this._boardBeforeMove = this._prevBoard;
    this._playedMoveUci = isForward && this._prevBoard && board
      ? boardDiffToUci(this._prevBoard, board)
      : null;
    this._locked = false;
    this.emit(EVT_CLASSIFY_CLEAR);
    this._prevFen = fen;
    this._prevBoard = board || null;
    this._prevPly = ply || 0;

    // Restore cached classification when navigating (revert/forward through history)
    if (!isForward && this._settings.showClassifications) {
      const cached = this._getCachedClassification(ply);
      if (cached) {
        this.emit(EVT_CLASSIFY_LOCK, cached);
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
    if (!enabled) this.emit(EVT_CLASSIFY_CLEAR);
  }

  clearCache() {
    this._cache.clear();
  }

  destroy() {
    this.emit(EVT_CLASSIFY_CLEAR);
    this._latestEval = null;
    this._prevEval = null;
    this._prevFen = null;
    this._prevBoard = null;
    this._boardBeforeMove = null;
    this._prevPly = 0;
    this._locked = false;
    this._playedMoveUci = null;
    this._cache.clear();
    this._totalCpLoss = 0;
    this._moveCount = 0;
    this.removeAllListeners();
  }
}
