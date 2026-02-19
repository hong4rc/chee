// Arrow overlay: draws SVG arrows on the chess board for hovered analysis lines

import { forEach, clamp } from 'lodash-es';
import {
  BOARD_SIZE, LAST_RANK, CHAR_CODE_A,
  ARROW_COLORS, ARROW_OPACITY, ARROW_HEAD_SIZE, ARROW_WIDTH,
  ARROW_OVERLAY_ID, ARROW_OVERLAY_Z, ARROW_ORIGIN_RADIUS,
  ARROW_SHORTEN_FACTOR,
  ARROW_MARKER_WIDTH, ARROW_MARKER_HEIGHT, ARROW_MARKER_REF_X, ARROW_MARKER_REF_Y,
  UCI_MIN_LEN,
} from '../constants.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  forEach(attrs, (val, key) => node.setAttribute(key, val));
  return node;
}

function createMarkerDefs() {
  const defs = createSvgEl('defs', {});
  forEach(ARROW_COLORS, (color, i) => {
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

  draw(uciMove, lineIndex, isFlipped) {
    if (!this._svg || !this._boardEl) return;
    if (!uciMove || uciMove.length < UCI_MIN_LEN) return;

    this.clear();

    const rect = this._boardEl.getBoundingClientRect();
    const { width: boardWidth, height: boardHeight } = rect;
    const sqW = boardWidth / BOARD_SIZE;
    const sqH = boardHeight / BOARD_SIZE;

    const fromFile = uciMove.charCodeAt(0) - CHAR_CODE_A;
    const fromRank = parseInt(uciMove[1], 10) - 1;
    const toFile = uciMove.charCodeAt(2) - CHAR_CODE_A;
    const toRank = parseInt(uciMove[3], 10) - 1;

    const from = squareCenter(fromFile, fromRank, sqW, sqH, isFlipped);
    const to = squareCenter(toFile, toRank, sqW, sqH, isFlipped);

    this._svg.setAttribute('viewBox', `0 0 ${boardWidth} ${boardHeight}`);

    const colorIdx = clamp(lineIndex, 0, ARROW_COLORS.length - 1);
    const color = ARROW_COLORS[colorIdx];
    const strokeWidth = ARROW_WIDTH * sqW;
    const headSize = ARROW_HEAD_SIZE * sqW;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const shortenBy = headSize * ARROW_SHORTEN_FACTOR;
    const toX = dist > shortenBy ? to.x - (dx / dist) * shortenBy : to.x;
    const toY = dist > shortenBy ? to.y - (dy / dist) * shortenBy : to.y;

    const circle = createSvgEl('circle', {
      cx: from.x,
      cy: from.y,
      r: sqW * ARROW_ORIGIN_RADIUS,
      fill: color,
      opacity: ARROW_OPACITY,
      class: 'chee-arrow-el',
    });
    this._svg.appendChild(circle);

    const line = createSvgEl('line', {
      x1: from.x,
      y1: from.y,
      x2: toX,
      y2: toY,
      stroke: color,
      'stroke-width': strokeWidth,
      'stroke-linecap': 'round',
      opacity: ARROW_OPACITY,
      'marker-end': `url(#chee-arrowhead-${colorIdx})`,
      class: 'chee-arrow-el',
    });
    this._svg.appendChild(line);
  }

  clear() {
    if (!this._svg) return;
    const els = this._svg.querySelectorAll('.chee-arrow-el');
    forEach(els, (el) => el.remove());
  }
}
