// Encapsulates move classification state and logic.
// Compares eval before/after each board change to label the played move.

import createDebug from '../lib/debug.js';
import { classify } from './classify.js';
import { FILES, CLASSIFICATION_MIN_DEPTH, CLASSIFICATION_LOCK_DEPTH } from '../constants.js';

const log = createDebug('chee:classify');

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
    this._locked = false;
    this._playedMoveUci = null;
  }

  initFen(fen) {
    this._prevFen = fen;
    log('initFen:', fen);
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
    this._panel.showClassification(result);
    this._arrow.drawClassification(
      this._playedMoveUci,
      this._adapter.isFlipped(boardEl),
      result.color,
    );

    if (data.depth >= CLASSIFICATION_LOCK_DEPTH) {
      log.info('locked at depth', data.depth);
      this._locked = true;
    }
  }

  onBoardChange(fen, boardEl) {
    if (fen === this._prevFen) return;

    this._prevEval = this._latestEval ? { ...this._latestEval } : null;
    this._playedMoveUci = this._detectPlayedMoveUci(boardEl);
    this._locked = false;
    this._panel.clearClassification();
    this._arrow.clearClassification();
    this._prevFen = fen;

    log(
      'board changed',
      'enabled:',
      this._settings.showClassifications,
      'move:',
      this._playedMoveUci,
      'prevEval:',
      this._prevEval
        ? { cp: this._prevEval.score, m: this._prevEval.mate, d: this._prevEval.depth }
        : null,
    );
  }

  setEnabled(enabled) {
    if (!enabled) {
      this._panel.clearClassification();
      this._arrow.clearClassification();
    }
  }

  destroy() {
    this._arrow.clearClassification();
    this._latestEval = null;
    this._prevEval = null;
    this._prevFen = null;
    this._locked = false;
    this._playedMoveUci = null;
  }

  _detectPlayedMoveUci(boardEl) {
    if (!boardEl) return null;
    const lastMove = this._adapter.detectLastMove(boardEl);
    if (!lastMove) {
      log.warn('detectLastMove: no highlights found');
      return null;
    }
    const { from, to } = lastMove;
    const uci = FILES[from.file] + (from.rank + 1) + FILES[to.file] + (to.rank + 1);
    log('detectLastMove:', uci, from, '->', to);
    return uci;
  }
}
