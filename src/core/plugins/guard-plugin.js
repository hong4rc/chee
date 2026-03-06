// Guard plugin: warns when a clicked piece is not in any engine top line.
// Self-contained — handles mouse events via onBoardMouseDown/onBoardMouseUp hooks.

import { AnalysisPlugin } from '../plugin.js';
import { parseUci } from '../../lib/uci.js';
import { PLUGIN_GUARD, LAST_RANK, TURN_WHITE } from '../../constants.js';

export class GuardPlugin extends AnalysisPlugin {
  constructor({ settings } = {}) {
    super(PLUGIN_GUARD);
    this._settings = settings || {};
    this._latestLines = null;
  }

  onBoardChange(boardState, renderCtx) {
    renderCtx.arrow.clearGuard();
  }

  onEval(data) {
    if (data.lines) this._latestLines = data.lines;
  }

  onSettingsChange(settings) {
    this._settings = settings;
  }

  onBoardMouseDown(sq, board, turn, renderCtx) {
    renderCtx.arrow.clearGuard();
    if (this.checkSquare(sq.file, sq.rank, board, turn)) {
      renderCtx.arrow.drawGuard(sq.file, sq.rank, renderCtx.isFlipped());
    }
  }

  onBoardMouseUp(renderCtx) {
    renderCtx.arrow.clearGuard();
  }

  // Returns true if the square should show a warning (piece not in any engine line).
  checkSquare(file, rank, board, turn) {
    if (!this._settings.showGuard) return false;
    // board is row-major: board[LAST_RANK - rank][file]
    const piece = board[LAST_RANK - rank][file];
    if (!piece) return false;

    // Only warn for the side to move
    const isWhitePiece = piece === piece.toUpperCase();
    if ((turn === TURN_WHITE) !== isWhitePiece) return false;

    if (!this._latestLines || this._latestLines.length === 0) return false;

    for (let i = 0; i < this._latestLines.length; i++) {
      const line = this._latestLines[i];
      if (!line.pv || line.pv.length === 0) continue;
      const { fromFile, fromRank } = parseUci(line.pv[0]);
      if (fromFile === file && fromRank === rank) return false;
    }

    return true;
  }

  onEngineReset() {
    this._latestLines = null;
  }

  destroy() {
    this._latestLines = null;
  }
}
