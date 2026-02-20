// Header sub-renderer: eval score, depth, WDL bar, opening name, classification badge,
// insight text, accuracy, minimize/hide/show controls.

import { el } from '../../lib/dom.js';
import { lookupOpening, STARTING_POSITION } from '../openings.js';
import {
  TURN_BLACK, CENTIPAWN_DIVISOR,
} from '../../constants.js';

const CLS_WHITE_ADV = 'white-advantage';
const CLS_BLACK_ADV = 'black-advantage';
const CLS_MATE = 'mate-score';

function advantageCls(isWhite) {
  return isWhite ? CLS_WHITE_ADV : CLS_BLACK_ADV;
}

function formatMate(wMate) {
  return (wMate > 0 ? 'M' : '-M') + Math.abs(wMate);
}

function formatCp(cp) {
  return (cp >= 0 ? '+' : '') + cp.toFixed(1);
}

function cpToWdl(cp) {
  const winRaw = 1 / (1 + Math.exp(-0.00368208 * cp));
  const drawMax = 0.33;
  const drawRaw = drawMax * Math.exp(-(cp * cp) / (2 * 200 * 200));
  const w = Math.round(winRaw * (1 - drawRaw) * 100);
  const l = Math.round((1 - winRaw) * (1 - drawRaw) * 100);
  const d = 100 - w - l;
  return { w, d, l };
}

export class HeaderRenderer {
  constructor() {
    this._turn = null;
    this._scoreEl = null;
    this._depthEl = null;
    this._openingSlot = null;
    this._classSlot = null;
    this._insightSlot = null;
    this._accuracyEl = null;
    this._wdl = null;
    this._wdlPct = null;
  }

  get turn() { return this._turn; }

  setTurn(turn) {
    this._turn = turn;
  }

  createDOM() {
    const header = el('div', 'chee-header');
    const topRow = el('div', 'chee-header-top');
    const hide = el('button', 'chee-hide');
    hide.title = 'Hide panel';
    hide.innerHTML = '&#x2039;';
    const toggle = el('button', 'chee-toggle');
    toggle.title = 'Minimize';
    toggle.innerHTML = '&#x2212;';
    topRow.append(
      hide,
      el('span', 'chee-classification-slot'),
      el('span', 'chee-eval-score', '0.0'),
      el('span', 'chee-depth'),
      toggle,
    );

    const openingSlot = el('div', 'chee-opening-slot');
    const insightSlot = el('div', 'chee-insight-slot');

    const bar = el('div', 'chee-eval-bar');
    bar.append(
      el('div', 'chee-wdl-w'),
      el('div', 'chee-wdl-d'),
      el('div', 'chee-wdl-l'),
    );

    const wdlText = el('div', 'chee-wdl-text');
    wdlText.append(
      el('span', 'chee-wdl-w-pct', '50%'),
      el('span', 'chee-wdl-d-pct', '0%'),
      el('span', 'chee-wdl-l-pct', '50%'),
    );

    header.append(topRow, openingSlot, insightSlot, bar, wdlText);
    return header;
  }

  bind(panelEl) {
    this._scoreEl = panelEl.querySelector('.chee-eval-score');
    this._depthEl = panelEl.querySelector('.chee-depth');
    this._openingSlot = panelEl.querySelector('.chee-opening-slot');
    this._classSlot = panelEl.querySelector('.chee-classification-slot');
    this._insightSlot = panelEl.querySelector('.chee-insight-slot');
    this._accuracyEl = panelEl.querySelector('.chee-accuracy');
    this._wdl = {
      w: panelEl.querySelector('.chee-wdl-w'),
      d: panelEl.querySelector('.chee-wdl-d'),
      l: panelEl.querySelector('.chee-wdl-l'),
    };
    this._wdlPct = {
      w: panelEl.querySelector('.chee-wdl-w-pct'),
      d: panelEl.querySelector('.chee-wdl-d-pct'),
      l: panelEl.querySelector('.chee-wdl-l-pct'),
    };
  }

  _whiteScore(score) {
    return this._turn === TURN_BLACK ? -score : score;
  }

  _whiteMate(mate) {
    return this._turn === TURN_BLACK ? -mate : mate;
  }

  updateOpening(fen) {
    if (!this._openingSlot) return;
    const name = lookupOpening(fen);
    if (name && name !== STARTING_POSITION) {
      this._openingSlot.textContent = name;
    } else {
      this._openingSlot.textContent = '';
    }
  }

  updateEval(bestLine, depth) {
    if (this._depthEl) this._depthEl.textContent = `d${depth}`;
    if (!bestLine) return;
    this._updateScoreDisplay(bestLine);
  }

  _updateScoreDisplay(bestLine) {
    if (bestLine.mate !== null) {
      const wMate = this._whiteMate(bestLine.mate);
      this._scoreEl.textContent = formatMate(wMate);
      this._scoreEl.className = `chee-eval-score ${CLS_MATE} ${advantageCls(wMate > 0)}`;
      this._updateWdlBar(wMate > 0 ? 100 : 0, 0, wMate > 0 ? 0 : 100);
      return;
    }

    const cp = this._whiteScore(bestLine.score) / CENTIPAWN_DIVISOR;
    this._scoreEl.textContent = formatCp(cp);
    this._scoreEl.className = `chee-eval-score ${advantageCls(cp >= 0)}`;
    const cpRaw = this._whiteScore(bestLine.score);
    const { w, d, l } = cpToWdl(cpRaw);
    this._updateWdlBar(w, d, l);
  }

  _updateWdlBar(w, d, l) {
    if (this._wdl.w) this._wdl.w.style.width = `${w}%`;
    if (this._wdl.d) this._wdl.d.style.width = `${d}%`;
    if (this._wdl.l) this._wdl.l.style.width = `${l}%`;
    if (this._wdlPct.w) this._wdlPct.w.textContent = `${w}%`;
    if (this._wdlPct.d) this._wdlPct.d.textContent = `${d}%`;
    if (this._wdlPct.l) this._wdlPct.l.textContent = `${l}%`;
  }

  showClassification({ label, symbol, color }, insight) {
    this.clearClassification();
    if (!this._classSlot) return;
    const text = symbol ? `${symbol} ${label}` : label;
    const badge = el('span', 'chee-classification-badge', text);
    badge.style.background = color;
    this._classSlot.appendChild(badge);

    if (insight && this._insightSlot) {
      const insightEl = el('div', 'chee-insight', `\u21B3 ${insight}`);
      this._insightSlot.appendChild(insightEl);
    }
  }

  showAccuracy(pct) {
    if (!this._accuracyEl) return;
    this._accuracyEl.textContent = pct !== null ? `Acc: ${pct}%` : '';
  }

  clearClassification() {
    if (this._classSlot) { this._classSlot.innerHTML = ''; }
    if (this._insightSlot) { this._insightSlot.innerHTML = ''; }
  }

  destroy() {
    this._scoreEl = null;
    this._depthEl = null;
    this._openingSlot = null;
    this._classSlot = null;
    this._insightSlot = null;
    this._accuracyEl = null;
    this._wdl = null;
    this._wdlPct = null;
  }
}
