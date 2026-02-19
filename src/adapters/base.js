// BoardAdapter interface (abstract base class)
/* eslint-disable no-unused-vars */

export class BoardAdapter {
  findBoard() { throw new Error('Not implemented'); }
  readPieces(boardEl) { throw new Error('Not implemented'); }
  detectTurn() { throw new Error('Not implemented'); }
  detectCastling(board) { throw new Error('Not implemented'); }
  detectEnPassant(board) { throw new Error('Not implemented'); }
  detectMoveCount() { throw new Error('Not implemented'); }
  getPanelAnchor(boardEl) { throw new Error('Not implemented'); }
  isFlipped(boardEl) { throw new Error('Not implemented'); }
  observe(boardEl, onChange) { throw new Error('Not implemented'); }
  disconnect() { throw new Error('Not implemented'); }
}
