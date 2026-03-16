// Trapboy plugin: trap detection via three methods:
// 1. Sacrifice detection: engine PV leaves a piece hanging → opponent captures → punish.
// 2. Tempting capture detection: opponent has a "free" piece the engine rejects taking →
//    verify the capture leads to a losing position (humans take free pieces, engines don't).
// 3. Opening trap database: known named traps matched by FEN position.
// Tracks the trap sequence: if you play the bait, advances to show the next step.

import createDebug from '../../lib/debug.js';
import { el } from '../../lib/dom.js';
import { parseUci } from '../../lib/uci.js';
import { AnalysisPlugin } from '../plugin.js';
import { applyUciMove } from '../san.js';
import { boardToFen } from '../fen.js';
import { boardDiffToUci } from '../board-diff.js';
import { isSquareAttacked } from '../attacks.js';
import { lookupOpeningTrap } from '../opening-traps.js';
import {
  PLUGIN_TRAPBOY, LAST_RANK, BOARD_SIZE,
  TURN_WHITE, toggleTurn,
  WHITE_PAWN, WHITE_KNIGHT, WHITE_BISHOP, WHITE_ROOK, WHITE_QUEEN, WHITE_KING,
  TRAPBOY_MIN_DEPTH, TRAPBOY_GREED_DEPTH,
  TRAPBOY_TRAP_THRESHOLD, TRAPBOY_MIN_SACRIFICE_VALUE, TRAPBOY_MAX_DEFENDERS,
  TRAPBOY_BAIT_COLOR, TRAPBOY_GREED_COLOR, TRAPBOY_GOD_COLOR,
  TRAPBOY_ARROW_OPACITY, TRAPBOY_GREED_ARROW_OPACITY, TRAPBOY_GOD_ARROW_OPACITY,
  TRAPBOY_GOD_DASH, TRAPBOY_OPPONENT_COLOR, TRAPBOY_OPPONENT_OPACITY, TRAPBOY_OPPONENT_DASH,
} from '../../constants.js';

const log = createDebug('chee:trapboy');

const LAYER_BAIT = 'trapboy-bait';
const LAYER_GREED = 'trapboy-greed';
const LAYER_GOD = 'trapboy-god';
const LAYER_OPPONENT = 'trapboy-opponent';

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

/**
 * Count how many pieces of the given color defend (can reach) a target square.
 * Uses the same canReach logic as _findGreedyCapture.
 */
function countDefenders(board, targetFile, targetRank, byColor) {
  const isWhite = byColor === TURN_WHITE;
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let f = 0; f < BOARD_SIZE; f++) {
      const p = board[LAST_RANK - r][f];
      if (!p) continue;
      const pIsWhite = p === p.toUpperCase();
      if (pIsWhite !== isWhite) continue;
      if (f === targetFile && r === targetRank) continue; // skip the bait piece itself
      const pu = p.toUpperCase();
      if (!canReach(pu, f, r, targetFile, targetRank, board)) continue;
      if (pu === WHITE_PAWN) {
        const dir = isWhite ? 1 : -1;
        if (targetRank - r !== dir) continue;
      }
      count++;
    }
  }
  return count;
}

/**
 * Find tempting captures available to the side to move.
 * A capture is "tempting" if the target value >= capturer value (free piece / winning material).
 * Returns array sorted by target value descending (most tempting first).
 */
function findTemptingCaptures(board, turn) {
  const isWhite = turn === TURN_WHITE;
  const captures = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let f = 0; f < BOARD_SIZE; f++) {
      const target = board[LAST_RANK - r][f];
      if (!target) continue;

      // Target must be opponent's piece
      const targetIsWhite = target === target.toUpperCase();
      if (targetIsWhite === isWhite) continue;

      const targetValue = pieceValue(target);
      if (targetValue < TRAPBOY_MIN_SACRIFICE_VALUE) continue;

      // Find lowest-value attacker of our color that can reach this square
      let bestUci = null;
      let bestValue = Infinity;

      for (let ar = 0; ar < BOARD_SIZE; ar++) {
        for (let af = 0; af < BOARD_SIZE; af++) {
          const a = board[LAST_RANK - ar][af];
          if (!a) continue;
          const aIsWhite = a === a.toUpperCase();
          if (aIsWhite !== isWhite) continue;
          const au = a.toUpperCase();
          if (!canReach(au, af, ar, f, r, board)) continue;
          if (au === WHITE_PAWN) {
            const dir = isWhite ? 1 : -1;
            if (r - ar !== dir) continue;
          }
          const val = pieceValue(a);
          if (val < bestValue) {
            bestValue = val;
            bestUci = toUci(af, ar, f, r);
          }
        }
      }

      if (!bestUci) continue;

      // Tempting: target value >= capturer value (free piece or winning trade)
      if (targetValue < bestValue) continue;

      captures.push({
        targetFile: f,
        targetRank: r,
        captureUci: bestUci,
        capturedValue: targetValue,
      });
    }
  }

  captures.sort((a, b) => b.capturedValue - a.capturedValue);
  return captures;
}

export class TrapboyPlugin extends AnalysisPlugin {
  constructor({ settings }) {
    super(PLUGIN_TRAPBOY);
    this._settings = settings;
    this._requestSecondaryAnalysis = null;
    this._phase2Pending = false;
    this._activeFen = null;
    this._trapData = null;
    this._prevBoard = null;
    this._prevPly = null;
  }

  setup({
    requestSecondaryAnalysis, getRenderCtx, adapter, boardState,
  }) {
    this._requestSecondaryAnalysis = requestSecondaryAnalysis;
    this._getRenderCtx = getRenderCtx;
    this._adapter = adapter;
    this._boardStateRef = boardState;
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
            this._clearTrapPanel(renderCtx.panel);
            return;
          }

          // Redraw with updated step index
          const isFlipped = renderCtx.isFlipped();
          this._drawTrap(renderCtx.arrow, isFlipped);
          this._showTrapPanel(renderCtx.panel, this._trapData.steps, this._trapData.stepIndex, this._trapData.godUci);
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
          this._showTrapPanel(renderCtx.panel, this._trapData.steps, this._trapData.stepIndex, this._trapData.godUci);
          return;
        }
      }

      // Deviated move or navigated before trap start — clear trap
      log('Trap cleared: move deviation or navigation before trap start');
    }

    this._phase2Pending = false;
    this._trapData = null;
    this._clearAllLayers(renderCtx.arrow);
    this._clearTrapPanel(renderCtx.panel);

    // Check opening trap database for known trap patterns
    if (this._settings.showTrapboy && boardState.fen) {
      const openingTrap = lookupOpeningTrap(boardState.fen);
      if (openingTrap) {
        this._trapData = {
          steps: openingTrap.steps,
          stepIndex: 0,
          godUci: openingTrap.godUci,
          startPly: currentPly,
          name: openingTrap.name,
        };
        log('Opening trap detected:', openingTrap.name);
        const isFlipped = renderCtx.isFlipped();
        this._drawTrap(renderCtx.arrow, isFlipped);
        this._showTrapPanel(
          renderCtx.panel,
          this._trapData.steps,
          this._trapData.stepIndex,
          this._trapData.godUci,
        );
      }
    }

    this._prevBoard = boardState.board;
    this._prevPly = currentPly;
  }

  onEval(data, boardState, renderCtx) {
    if (!this._settings.showTrapboy) return;

    // Don't re-run detection if we're mid-trap tracking or verifying
    if (this._trapData) return;
    if (this._phase2Pending) return;

    // Scan as soon as depth is sufficient — don't wait for engine to complete
    if (data.depth < TRAPBOY_MIN_DEPTH) {
      this._showTrapStatus(renderCtx.panel, 'Searching...');
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

      // If the bait square is over-defended, humans won't take — it looks suspicious
      const defenders = countDefenders(boardAfter, toFile, toRank, turn);
      if (defenders > TRAPBOY_MAX_DEFENDERS) continue;

      log(
        'Sacrifice detected:',
        sacrificeUci,
        'greedy capture:',
        greedyCapture,
        'god-mode:',
        godModeUci,
        'defenders:',
        defenders,
      );

      // Build FEN for position after: sacrifice + greedy capture
      const boardAfterGreed = applyUciMove(boardAfter, greedyCapture);
      const greedFen = boardToFen(boardAfterGreed, turn, '-', '-', 1);

      this._phase2Pending = true;
      this._showTrapStatus(renderCtx.panel, 'Verifying...');
      const capturedFen = this._activeFen;
      this._requestSecondaryAnalysis(
        greedFen,
        TRAPBOY_GREED_DEPTH,
        (evalData) => this._onGreedEval(evalData, {
          sacrificeUci, greedyCapture, godModeUci, capturedFen, board,
        }, renderCtx),
      );
      return; // only process first qualifying line
    }

    // Phase 1b: Check for tempting captures the engine rejects.
    // Humans take "free" pieces — if a hanging piece is a trap, detect it.
    const temptingCaptures = findTemptingCaptures(board, turn);
    for (const target of temptingCaptures) {
      // Skip if engine recommends this capture (it's a good move, not a trap)
      if (data.lines.some((l) => l.pv && l.pv[0] === target.captureUci)) continue;

      const boardAfterCapture = applyUciMove(board, target.captureUci);
      const captureFen = boardToFen(boardAfterCapture, toggleTurn(turn), '-', '-', 1);

      this._phase2Pending = true;
      this._showTrapStatus(renderCtx.panel, 'Verifying...');
      const capturedFen = this._activeFen;
      const godModeUci = data.lines[0]?.pv?.[0] || null;

      this._requestSecondaryAnalysis(
        captureFen,
        TRAPBOY_GREED_DEPTH,
        (evalData) => this._onTemptingCaptureEval(evalData, {
          captureUci: target.captureUci,
          targetFile: target.targetFile,
          targetRank: target.targetRank,
          godModeUci,
          capturedFen,
          board,
        }, renderCtx),
      );
      return; // only check first qualifying tempting capture
    }

    // No trap found by any method
    this._clearTrapPanel(renderCtx.panel);
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
      this._clearTrapPanel(renderCtx.panel);
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
      this._clearTrapPanel(renderCtx.panel);
      return;
    }

    // Collect greed line continuation moves (our punishing moves)
    const greedMoves = line1.pv ? line1.pv.slice(0, 3) : [];

    // Punishment must not be a simple recapture on the bait square — that's obvious.
    // Check the first 2 punishment moves (not just the first) to catch multi-step take-backs.
    if (greedMoves.length > 0) {
      const baitDest = parseUci(trapInfo.sacrificeUci);
      const movesToCheck = Math.min(greedMoves.length, 2);
      for (let mi = 0; mi < movesToCheck; mi++) {
        const punishDest = parseUci(greedMoves[mi]);
        if (punishDest.toFile === baitDest.toFile && punishDest.toRank === baitDest.toRank) {
          log('Punishment move', mi, 'recaptures on bait square — too obvious');
          this._clearTrapPanel(renderCtx.panel);
          return;
        }
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
      this._clearTrapPanel(renderCtx.panel);
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
    this._showTrapPanel(renderCtx.panel, this._trapData.steps, this._trapData.stepIndex, this._trapData.godUci);
  }

  _onTemptingCaptureEval(data, trapInfo, renderCtx) {
    if (!this._phase2Pending) return;
    if (this._activeFen !== trapInfo.capturedFen) {
      this._phase2Pending = false;
      return;
    }
    if (!data.complete && data.depth < TRAPBOY_GREED_DEPTH) return;

    this._phase2Pending = false;

    if (!data.lines || data.lines.length === 0) {
      this._clearTrapPanel(renderCtx.panel);
      return;
    }
    const line1 = data.lines[0];

    // After the tempting capture, the OTHER side moves — check if they're winning
    let { score } = line1;
    if (line1.mate !== null) {
      score = line1.mate > 0 ? 10000 : -10000;
    }
    if (score < TRAPBOY_TRAP_THRESHOLD) {
      log('Tempting capture score', score, '< threshold — not a trap');
      this._clearTrapPanel(renderCtx.panel);
      return;
    }

    const punishMoves = line1.pv ? line1.pv.slice(0, 3) : [];

    // Recapture filter: if punishment just takes back on the captured square, not a trap
    if (punishMoves.length > 0) {
      const movesToCheck = Math.min(punishMoves.length, 2);
      for (let mi = 0; mi < movesToCheck; mi++) {
        const dest = parseUci(punishMoves[mi]);
        if (dest.toFile === trapInfo.targetFile && dest.toRank === trapInfo.targetRank) {
          log('Punishment recaptures on target square — not a trap');
          this._clearTrapPanel(renderCtx.panel);
          return;
        }
      }
    }

    // Build steps: tempting capture (Greed) + punishment moves
    const steps = [
      { uci: trapInfo.captureUci, label: 'Greed' },
      ...punishMoves.map((uci, idx) => ({ uci, label: idx === 0 ? 'Punish' : `Punish ${idx + 1}` })),
    ];

    const allMoves = steps.map((s) => s.uci);
    if (!validateMoveSequence(trapInfo.board, allMoves)) {
      log('Tempting capture trap validation failed');
      this._clearTrapPanel(renderCtx.panel);
      return;
    }

    log('TEMPTING CAPTURE TRAP! Steps:', steps.map((s) => `${s.label}:${s.uci}`).join(' '));

    this._trapData = {
      steps,
      stepIndex: 0,
      godUci: trapInfo.godModeUci,
      startPly: this._prevPly,
    };

    const isFlipped = renderCtx.isFlipped();
    this._drawTrap(renderCtx.arrow, isFlipped);
    this._showTrapPanel(
      renderCtx.panel,
      this._trapData.steps,
      this._trapData.stepIndex,
      this._trapData.godUci,
    );
  }

  _showTrapPanel(panel, steps, stepIndex, godUci) {
    const wrap = el('div', 'chee-trapboy');
    const titleText = this._trapData?.name || 'TRAP';
    const title = el('span', 'chee-trapboy-title', titleText);
    wrap.appendChild(title);

    for (let i = 0; i < steps.length; i++) {
      const { uci, label } = steps[i];
      const readable = uci && uci.length >= 4 ? `${uci.slice(0, 2)}-${uci.slice(2, 4)}` : uci;
      let cls = 'chee-trapboy-greed';
      if (label === 'Bait') cls = 'chee-trapboy-bait';
      const span = el('span', cls, `${label} ${readable}`);
      if (i < stepIndex) span.classList.add('chee-trapboy-done');
      if (i === stepIndex) span.classList.add('chee-trapboy-active');

      // Board preview on hover for future steps (not yet played)
      if (i >= stepIndex) {
        span.classList.add('chee-trapboy-hoverable');
        const movesToApply = steps.slice(stepIndex, i + 1).map((s) => s.uci);
        span.addEventListener('mouseenter', () => this._showStepPreview(movesToApply));
      }

      wrap.appendChild(span);
    }

    if (godUci) {
      const godReadable = godUci.length >= 4 ? `${godUci.slice(0, 2)}-${godUci.slice(2, 4)}` : godUci;
      const godSpan = el('span', 'chee-trapboy-god chee-trapboy-hoverable', `Escape ${godReadable}`);

      // Escape preview: bait (if not played) + god-mode response
      const baitMoves = stepIndex === 0 ? [steps[0].uci] : [];
      const godMoves = [...baitMoves, godUci];
      godSpan.addEventListener('mouseenter', () => this._showStepPreview(godMoves));

      wrap.appendChild(godSpan);
    }

    // Clear preview only when mouse leaves the entire trap panel, not between spans
    wrap.addEventListener('mouseleave', () => this._clearStepPreview());

    panel.setSlot('trapboy', wrap);
  }

  _showStepPreview(uciMoves) {
    if (!this._getRenderCtx) return;
    const ctx = this._getRenderCtx();
    if (!ctx.boardPreview) return;
    const board = this._prevBoard || this._boardStateRef?.board;
    if (!board) return;
    ctx.boardPreview.show(
      board,
      uciMoves,
      ctx.isFlipped(),
      this._adapter,
    );
  }

  _clearStepPreview() {
    if (!this._getRenderCtx) return;
    const ctx = this._getRenderCtx();
    if (ctx.boardPreview) ctx.boardPreview.clear();
  }

  _showTrapStatus(panel, text) {
    panel.setSlot('trapboy', el('div', 'chee-trapboy chee-trapboy-status', text));
  }

  _clearTrapPanel(panel) {
    panel.clearSlot('trapboy');
  }

  _drawTrap(arrow, isFlipped) {
    if (!this._trapData) return;
    const { steps, stepIndex, godUci } = this._trapData;

    // Collect remaining moves by type
    const remaining = steps.slice(stepIndex);
    const baitMoves = remaining.filter((s) => s.label === 'Bait').map((s) => s.uci);
    const punishMoves = remaining.filter((s) => s.label !== 'Bait' && s.label !== 'Greed').map((s) => s.uci);
    const opponentMoves = remaining.filter((s) => s.label === 'Greed').map((s) => s.uci);

    // Bait arrow (magenta) — only if bait hasn't been played yet
    if (baitMoves.length > 0) {
      arrow.drawLayer(LAYER_BAIT, baitMoves, isFlipped, {
        color: TRAPBOY_BAIT_COLOR,
        opacity: TRAPBOY_ARROW_OPACITY,
      });
    } else {
      arrow.clearLayer(LAYER_BAIT);
    }

    // Punish arrows (red) — our punishing continuation
    if (punishMoves.length > 0) {
      arrow.drawLayer(LAYER_GREED, punishMoves, isFlipped, {
        color: TRAPBOY_GREED_COLOR,
        opacity: TRAPBOY_GREED_ARROW_OPACITY,
      });
    } else {
      arrow.clearLayer(LAYER_GREED);
    }

    // Opponent arrows (amber dashed) — expected opponent responses
    if (opponentMoves.length > 0) {
      arrow.drawLayer(LAYER_OPPONENT, opponentMoves, isFlipped, {
        color: TRAPBOY_OPPONENT_COLOR,
        opacity: TRAPBOY_OPPONENT_OPACITY,
        dashArray: TRAPBOY_OPPONENT_DASH,
      });
    } else {
      arrow.clearLayer(LAYER_OPPONENT);
    }

    // God-mode arrow (green dashed) — opponent's only safe response (only before bait is played)
    if (stepIndex === 0 && godUci) {
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
    arrow.clearLayer(LAYER_OPPONENT);
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
