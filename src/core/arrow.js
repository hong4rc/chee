// Arrow overlay: draws SVG arrows on the chess board for hovered analysis lines

import { forEach } from 'lodash-es';
import { parseUci } from '../lib/uci.js';
import {
  BOARD_SIZE, LAST_RANK,
  ARROW_COLOR_WHITE, ARROW_COLOR_BLACK,
  ARROW_OPACITY_MAX, ARROW_OPACITY_MIN, ARROW_HEAD_SIZE, ARROW_WIDTH,
  ARROW_OVERLAY_ID, ARROW_OVERLAY_Z, ARROW_ORIGIN_RADIUS,
  ARROW_SHORTEN_FACTOR,
  ARROW_MARKER_WIDTH, ARROW_MARKER_HEIGHT, ARROW_MARKER_REF_X, ARROW_MARKER_REF_Y,
  UCI_MIN_LEN, TURN_WHITE, toggleTurn,
  INSIGHT_ARROW_OPACITY, INSIGHT_ARROW_DASH,
} from '../constants.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TEAM_COLORS = [ARROW_COLOR_WHITE, ARROW_COLOR_BLACK];

// Badge layout (fraction of square size)
const BADGE_RADIUS = 0.22;
const BADGE_OFFSET_X = 0.28; // right of center
const BADGE_OFFSET_Y = 0.28; // above center
const BADGE_FONT_SIZE = 0.18;

// Scale factors for hint/insight arrows relative to main arrows
const HINT_SCALE = 0.8;
const INSIGHT_STROKE_SCALE = 0.6;
const INSIGHT_ORIGIN_SCALE = 0.7;

function createSvgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  forEach(attrs, (val, key) => node.setAttribute(key, val));
  return node;
}

function createMarkerDefs() {
  const defs = createSvgEl('defs', {});
  forEach(TEAM_COLORS, (color, i) => {
    const marker = createSvgEl('marker', {
      id: `chee-arrowhead-${i}`,
      markerWidth: ARROW_MARKER_WIDTH,
      markerHeight: ARROW_MARKER_HEIGHT,
      refX: ARROW_MARKER_REF_X,
      refY: ARROW_MARKER_REF_Y,
      orient: 'auto',
    });
    const path = createSvgEl('path', {
      d: `M0,0 L${ARROW_MARKER_WIDTH},${ARROW_MARKER_REF_Y} L0,${ARROW_MARKER_HEIGHT} Z`,
      fill: color,
    });
    marker.appendChild(path);
    defs.appendChild(marker);
  });
  return defs;
}

function squareCenter(file, rank, sqW, sqH, isFlipped) {
  if (isFlipped) {
    return {
      x: (LAST_RANK - file + 0.5) * sqW,
      y: (rank + 0.5) * sqH,
    };
  }
  return {
    x: (file + 0.5) * sqW,
    y: (LAST_RANK - rank + 0.5) * sqH,
  };
}

function shortenEnd(from, to, headSize) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const shortenBy = headSize * ARROW_SHORTEN_FACTOR;
  if (dist <= shortenBy) return to;
  return {
    x: to.x - (dx / dist) * shortenBy,
    y: to.y - (dy / dist) * shortenBy,
  };
}

function moveOpacity(idx, total) {
  if (total === 1) return ARROW_OPACITY_MAX;
  return ARROW_OPACITY_MIN + (ARROW_OPACITY_MAX - ARROW_OPACITY_MIN) * (idx / (total - 1));
}

function appendArrow(svg, from, to, opts) {
  const {
    color,
    colorIdx,
    opacity,
    strokeWidth,
    originRadius,
    elClass = 'chee-arrow-el',
    markerEnd,
    dashArray,
  } = opts;
  svg.appendChild(createSvgEl('circle', {
    cx: from.x,
    cy: from.y,
    r: originRadius,
    fill: color,
    opacity,
    class: elClass,
  }));
  const lineAttrs = {
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
    stroke: color,
    'stroke-width': strokeWidth,
    'stroke-linecap': 'round',
    opacity,
    'marker-end': markerEnd || `url(#chee-arrowhead-${colorIdx})`,
    class: elClass,
  };
  if (dashArray) lineAttrs['stroke-dasharray'] = dashArray;
  svg.appendChild(createSvgEl('line', lineAttrs));
}

export class ArrowOverlay {
  constructor() {
    this._svg = null;
    this._boardEl = null;
  }

  mount(boardEl) {
    this._boardEl = boardEl;

    const existing = document.getElementById(ARROW_OVERLAY_ID);
    if (existing) existing.remove();

    const svg = createSvgEl('svg', { id: ARROW_OVERLAY_ID });
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = ARROW_OVERLAY_Z;

    svg.appendChild(createMarkerDefs());

    const parent = boardEl.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(svg);
    }

    this._svg = svg;
  }

  _getBoardMetrics() {
    const rect = this._boardEl.getBoundingClientRect();
    const { width: boardWidth, height: boardHeight } = rect;
    const sqW = boardWidth / BOARD_SIZE;
    const sqH = boardHeight / BOARD_SIZE;
    this._svg.setAttribute('viewBox', `0 0 ${boardWidth} ${boardHeight}`);
    return {
      sqW,
      sqH,
      strokeWidth: ARROW_WIDTH * sqW,
      headSize: ARROW_HEAD_SIZE * sqW,
      originRadius: sqW * ARROW_ORIGIN_RADIUS,
    };
  }

  draw(uciMoves, startTurn, isFlipped) {
    if (!this._svg || !this._boardEl) return;
    if (!uciMoves || uciMoves.length === 0) return;

    this.clear();

    const {
      sqW, sqH, strokeWidth, headSize, originRadius,
    } = this._getBoardMetrics();
    const total = uciMoves.length;

    let turn = startTurn;
    forEach(uciMoves, (uciMove, idx) => {
      if (!uciMove || uciMove.length < UCI_MIN_LEN) return;

      const {
        fromFile, fromRank, toFile, toRank,
      } = parseUci(uciMove);
      const from = squareCenter(fromFile, fromRank, sqW, sqH, isFlipped);
      const to = shortenEnd(from, squareCenter(toFile, toRank, sqW, sqH, isFlipped), headSize);
      const colorIdx = turn === TURN_WHITE ? 0 : 1;

      appendArrow(this._svg, from, to, {
        color: TEAM_COLORS[colorIdx],
        colorIdx,
        opacity: moveOpacity(idx, total),
        strokeWidth,
        originRadius,
      });

      turn = toggleTurn(turn);
    });
  }

  clear() {
    if (!this._svg) return;
    const els = this._svg.querySelectorAll('.chee-arrow-el');
    forEach(els, (el) => el.remove());
  }

  _createMarker(markerId, color, elClass) {
    const defs = this._svg.querySelector('defs');
    const marker = createSvgEl('marker', {
      id: markerId,
      markerWidth: ARROW_MARKER_WIDTH,
      markerHeight: ARROW_MARKER_HEIGHT,
      refX: ARROW_MARKER_REF_X,
      refY: ARROW_MARKER_REF_Y,
      orient: 'auto',
      class: elClass,
    });
    marker.appendChild(createSvgEl('path', {
      d: `M0,0 L${ARROW_MARKER_WIDTH},${ARROW_MARKER_REF_Y} L0,${ARROW_MARKER_HEIGHT} Z`,
      fill: color,
    }));
    defs.appendChild(marker);
  }

  _drawBadge(toFile, toRank, sqW, sqH, isFlipped, color, symbol, elClass) {
    const center = squareCenter(toFile, toRank, sqW, sqH, isFlipped);
    const badgeR = sqW * BADGE_RADIUS;
    const bx = center.x + sqW * BADGE_OFFSET_X;
    const by = center.y - sqH * BADGE_OFFSET_Y;

    this._svg.appendChild(createSvgEl('circle', {
      cx: bx, cy: by, r: badgeR, fill: color, class: elClass,
    }));

    if (symbol) {
      const text = createSvgEl('text', {
        x: bx,
        y: by,
        fill: '#fff',
        'font-size': sqW * BADGE_FONT_SIZE,
        'font-weight': '700',
        'font-family': '-apple-system, BlinkMacSystemFont, sans-serif',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        class: elClass,
      });
      text.textContent = symbol;
      this._svg.appendChild(text);
    }
  }

  drawClassification(uciMove, isFlipped, color, symbol) {
    if (!this._svg || !this._boardEl) return;
    this.clearClassification();
    if (!uciMove || uciMove.length < UCI_MIN_LEN) return;

    const { sqW, sqH } = this._getBoardMetrics();
    const { toFile, toRank } = parseUci(uciMove);
    this._drawBadge(toFile, toRank, sqW, sqH, isFlipped, color, symbol, 'chee-classify-el');
  }

  clearClassification() {
    if (!this._svg) return;
    forEach(this._svg.querySelectorAll('.chee-classify-el'), (el) => el.remove());
  }

  drawHint(uciMove, isFlipped, color, symbol, opacity) {
    if (!this._svg || !this._boardEl) return;
    this.clearHint();
    if (!uciMove || uciMove.length < UCI_MIN_LEN) return;

    const {
      sqW, sqH, strokeWidth, headSize, originRadius,
    } = this._getBoardMetrics();

    const {
      fromFile, fromRank, toFile, toRank,
    } = parseUci(uciMove);
    const from = squareCenter(fromFile, fromRank, sqW, sqH, isFlipped);
    const to = shortenEnd(from, squareCenter(toFile, toRank, sqW, sqH, isFlipped), headSize);

    const markerId = 'chee-hint-arrowhead';
    this._createMarker(markerId, color, 'chee-hint-el');

    appendArrow(this._svg, from, to, {
      color,
      opacity,
      strokeWidth: strokeWidth * HINT_SCALE,
      originRadius: originRadius * HINT_SCALE,
      elClass: 'chee-hint-el',
      markerEnd: `url(#${markerId})`,
    });

    if (symbol) {
      this._drawBadge(toFile, toRank, sqW, sqH, isFlipped, color, symbol, 'chee-hint-el');
    }
  }

  clearHint() {
    if (!this._svg) return;
    forEach(this._svg.querySelectorAll('.chee-hint-el'), (el) => el.remove());
  }

  drawInsight(uciMove, isFlipped, color) {
    if (!this._svg || !this._boardEl) return;
    this.clearInsight();
    if (!uciMove || uciMove.length < UCI_MIN_LEN) return;

    const {
      sqW, sqH, strokeWidth, headSize, originRadius,
    } = this._getBoardMetrics();

    const {
      fromFile, fromRank, toFile, toRank,
    } = parseUci(uciMove);
    const from = squareCenter(fromFile, fromRank, sqW, sqH, isFlipped);
    const to = shortenEnd(from, squareCenter(toFile, toRank, sqW, sqH, isFlipped), headSize);

    const markerId = 'chee-insight-arrowhead';
    this._createMarker(markerId, color, 'chee-insight-el');

    appendArrow(this._svg, from, to, {
      color,
      opacity: INSIGHT_ARROW_OPACITY,
      strokeWidth: strokeWidth * INSIGHT_STROKE_SCALE,
      originRadius: originRadius * INSIGHT_ORIGIN_SCALE,
      elClass: 'chee-insight-el',
      markerEnd: `url(#${markerId})`,
      dashArray: INSIGHT_ARROW_DASH,
    });
  }

  clearInsight() {
    if (!this._svg) return;
    forEach(this._svg.querySelectorAll('.chee-insight-el'), (el) => el.remove());
  }
}
