// Guard plugin: on mousedown, runs shallow search on all moves from the picked-up piece.
// Marks destination squares with ⚠️ if the move loses more than GUARD_CP_THRESHOLD centipawns.

import createDebug from '../../lib/debug.js';
import { AnalysisPlugin } from '../plugin.js';
import { parseUci } from '../../lib/uci.js';
import { generateMovesFromSquare } from '../san.js';
import {
  PLUGIN_GUARD, LAST_RANK, TURN_WHITE,
  GUARD_DEPTH, GUARD_CP_THRESHOLD,
} from '../../constants.js';

const log = createDebug('chee:guard');

export class GuardPlugin extends AnalysisPlugin {
  constructor({ settings } = {}) {
    super(PLUGIN_GUARD);
    this._settings = settings || {};
    this._latestEval = null;
    this._requestSecondaryAnalysis = null;
    this._cancelSecondaryAnalysis = null;
    this._boardStateRef = null;
    this._pendingSquare = null;
  }

  setup({ requestSecondaryAnalysis, cancelSecondaryAnalysis, boardState }) {
    this._requestSecondaryAnalysis = requestSecondaryAnalysis;
    this._cancelSecondaryAnalysis = cancelSecondaryAnalysis;
    this._boardStateRef = boardState;
  }

  onBoardChange(boardState, renderCtx) {
    this._clearAll(renderCtx.arrow);
    this._pendingSquare = null;
  }

  onEval(data) {
    if (data.lines && data.lines.length > 0) {
      const top = data.lines[0];
      this._latestEval = {
        score: top.mate !== null ? Math.sign(top.mate) * 10000 : top.score,
      };
    }
  }

  onSettingsChange(settings, renderCtx) {
    if ('showGuard' in settings && !settings.showGuard) {
      this._clearAll(renderCtx.arrow);
      this._pendingSquare = null;
    }
  }

  onBoardMouseDown(sq, board, turn, renderCtx) {
    this._clearAll(renderCtx.arrow);
    this._pendingSquare = null;
    if (!this._settings.showGuard) return;
    if (!this._latestEval || !this._requestSecondaryAnalysis) return;

    const piece = board[LAST_RANK - sq.rank][sq.file];
    if (!piece) return;
    const isWhite = piece === piece.toUpperCase();
    if ((turn === TURN_WHITE) !== isWhite) return;

    const moves = generateMovesFromSquare(board, sq.file, sq.rank, turn);
    if (moves.length === 0) return;

    this._pendingSquare = { file: sq.file, rank: sq.rank };
    const bestScore = this._latestEval.score;
    const fen = this._boardStateRef?.fen;
    if (!fen) return;

    log.info(`guard check: ${piece} at ${sq.file},${sq.rank} — ${moves.length} moves`);

    this._requestSecondaryAnalysis(
      fen,
      GUARD_DEPTH,
      (data) => {
        if (!this._pendingSquare) return;
        if (!data.complete && data.depth < GUARD_DEPTH) return;
        this._pendingSquare = null;
        this._evaluateGuardResults(data, bestScore, turn, moves, renderCtx);
      },
      moves,
    );
  }

  onBoardMouseUp(renderCtx) {
    this._clearAll(renderCtx.arrow);
    if (this._pendingSquare && this._cancelSecondaryAnalysis) {
      this._cancelSecondaryAnalysis();
    }
    this._pendingSquare = null;
  }

  _evaluateGuardResults(data, bestScore, turn, allMoves, renderCtx) {
    if (!data.lines || data.lines.length === 0) return;
    const badSquares = [];
    const flip = turn === TURN_WHITE ? 1 : -1;
    const evaluatedMoves = new Set();

    for (const line of data.lines) {
      if (!line.pv || line.pv.length === 0) continue;
      evaluatedMoves.add(line.pv[0]);
      const moveScore = line.mate !== null
        ? Math.sign(line.mate) * 10000
        : line.score;
      // cp loss from the perspective of the side to move
      const cpLoss = (bestScore - moveScore) * flip;
      if (cpLoss > GUARD_CP_THRESHOLD) {
        const { toFile, toRank } = parseUci(line.pv[0]);
        badSquares.push({ file: toFile, rank: toRank });
        log(`bad move: ${line.pv[0]} cpLoss:${cpLoss}`);
      }
    }

    // Moves not in results are worse than the worst evaluated — mark as bad
    for (const uci of allMoves) {
      if (!evaluatedMoves.has(uci)) {
        const { toFile, toRank } = parseUci(uci);
        badSquares.push({ file: toFile, rank: toRank });
        log(`bad move (unevaluated): ${uci}`);
      }
    }

    if (badSquares.length > 0) {
      renderCtx.arrow.drawGuardBadges(badSquares, renderCtx.isFlipped());
    }
  }

  _clearAll(arrow) {
    arrow.clearGuard();
    arrow.clearGuardBadges();
  }

  onEngineReset() {
    this._latestEval = null;
    this._pendingSquare = null;
  }

  destroy() {
    this._latestEval = null;
    this._pendingSquare = null;
  }
}
