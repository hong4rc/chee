// Encapsulates move classification state and logic.
// Compares eval before/after each board change to label the played move.
// Emits events instead of calling panel/arrow directly.

import createDebug from '../lib/debug.js';
import { LruCache } from '../lib/lru.js';
import { Emitter } from '../lib/emitter.js';
import { parseUci } from '../lib/uci.js';
import { classify, detectSacrifice } from './classify.js';
import { detectInsight } from './insight.js';
import { boardDiffToUci } from './board-diff.js';
import { lookupOpening, STARTING_POSITION } from './openings.js';
import {
  LAST_RANK,
  CLASSIFICATION_MIN_DEPTH, CLASSIFICATION_LOCK_DEPTH,
  CLASSIFICATION_CRAZY, CLASSIFICATION_BOOK, CRAZY_MIN_SACRIFICE, CRAZY_MAX_CP_LOSS,
  LABEL_CRAZY, LABEL_MISTAKE, LABEL_BLUNDER, LABEL_BOOK,
  TURN_WHITE, TURN_BLACK,
  EVT_CLASSIFY_SHOW, EVT_CLASSIFY_CLEAR, EVT_CLASSIFY_LOCK, EVT_ACCURACY_UPDATE,
  ACCURACY_SCORES,
} from '../constants.js';

const CLASSIFICATION_CACHE_SIZE = 512;

const log = createDebug('chee:classify');

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
    this._totalScore = { [TURN_WHITE]: 0, [TURN_BLACK]: 0 };
    this._moves = { [TURN_WHITE]: 0, [TURN_BLACK]: 0 };
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

    if (!this._settings.showClassifications && !this._settings.showCrazy) return;
    if (!this._prevEval || !this._playedMoveUci || this._locked) return;
    if (data.depth < CLASSIFICATION_MIN_DEPTH) return;
    if (this._prevEval.depth < CLASSIFICATION_MIN_DEPTH) return;

    let result = classify(this._prevEval, data.lines[0], this._playedMoveUci);

    // Upgrade to Crazy if the move is a material sacrifice that's objectively good
    if (this._settings.showCrazy && result.cpLoss <= CRAZY_MAX_CP_LOSS && this._boardBeforeMove && this._prevBoard) {
      const sacrifice = detectSacrifice(this._boardBeforeMove, this._prevBoard, this._playedMoveUci, data.lines[0].pv);
      if (sacrifice >= CRAZY_MIN_SACRIFICE) {
        result = { ...CLASSIFICATION_CRAZY, cpLoss: result.cpLoss };
      }
    }

    // In Crazy-only mode, skip non-Crazy classifications
    if (!this._settings.showClassifications && result.label !== LABEL_CRAZY) return;

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
    if (this._settings.showClassifications && result.label !== LABEL_BOOK) {
      const side = this._prevPly % 2 === 0 ? TURN_WHITE : TURN_BLACK;
      this._totalScore[side] += ACCURACY_SCORES[result.label] || 0;
      this._moves[side] += 1;
    }
    this._lockedLabel = result.label;
    log.info('locked at depth', depth, 'cached ply:', this._prevPly);
    this._locked = true;

    this.emit(EVT_CLASSIFY_LOCK, {
      result, moveUci: this._playedMoveUci, insight, bestUci,
    });
    if (this._settings.showClassifications) {
      this.emit(EVT_ACCURACY_UPDATE, this.getAccuracy());
    }
  }

  _getCachedClassification(ply) {
    return this._cache.get(ply);
  }

  getAccuracy() {
    return {
      white: this._moves[TURN_WHITE] > 0
        ? Math.round(this._totalScore[TURN_WHITE] / this._moves[TURN_WHITE]) : null,
      black: this._moves[TURN_BLACK] > 0
        ? Math.round(this._totalScore[TURN_BLACK] / this._moves[TURN_BLACK]) : null,
    };
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

    // Book move: if the resulting position is a known opening, lock immediately
    if (this._settings.showBookMoves) {
      const opening = lookupOpening(fen);
      if (opening && opening !== STARTING_POSITION) {
        const moveUci = this._playedMoveUci || null;
        const result = { ...CLASSIFICATION_BOOK };
        this._cache.set(this._prevPly, {
          result, moveUci, insight: null, bestUci: null,
        });
        this._locked = true;
        this._lockedLabel = result.label;
        log.info('book move:', moveUci, opening);
        this.emit(EVT_CLASSIFY_LOCK, {
          result, moveUci, insight: null, bestUci: null,
        });
        return;
      }
    }

    // Restore cached classification when navigating (revert/forward through history)
    if (!isForward && (this._settings.showClassifications || this._settings.showCrazy
      || this._settings.showBookMoves)) {
      const cached = this._getCachedClassification(ply);
      if (cached && (this._settings.showClassifications || cached.result.label === LABEL_CRAZY
        || cached.result.label === LABEL_BOOK)) {
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

  replayCurrent() {
    const cached = this._cache.get(this._prevPly);
    if (cached) {
      this.emit(EVT_CLASSIFY_LOCK, cached);
      this.emit(EVT_ACCURACY_UPDATE, this.getAccuracy());
    }
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
    this._totalScore = { [TURN_WHITE]: 0, [TURN_BLACK]: 0 };
    this._moves = { [TURN_WHITE]: 0, [TURN_BLACK]: 0 };
    this.removeAllListeners();
  }
}
