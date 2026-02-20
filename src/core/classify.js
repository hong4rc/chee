// Move classification: compares eval before/after a move to label it

import { find } from 'lodash-es';
import {
  CLASSIFICATION_MATE_LOSS,
  CLASSIFICATION_THRESHOLDS,
  CLASSIFICATION_BLUNDER,
  CLASSIFICATION_BEST,
  CLASSIFICATION_BRILLIANT,
  CLASSIFICATION_BRILLIANT_THRESHOLD,
  CLASSIFICATION_MIN_DEPTH,
} from '../constants.js';

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
