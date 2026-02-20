// Hint plugin: manages pre-move hint arrows (classification-based and best-move).
// Owns _currentHint state, exposed via getter for line-leave restoration.

import { find } from 'lodash-es';
import { AnalysisPlugin } from '../plugin.js';
import {
  PLUGIN_HINT, TURN_WHITE,
  HINT_MIN_DEPTH, HINT_ARROW_OPACITY, HINT_THRESHOLDS,
  CLASSIFICATION_MATE_LOSS,
  ARROW_COLOR_WHITE, ARROW_COLOR_BLACK,
} from '../../constants.js';

export class HintPlugin extends AnalysisPlugin {
  constructor({ settings }) {
    super(PLUGIN_HINT);
    this._settings = settings;
    this._currentHint = null;
  }

  get currentHint() {
    return this._currentHint;
  }

  onBoardChange(boardState, renderCtx) {
    renderCtx.arrow.clearHint();
    this._currentHint = null;
  }

  onEval(data, boardState, renderCtx) {
    renderCtx.arrow.clearHint();
    this._currentHint = null;

    if (!data.lines || data.lines.length === 0) return;
    const line1 = data.lines[0];
    const bestUci = line1.pv && line1.pv[0];
    if (!bestUci) return;

    // Classification-based hint (requires spread threshold)
    if (this._settings.showClassifications && data.lines.length >= 2 && data.depth >= HINT_MIN_DEPTH) {
      const line2 = data.lines[1];
      let spread;
      if (line1.mate !== null && line2.mate === null) {
        spread = CLASSIFICATION_MATE_LOSS;
      } else if (line1.mate === null && line2.mate === null) {
        spread = line1.score - line2.score;
      } else {
        spread = 0;
      }

      const tier = find(HINT_THRESHOLDS, (t) => spread >= t.min);
      if (tier) {
        this._currentHint = { uci: bestUci, color: tier.color, symbol: tier.symbol };
        renderCtx.arrow.drawHint(bestUci, renderCtx.isFlipped(), tier.color, tier.symbol, HINT_ARROW_OPACITY);
        return;
      }
    }

    // Always-on best move arrow (no badge, team color)
    if (this._settings.showBestMove) {
      const { turn } = renderCtx.panel;
      const color = turn === TURN_WHITE ? ARROW_COLOR_WHITE : ARROW_COLOR_BLACK;
      this._currentHint = { uci: bestUci, color, symbol: null };
      renderCtx.arrow.drawHint(bestUci, renderCtx.isFlipped(), color, null, HINT_ARROW_OPACITY);
    }
  }

  destroy() {
    this._currentHint = null;
  }
}
