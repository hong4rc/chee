import { describe, it, expect } from 'vitest';
import { parseUci } from '../../src/lib/uci.js';

describe('parseUci', () => {
  it('parses a standard move', () => {
    expect(parseUci('e2e4')).toEqual({
      fromFile: 4, fromRank: 1, toFile: 4, toRank: 3, promotion: null,
    });
  });

  it('parses a promotion move', () => {
    expect(parseUci('e7e8q')).toEqual({
      fromFile: 4, fromRank: 6, toFile: 4, toRank: 7, promotion: 'q',
    });
  });

  it('parses corner-to-corner (a1h8)', () => {
    expect(parseUci('a1h8')).toEqual({
      fromFile: 0, fromRank: 0, toFile: 7, toRank: 7, promotion: null,
    });
  });

  it('parses corner-to-corner (h1a8)', () => {
    expect(parseUci('h1a8')).toEqual({
      fromFile: 7, fromRank: 0, toFile: 0, toRank: 7, promotion: null,
    });
  });

  it('parses knight promotion', () => {
    expect(parseUci('a7a8n')).toEqual({
      fromFile: 0, fromRank: 6, toFile: 0, toRank: 7, promotion: 'n',
    });
  });
});
