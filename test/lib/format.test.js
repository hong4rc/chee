import { describe, it, expect } from 'vitest';
import {
  advantageCls, formatMate, formatCp, CLS_MATE,
} from '../../src/lib/format.js';

describe('CLS_MATE', () => {
  it('is the string "mate-score"', () => {
    expect(CLS_MATE).toBe('mate-score');
  });
});

describe('advantageCls', () => {
  it('returns white-advantage when isWhite is true', () => {
    expect(advantageCls(true)).toBe('white-advantage');
  });

  it('returns black-advantage when isWhite is false', () => {
    expect(advantageCls(false)).toBe('black-advantage');
  });

  it('returns black-advantage for falsy values', () => {
    expect(advantageCls(0)).toBe('black-advantage');
    expect(advantageCls(null)).toBe('black-advantage');
    expect(advantageCls(undefined)).toBe('black-advantage');
    expect(advantageCls('')).toBe('black-advantage');
  });

  it('returns white-advantage for truthy values', () => {
    expect(advantageCls(1)).toBe('white-advantage');
    expect(advantageCls('yes')).toBe('white-advantage');
  });
});

describe('formatMate', () => {
  it('formats positive mate with M prefix', () => {
    expect(formatMate(3)).toBe('M3');
  });

  it('formats mate in 1', () => {
    expect(formatMate(1)).toBe('M1');
  });

  it('formats negative mate with -M prefix', () => {
    expect(formatMate(-4)).toBe('-M4');
  });

  it('formats negative mate in 1', () => {
    expect(formatMate(-1)).toBe('-M1');
  });

  it('formats large mate distances', () => {
    expect(formatMate(25)).toBe('M25');
    expect(formatMate(-30)).toBe('-M30');
  });
});

describe('formatCp', () => {
  it('formats positive centipawns with + prefix', () => {
    expect(formatCp(150)).toBe('+150.0');
  });

  it('formats zero with + prefix', () => {
    expect(formatCp(0)).toBe('+0.0');
  });

  it('formats negative centipawns without extra prefix', () => {
    expect(formatCp(-200)).toBe('-200.0');
  });

  it('formats fractional centipawns to one decimal', () => {
    expect(formatCp(1.55)).toBe('+1.6');
    expect(formatCp(-0.75)).toBe('-0.8');
  });

  it('formats small values', () => {
    expect(formatCp(0.1)).toBe('+0.1');
    expect(formatCp(-0.1)).toBe('-0.1');
  });

  it('formats negative zero as positive', () => {
    expect(formatCp(-0)).toBe('+0.0');
  });
});
