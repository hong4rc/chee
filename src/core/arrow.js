// Arrow overlay: draws SVG arrows on the chess board for hovered analysis lines

import { forEach } from 'lodash-es';
import {
  BOARD_SIZE, LAST_RANK, CHAR_CODE_A,
  ARROW_COLOR_WHITE, ARROW_COLOR_BLACK,
  ARROW_OPACITY_MAX, ARROW_OPACITY_MIN, ARROW_HEAD_SIZE, ARROW_WIDTH,
  ARROW_OVERLAY_ID, ARROW_OVERLAY_Z, ARROW_ORIGIN_RADIUS,
  ARROW_SHORTEN_FACTOR,
  ARROW_MARKER_WIDTH, ARROW_MARKER_HEIGHT, ARROW_MARKER_REF_X, ARROW_MARKER_REF_Y,
  UCI_MIN_LEN, TURN_WHITE, TURN_BLACK,
} from '../constants.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TEAM_COLORS = [ARROW_COLOR_WHITE, ARROW_COLOR_BLACK];

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

function parseUci(uciMove) {
  return {
    fromFile: uciMove.charCodeAt(0) - CHAR_CODE_A,
    fromRank: parseInt(uciMove[1], 10) - 1,
    toFile: uciMove.charCodeAt(2) - CHAR_CODE_A,
    toRank: parseInt(uciMove[3], 10) - 1,
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
  } = opts;
  svg.appendChild(createSvgEl('circle', {
    cx: from.x,
    cy: from.y,
    r: originRadius,
    fill: color,
    opacity,
    class: 'chee-arrow-el',
  }));
  svg.appendChild(createSvgEl('line', {
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
    stroke: color,
    'stroke-width': strokeWidth,
    'stroke-linecap': 'round',
    opacity,
    'marker-end': `url(#chee-arrowhead-${colorIdx})`,
    class: 'chee-arrow-el',
  }));
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

  draw(uciMoves, startTurn, isFlipped) {
    if (!this._svg || !this._boardEl) return;
    if (!uciMoves || uciMoves.length === 0) return;

    this.clear();

    const rect = this._boardEl.getBoundingClientRect();
    const { width: boardWidth, height: boardHeight } = rect;
    const sqW = boardWidth / BOARD_SIZE;
    const sqH = boardHeight / BOARD_SIZE;

    this._svg.setAttribute('viewBox', `0 0 ${boardWidth} ${boardHeight}`);

    const strokeWidth = ARROW_WIDTH * sqW;
    const headSize = ARROW_HEAD_SIZE * sqW;
    const originRadius = sqW * ARROW_ORIGIN_RADIUS;
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

      turn = turn === TURN_WHITE ? TURN_BLACK : TURN_WHITE;
    });
  }

  clear() {
    if (!this._svg) return;
    const els = this._svg.querySelectorAll('.chee-arrow-el');
    forEach(els, (el) => el.remove());
  }
}
