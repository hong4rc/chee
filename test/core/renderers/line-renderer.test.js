// @vitest-environment jsdom
import {
  describe, it, expect, beforeEach,
} from 'vitest';
import { LineRenderer } from '../../../src/core/renderers/line-renderer.js';
import {
  TURN_WHITE, TURN_BLACK,
  MAX_PV_MOVES,
} from '../../../src/constants.js';
import { STARTING_BOARD } from '../../helpers.js';

/**
 * Build a LineRenderer with `numLines` lines, mount its DOM into the document,
 * and call bind() so internal element references are wired up.
 */
function mountRenderer(numLines = 3) {
  const renderer = new LineRenderer(numLines);
  const container = renderer.createDOM();
  document.body.innerHTML = '';
  document.body.appendChild(container);
  // bind expects panelEl whose subtree contains the .chee-line elements
  renderer.bind(document.body);
  return renderer;
}

function makeLine(score, pv, mate = null) {
  return { score, pv, mate };
}

describe('LineRenderer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('updateLines — move span creation', () => {
    it('creates correct number of move spans for each line', () => {
      const renderer = mountRenderer(2);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      renderer.updateLines([
        makeLine(50, ['e2e4', 'e7e5', 'g1f3']),
        makeLine(30, ['d2d4', 'g8f6']),
      ]);

      const lineEls = document.querySelectorAll('.chee-line');
      const spans0 = lineEls[0].querySelectorAll('.chee-move');
      const spans1 = lineEls[1].querySelectorAll('.chee-move');
      expect(spans0.length).toBe(3);
      expect(spans1.length).toBe(2);
    });

    it('creates no spans for an empty pv', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      renderer.updateLines([makeLine(0, [])]);

      const spans = document.querySelectorAll('.chee-move');
      expect(spans.length).toBe(0);
    });

    it('clamps pv to MAX_PV_MOVES', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      // Build a pv longer than MAX_PV_MOVES
      const longPv = [
        'e2e4', 'e7e5', 'g1f3', 'b8c6',
        'f1b5', 'a7a6', 'b5a4', 'g8f6',
        'd2d3', 'b7b5',
      ];
      expect(longPv.length).toBeGreaterThan(MAX_PV_MOVES);

      renderer.updateLines([makeLine(20, longPv)]);

      const spans = document.querySelectorAll('.chee-move');
      expect(spans.length).toBe(MAX_PV_MOVES);
    });
  });

  describe('updateLines — DOM reuse (no mutation when text matches)', () => {
    it('reuses existing spans when text matches', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      const pv = ['e2e4', 'e7e5', 'g1f3'];
      renderer.updateLines([makeLine(50, pv)]);

      // Grab references to the original span elements
      const originalSpans = [...document.querySelectorAll('.chee-move')];
      expect(originalSpans.length).toBe(3);
      const originalTexts = originalSpans.map((s) => s.textContent);

      // Update with the same PV — spans should be the same DOM nodes
      renderer.updateLines([makeLine(55, pv)]);

      const afterSpans = [...document.querySelectorAll('.chee-move')];
      expect(afterSpans.length).toBe(3);
      afterSpans.forEach((span, i) => {
        expect(span).toBe(originalSpans[i]);
        expect(span.textContent).toBe(originalTexts[i]);
      });
    });
  });

  describe('updateLines — span text updates when moves change', () => {
    it('updates span textContent when a move changes', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      renderer.updateLines([makeLine(50, ['e2e4', 'e7e5'])]);
      const beforeText = document.querySelectorAll('.chee-move')[0].textContent;

      // Change the first move in PV
      renderer.updateLines([makeLine(50, ['d2d4', 'e7e5'])]);
      const afterText = document.querySelectorAll('.chee-move')[0].textContent;

      expect(afterText).not.toBe(beforeText);
      // Second move stays the same SAN since the board context changed,
      // but the first move should now be d4 instead of e4
      expect(afterText).toBe('d4');
    });
  });

  describe('updateLines — removes excess spans when line gets shorter', () => {
    it('removes trailing spans when PV shrinks', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      renderer.updateLines([makeLine(50, ['e2e4', 'e7e5', 'g1f3'])]);
      expect(document.querySelectorAll('.chee-move').length).toBe(3);

      renderer.updateLines([makeLine(50, ['e2e4'])]);
      expect(document.querySelectorAll('.chee-move').length).toBe(1);
      expect(document.querySelector('.chee-move').textContent).toBe('e4');
    });

    it('removes all spans when line becomes null', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      renderer.updateLines([makeLine(50, ['e2e4', 'e7e5'])]);
      expect(document.querySelectorAll('.chee-move').length).toBe(2);

      // Pass empty lines array — the single line slot gets null
      renderer.updateLines([]);
      expect(document.querySelectorAll('.chee-move').length).toBe(0);
    });

    it('leaves only element children after removing excess spans', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      renderer.updateLines([makeLine(50, ['e2e4', 'e7e5', 'g1f3'])]);
      const movesEl = document.querySelector('.chee-line-moves');
      expect(movesEl.children.length).toBe(3);

      renderer.updateLines([makeLine(50, ['e2e4'])]);
      expect(movesEl.children.length).toBe(1);
    });
  });

  describe('updateLines — adds new spans when line gets longer', () => {
    it('appends new spans to an existing line', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      renderer.updateLines([makeLine(50, ['e2e4'])]);
      expect(document.querySelectorAll('.chee-move').length).toBe(1);

      renderer.updateLines([makeLine(50, ['e2e4', 'e7e5', 'g1f3'])]);
      const spans = document.querySelectorAll('.chee-move');
      expect(spans.length).toBe(3);
      // Each span should have a data-idx attribute
      expect(spans[0].dataset.idx).toBe('0');
      expect(spans[1].dataset.idx).toBe('1');
      expect(spans[2].dataset.idx).toBe('2');
    });

    it('uses CSS spacing — no text node separators between spans', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      renderer.updateLines([makeLine(50, ['e2e4', 'e7e5'])]);
      const movesEl = document.querySelector('.chee-line-moves');
      // 2 spans, no text nodes — CSS margin-right handles spacing
      expect(movesEl.children.length).toBe(2);
      expect(movesEl.childNodes.length).toBe(2);
    });
  });

  describe('score display', () => {
    it('displays centipawn score with correct format for white turn', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      renderer.updateLines([makeLine(150, ['e2e4'])]);

      const scoreEl = document.querySelector('.chee-line-score');
      // 150 / CENTIPAWN_DIVISOR = 1.5 → "+1.5"
      expect(scoreEl.textContent).toBe('+1.5');
      expect(scoreEl.className).toContain('white-advantage');
    });

    it('displays negative centipawn score', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      renderer.updateLines([makeLine(-200, ['e2e4'])]);

      const scoreEl = document.querySelector('.chee-line-score');
      expect(scoreEl.textContent).toBe('-2.0');
      expect(scoreEl.className).toContain('black-advantage');
    });

    it('negates score for black turn', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_BLACK);

      // Engine reports +100 from side-to-move (black), white-perspective = -100
      renderer.updateLines([makeLine(100, ['e7e5'])]);

      const scoreEl = document.querySelector('.chee-line-score');
      expect(scoreEl.textContent).toBe('-1.0');
      expect(scoreEl.className).toContain('black-advantage');
    });

    it('displays mate score with M prefix', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      renderer.updateLines([makeLine(0, ['e2e4'], 3)]);

      const scoreEl = document.querySelector('.chee-line-score');
      expect(scoreEl.textContent).toBe('M3');
      expect(scoreEl.className).toContain('white-advantage');
    });

    it('displays negative mate score', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      renderer.updateLines([makeLine(0, ['e2e4'], -2)]);

      const scoreEl = document.querySelector('.chee-line-score');
      expect(scoreEl.textContent).toBe('-M2');
      expect(scoreEl.className).toContain('black-advantage');
    });

    it('negates mate for black turn', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_BLACK);

      // mate=2 from black's perspective → white-perspective = -2
      renderer.updateLines([makeLine(0, ['e7e5'], 2)]);

      const scoreEl = document.querySelector('.chee-line-score');
      expect(scoreEl.textContent).toBe('-M2');
      expect(scoreEl.className).toContain('black-advantage');
    });

    it('clears score when line becomes null', () => {
      const renderer = mountRenderer(1);
      renderer.setBoard(STARTING_BOARD, TURN_WHITE);

      renderer.updateLines([makeLine(150, ['e2e4'])]);
      expect(document.querySelector('.chee-line-score').textContent).toBe('+1.5');

      renderer.updateLines([]);
      const scoreEl = document.querySelector('.chee-line-score');
      expect(scoreEl.textContent).toBe('');
      expect(scoreEl.className).toBe('chee-line-score');
    });
  });
});
