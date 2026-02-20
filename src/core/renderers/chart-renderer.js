// Chart sub-renderer: SVG area chart plotting white-perspective eval at each ply.

import { forEach, sortedIndex } from 'lodash-es';
import { el, svgEl } from '../../lib/dom.js';
import { TURN_BLACK } from '../../constants.js';

const CHART_VB_W = 200;
const CHART_VB_H = 40;
const CHART_MAX_CP = 500;

export class ChartRenderer {
  constructor() {
    this._scores = new Map();
    this._sortedPlies = [];
    this._chartSvg = null;
    this._chartWhite = null;
    this._chartCursor = null;
  }

  createDOM() {
    const container = el('div', 'chee-chart');
    const svg = svgEl('svg', {
      viewBox: `0 0 ${CHART_VB_W} ${CHART_VB_H}`,
      preserveAspectRatio: 'none',
    });
    // Background (black's territory)
    svg.appendChild(svgEl('rect', {
      width: CHART_VB_W, height: CHART_VB_H, fill: '#2a2a2a',
    }));
    // White area path (filled from bottom up to score line)
    const whitePath = svgEl('path', { class: 'chee-chart-white', d: '' });
    svg.appendChild(whitePath);
    // Zero line
    svg.appendChild(svgEl('line', {
      class: 'chee-chart-zero',
      x1: 0,
      y1: CHART_VB_H / 2,
      x2: CHART_VB_W,
      y2: CHART_VB_H / 2,
    }));
    // Current ply cursor
    svg.appendChild(svgEl('line', {
      class: 'chee-chart-cursor',
      x1: 0,
      y1: 0,
      x2: 0,
      y2: CHART_VB_H,
    }));
    container.appendChild(svg);
    return container;
  }

  bind(panelEl) {
    this._chartSvg = panelEl.querySelector('.chee-chart svg');
    this._chartWhite = this._chartSvg?.querySelector('.chee-chart-white');
    this._chartCursor = this._chartSvg?.querySelector('.chee-chart-cursor');
  }

  recordScore(ply, data, turn) {
    if (!data.lines || data.lines.length === 0) return;
    const line = data.lines[0];
    let whiteScore;
    if (line.mate !== null) {
      const wMate = turn === TURN_BLACK ? -line.mate : line.mate;
      whiteScore = wMate > 0 ? CHART_MAX_CP : -CHART_MAX_CP;
    } else {
      whiteScore = turn === TURN_BLACK ? -line.score : line.score;
    }
    const isNew = !this._scores.has(ply);
    this._scores.set(ply, whiteScore);
    if (isNew) this._insertSortedPly(ply);
    this._renderChart(ply);
  }

  clearScores() {
    this._scores.clear();
    this._sortedPlies = [];
    this._renderChart(0);
  }

  _insertSortedPly(ply) {
    const idx = sortedIndex(this._sortedPlies, ply);
    this._sortedPlies.splice(idx, 0, ply);
  }

  _renderChart(currentPly) {
    if (!this._chartSvg) return;

    const plies = this._sortedPlies;
    if (plies.length === 0) {
      if (this._chartWhite) this._chartWhite.setAttribute('d', '');
      if (this._chartCursor) {
        this._chartCursor.setAttribute('x1', 0);
        this._chartCursor.setAttribute('x2', 0);
      }
      return;
    }

    const minPly = plies[0];
    const maxPly = Math.max(plies[plies.length - 1], minPly + 1);
    const plyRange = maxPly - minPly;
    const centerY = CHART_VB_H / 2;

    const xPos = (ply) => ((ply - minPly) / plyRange) * CHART_VB_W;
    const yPos = (cp) => {
      const clamped = Math.max(-CHART_MAX_CP, Math.min(CHART_MAX_CP, cp));
      return centerY - (clamped / CHART_MAX_CP) * centerY;
    };

    // White area: bottom → score line → bottom
    const first = this._scores.get(plies[0]);
    let d = `M 0 ${CHART_VB_H} L 0 ${yPos(first)}`;
    forEach(plies, (ply) => {
      d += ` L ${xPos(ply)} ${yPos(this._scores.get(ply))}`;
    });
    const last = this._scores.get(plies[plies.length - 1]);
    d += ` L ${CHART_VB_W} ${yPos(last)} L ${CHART_VB_W} ${CHART_VB_H} Z`;
    if (this._chartWhite) this._chartWhite.setAttribute('d', d);

    // Cursor at current ply
    if (this._chartCursor && currentPly !== undefined) {
      const cx = plies.length === 1 ? CHART_VB_W / 2 : xPos(currentPly);
      this._chartCursor.setAttribute('x1', cx);
      this._chartCursor.setAttribute('x2', cx);
    }
  }

  destroy() {
    this._scores.clear();
    this._sortedPlies = [];
    this._chartSvg = null;
    this._chartWhite = null;
    this._chartCursor = null;
  }
}
