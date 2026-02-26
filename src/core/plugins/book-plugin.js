// Book plugin: draws book continuation arrows on the board.
// Uses the persistent layer registry so hover/leave is handled generically.

import { AnalysisPlugin } from '../plugin.js';
import { findBookContinuations } from '../openings.js';
import {
  PLUGIN_BOOK, CLASSIFICATION_BOOK, BOOK_ARROW_OPACITY,
} from '../../constants.js';

export class BookPlugin extends AnalysisPlugin {
  constructor({ settings }) {
    super(PLUGIN_BOOK);
    this._settings = settings;
    this._currentHints = null;
  }

  onBoardChange(boardState, renderCtx) {
    renderCtx.arrow.clearLayer('book');
    this._currentHints = null;

    if (!this._settings.showBookMoves || !boardState.board) return;

    const hints = findBookContinuations(boardState.board, boardState.turn);
    if (!hints || hints.length === 0) return;

    this._currentHints = hints;
    renderCtx.arrow.drawLayer(
      'book',
      hints.map((h) => h.uci),
      renderCtx.isFlipped(),
      { color: CLASSIFICATION_BOOK.color, opacity: BOOK_ARROW_OPACITY },
    );
  }

  onSettingsChange(settings) {
    if ('showBookMoves' in settings) {
      this._settings.showBookMoves = settings.showBookMoves;
    }
  }

  getPersistentLayer(getRenderCtx) {
    return {
      clear: () => {
        getRenderCtx().arrow.clearLayer('book');
      },
      restore: () => {
        if (!this._currentHints) return;
        const { arrow, isFlipped } = getRenderCtx();
        arrow.drawLayer(
          'book',
          this._currentHints.map((h) => h.uci),
          isFlipped(),
          { color: CLASSIFICATION_BOOK.color, opacity: BOOK_ARROW_OPACITY },
        );
      },
    };
  }

  destroy() {
    this._currentHints = null;
  }
}
