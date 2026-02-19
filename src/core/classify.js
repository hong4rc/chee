// Move classification: compares eval before/after a move to label it

import { find } from 'lodash-es';
import {
  CLASSIFICATION_MATE_LOSS,
  CLASSIFICATION_THRESHOLDS,
  CLASSIFICATION_BLUNDER,
  CLASSIFICATION_BEST,
} from '../constants.js';

export function computeCpLoss(prevScore, prevMate, currScore, currMate) {
  // Had forced mate, check if we kept it
  if (prevMate !== null && prevMate > 0) {
    // currMate < 0 = opponent being mated = still winning
    if (currMate !== null && currMate < 0) return 0;
    return CLASSIFICATION_MATE_LOSS;
  }

  // Was being mated — any move is no additional loss
  if (prevMate !== null && prevMate < 0) return 0;

  // Normal prev score → now mate
  if (currMate !== null) {
    // currMate > 0 = opponent has forced mate = blunder
    return currMate > 0 ? CLASSIFICATION_MATE_LOSS : 0;
  }

  // Both normal centipawn: cpLoss = prevScore + currScore (both side-to-move)
  return Math.max(0, prevScore + currScore);
}

export function classify(prevEval, currLine, playedUci) {
  // Best move = played engine's #1 line
  if (prevEval.pv && prevEval.pv.length > 0 && prevEval.pv[0] === playedUci) {
    return { ...CLASSIFICATION_BEST, cpLoss: 0 };
  }

  const cpLoss = computeCpLoss(prevEval.score, prevEval.mate, currLine.score, currLine.mate);

  const match = find(CLASSIFICATION_THRESHOLDS, (t) => cpLoss <= t.max);
  if (match) return { label: match.label, color: match.color, cpLoss };
  return { ...CLASSIFICATION_BLUNDER, cpLoss };
}
