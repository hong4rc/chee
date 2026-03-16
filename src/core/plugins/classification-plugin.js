// Classification plugin: wraps MoveClassifier, wires classifier events to panel/arrow.
// Self-contained — no coordinator-side wiring needed.

import { AnalysisPlugin } from '../plugin.js';
import { MoveClassifier } from '../move-classifier.js';
import {
  PLUGIN_CLASSIFICATION,
  EVT_CLASSIFY_SHOW, EVT_CLASSIFY_CLEAR, EVT_CLASSIFY_LOCK, EVT_ACCURACY_UPDATE,
} from '../../constants.js';

export class ClassificationPlugin extends AnalysisPlugin {
  constructor({ adapter, settings }) {
    super(PLUGIN_CLASSIFICATION);
    this._settings = settings;
    this._classifier = new MoveClassifier({ adapter, settings });
    this._initialised = false;
  }

  get classifier() {
    return this._classifier;
  }

  setup({ getRenderCtx, panel, broadcastToPlugins }) {
    this._getRenderCtx = getRenderCtx;

    this._classifier.on(EVT_CLASSIFY_CLEAR, () => {
      panel.clearClassification();
      const { arrow } = getRenderCtx();
      arrow.clearClassification();
      arrow.clearInsight();
    });

    this._classifier.on(EVT_CLASSIFY_SHOW, ({ result, insight }) => {
      panel.showClassification(result, insight);
    });

    this._classifier.on(EVT_CLASSIFY_LOCK, ({
      result, moveUci, insight, bestUci,
    }) => {
      const { arrow, isFlipped } = getRenderCtx();
      panel.showClassification(result, insight);
      arrow.drawClassification(moveUci, isFlipped(), result.color, result.symbol);
      if (bestUci) {
        arrow.drawInsight(bestUci, isFlipped(), result.color);
      }
      broadcastToPlugins('classification:lock', { ply: this._lastPly, result });
    });

    this._classifier.on(EVT_ACCURACY_UPDATE, (pct) => {
      panel.showAccuracy(pct);
    });
  }

  onBoardChange(boardState) {
    this._lastPly = boardState.ply;
    if (!this._initialised) {
      this._classifier.initFen(boardState.fen, boardState.board, boardState.ply);
      this._initialised = true;
      return;
    }
    this._classifier.onBoardChange(boardState.fen, boardState.board, boardState.ply);
  }

  onEval(data) {
    this._classifier.onEval(data);
  }

  onSettingsChange(settings, renderCtx) { // eslint-disable-line no-unused-vars
    if ('showClassifications' in settings || 'showCrazy' in settings) {
      if (!this._settings.showClassifications && !this._settings.showCrazy) {
        this._classifier.setEnabled(false);
      } else {
        this._classifier.replayCurrent();
      }
    }
  }

  onEngineReset() {
    this._classifier.clearCache();
    this._initialised = false;
  }

  destroy() {
    this._classifier.destroy();
  }
}
