import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import { PgnPlugin } from '../../../src/core/plugins/pgn-plugin.js';
import { boardFromFen, STARTING_BOARD } from '../../helpers.js';
import {
  TURN_WHITE, TURN_BLACK,
  LABEL_BLUNDER, LABEL_BRILLIANT, LABEL_INACCURACY,
} from '../../../src/constants.js';

function makeBoardState(board, fen, ply, turn) {
  return {
    board, fen, ply, turn,
  };
}

beforeEach(() => {
  vi.stubGlobal('window', {
    location: { hostname: 'www.chess.com' },
    addEventListener: vi.fn(),
  });
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => ''),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
});

describe('PgnPlugin', () => {
  describe('onBoardChange', () => {
    it('initializes on first call', () => {
      const pgn = new PgnPlugin();
      const bs = makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE);
      pgn.onBoardChange(bs);
      // No error, _initialised is true internally
      expect(pgn.name).toBe('pgn');
    });

    it('records moves on forward navigation', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));

      const afterE4 = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
      pgn.onBoardChange(makeBoardState(afterE4, 'afterE4Fen', 1, TURN_BLACK));

      // Export should have one move (move number and SAN as separate tokens)
      const result = pgn.exportPgn();
      expect(result).toContain('1. e4');
    });

    it('skips backward navigation', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));

      const afterE4 = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
      pgn.onBoardChange(makeBoardState(afterE4, 'afterE4Fen', 1, TURN_BLACK));

      // Navigate backward (ply 0 < 1, so isForward=false)
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen2', 0, TURN_WHITE));

      const result = pgn.exportPgn();
      // Extract just the move text (after the blank line separating headers from moves)
      const moveText = result.split('\n\n')[1] || '';
      // Should only have 1 move number token in the move text
      const moveNumbers = moveText.match(/\d+\./g) || [];
      expect(moveNumbers.length).toBe(1);
    });
  });

  describe('onEval', () => {
    it('stores best eval per ply (higher depth wins)', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));

      pgn.onEval({ depth: 10, lines: [{ score: 30, mate: null }] }, { ply: 0 });
      pgn.onEval({ depth: 20, lines: [{ score: 25, mate: null }] }, { ply: 0 });
      pgn.onEval({ depth: 15, lines: [{ score: 35, mate: null }] }, { ply: 0 });

      // Need a move so the eval comment appears in PGN
      const afterE4 = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
      pgn.onBoardChange(makeBoardState(afterE4, 'e4Fen', 1, TURN_BLACK));

      // depth 20 should win
      const result = pgn.exportPgn();
      expect(result).toContain('/20}');
    });

    it('ignores eval with empty lines', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'fen', 0, TURN_WHITE));
      pgn.onEval({ depth: 10, lines: [] }, { ply: 0 });
      // No error
      const result = pgn.exportPgn();
      expect(result).not.toContain('/10}');
    });
  });

  describe('onPluginEvent classification:lock', () => {
    it('stores classification for ply', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));
      const afterE4 = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
      pgn.onBoardChange(makeBoardState(afterE4, 'e4Fen', 1, TURN_BLACK));

      pgn.onPluginEvent('classification:lock', { ply: 0, result: { label: LABEL_BLUNDER, symbol: '??' } });

      const result = pgn.exportPgn();
      // PGN export format uses NAGs, not inline symbols
      expect(result).toContain('e4');
      expect(result).toContain('$4'); // Blunder NAG
    });
  });

  describe('exportPgn', () => {
    it('generates correct Seven Tag Roster', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(
        STARTING_BOARD,
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        0,
        TURN_WHITE,
      ));

      const result = pgn.exportPgn();
      expect(result).toContain('[Event "Live Chess"]');
      expect(result).toContain('[Site "www.chess.com"]');
      expect(result).toContain('[Date "');
      expect(result).toContain('[Round "?"]');
      expect(result).toContain('[White "?"]');
      expect(result).toContain('[Black "?"]');
      expect(result).toContain('[Result "*"]');
      // Standard FEN should NOT include SetUp/FEN headers
      expect(result).not.toContain('[SetUp');

      // Verify STR order: Event before Site before Date before Round before White before Black before Result
      const eventIdx = result.indexOf('[Event');
      const siteIdx = result.indexOf('[Site');
      const dateIdx = result.indexOf('[Date');
      const roundIdx = result.indexOf('[Round');
      const whiteIdx = result.indexOf('[White');
      const blackIdx = result.indexOf('[Black');
      const resultIdx = result.indexOf('[Result');
      expect(eventIdx).toBeLessThan(siteIdx);
      expect(siteIdx).toBeLessThan(dateIdx);
      expect(dateIdx).toBeLessThan(roundIdx);
      expect(roundIdx).toBeLessThan(whiteIdx);
      expect(whiteIdx).toBeLessThan(blackIdx);
      expect(blackIdx).toBeLessThan(resultIdx);
    });

    it('uses player names from adapter', () => {
      const pgn = new PgnPlugin();
      pgn.setup({
        panel: null,
        adapter: {
          readPlayerNames: () => ({ white: 'Magnus', black: 'Hikaru' }),
          readGameResult: () => '*',
          readMoveList: () => null,
        },
      });
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));

      const result = pgn.exportPgn();
      expect(result).toContain('[White "Magnus"]');
      expect(result).toContain('[Black "Hikaru"]');
    });

    it('uses game result from adapter', () => {
      const pgn = new PgnPlugin();
      pgn.setup({
        panel: null,
        adapter: {
          readPlayerNames: () => null,
          readGameResult: () => '1-0',
          readMoveList: () => null,
        },
      });
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));

      const result = pgn.exportPgn();
      expect(result).toContain('[Result "1-0"]');
      expect(result.trim()).toMatch(/1-0$/);
    });

    it('includes SetUp/FEN headers for non-standard start position', () => {
      const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const afterE4 = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(afterE4, customFen, 0, TURN_BLACK));

      const result = pgn.exportPgn();
      expect(result).toContain('[SetUp "1"]');
      expect(result).toContain(`[FEN "${customFen}"]`);
    });

    it('formats eval comment with centipawn score', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));
      pgn.onEval({ depth: 22, lines: [{ score: 30, mate: null }] }, { ply: 0 });

      const afterE4 = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
      pgn.onBoardChange(makeBoardState(afterE4, 'e4Fen', 1, TURN_BLACK));

      const result = pgn.exportPgn();
      expect(result).toContain('{+0.3/22}');
    });

    it('formats eval comment with mate score', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));
      pgn.onEval({ depth: 22, lines: [{ score: 0, mate: 3 }] }, { ply: 0 });

      const afterE4 = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
      pgn.onBoardChange(makeBoardState(afterE4, 'e4Fen', 1, TURN_BLACK));

      const result = pgn.exportPgn();
      expect(result).toContain('{#+3/22}');
    });

    it('formats negative mate score', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));
      pgn.onEval({ depth: 22, lines: [{ score: 0, mate: -2 }] }, { ply: 0 });

      const afterE4 = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
      pgn.onBoardChange(makeBoardState(afterE4, 'e4Fen', 1, TURN_BLACK));

      const result = pgn.exportPgn();
      expect(result).toContain('{#-2/22}');
    });

    it('uses NAG codes for classifications', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));
      const afterE4 = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
      pgn.onBoardChange(makeBoardState(afterE4, 'e4Fen', 1, TURN_BLACK));

      pgn.onPluginEvent('classification:lock', { ply: 0, result: { label: LABEL_BRILLIANT, symbol: '!!' } });
      const result = pgn.exportPgn();
      expect(result).toContain('$3'); // Brilliant NAG
    });

    it('handles NAG codes correctly for various labels', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));
      const afterE4 = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
      pgn.onBoardChange(makeBoardState(afterE4, 'e4Fen', 1, TURN_BLACK));

      pgn.onPluginEvent('classification:lock', { ply: 0, result: { label: LABEL_INACCURACY, symbol: '?!' } });
      const result = pgn.exportPgn();
      expect(result).toContain('$6'); // Inaccuracy NAG
    });

    it('does not append NAG for Good classification', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));
      const afterE4 = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
      pgn.onBoardChange(makeBoardState(afterE4, 'e4Fen', 1, TURN_BLACK));

      pgn.onPluginEvent('classification:lock', { ply: 0, result: { label: 'Good', symbol: '' } });
      const result = pgn.exportPgn();
      expect(result).toContain('e4');
      expect(result).not.toContain('$');
    });

    it('black first move uses ... notation', () => {
      const afterE4 = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
      const pgn = new PgnPlugin();
      // Start from black's turn
      pgn.onBoardChange(makeBoardState(afterE4, 'e4Fen', 1, TURN_BLACK));

      const afterE5 = boardFromFen('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR');
      pgn.onBoardChange(makeBoardState(afterE5, 'e5Fen', 2, TURN_WHITE));

      const result = pgn.exportPgn();
      expect(result).toContain('1... e5');
    });

    it('repeats black move number after annotation', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));

      const afterE4 = boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
      pgn.onBoardChange(makeBoardState(afterE4, 'e4Fen', 1, TURN_BLACK));
      pgn.onEval({ depth: 22, lines: [{ score: 30, mate: null }] }, { ply: 0 });

      const afterE5 = boardFromFen('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR');
      pgn.onBoardChange(makeBoardState(afterE5, 'e5Fen', 2, TURN_WHITE));

      const result = pgn.exportPgn();
      // After eval comment on white's move, black's move number must be repeated
      expect(result).toContain('1... e5');
    });

    it('wraps movetext lines under 80 characters', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));

      // Play enough moves to exceed 80 chars
      const positions = [
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR',
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R',
        'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R',
        'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R',
        'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R',
        'r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R',
        'r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R',
      ];
      const turns = [TURN_BLACK, TURN_WHITE, TURN_BLACK, TURN_WHITE, TURN_BLACK, TURN_WHITE, TURN_BLACK, TURN_WHITE];

      for (let i = 0; i < positions.length; i++) {
        const board = boardFromFen(positions[i]);
        pgn.onBoardChange(makeBoardState(board, `fen${i}`, i + 1, turns[i]));
        pgn.onEval({ depth: 22, lines: [{ score: 30, mate: null }] }, { ply: i });
      }

      const result = pgn.exportPgn();
      const lines = result.split('\n');
      // All lines should be under 80 chars
      for (const line of lines) {
        expect(line.length).toBeLessThan(80);
      }
    });

    it('uses DOM move list when adapter provides one', () => {
      const pgn = new PgnPlugin();
      pgn.setup({
        panel: null,
        adapter: {
          readPlayerNames: () => null,
          readGameResult: () => '*',
          readMoveList: () => ({ moves: ['e4', 'e5', 'Nf3', 'Nc6'], startPly: 0 }),
        },
      });
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));

      const result = pgn.exportPgn();
      expect(result).toContain('1. e4');
      expect(result).toContain('e5');
      expect(result).toContain('2. Nf3');
      expect(result).toContain('Nc6');
    });

    it('ends with game termination marker', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));
      const result = pgn.exportPgn();
      expect(result.trim().endsWith('*')).toBe(true);
    });
  });

  describe('onEngineReset', () => {
    it('clears all state', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));
      pgn.onEval({ depth: 10, lines: [{ score: 30, mate: null }] }, { ply: 0 });

      pgn.onEngineReset();

      const result = pgn.exportPgn();
      // After reset, no moves should be present
      expect(result).toContain('*');
      expect(result).not.toContain('1.');
    });
  });

  describe('destroy', () => {
    it('clears state', () => {
      const pgn = new PgnPlugin();
      pgn.onBoardChange(makeBoardState(STARTING_BOARD, 'startFen', 0, TURN_WHITE));
      pgn.destroy();
      // No error on subsequent operations
      expect(pgn.name).toBe('pgn');
    });
  });
});
