// Classification plugin: wraps MoveClassifier, exposes it as a plugin lifecycle.
// Bridges classifier events to coordinator via its own event subscriptions.

import { AnalysisPlugin } from '../plugin.js';
import { MoveClassifier } from '../move-classifier.js';
import { PLUGIN_CLASSIFICATION } from '../../constants.js';

export class ClassificationPlugin extends AnalysisPlugin {
  constructor({ adapter, settings }) {
    super(PLUGIN_CLASSIFICATION);
    this._classifier = new MoveClassifier({ adapter, settings });
    this._initialised = false;
  }

  get classifier() {
    return this._classifier;
  }

  onBoardChange(boardState) {
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

  onSettingsChange(settings) {
    if ('showClassifications' in settings && !settings.showClassifications) {
      this._classifier.setEnabled(false);
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
