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
    this._boardState = null;
    this._getRenderCtx = null;
  }

  onBoardChange(boardState, renderCtx) {
    this._boardState = boardState;
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
    if (!('showBookMoves' in settings) || !this._getRenderCtx) return;
    const { arrow, isFlipped } = this._getRenderCtx();

    if (!settings.showBookMoves) {
      arrow.clearLayer('book');
      this._currentHints = null;
      return;
    }

    // Toggled on — recompute and draw
    if (!this._boardState || !this._boardState.board) return;
    const hints = findBookContinuations(this._boardState.board, this._boardState.turn);
    this._currentHints = hints && hints.length > 0 ? hints : null;
    if (this._currentHints) {
      arrow.drawLayer(
        'book',
        this._currentHints.map((h) => h.uci),
        isFlipped(),
        { color: CLASSIFICATION_BOOK.color, opacity: BOOK_ARROW_OPACITY },
      );
    }
  }

  getPersistentLayer(getRenderCtx) {
    this._getRenderCtx = getRenderCtx;
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
    this._boardState = null;
    this._getRenderCtx = null;
  }
}
