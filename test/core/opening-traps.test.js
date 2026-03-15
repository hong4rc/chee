import {
  describe, it, expect,
} from 'vitest';
import { TRAP_DEFINITIONS, lookupOpeningTrap } from '../../src/core/opening-traps.js';
import { applyUciMove } from '../../src/core/san.js';
import { boardToFen } from '../../src/core/fen.js';
import { STARTING_BOARD } from '../helpers.js';
import {
  LAST_RANK, TURN_WHITE, TURN_BLACK,
} from '../../src/constants.js';

/**
 * Replay UCI moves on a board and return the resulting board.
 */
function replayMoves(moves, startBoard = STARTING_BOARD) {
  let board = startBoard;
  for (const uci of moves) {
    board = applyUciMove(board, uci);
  }
  return board;
}

/**
 * Check that a piece exists at the source square of a UCI move.
 */
function hasPieceAtSource(board, uci) {
  const fromFile = uci.charCodeAt(0) - 97;
  const fromRank = Number(uci[1]) - 1;
  return board[LAST_RANK - fromRank][fromFile] !== null;
}

describe('Opening Traps Database', () => {
  it('has at least 10 trap definitions', () => {
    expect(TRAP_DEFINITIONS.length).toBeGreaterThanOrEqual(10);
  });

  it('each definition has required fields', () => {
    for (const def of TRAP_DEFINITIONS) {
      expect(def.name).toBeTruthy();
      expect([TURN_WHITE, TURN_BLACK]).toContain(def.side);
      expect(def.preamble.length).toBeGreaterThan(0);
      expect(def.steps.length).toBeGreaterThan(0);
    }
  });

  describe('preamble validity', () => {
    for (const def of TRAP_DEFINITIONS) {
      it(`${def.name}: every preamble move has a piece at source`, () => {
        let board = STARTING_BOARD;
        for (const uci of def.preamble) {
          expect(hasPieceAtSource(board, uci)).toBe(true);
          board = applyUciMove(board, uci);
        }
      });
    }
  });

  describe('step validity', () => {
    for (const def of TRAP_DEFINITIONS) {
      it(`${def.name}: every step move has a piece at source`, () => {
        const triggerBoard = replayMoves(def.preamble);
        let board = triggerBoard;
        for (const uci of def.steps) {
          expect(hasPieceAtSource(board, uci)).toBe(true);
          board = applyUciMove(board, uci);
        }
      });
    }
  });

  describe('lookupOpeningTrap', () => {
    for (const def of TRAP_DEFINITIONS) {
      it(`finds ${def.name} by trigger FEN`, () => {
        const triggerBoard = replayMoves(def.preamble);
        const triggerTurn = def.preamble.length % 2 === 0 ? TURN_WHITE : TURN_BLACK;
        const fen = boardToFen(triggerBoard, triggerTurn, '-', '-', 1);

        const result = lookupOpeningTrap(fen);
        expect(result).not.toBeNull();
        expect(result.name).toBe(def.name);
        expect(result.steps.length).toBe(def.steps.length);
      });
    }

    it('returns null for starting position', () => {
      expect(lookupOpeningTrap(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      )).toBeNull();
    });

    it('returns null for random mid-game FEN', () => {
      expect(lookupOpeningTrap(
        'r1bqk2r/ppppbppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4',
      )).toBeNull();
    });

    it('returns null for null/undefined input', () => {
      expect(lookupOpeningTrap(null)).toBeNull();
      expect(lookupOpeningTrap(undefined)).toBeNull();
    });
  });

  describe('no duplicate FEN keys', () => {
    it('each trap has a unique trigger position', () => {
      const fens = new Set();
      for (const def of TRAP_DEFINITIONS) {
        const board = replayMoves(def.preamble);
        const turn = def.preamble.length % 2 === 0 ? TURN_WHITE : TURN_BLACK;
        const fen = boardToFen(board, turn, '-', '-', 1);
        const key = fen.split(' ').slice(0, 2).join(' ');
        expect(fens.has(key)).toBe(false);
        fens.add(key);
      }
    });
  });

  describe('step labels', () => {
    it('Noah\'s Ark: Black benefits, first Black move is Bait', () => {
      const result = lookupOpeningTrap(
        boardToFen(replayMoves(TRAP_DEFINITIONS[0].preamble), TURN_WHITE, '-', '-', 1),
      );
      // Step 0 is White's Qxd4 (opponent) → Greed
      expect(result.steps[0].label).toBe('Greed');
      // Step 1 is Black's c5 (benefiting side first move) → Bait
      expect(result.steps[1].label).toBe('Bait');
      // Step 3 is Black's Be6 → Punish
      expect(result.steps[3].label).toBe('Punish');
    });

    it('Legal Trap: White benefits, first White move is Bait', () => {
      const result = lookupOpeningTrap(
        boardToFen(replayMoves(TRAP_DEFINITIONS[1].preamble), TURN_WHITE, '-', '-', 1),
      );
      // Step 0 is White's Nxe5 (benefiting side) → Bait
      expect(result.steps[0].label).toBe('Bait');
      // Step 1 is Black's Bxd1 (opponent) → Greed
      expect(result.steps[1].label).toBe('Greed');
      // Step 2 is White's Bxf7+ → Punish
      expect(result.steps[2].label).toBe('Punish');
    });
  });
});
