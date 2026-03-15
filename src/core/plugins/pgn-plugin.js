// PGN export plugin: accumulates moves, evals, and classifications during analysis.
// Self-contained — handles PGN copy via onPanelEvent, receives classifications via onPluginEvent.

import createDebug from '../../lib/debug.js';
import { AnalysisPlugin } from '../plugin.js';
import { boardDiffToUci } from '../board-diff.js';
import { uciToSan } from '../san.js';
import {
  PLUGIN_PGN, TURN_WHITE, TURN_BLACK, CENTIPAWN_DIVISOR, PGN_NAGS, EVT_PGN_COPY,
} from '../../constants.js';

const log = createDebug('chee:pgn');

const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PGN_MAX_LINE_LEN = 80;

function formatEvalComment(ev) {
  if (ev.mate !== null && ev.mate !== undefined) {
    return `{#${ev.mate > 0 ? '+' : ''}${ev.mate}/${ev.depth}}`;
  }
  const cp = ev.score / CENTIPAWN_DIVISOR;
  const sign = cp >= 0 ? '+' : '';
  return `{${sign}${cp.toFixed(1)}/${ev.depth}}`;
}

// Wrap tokens into lines under 80 characters per the PGN export format spec.
function wrapMovetext(tokens) {
  const lines = [];
  let line = '';
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (line.length === 0) {
      line = token;
    } else if (line.length + 1 + token.length < PGN_MAX_LINE_LEN) {
      line += ` ${token}`;
    } else {
      lines.push(line);
      line = token;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines.join('\n');
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
    this._panel = null;
    this._adapter = null;
  }

  setup({ panel, adapter }) {
    this._panel = panel;
    this._adapter = adapter;
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

  onPluginEvent(eventName, data) {
    if (eventName === 'classification:lock') {
      this._classifications.set(data.ply, { label: data.result.label, symbol: data.result.symbol });
    }
  }

  onPanelEvent(eventName) {
    if (eventName !== EVT_PGN_COPY) return;
    const pgn = this.exportPgn();
    const btn = this._panel && this._panel.el && this._panel.el.querySelector('.chee-copy-pgn');
    navigator.clipboard.writeText(pgn).then(() => {
      if (btn) {
        btn.textContent = '\u2713';
        btn.classList.add('chee-copied');
        setTimeout(() => {
          btn.textContent = 'PGN';
          btn.classList.remove('chee-copied');
        }, 1000);
      }
    });
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
    const site = window.location.hostname || '?';
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    const players = (this._adapter && this._adapter.readPlayerNames()) || null;
    const result = (this._adapter && this._adapter.readGameResult()) || '*';
    const whiteName = (players && players.white) || '?';
    const blackName = (players && players.black) || '?';

    // Seven Tag Roster (STR) in required order per PGN spec
    const headers = [];
    headers.push('[Event "Live Chess"]');
    headers.push(`[Site "${site}"]`);
    headers.push(`[Date "${dateStr}"]`);
    headers.push('[Round "?"]');
    headers.push(`[White "${whiteName}"]`);
    headers.push(`[Black "${blackName}"]`);
    headers.push(`[Result "${result}"]`);

    if (this._startFen && this._startFen !== STANDARD_FEN) {
      headers.push('[SetUp "1"]');
      headers.push(`[FEN "${this._startFen}"]`);
    }

    const domMoveList = this._adapter && this._adapter.readMoveList();
    const tokens = domMoveList
      ? this._exportFromDomMoves(domMoveList)
      : this._exportFromDiffMoves();

    tokens.push(result);
    const movetext = wrapMovetext(tokens);
    const pgn = `${headers.join('\n')}\n\n${movetext}\n`;
    log.info('exported PGN:', pgn.length, 'chars');
    return pgn;
  }

  _annotateMoveTokens(san, ply, tokens, needsMoveNum, turn) {
    const cls = this._classifications.get(ply);
    const nag = cls ? PGN_NAGS[cls.label] : null;

    if (needsMoveNum) {
      const moveNum = Math.floor(ply / 2) + 1;
      if (turn === TURN_WHITE) {
        tokens.push(`${moveNum}.`);
      } else {
        tokens.push(`${moveNum}...`);
      }
    }

    tokens.push(san);
    if (nag) tokens.push(nag);

    const ev = this._evals.get(ply);
    if (ev) {
      tokens.push(formatEvalComment(ev));
    }
  }

  _exportFromDomMoves(domMoveList) {
    const { moves, startPly } = domMoveList;
    const tokens = [];
    let prevHadAnnotation = false;
    for (let i = 0; i < moves.length; i++) {
      const ply = startPly + i;
      const turn = ply % 2 === 0 ? TURN_WHITE : TURN_BLACK;
      // Move number required for: white moves, first move, or after annotation
      const needsMoveNum = turn === TURN_WHITE || i === 0 || prevHadAnnotation;
      const cls = this._classifications.get(ply);
      const ev = this._evals.get(ply);
      this._annotateMoveTokens(moves[i], ply, tokens, needsMoveNum, turn);
      prevHadAnnotation = !!(cls && PGN_NAGS[cls.label]) || !!ev;
    }
    return tokens;
  }

  _exportFromDiffMoves() {
    const tokens = [];
    let prevHadAnnotation = false;
    for (let i = 0; i < this._moves.length; i++) {
      const { ply, san, turn } = this._moves[i];
      const needsMoveNum = turn === TURN_WHITE || i === 0 || prevHadAnnotation;
      const cls = this._classifications.get(ply);
      const ev = this._evals.get(ply);
      this._annotateMoveTokens(san, ply, tokens, needsMoveNum, turn);
      prevHadAnnotation = !!(cls && PGN_NAGS[cls.label]) || !!ev;
    }
    return tokens;
  }

  destroy() {
    this._moves = [];
    this._evals.clear();
    this._classifications.clear();
  }
}
