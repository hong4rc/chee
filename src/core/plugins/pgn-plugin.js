// PGN export plugin: accumulates moves, evals, and classifications during analysis.
// Exports an annotated PGN string on demand.

import createDebug from '../../lib/debug.js';
import { AnalysisPlugin } from '../plugin.js';
import { boardDiffToUci } from '../board-diff.js';
import { uciToSan } from '../san.js';
import {
  PLUGIN_PGN, TURN_WHITE, CENTIPAWN_DIVISOR, PGN_NAGS,
} from '../../constants.js';

const log = createDebug('chee:pgn');

const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function formatEvalComment(ev) {
  if (ev.mate !== null && ev.mate !== undefined) {
    return `{#${ev.mate > 0 ? '+' : ''}${ev.mate}/${ev.depth}}`;
  }
  const cp = ev.score / CENTIPAWN_DIVISOR;
  const sign = cp >= 0 ? '+' : '';
  return `{${sign}${cp.toFixed(1)}/${ev.depth}}`;
}

function classificationSuffix(label, symbol) {
  if (!symbol) return '';
  // Append known PGN symbols inline: ?!, ??, !!
  if (symbol === '?!' || symbol === '??' || symbol === '!!') return symbol;
  return '';
}

export class PgnPlugin extends AnalysisPlugin {
  constructor() {
    super(PLUGIN_PGN);
    this._moves = [];
    this._evals = new Map();
    this._classifications = new Map();
    this._prevBoard = null;
    this._prevTurn = null;
    this._prevPly = 0;
    this._startFen = null;
    this._initialised = false;
  }

  onBoardChange(boardState) {
    if (!this._initialised) {
      this._startFen = boardState.fen;
      this._prevBoard = boardState.board;
      this._prevTurn = boardState.turn;
      this._prevPly = boardState.ply;
      this._initialised = true;
      log('init:', boardState.fen, 'ply:', boardState.ply);
      return;
    }

    const isForward = boardState.ply > this._prevPly;
    if (isForward && this._prevBoard && boardState.board) {
      const uci = boardDiffToUci(this._prevBoard, boardState.board);
      if (uci) {
        const san = uciToSan(uci, this._prevBoard, this._prevTurn);
        this._moves.push({ ply: this._prevPly, san, turn: this._prevTurn });
        log('move:', san, 'ply:', this._prevPly, 'uci:', uci);
      }
    }

    this._prevBoard = boardState.board;
    this._prevTurn = boardState.turn;
    this._prevPly = boardState.ply;
  }

  onEval(data, boardState) {
    if (!data.lines || data.lines.length === 0) return;
    const line = data.lines[0];
    const { ply } = boardState;
    const existing = this._evals.get(ply);
    if (!existing || data.depth > existing.depth) {
      this._evals.set(ply, { score: line.score, mate: line.mate, depth: data.depth });
    }
  }

  receiveClassification(ply, result) {
    this._classifications.set(ply, { label: result.label, symbol: result.symbol });
  }

  onEngineReset() {
    this._moves = [];
    this._evals.clear();
    this._classifications.clear();
    this._prevBoard = null;
    this._prevTurn = null;
    this._prevPly = 0;
    this._startFen = null;
    this._initialised = false;
  }

  exportPgn() {
    const headers = [];
    const site = window.location.hostname || 'Unknown';
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    headers.push('[Event "Live Chess"]');
    headers.push(`[Site "${site}"]`);
    headers.push(`[Date "${dateStr}"]`);
    headers.push('[White "White"]');
    headers.push('[Black "Black"]');
    headers.push('[Result "*"]');

    if (this._startFen && this._startFen !== STANDARD_FEN) {
      headers.push('[SetUp "1"]');
      headers.push(`[FEN "${this._startFen}"]`);
    }

    const parts = [];
    for (let i = 0; i < this._moves.length; i++) {
      const { ply, san, turn } = this._moves[i];
      const cls = this._classifications.get(ply);
      const suffix = cls ? classificationSuffix(cls.label, cls.symbol) : '';
      const moveSan = san + suffix;

      if (turn === TURN_WHITE) {
        const moveNum = Math.floor(ply / 2) + 1;
        parts.push(`${moveNum}. ${moveSan}`);
      } else if (i === 0) {
        const moveNum = Math.floor(ply / 2) + 1;
        parts.push(`${moveNum}... ${moveSan}`);
      } else {
        parts.push(moveSan);
      }

      const nag = cls ? PGN_NAGS[cls.label] : null;
      if (nag) parts.push(nag);

      const ev = this._evals.get(ply);
      if (ev) parts.push(formatEvalComment(ev));
    }

    parts.push('*');
    const pgn = `${headers.join('\n')}\n\n${parts.join(' ')}`;
    log.info('exported PGN:', pgn.length, 'chars,', this._moves.length, 'moves');
    return pgn;
  }

  destroy() {
    this._moves = [];
    this._evals.clear();
    this._classifications.clear();
  }
}
