// Base class for analysis plugins.
// Plugins receive lifecycle hooks from the coordinator and can render via renderCtx.

export class AnalysisPlugin {
  constructor(name) {
    this.name = name;
  }

  // Called once after all plugins are registered, before start().
  // ctx: { getRenderCtx, panel, adapter, boardState, requestSecondaryAnalysis, broadcastToPlugins }
  setup(ctx) {} // eslint-disable-line no-unused-vars

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

  // Return a persistent visual layer { clear(), restore() } or null.
  // getRenderCtx is a thunk returning { panel, arrow, isFlipped() }.
  getPersistentLayer(getRenderCtx) { return null; } // eslint-disable-line no-unused-vars

  // Called on board mousedown with resolved square coordinates.
  // sq: { file, rank }, board, turn, renderCtx
  onBoardMouseDown(sq, board, turn, renderCtx) {} // eslint-disable-line no-unused-vars

  // Called on board mouseup.
  onBoardMouseUp(renderCtx) {} // eslint-disable-line no-unused-vars

  // Called when a panel event fires (e.g. EVT_PGN_COPY).
  onPanelEvent(eventName, renderCtx) {} // eslint-disable-line no-unused-vars

  // Receive events broadcast by other plugins.
  onPluginEvent(eventName, data) {} // eslint-disable-line no-unused-vars

  destroy() {}
}
