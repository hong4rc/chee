// Reusable DOM helpers

import { findIndex } from 'lodash-es';
import { BOARD_SIZE, LAST_RANK } from '../constants.js';

export const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Find the index of `target` inside a NodeList (or array) by reference equality.
 * Returns -1 when target is falsy or not found.
 * Works directly on NodeList — no Array.from() copy needed.
 */
export const indexOfNode = (nodes, target) => (
  target ? findIndex(nodes, (n) => n === target) : -1
);

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
  }
  return node;
}

/**
 * Convert a MouseEvent to board square { file, rank } (0-indexed).
 * Works on both chess.com and lichess — uses board bounding rect ÷ 8.
 * Returns null if the click is outside the board.
 */
export function eventToSquare(e, boardEl, isFlipped) {
  const rect = boardEl.getBoundingClientRect();
  const sqSize = rect.width / BOARD_SIZE;
  let col = Math.floor((e.clientX - rect.left) / sqSize);
  let row = Math.floor((e.clientY - rect.top) / sqSize);
  if (col < 0 || col > LAST_RANK || row < 0 || row > LAST_RANK) return null;
  if (isFlipped) { col = LAST_RANK - col; row = LAST_RANK - row; }
  return { file: col, rank: LAST_RANK - row };
}
