// Reusable DOM helpers

import { findIndex } from 'lodash-es';

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
