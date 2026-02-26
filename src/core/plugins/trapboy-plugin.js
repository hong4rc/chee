// Trapboy plugin: sacrifice-based trap detection.
// Phase 1: detect sacrifices where our best move leaves a piece hanging.
// Phase 2: verify the "greed line" (opponent captures) leads to a winning position.
// Tracks the trap sequence: if you play the bait, advances to show the next step.

import createDebug from '../../lib/debug.js';
import { parseUci } from '../../lib/uci.js';
import { AnalysisPlugin } from '../plugin.js';
import { applyUciMove } from '../san.js';
import { boardToFen } from '../fen.js';
import { boardDiffToUci } from '../board-diff.js';
import { isSquareAttacked } from '../attacks.js';
import {
  PLUGIN_TRAPBOY, LAST_RANK, BOARD_SIZE,
  TURN_WHITE, toggleTurn,
  WHITE_PAWN, WHITE_KNIGHT, WHITE_BISHOP, WHITE_ROOK, WHITE_QUEEN, WHITE_KING,
  TRAPBOY_MIN_DEPTH, TRAPBOY_GREED_DEPTH,
  TRAPBOY_TRAP_THRESHOLD, TRAPBOY_MIN_SACRIFICE_VALUE,
  TRAPBOY_BAIT_COLOR, TRAPBOY_GREED_COLOR, TRAPBOY_GOD_COLOR,
  TRAPBOY_ARROW_OPACITY, TRAPBOY_GREED_ARROW_OPACITY, TRAPBOY_GOD_ARROW_OPACITY,
  TRAPBOY_GOD_DASH,
} from '../../constants.js';

const log = createDebug('chee:trapboy');

const LAYER_BAIT = 'trapboy-bait';
const LAYER_GREED = 'trapboy-greed';
const LAYER_GOD = 'trapboy-god';

const PIECE_VALUES = {
  [WHITE_PAWN]: 1,
  [WHITE_KNIGHT]: 3,
  [WHITE_BISHOP]: 3,
  [WHITE_ROOK]: 5,
  [WHITE_QUEEN]: 9,
  [WHITE_KING]: 0,
};

function pieceValue(piece) {
  if (!piece) return 0;
  return PIECE_VALUES[piece.toUpperCase()] || 0;
}

function isPathClear(board, ff, fr, tf, tr) {
  const sf = Math.sign(tf - ff);
  const sr = Math.sign(tr - fr);
  let f = ff + sf;
  let r = fr + sr;
  while (f !== tf || r !== tr) {
    if (board[LAST_RANK - r][f] !== null) return false;
    f += sf;
    r += sr;
  }
  return true;
}

function canReach(pieceUpper, ff, fr, tf, tr, board) {
  const adf = Math.abs(tf - ff);
  const adr = Math.abs(tr - fr);
  switch (pieceUpper) {
    case WHITE_PAWN: return adf === 1 && adr === 1; // capture diagonal only
    case WHITE_KNIGHT: return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case WHITE_BISHOP: return adf === adr && adf > 0 && isPathClear(board, ff, fr, tf, tr);
    case WHITE_ROOK: return (tf === ff || tr === fr) && (adf + adr > 0) && isPathClear(board, ff, fr, tf, tr);
    case WHITE_QUEEN:
      return ((adf === adr && adf > 0) || tf === ff || tr === fr)
        && (adf + adr > 0) && isPathClear(board, ff, fr, tf, tr);
    case WHITE_KING: return adf <= 1 && adr <= 1 && (adf + adr > 0);
    default: return false;
  }
}

function toUci(ff, fr, tf, tr) {
  return String.fromCharCode(97 + ff) + (fr + 1) + String.fromCharCode(97 + tf) + (tr + 1);
}

/**
 * Validate a sequence of UCI moves by simulating them on the board.
 * Returns true if every move's source square has a piece present.
 */
function validateMoveSequence(board, moves) {
  let sim = board;
  for (const uci of moves) {
    const { fromFile, fromRank } = parseUci(uci);
    const piece = sim[LAST_RANK - fromRank][fromFile];
    if (!piece) return false;
    sim = applyUciMove(sim, uci);
  }
  return true;
}

export class TrapboyPlugin extends AnalysisPlugin {
  constructor({ settings, coordinator }) {
    super(PLUGIN_TRAPBOY);
    this._settings = settings;
    this._coordinator = coordinator;
    this._phase2Pending = false;
    this._activeFen = null;
    this._trapData = null;
    this._prevBoard = null;
    this._prevPly = null;
  }

  onBoardChange(boardState, renderCtx) {
    const currentPly = boardState.ply ?? null;

    // If we have a trap, check if the played move matches the next step
    if (this._trapData && this._prevBoard && currentPly !== null && this._prevPly !== null) {
      if (currentPly > this._prevPly) {
        const playedUci = boardDiffToUci(this._prevBoard, boardState.board);
        const expectedStep = this._trapData.steps[this._trapData.stepIndex];

        if (playedUci && expectedStep && playedUci === expectedStep.uci) {
          // Move matches — advance step
          this._trapData.stepIndex += 1;
          log('Trap step matched:', playedUci, 'advancing to step', this._trapData.stepIndex);

          this._prevBoard = boardState.board;
          this._prevPly = currentPly;

          // If we've completed all steps, clear the trap
          if (this._trapData.stepIndex >= this._trapData.steps.length) {
            log('Trap sequence complete!');
            this._trapData = null;
            this._phase2Pending = false;
            this._clearAllLayers(renderCtx.arrow);
            renderCtx.panel.clearTrap();
            return;
          }

          // Redraw with updated step index
          const isFlipped = renderCtx.isFlipped();
          this._drawTrap(renderCtx.arrow, isFlipped);
          renderCtx.panel.showTrap(this._trapData.steps, this._trapData.stepIndex, this._trapData.godUci);
          return;
        }
      }

      if (currentPly < this._prevPly) {
        // Backward navigation — revert stepIndex if still within trap range
        const stepsBack = this._prevPly - currentPly;
        const newIndex = this._trapData.stepIndex - stepsBack;
        if (newIndex >= 0) {
          this._trapData.stepIndex = newIndex;
          log('Trap step reverted to', newIndex);
          this._prevBoard = boardState.board;
          this._prevPly = currentPly;
          const isFlipped = renderCtx.isFlipped();
          this._drawTrap(renderCtx.arrow, isFlipped);
          renderCtx.panel.showTrap(this._trapData.steps, this._trapData.stepIndex, this._trapData.godUci);
          return;
        }
      }

      // Deviated move or navigated before trap start — clear trap
      log('Trap cleared: move deviation or navigation before trap start');
    }

    this._phase2Pending = false;
    this._trapData = null;
    this._prevBoard = boardState.board;
    this._prevPly = currentPly;
    this._clearAllLayers(renderCtx.arrow);
    renderCtx.panel.clearTrap();
  }

  onEval(data, boardState, renderCtx) {
    if (!this._settings.showTrapboy) return;

    // Don't re-run detection if we're mid-trap tracking or verifying
    if (this._trapData) return;
    if (this._phase2Pending) return;

    // Scan as soon as depth is sufficient — don't wait for engine to complete
    if (data.depth < TRAPBOY_MIN_DEPTH) {
      renderCtx.panel.showTrapStatus('Searching...');
      return;
    }
    if (!data.lines || data.lines.length === 0) return;

    const { board, turn } = boardState;
    if (!board || !turn) return;

    this._activeFen = boardState.fen;

    for (let i = 0; i < data.lines.length; i++) {
      const line = data.lines[i];
      if (!line.pv || line.pv.length < 2) continue;

      const sacrificeUci = line.pv[0];
      const godModeUci = line.pv[1]; // opponent's best (non-greedy) response

      // Apply our sacrifice move
      const boardAfter = applyUciMove(board, sacrificeUci);
      const { toFile, toRank } = parseUci(sacrificeUci);
      const sacrificedPiece = boardAfter[LAST_RANK - toRank][toFile];

      // Is the destination square attacked by opponent?
      const opponentColor = toggleTurn(turn);
      if (!isSquareAttacked(boardAfter, toFile, toRank, opponentColor)) continue;

      // Check minimum material value of the hanging piece
      if (pieceValue(sacrificedPiece) < TRAPBOY_MIN_SACRIFICE_VALUE) continue;

      // Find the greedy capture — lowest-value attacker captures our piece
      const greedResult = this._findGreedyCapture(boardAfter, toFile, toRank, opponentColor);
      if (!greedResult) continue;

      // Capture must be tempting: bait worth >= capturer (no human trades knight for pawn)
      const baitValue = pieceValue(sacrificedPiece);
      if (baitValue < greedResult.value) continue;

      const greedyCapture = greedResult.uci;

      // If god-mode IS the greedy capture, it's not a trap
      if (godModeUci === greedyCapture) continue;

      log('Sacrifice detected:', sacrificeUci, 'greedy capture:', greedyCapture, 'god-mode:', godModeUci);

      // Build FEN for position after: sacrifice + greedy capture
      const boardAfterGreed = applyUciMove(boardAfter, greedyCapture);
      const greedFen = boardToFen(boardAfterGreed, turn, '-', '-', 1);

      this._phase2Pending = true;
      renderCtx.panel.showTrapStatus('Verifying...');
      const capturedFen = this._activeFen;
      this._coordinator.requestSecondaryAnalysis(
        greedFen,
        TRAPBOY_GREED_DEPTH,
        (evalData) => this._onGreedEval(evalData, {
          sacrificeUci, greedyCapture, godModeUci, capturedFen, board,
        }, renderCtx),
      );
      return; // only process first qualifying line
    }

    // No sacrifice found in any line
    renderCtx.panel.showTrapStatus('No trap');
  }

  _onGreedEval(data, trapInfo, renderCtx) {
    if (!this._phase2Pending) return;
    if (this._activeFen !== trapInfo.capturedFen) {
      this._phase2Pending = false;
      return;
    }
    if (!data.complete && data.depth < TRAPBOY_GREED_DEPTH) return;

    this._phase2Pending = false;

    if (!data.lines || data.lines.length === 0) {
      renderCtx.panel.showTrapStatus('No trap');
      return;
    }
    const line1 = data.lines[0];

    // We're the side to move after the greed capture — check if we're winning big
    let { score } = line1;
    if (line1.mate !== null) {
      score = line1.mate > 0 ? 10000 : -10000;
    }
    if (score < TRAPBOY_TRAP_THRESHOLD) {
      log('Greed line score', score, '< threshold', TRAPBOY_TRAP_THRESHOLD, '— not a trap');
      renderCtx.panel.showTrapStatus('No trap');
      return;
    }

    // Collect greed line continuation moves (our punishing moves)
    const greedMoves = line1.pv ? line1.pv.slice(0, 3) : [];

    // Punishment must not be a simple recapture on the bait square — that's obvious
    if (greedMoves.length > 0) {
      const baitDest = parseUci(trapInfo.sacrificeUci);
      const punishDest = parseUci(greedMoves[0]);
      if (punishDest.toFile === baitDest.toFile && punishDest.toRank === baitDest.toRank) {
        log('Punishment is a recapture on bait square — too obvious');
        renderCtx.panel.showTrapStatus('No trap');
        return;
      }
    }

    // Build the full step sequence: bait, greed capture, then punish moves
    const steps = [
      { uci: trapInfo.sacrificeUci, label: 'Bait' },
      { uci: trapInfo.greedyCapture, label: 'Greed' },
      ...greedMoves.map((uci, idx) => ({ uci, label: idx === 0 ? 'Punish' : `Punish ${idx + 1}` })),
    ];

    // Validate the full move sequence on the original board
    const allMoves = steps.map((s) => s.uci);
    if (!validateMoveSequence(trapInfo.board, allMoves)) {
      log('Trap validation failed — invalid move in sequence');
      renderCtx.panel.showTrapStatus('No trap');
      return;
    }

    log('TRAP CONFIRMED! Score:', score, 'steps:', steps.map((s) => `${s.label}:${s.uci}`).join(' '));

    this._trapData = {
      steps,
      stepIndex: 0,
      godUci: trapInfo.godModeUci,
      startPly: this._prevPly,
    };

    const isFlipped = renderCtx.isFlipped();
    this._drawTrap(renderCtx.arrow, isFlipped);
    renderCtx.panel.showTrap(this._trapData.steps, this._trapData.stepIndex, this._trapData.godUci);
  }

  _drawTrap(arrow, isFlipped) {
    if (!this._trapData) return;
    const { steps, stepIndex, godUci } = this._trapData;

    // Collect remaining moves by type
    const remaining = steps.slice(stepIndex);
    const baitMoves = remaining.filter((s) => s.label === 'Bait').map((s) => s.uci);
    const punishMoves = remaining.filter((s) => s.label !== 'Bait' && s.label !== 'Greed').map((s) => s.uci);

    // Bait arrow (magenta) — only if bait hasn't been played yet
    if (baitMoves.length > 0) {
      arrow.drawLayer(LAYER_BAIT, baitMoves, isFlipped, {
        color: TRAPBOY_BAIT_COLOR,
        opacity: TRAPBOY_ARROW_OPACITY,
      });
    } else {
      arrow.clearLayer(LAYER_BAIT);
    }

    // Greed/Punish line arrows (red) — our punishing continuation
    if (punishMoves.length > 0) {
      arrow.drawLayer(LAYER_GREED, punishMoves, isFlipped, {
        color: TRAPBOY_GREED_COLOR,
        opacity: TRAPBOY_GREED_ARROW_OPACITY,
      });
    } else {
      arrow.clearLayer(LAYER_GREED);
    }

    // God-mode arrow (green dashed) — opponent's only safe response (only before bait is played)
    if (stepIndex === 0) {
      arrow.drawLayer(LAYER_GOD, [godUci], isFlipped, {
        color: TRAPBOY_GOD_COLOR,
        opacity: TRAPBOY_GOD_ARROW_OPACITY,
        dashArray: TRAPBOY_GOD_DASH,
      });
    } else {
      arrow.clearLayer(LAYER_GOD);
    }
  }

  _findGreedyCapture(board, targetFile, targetRank, byColor) {
    const isWhite = byColor === TURN_WHITE;
    let bestCapture = null;
    let bestValue = Infinity;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let f = 0; f < BOARD_SIZE; f++) {
        const p = board[LAST_RANK - r][f];
        if (!p) continue;
        const pIsWhite = p === p.toUpperCase();
        if (pIsWhite !== isWhite) continue;
        const pu = p.toUpperCase();
        if (!canReach(pu, f, r, targetFile, targetRank, board)) continue;

        // Pawn direction check: pawns can only capture forward
        if (pu === WHITE_PAWN) {
          const dir = isWhite ? 1 : -1;
          if (targetRank - r !== dir) continue;
        }

        const val = pieceValue(p);
        if (val < bestValue) {
          bestValue = val;
          bestCapture = toUci(f, r, targetFile, targetRank);
        }
      }
    }

    if (!bestCapture) return null;
    return { uci: bestCapture, value: bestValue };
  }

  _clearAllLayers(arrow) {
    arrow.clearLayer(LAYER_BAIT);
    arrow.clearLayer(LAYER_GREED);
    arrow.clearLayer(LAYER_GOD);
  }

  getPersistentLayer(getRenderCtx) {
    return {
      clear: () => {
        const { arrow } = getRenderCtx();
        this._clearAllLayers(arrow);
      },
      restore: () => {
        if (!this._trapData) return;
        const { arrow, isFlipped } = getRenderCtx();
        this._drawTrap(arrow, isFlipped());
      },
    };
  }

  onSettingsChange(settings) {
    if ('showTrapboy' in settings && !settings.showTrapboy) {
      this._trapData = null;
      this._phase2Pending = false;
    }
  }

  destroy() {
    this._phase2Pending = false;
    this._trapData = null;
    this._activeFen = null;
    this._prevBoard = null;
    this._prevPly = null;
  }
}
