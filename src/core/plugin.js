// Base class for analysis plugins.
// Plugins receive lifecycle hooks from the coordinator and can render via renderCtx.

export class AnalysisPlugin {
  constructor(name) {
    this.name = name;
  }

  // Called when the board changes (new FEN detected).
  // boardState: BoardState instance, renderCtx: { panel, arrow, isFlipped() }
  onBoardChange(boardState, renderCtx) {} // eslint-disable-line no-unused-vars

  // Called when engine eval data arrives.
  // data: engine eval, boardState: BoardState, renderCtx: { panel, arrow, isFlipped() }
  onEval(data, boardState, renderCtx) {} // eslint-disable-line no-unused-vars

  // Called when user changes settings.
  onSettingsChange(settings) {} // eslint-disable-line no-unused-vars

  // Called when the engine is rebuilt (depth/lines changed). Clear caches and reset state.
  onEngineReset() {}

  destroy() {}
}
