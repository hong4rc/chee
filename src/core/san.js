// UCI → SAN converter + board simulation (pure functions)

import {
  map, some, take,
} from 'lodash-es';
import { parseUci } from '../lib/uci.js';
import {
  FILES, BOARD_SIZE, LAST_RANK, CHAR_CODE_A,
  WHITE_KING, WHITE_QUEEN, WHITE_ROOK, WHITE_BISHOP, WHITE_KNIGHT, WHITE_PAWN,
  TURN_WHITE, toggleTurn,
  SAN_CASTLE_KING, SAN_CASTLE_QUEEN, SAN_CASTLE_KING_ZEROS, SAN_CASTLE_QUEEN_ZEROS,
  CASTLING_DISTANCE, KING_START_FILE, KINGSIDE_ROOK_FILE, QUEENSIDE_ROOK_FILE,
  KINGSIDE_ROOK_DEST, QUEENSIDE_ROOK_DEST,
  UCI_MIN_LEN, MAX_PV_MOVES,
  WHITE_BACK_ROW, BLACK_BACK_ROW,
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

function applyMoveInPlace(board, uciMove) {
  const {
    fromFile: ff, fromRank: fr, toFile: tf, toRank: tr, promotion: promo,
  } = parseUci(uciMove);

  const piece = board[LAST_RANK - fr][ff];
  if (!piece) return;
  const pu = piece.toUpperCase();

  if (pu === WHITE_PAWN && ff !== tf && board[LAST_RANK - tr][tf] === null) {
    board[LAST_RANK - fr][tf] = null; // en passant
  }

  board[LAST_RANK - fr][ff] = null;
  if (promo) {
    board[LAST_RANK - tr][tf] = piece === piece.toUpperCase() ? promo.toUpperCase() : promo.toLowerCase();
  } else {
    board[LAST_RANK - tr][tf] = piece;
  }

  if (pu === WHITE_KING && Math.abs(tf - ff) === CASTLING_DISTANCE) {
    if (tf > ff) {
      board[LAST_RANK - fr][KINGSIDE_ROOK_DEST] = board[LAST_RANK - fr][KINGSIDE_ROOK_FILE];
      board[LAST_RANK - fr][KINGSIDE_ROOK_FILE] = null;
    } else {
      board[LAST_RANK - fr][QUEENSIDE_ROOK_DEST] = board[LAST_RANK - fr][QUEENSIDE_ROOK_FILE];
      board[LAST_RANK - fr][QUEENSIDE_ROOK_FILE] = null;
    }
  }
}

export function applyUciMove(board, uciMove) {
  const nb = cloneBoard(board);
  applyMoveInPlace(nb, uciMove);
  return nb;
}

export function pvToSan(pvMoves, board, startTurn) {
  const b = cloneBoard(board);
  let turn = startTurn;
  return map(take(pvMoves, MAX_PV_MOVES), (uciMove) => {
    const san = uciToSan(uciMove, b, turn);
    applyMoveInPlace(b, uciMove);
    turn = toggleTurn(turn);
    return san;
  });
}

// ─── SAN → UCI ──────────────────────────────────────────────

const PAWN_START_WHITE = 1;
const PAWN_START_BLACK = 6;

function canPawnReach(ff, fr, tf, tr, board, turn) {
  const dir = turn === TURN_WHITE ? 1 : -1;
  const startRank = turn === TURN_WHITE ? PAWN_START_WHITE : PAWN_START_BLACK;

  if (ff === tf) {
    // Forward one
    if (tr === fr + dir && board[LAST_RANK - tr][tf] === null) return true;
    // Forward two from starting rank
    if (
      fr === startRank && tr === fr + 2 * dir
      && board[LAST_RANK - (fr + dir)][ff] === null
      && board[LAST_RANK - tr][tf] === null
    ) return true;
    return false;
  }
  // Diagonal capture (normal or en passant)
  return Math.abs(tf - ff) === 1 && tr === fr + dir;
}

/**
 * Convert a SAN move string to UCI notation given a board and turn.
 * Handles castling, disambiguation, captures, promotions, en passant.
 * Returns null if the move cannot be resolved.
 */
export function sanToUci(san, board, turn) {
  let s = san.replace(/[+#!?]+$/g, '');

  // Castling
  if (s === SAN_CASTLE_KING || s === SAN_CASTLE_KING_ZEROS) {
    const rank = turn === TURN_WHITE ? WHITE_BACK_ROW : BLACK_BACK_ROW;
    const r = LAST_RANK - rank + 1;
    return `${FILES[KING_START_FILE]}${r}${FILES[KING_START_FILE + CASTLING_DISTANCE]}${r}`;
  }
  if (s === SAN_CASTLE_QUEEN || s === SAN_CASTLE_QUEEN_ZEROS) {
    const rank = turn === TURN_WHITE ? WHITE_BACK_ROW : BLACK_BACK_ROW;
    const r = LAST_RANK - rank + 1;
    return `${FILES[KING_START_FILE]}${r}${FILES[KING_START_FILE - CASTLING_DISTANCE]}${r}`;
  }

  // Promotion
  let promotion = null;
  const promoIdx = s.indexOf('=');
  if (promoIdx >= 0) {
    promotion = s[promoIdx + 1].toLowerCase();
    s = s.slice(0, promoIdx) + s.slice(promoIdx + 2);
  }

  // Target square (always last 2 chars)
  const toFile = s.charCodeAt(s.length - 2) - CHAR_CODE_A;
  const toRank = parseInt(s[s.length - 1], 10) - 1;
  s = s.slice(0, -2);

  // Remove capture marker
  s = s.replace('x', '');

  // Piece type
  let pieceType = WHITE_PAWN;
  if (s.length > 0 && s[0] >= 'A' && s[0] <= 'Z') {
    [pieceType] = s;
    s = s.slice(1);
  }

  // Disambiguation
  let disambigFile = -1;
  let disambigRank = -1;
  for (const ch of s) {
    if (ch >= 'a' && ch <= 'h') disambigFile = ch.charCodeAt(0) - CHAR_CODE_A;
    else if (ch >= '1' && ch <= '8') disambigRank = parseInt(ch, 10) - 1;
  }

  // Find source square
  const pieceCh = turn === TURN_WHITE ? pieceType : pieceType.toLowerCase();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let f = 0; f < BOARD_SIZE; f++) {
      if (board[LAST_RANK - r][f] !== pieceCh) continue;
      if (disambigFile >= 0 && f !== disambigFile) continue;
      if (disambigRank >= 0 && r !== disambigRank) continue;
      // Pawn non-captures must stay on the same file (captures always have disambigFile)
      if (pieceType === WHITE_PAWN && disambigFile < 0 && f !== toFile) continue;

      const reachable = pieceType === WHITE_PAWN
        ? canPawnReach(f, r, toFile, toRank, board, turn)
        : canPieceReach(pieceType, f, r, toFile, toRank, board);
      if (!reachable) continue;

      let uci = FILES[f] + (r + 1) + FILES[toFile] + (toRank + 1);
      if (promotion) uci += promotion;
      return uci;
    }
  }
  return null;
}
