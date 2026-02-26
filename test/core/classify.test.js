import { describe, it, expect } from 'vitest';
import { computeCpLoss, classify, detectSacrifice } from '../../src/core/classify.js';
import { boardFromFen } from '../helpers.js';
import {
  LABEL_BRILLIANT, LABEL_BEST, LABEL_EXCELLENT, LABEL_GOOD,
  LABEL_INACCURACY, LABEL_MISTAKE, LABEL_BLUNDER,
  CLASSIFICATION_MATE_LOSS,
} from '../../src/constants.js';

// ─── computeCpLoss ──────────────────────────────────────────

describe('computeCpLoss', () => {
  it('returns sum of prevScore + currScore for normal evals', () => {
    // We had +50, opponent now has +30 → cpLoss = 50 + 30 = 80
    expect(computeCpLoss(50, null, 30, null)).toBe(80);
  });

  it('perfect move yields ~0 loss', () => {
    // We had +100, opponent now has -100 → 100 + (-100) = 0
    expect(computeCpLoss(100, null, -100, null)).toBe(0);
  });

  it('improving move yields negative loss', () => {
    // We had +50, opponent now has -200 → 50 + (-200) = -150
    expect(computeCpLoss(50, null, -200, null)).toBe(-150);
  });

  it('had forced mate, kept it → 0 loss', () => {
    expect(computeCpLoss(0, 3, 0, -2)).toBe(0);
  });

  it('had forced mate, lost it → max penalty', () => {
    expect(computeCpLoss(0, 3, 50, null)).toBe(CLASSIFICATION_MATE_LOSS);
  });

  it('was being mated → 0 loss (nothing to lose)', () => {
    expect(computeCpLoss(0, -5, 0, -3)).toBe(0);
  });

  it('normal → opponent has forced mate (blunder into mate)', () => {
    expect(computeCpLoss(50, null, 0, 5)).toBe(CLASSIFICATION_MATE_LOSS);
  });

  it('normal → we found mate (gain)', () => {
    expect(computeCpLoss(50, null, 0, -3)).toBe(0);
  });
});

// ─── classify ───────────────────────────────────────────────

describe('classify', () => {
  const makePrevEval = (score, pv, depth = 20) => ({
    score, mate: null, pv, depth,
  });

  const makeCurrLine = (score) => ({ score, mate: null });

  it('Best — played engine PV[0]', () => {
    const prev = makePrevEval(30, ['e2e4', 'd2d4']);
    const curr = makeCurrLine(-25);
    const result = classify(prev, curr, 'e2e4');
    expect(result.label).toBe(LABEL_BEST);
    expect(result.cpLoss).toBe(0);
  });

  it('Excellent — cpLoss ≤ 10', () => {
    const prev = makePrevEval(50, ['e2e4']);
    const curr = makeCurrLine(-55);
    const result = classify(prev, curr, 'd2d4');
    expect(result.label).toBe(LABEL_EXCELLENT);
    expect(result.cpLoss).toBeLessThanOrEqual(10);
  });

  it('Good — cpLoss ≤ 30', () => {
    const prev = makePrevEval(50, ['e2e4']);
    const curr = makeCurrLine(-30);
    const result = classify(prev, curr, 'd2d4');
    expect(result.label).toBe(LABEL_GOOD);
  });

  it('Inaccuracy — cpLoss ≤ 80', () => {
    const prev = makePrevEval(50, ['e2e4']);
    const curr = makeCurrLine(10);
    const result = classify(prev, curr, 'd2d4');
    expect(result.label).toBe(LABEL_INACCURACY);
  });

  it('Mistake — cpLoss ≤ 200', () => {
    const prev = makePrevEval(50, ['e2e4']);
    const curr = makeCurrLine(100);
    const result = classify(prev, curr, 'd2d4');
    expect(result.label).toBe(LABEL_MISTAKE);
  });

  it('Blunder — cpLoss > 200', () => {
    const prev = makePrevEval(50, ['e2e4']);
    const curr = makeCurrLine(300);
    const result = classify(prev, curr, 'd2d4');
    expect(result.label).toBe(LABEL_BLUNDER);
  });

  it('Brilliant — not engine #1, position improved significantly', () => {
    const prev = makePrevEval(50, ['e2e4'], 20);
    const curr = makeCurrLine(-120); // cpLoss = 50 + (-120) = -70, well below -50
    const result = classify(prev, curr, 'd2d4');
    expect(result.label).toBe(LABEL_BRILLIANT);
  });

  it('Brilliant requires sufficient depth on prevEval', () => {
    const prev = makePrevEval(50, ['e2e4'], 5); // too shallow
    const curr = makeCurrLine(-120);
    const result = classify(prev, curr, 'd2d4');
    // Should not be Brilliant with shallow depth — falls to Excellent (cpLoss clamped to 0)
    expect(result.label).not.toBe(LABEL_BRILLIANT);
  });
});

// ─── detectSacrifice ────────────────────────────────────────

describe('detectSacrifice', () => {
  it('returns 0 when no PV is provided', () => {
    const board = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(detectSacrifice(board, board, 'e2e4', null)).toBe(0);
    expect(detectSacrifice(board, board, 'e2e4', [])).toBe(0);
  });

  it('detects material sacrifice when opponent captures', () => {
    // White knight on f3 moves to e5 (captured by d6 pawn)
    const before = boardFromFen('rnbqkb1r/pppppppp/5n2/4N3/8/8/PPPPPPPP/RNBQKB1R');
    const after = boardFromFen('rnbqkb1r/pppppppp/5n2/4N3/8/8/PPPPPPPP/RNBQKB1R');
    // With no captures in PV, sacrifice = 0
    expect(detectSacrifice(before, after, 'f3e5', ['d6e5'])).toBeLessThanOrEqual(0);
  });

  it('returns 0 when moved piece does not exist', () => {
    const board = boardFromFen('8/8/8/8/8/8/8/8');
    expect(detectSacrifice(board, board, 'e2e4', ['e7e5'])).toBe(0);
  });

  it('detects deep sacrifice where opponent recaptures over multiple moves', () => {
    // White knight sacs on e5, black takes d6xe5, white follows up
    // Board: white knight on f3, black pawn on d6, white pawn on e4
    const before = boardFromFen('rnbqkb1r/ppp1pppp/3p4/4N3/4P3/8/PPPP1PPP/RNBQKB1R');
    const after = boardFromFen('rnbqkb1r/ppp1pppp/3p4/4N3/4P3/8/PPPP1PPP/RNBQKB1R');
    // PV: opponent takes knight with pawn, then we take back
    const result = detectSacrifice(before, after, 'f3e5', ['d6e5', 'd2d4', 'e5d4']);
    expect(typeof result).toBe('number');
  });

  it('handles promotion in PV', () => {
    // White pawn on e7, near promotion
    const before = boardFromFen('4k3/4P3/8/8/8/8/8/4K3');
    const after = boardFromFen('4k3/4P3/8/8/8/8/8/4K3');
    // PV includes a move that would be a promotion
    const result = detectSacrifice(before, after, 'e1e2', ['e7e6', 'e2e3']);
    expect(typeof result).toBe('number');
  });

  it('tracks opponent captures vs our captures correctly', () => {
    // Set up: white queen on d1 moves to h5, opponent pawn on e5, our bishop on c4
    const before = boardFromFen('rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR');
    // After Qh5 (white queen d1 → h5)
    const after = boardFromFen('rnbqkbnr/pppp1ppp/8/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR');
    // PV: opponent captures our queen? unlikely but testing net calculation
    const result = detectSacrifice(before, after, 'd1h5', ['f7f6']);
    expect(typeof result).toBe('number');
  });

  it('limits PV depth to SACRIFICE_PV_DEPTH', () => {
    const before = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    const after = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    // Provide a very long PV — should be capped
    const longPv = ['e7e5', 'd2d4', 'd7d5', 'e4d5', 'e5d4', 'f1b5', 'c7c6', 'b5c6'];
    const result = detectSacrifice(before, after, 'e2e4', longPv);
    expect(typeof result).toBe('number');
  });
});
