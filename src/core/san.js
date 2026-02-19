// UCI → SAN converter + board simulation (pure functions)

import {
  map, some, reduce, take,
} from 'lodash-es';
import { parseUci } from '../lib/uci.js';
import {
  FILES, BOARD_SIZE, LAST_RANK,
  WHITE_KING, WHITE_QUEEN, WHITE_ROOK, WHITE_BISHOP, WHITE_KNIGHT, WHITE_PAWN,
  TURN_WHITE, TURN_BLACK,
  SAN_CASTLE_KING, SAN_CASTLE_QUEEN,
  CASTLING_DISTANCE, KINGSIDE_ROOK_FILE, QUEENSIDE_ROOK_FILE,
  KINGSIDE_ROOK_DEST, QUEENSIDE_ROOK_DEST,
  UCI_MIN_LEN, MAX_PV_MOVES,
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
    case WHITE_KNIGHT: return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case WHITE_BISHOP: return adf === adr && adf > 0 && isPathClear(ff, fr, tf, tr, board);
    case WHITE_ROOK: return (tf === ff || tr === fr) && (adf + adr > 0) && isPathClear(ff, fr, tf, tr, board);
    case WHITE_QUEEN:
      return ((adf === adr && adf > 0) || tf === ff || tr === fr)
        && (adf + adr > 0) && isPathClear(ff, fr, tf, tr, board);
    case WHITE_KING: return adf <= 1 && adr <= 1 && (adf + adr > 0);
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

  const {
    fromFile, fromRank, toFile, toRank, promotion,
  } = parseUci(uciMove);

  const piece = board[LAST_RANK - fromRank][fromFile];
  if (!piece) return uciMove;

  const targetPiece = board[LAST_RANK - toRank][toFile];
  const isCapture = targetPiece !== null;
  const pieceUpper = piece.toUpperCase();

  if (pieceUpper === WHITE_KING && Math.abs(toFile - fromFile) === CASTLING_DISTANCE) {
    return toFile > fromFile ? SAN_CASTLE_KING : SAN_CASTLE_QUEEN;
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
  const {
    fromFile: ff, fromRank: fr, toFile: tf, toRank: tr, promotion: promo,
  } = parseUci(uciMove);

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
