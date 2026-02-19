// UCI → SAN converter + board simulation (pure functions)

import {
  map, some, reduce, take,
} from 'lodash-es';
import {
  FILES, CHAR_CODE_A, BOARD_SIZE, LAST_RANK,
  WHITE_KING, WHITE_PAWN, TURN_WHITE, TURN_BLACK,
  CASTLING_DISTANCE, KINGSIDE_ROOK_FILE, QUEENSIDE_ROOK_FILE,
  KINGSIDE_ROOK_DEST, QUEENSIDE_ROOK_DEST,
  UCI_MIN_LEN, UCI_PROMO_LEN, MAX_PV_MOVES,
} from '../constants.js';

function cloneBoard(board) {
  return map(board, (row) => [...row]);
}

function isPathClear(ff, fr, tf, tr, board) {
  const sf = Math.sign(tf - ff);
  const sr = Math.sign(tr - fr);
  let f = ff + sf;
  let r = fr + sr;
  while (f !== tf || r !== tr) {
    if (board[LAST_RANK - r][f] !== null) return false;
    f += sf;
    r += sr;
  }
  return true;
}

function canPieceReach(pt, ff, fr, tf, tr, board) {
  const adf = Math.abs(tf - ff);
  const adr = Math.abs(tr - fr);
  switch (pt) {
    case 'N': return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case 'B': return adf === adr && adf > 0 && isPathClear(ff, fr, tf, tr, board);
    case 'R': return (tf === ff || tr === fr) && (adf + adr > 0) && isPathClear(ff, fr, tf, tr, board);
    case 'Q':
      return ((adf === adr && adf > 0) || tf === ff || tr === fr)
        && (adf + adr > 0) && isPathClear(ff, fr, tf, tr, board);
    case 'K': return adf <= 1 && adr <= 1 && (adf + adr > 0);
    default: return false;
  }
}

function getDisambiguation(board, pieceType, fromFile, fromRank, toFile, toRank, turn) {
  const pieceCh = turn === TURN_WHITE ? pieceType : pieceType.toLowerCase();
  const candidates = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let f = 0; f < BOARD_SIZE; f++) {
      if (board[LAST_RANK - r][f] === pieceCh && !(f === fromFile && r === fromRank)) {
        if (canPieceReach(pieceType, f, r, toFile, toRank, board)) {
          candidates.push({ file: f, rank: r });
        }
      }
    }
  }
  if (candidates.length === 0) return '';
  if (!some(candidates, (c) => c.file === fromFile)) return FILES[fromFile];
  if (!some(candidates, (c) => c.rank === fromRank)) return `${fromRank + 1}`;
  return FILES[fromFile] + (fromRank + 1);
}

export function uciToSan(uciMove, board, turn) {
  if (!uciMove || uciMove.length < UCI_MIN_LEN) return uciMove;

  const fromFile = uciMove.charCodeAt(0) - CHAR_CODE_A;
  const fromRank = parseInt(uciMove[1], 10) - 1;
  const toFile = uciMove.charCodeAt(2) - CHAR_CODE_A;
  const toRank = parseInt(uciMove[3], 10) - 1;
  const promotion = uciMove.length === UCI_PROMO_LEN ? uciMove[4] : null;

  const piece = board[LAST_RANK - fromRank][fromFile];
  if (!piece) return uciMove;

  const targetPiece = board[LAST_RANK - toRank][toFile];
  const isCapture = targetPiece !== null;
  const pieceUpper = piece.toUpperCase();

  if (pieceUpper === WHITE_KING && Math.abs(toFile - fromFile) === CASTLING_DISTANCE) {
    return toFile > fromFile ? 'O-O' : 'O-O-O';
  }

  let san = '';
  if (pieceUpper === WHITE_PAWN) {
    if (isCapture || fromFile !== toFile) {
      san = `${FILES[fromFile]}x${FILES[toFile]}${toRank + 1}`;
    } else {
      san = FILES[toFile] + (toRank + 1);
    }
    if (promotion) san += `=${promotion.toUpperCase()}`;
  } else {
    san = pieceUpper;
    san += getDisambiguation(board, pieceUpper, fromFile, fromRank, toFile, toRank, turn);
    if (isCapture) san += 'x';
    san += FILES[toFile] + (toRank + 1);
  }
  return san;
}

export function applyUciMove(board, uciMove) {
  const nb = cloneBoard(board);
  const ff = uciMove.charCodeAt(0) - CHAR_CODE_A;
  const fr = parseInt(uciMove[1], 10) - 1;
  const tf = uciMove.charCodeAt(2) - CHAR_CODE_A;
  const tr = parseInt(uciMove[3], 10) - 1;
  const promo = uciMove.length === UCI_PROMO_LEN ? uciMove[4] : null;

  const piece = nb[LAST_RANK - fr][ff];
  if (!piece) return nb;
  const pu = piece.toUpperCase();

  if (pu === WHITE_PAWN && ff !== tf && nb[LAST_RANK - tr][tf] === null) {
    nb[LAST_RANK - fr][tf] = null; // en passant
  }

  nb[LAST_RANK - fr][ff] = null;
  if (promo) {
    nb[LAST_RANK - tr][tf] = piece === piece.toUpperCase() ? promo.toUpperCase() : promo.toLowerCase();
  } else {
    nb[LAST_RANK - tr][tf] = piece;
  }

  if (pu === WHITE_KING && Math.abs(tf - ff) === CASTLING_DISTANCE) {
    if (tf > ff) {
      nb[LAST_RANK - fr][KINGSIDE_ROOK_DEST] = nb[LAST_RANK - fr][KINGSIDE_ROOK_FILE];
      nb[LAST_RANK - fr][KINGSIDE_ROOK_FILE] = null;
    } else {
      nb[LAST_RANK - fr][QUEENSIDE_ROOK_DEST] = nb[LAST_RANK - fr][QUEENSIDE_ROOK_FILE];
      nb[LAST_RANK - fr][QUEENSIDE_ROOK_FILE] = null;
    }
  }
  return nb;
}

export function pvToSan(pvMoves, board, startTurn) {
  const moves = take(pvMoves, MAX_PV_MOVES);
  const { sanMoves } = reduce(moves, (acc, uciMove) => {
    acc.sanMoves.push(uciToSan(uciMove, acc.board, acc.turn));
    return {
      sanMoves: acc.sanMoves,
      board: applyUciMove(acc.board, uciMove),
      turn: acc.turn === TURN_WHITE ? TURN_BLACK : TURN_WHITE,
    };
  }, { sanMoves: [], board: cloneBoard(board), turn: startTurn });
  return sanMoves;
}
