// Move classification: compares eval before/after a move to label it

import { find } from 'lodash-es';
import {
  LAST_RANK,
  CLASSIFICATION_MATE_LOSS,
  CLASSIFICATION_THRESHOLDS,
  CLASSIFICATION_BLUNDER,
  CLASSIFICATION_BEST,
  CLASSIFICATION_BRILLIANT,
  CLASSIFICATION_BRILLIANT_THRESHOLD,
  CLASSIFICATION_MIN_DEPTH,
} from '../constants.js';
import { parseUci } from '../lib/uci.js';

// Compute centipawn loss from the side-to-move's perspective.
// Scores are from each side-to-move's POV: prevScore is before the move,
// currScore is after (opponent's perspective, so positive = opponent happy).
// cpLoss = prevScore + currScore; a perfect move gives ~0.
export function computeCpLoss(prevScore, prevMate, currScore, currMate) {
  if (prevMate !== null && prevMate > 0) {
    // We had a forced mate. If opponent is still being mated, no loss;
    // otherwise we lost the mate — maximum penalty.
    return (currMate !== null && currMate < 0) ? 0 : CLASSIFICATION_MATE_LOSS;
  }

  if (prevMate !== null && prevMate < 0) {
    // We were being mated — can't lose what we don't have.
    return 0;
  }

  if (currMate !== null) {
    // Normal position → mate. currMate > 0 means opponent has forced mate
    // against us (blunder); currMate < 0 means we found mate (gain).
    return currMate > 0 ? CLASSIFICATION_MATE_LOSS : 0;
  }

  // Both normal centipawn evaluations.
  return prevScore + currScore;
}

export function classify(prevEval, currLine, playedUci) {
  const isBestMove = prevEval.pv && prevEval.pv.length > 0 && prevEval.pv[0] === playedUci;

  // Best move = played engine's #1 line
  if (isBestMove) {
    return { ...CLASSIFICATION_BEST, cpLoss: 0 };
  }

  const rawCpLoss = computeCpLoss(prevEval.score, prevEval.mate, currLine.score, currLine.mate);

  // Brilliant = not engine's #1, but position improved significantly (beyond eval noise)
  // Require prevEval at sufficient depth — shallow evals produce false positives
  if (rawCpLoss <= CLASSIFICATION_BRILLIANT_THRESHOLD && prevEval.depth >= CLASSIFICATION_MIN_DEPTH) {
    return { ...CLASSIFICATION_BRILLIANT, cpLoss: rawCpLoss };
  }

  const cpLoss = Math.max(0, rawCpLoss);
  const match = find(CLASSIFICATION_THRESHOLDS, (t) => cpLoss <= t.max);
  if (match) {
    return {
      label: match.label, symbol: match.symbol, color: match.color, cpLoss,
    };
  }
  return { ...CLASSIFICATION_BLUNDER, cpLoss };
}

// ─── Sacrifice detection ────────────────────────────────────
const PIECE_VALUE = {
  P: 1,
  N: 3,
  B: 3,
  R: 5,
  Q: 9,
  K: 0,
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const SACRIFICE_PV_DEPTH = 6; // half-moves to simulate (3 opponent moves)

/**
 * Detect a material sacrifice by simulating the PV and tracking all captures.
 * Looks multiple moves deep — the opponent may take back over 2-3 moves, not just one.
 * @param {Array[]} boardBefore - board state before our move
 * @param {Array[]} boardAfter  - board state after our move
 * @param {string}  playedUci   - the move we played (e.g. 'e2e4')
 * @param {string[]} opponentPv - opponent's best continuation PV
 * @returns {number} net material sacrifice (≥0 means we gave up material)
 */
export function detectSacrifice(boardBefore, boardAfter, playedUci, opponentPv) {
  if (!opponentPv || opponentPv.length === 0) return 0;

  const played = parseUci(playedUci);
  const movedPiece = boardBefore[LAST_RANK - played.fromRank][played.fromFile];
  if (!movedPiece) return 0;
  const weAreWhite = movedPiece === movedPiece.toUpperCase();

  // What did we capture with our move?
  const capturedPiece = boardBefore[LAST_RANK - played.toRank][played.toFile];
  let ourCaptures = capturedPiece ? (PIECE_VALUE[capturedPiece] || 0) : 0;
  let theirCaptures = 0;

  // Simulate the PV on a board copy, tracking all captures
  const board = boardAfter.map((row) => [...row]);
  const depth = Math.min(opponentPv.length, SACRIFICE_PV_DEPTH);

  for (let i = 0; i < depth; i++) {
    const move = parseUci(opponentPv[i]);
    const target = board[LAST_RANK - move.toRank][move.toFile];

    if (target) {
      const isOpponentMove = (i % 2 === 0); // PV[0]=opponent, PV[1]=us, ...
      const targetIsWhite = target === target.toUpperCase();
      const targetIsOurs = (weAreWhite === targetIsWhite);

      if (isOpponentMove && targetIsOurs) {
        theirCaptures += PIECE_VALUE[target] || 0;
      } else if (!isOpponentMove && !targetIsOurs) {
        ourCaptures += PIECE_VALUE[target] || 0;
      }
    }

    // Apply move to board (handle promotion)
    let piece = board[LAST_RANK - move.fromRank][move.fromFile];
    if (move.promotion) {
      const isWhiteMoving = (i % 2 === 0) ? !weAreWhite : weAreWhite;
      piece = isWhiteMoving ? move.promotion.toUpperCase() : move.promotion.toLowerCase();
    }
    board[LAST_RANK - move.toRank][move.toFile] = piece;
    board[LAST_RANK - move.fromRank][move.fromFile] = null;
  }

  return theirCaptures - ourCaptures;
}
