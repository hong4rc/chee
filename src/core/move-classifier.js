// Encapsulates move classification state and logic.
// Compares eval before/after each board change to label the played move.

import createDebug from '../lib/debug.js';
import { classify } from './classify.js';
import {
  BOARD_SIZE, LAST_RANK, FILES,
  CLASSIFICATION_MIN_DEPTH, CLASSIFICATION_LOCK_DEPTH,
} from '../constants.js';

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
    this._locked = false;
    this._playedMoveUci = null;
  }

  initFen(fen, board) {
    this._prevFen = fen;
    this._prevBoard = board || null;
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

  onBoardChange(fen, boardEl, board) {
    if (fen === this._prevFen) return;

    this._prevEval = this._latestEval ? { ...this._latestEval } : null;
    this._playedMoveUci = this._prevBoard && board
      ? boardDiffToUci(this._prevBoard, board)
      : null;
    this._locked = false;
    this._panel.clearClassification();
    this._arrow.clearClassification();
    this._prevFen = fen;
    this._prevBoard = board || null;

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
    this._prevBoard = null;
    this._locked = false;
    this._playedMoveUci = null;
  }
}
