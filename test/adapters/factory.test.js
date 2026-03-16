import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

vi.mock('../../src/adapters/chesscom.js', () => {
  const ChesscomAdapter = vi.fn(function stub() { this.site = 'chesscom'; });
  return { ChesscomAdapter };
});

vi.mock('../../src/adapters/lichess.js', () => {
  const LichessAdapter = vi.fn(function stub() { this.site = 'lichess'; });
  return { LichessAdapter };
});

describe('createAdapter', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns ChesscomAdapter for www.chess.com', async () => {
    vi.stubGlobal('window', { location: { hostname: 'www.chess.com' } });

    const { createAdapter } = await import('../../src/adapters/factory.js');
    const adapter = createAdapter();

    expect(adapter.site).toBe('chesscom');
  });

  it('returns ChesscomAdapter for bare chess.com', async () => {
    vi.stubGlobal('window', { location: { hostname: 'chess.com' } });

    const { createAdapter } = await import('../../src/adapters/factory.js');
    const adapter = createAdapter();

    expect(adapter.site).toBe('chesscom');
  });

  it('returns LichessAdapter for lichess.org', async () => {
    vi.stubGlobal('window', { location: { hostname: 'lichess.org' } });

    const { createAdapter } = await import('../../src/adapters/factory.js');
    const adapter = createAdapter();

    expect(adapter.site).toBe('lichess');
  });

  it('returns LichessAdapter for www.lichess.org', async () => {
    vi.stubGlobal('window', { location: { hostname: 'www.lichess.org' } });

    const { createAdapter } = await import('../../src/adapters/factory.js');
    const adapter = createAdapter();

    expect(adapter.site).toBe('lichess');
  });

  it('falls back to ChesscomAdapter for unknown hostname', async () => {
    vi.stubGlobal('window', { location: { hostname: 'example.com' } });

    const { createAdapter } = await import('../../src/adapters/factory.js');
    const adapter = createAdapter();

    expect(adapter.site).toBe('chesscom');
  });
});
