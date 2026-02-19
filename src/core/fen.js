// FEN generation (pure functions)

import { map, join, reduce } from 'lodash-es';

function rankToFen(row) {
  const { str, empty } = reduce(row, (acc, cell) => {
    if (cell) {
      return { str: acc.str + (acc.empty > 0 ? acc.empty : '') + cell, empty: 0 };
    }
    return { str: acc.str, empty: acc.empty + 1 };
  }, { str: '', empty: 0 });
  return empty > 0 ? str + empty : str;
}

export function buildPlacement(board) {
  return join(map(board, rankToFen), '/');
}

export function boardToFen(board, turn, castling, enPassant, moveCount) {
  const placement = buildPlacement(board);
  return `${placement} ${turn} ${castling} ${enPassant} 0 ${moveCount}`;
}
