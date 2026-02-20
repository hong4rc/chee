// Reusable DOM helpers

import { findIndex } from 'lodash-es';

/**
 * Find the index of `target` inside a NodeList (or array) by reference equality.
 * Returns -1 when target is falsy or not found.
 * Works directly on NodeList — no Array.from() copy needed.
 */
export const indexOfNode = (nodes, target) => (
  target ? findIndex(nodes, (n) => n === target) : -1
);
