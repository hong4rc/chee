// Detect tactical insight for Mistake/Blunder moves.
// Compares played UCI move with engine's best to explain what the player was trying to do.

import { uciToSan } from './san.js';

const UCI_MIN = 4;

export function detectInsight(playedUci, bestUci, bestPv, board, turn) {
  if (!playedUci || !bestUci || playedUci.length < UCI_MIN || bestUci.length < UCI_MIN) return null;

  const playedFrom = playedUci.slice(0, 2);
  const playedTo = playedUci.slice(2, 4);
  const bestFrom = bestUci.slice(0, 2);
  const bestTo = bestUci.slice(2, 4);

  // Same piece, wrong square
  if (playedFrom === bestFrom && playedTo !== bestTo) {
    const bestSan = uciToSan(bestUci, board, turn);
    return `Right piece \u2014 ${bestSan}`;
  }

  // Right square, wrong piece
  if (playedTo === bestTo && playedFrom !== bestFrom) {
    const bestSan = uciToSan(bestUci, board, turn);
    return `Right square \u2014 ${bestSan}`;
  }

  // Right idea, wrong timing: played move appears later in PV (same-side moves at indices 2, 4, 6...)
  if (bestPv && bestPv.length > 2) {
    for (let i = 2; i < bestPv.length; i += 2) {
      if (bestPv[i] === playedUci) {
        const firstSan = uciToSan(bestUci, board, turn);
        return `${firstSan} first, then your idea`;
      }
    }
  }

  return null;
}
