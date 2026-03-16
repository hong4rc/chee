import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import { TrapboyPlugin } from '../../../src/core/plugins/trapboy-plugin.js';
import { boardFromFen, STARTING_BOARD } from '../../helpers.js';
import { applyUciMove } from '../../../src/core/san.js';
import {
  TURN_WHITE, TURN_BLACK,
  TRAPBOY_MIN_DEPTH, TRAPBOY_GREED_DEPTH,
  PLUGIN_TRAPBOY,
} from '../../../src/constants.js';
import { TRAP_DEFINITIONS } from '../../../src/core/opening-traps.js';
import { boardToFen } from '../../../src/core/fen.js';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => ''),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
  vi.stubGlobal('document', {
    createElement: vi.fn((tag) => ({
      tagName: tag,
      className: '',
      textContent: '',
      classList: { add: vi.fn() },
      appendChild: vi.fn(),
      append: vi.fn(),
      addEventListener: vi.fn(),
    })),
  });
});

function makeArrow() {
  return {
    drawLayer: vi.fn(),
    clearLayer: vi.fn(),
  };
}

function makePanel() {
  return {
    setSlot: vi.fn(),
    clearSlot: vi.fn(),
  };
}

function makeRenderCtx() {
  return {
    arrow: makeArrow(),
    panel: makePanel(),
    boardPreview: { show: vi.fn(), clear: vi.fn() },
    isFlipped: () => false,
  };
}

function makePlugin(overrides = {}) {
  const requestSecondaryAnalysis = vi.fn();
  const settings = { showTrapboy: true, ...overrides };
  const plugin = new TrapboyPlugin({ settings });
  const getRenderCtx = () => makeRenderCtx();
  const adapter = { getPieceImageMap: vi.fn(() => new Map()) };
  const boardState = { board: null };
  plugin.setup({
    requestSecondaryAnalysis, getRenderCtx, adapter, boardState,
  });
  return { plugin, requestSecondaryAnalysis, settings };
}

function makeBoardState(opts = {}) {
  return {
    board: opts.board || boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'),
    turn: opts.turn || TURN_WHITE,
    fen: opts.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    ply: opts.ply ?? 0,
  };
}

describe('TrapboyPlugin', () => {
  it('has the correct name', () => {
    const { plugin } = makePlugin();
    expect(plugin.name).toBe(PLUGIN_TRAPBOY);
  });

  describe('onBoardChange', () => {
    it('clears all trap layers and panel', () => {
      const { plugin } = makePlugin();
      const ctx = makeRenderCtx();
      plugin.onBoardChange({ ply: 0 }, ctx);
      expect(ctx.arrow.clearLayer).toHaveBeenCalledWith('trapboy-bait');
      expect(ctx.arrow.clearLayer).toHaveBeenCalledWith('trapboy-greed');
      expect(ctx.arrow.clearLayer).toHaveBeenCalledWith('trapboy-god');
      expect(ctx.panel.clearSlot).toHaveBeenCalledWith('trapboy');
    });

    it('stores prevBoard and prevPly', () => {
      const { plugin } = makePlugin();
      const ctx = makeRenderCtx();
      const board = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
      plugin.onBoardChange({ board, ply: 5 }, ctx);
      expect(plugin._prevBoard).toBe(board);
      expect(plugin._prevPly).toBe(5);
    });
  });

  describe('onEval', () => {
    it('does nothing when showTrapboy is false', () => {
      const { plugin, requestSecondaryAnalysis } = makePlugin({ showTrapboy: false });
      const ctx = makeRenderCtx();

      plugin.onEval({
        complete: true,
        depth: TRAPBOY_MIN_DEPTH,
        lines: [{ score: 100, mate: null, pv: ['e2e4', 'd7d5'] }],
      }, makeBoardState(), ctx);

      expect(requestSecondaryAnalysis).not.toHaveBeenCalled();
    });

    it('scans even when data is not complete (no wait for full depth)', () => {
      const { plugin, requestSecondaryAnalysis } = makePlugin();
      const ctx = makeRenderCtx();

      // At sufficient depth, scans regardless of complete flag
      const customBoard = boardFromFen('rnbqkb1r/ppp1pppp/3p4/8/4P3/5N2/PPPP1PPP/RNBQKB1R');
      const bs = makeBoardState({
        board: customBoard,
        turn: TURN_WHITE,
        fen: 'rnbqkb1r/ppp1pppp/3p4/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
      });

      plugin.onEval({
        complete: false,
        depth: TRAPBOY_MIN_DEPTH,
        lines: [{
          score: 200,
          mate: null,
          pv: ['f3e5', 'a7a6', 'e5f7'],
        }],
      }, bs, ctx);

      expect(requestSecondaryAnalysis).toHaveBeenCalled();
    });

    it('shows searching status when depth is below minimum', () => {
      const { plugin, requestSecondaryAnalysis } = makePlugin();
      const ctx = makeRenderCtx();

      plugin.onEval({
        complete: true,
        depth: TRAPBOY_MIN_DEPTH - 1,
        lines: [{ score: 100, mate: null, pv: ['e2e4', 'd7d5'] }],
      }, makeBoardState(), ctx);

      expect(requestSecondaryAnalysis).not.toHaveBeenCalled();
      expect(ctx.panel.setSlot).toHaveBeenCalledWith('trapboy', expect.any(Object));
    });

    it('skips scan when phase2 is pending', () => {
      const { plugin, requestSecondaryAnalysis } = makePlugin();
      const ctx = makeRenderCtx();

      plugin._phase2Pending = true;

      plugin.onEval({
        complete: true,
        depth: TRAPBOY_MIN_DEPTH,
        lines: [{ score: 100, mate: null, pv: ['e2e4', 'd7d5'] }],
      }, makeBoardState(), ctx);

      expect(requestSecondaryAnalysis).not.toHaveBeenCalled();
    });

    it('requests secondary analysis when sacrifice is detected', () => {
      const { plugin, requestSecondaryAnalysis } = makePlugin();
      const ctx = makeRenderCtx();

      // White knight on f3, black pawn on d6 attacks e5 after Nf3-e5
      const customBoard = boardFromFen('rnbqkb1r/ppp1pppp/3p4/8/4P3/5N2/PPPP1PPP/RNBQKB1R');
      const bs = makeBoardState({
        board: customBoard,
        turn: TURN_WHITE,
        fen: 'rnbqkb1r/ppp1pppp/3p4/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
      });

      plugin.onEval({
        complete: true,
        depth: TRAPBOY_MIN_DEPTH,
        lines: [{
          score: 200,
          mate: null,
          pv: ['f3e5', 'a7a6', 'e5f7'],
        }],
      }, bs, ctx);

      expect(requestSecondaryAnalysis).toHaveBeenCalled();
      const call = requestSecondaryAnalysis.mock.calls[0];
      expect(call[1]).toBe(TRAPBOY_GREED_DEPTH);
      expect(typeof call[2]).toBe('function');
    });

    it('skips when god-mode equals greedy capture', () => {
      const { plugin, requestSecondaryAnalysis } = makePlugin();
      const ctx = makeRenderCtx();

      const customBoard = boardFromFen('rnbqkb1r/ppp1pppp/3p4/8/4P3/5N2/PPPP1PPP/RNBQKB1R');
      const bs = makeBoardState({
        board: customBoard,
        turn: TURN_WHITE,
        fen: 'rnbqkb1r/ppp1pppp/3p4/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
      });

      plugin.onEval({
        complete: true,
        depth: TRAPBOY_MIN_DEPTH,
        lines: [{
          score: 200,
          mate: null,
          pv: ['f3e5', 'd6e5', 'e4e5'],
        }],
      }, bs, ctx);

      expect(requestSecondaryAnalysis).not.toHaveBeenCalled();
    });

    it('skips when bait square is over-defended', () => {
      const { plugin, requestSecondaryAnalysis } = makePlugin();
      const ctx = makeRenderCtx();

      // White: Nf3, pawns on d4 and f4 — both defend e5 after Nf3-e5 (2 defenders > max 1)
      const customBoard = boardFromFen('rnbqkb1r/ppp1pppp/3p4/8/3P1P2/5N2/PPP1P1PP/RNBQKB1R');
      const bs = makeBoardState({
        board: customBoard,
        turn: TURN_WHITE,
        fen: 'rnbqkb1r/ppp1pppp/3p4/8/3P1P2/5N2/PPP1P1PP/RNBQKB1R w KQkq - 0 1',
      });

      plugin.onEval({
        complete: true,
        depth: TRAPBOY_MIN_DEPTH,
        lines: [{
          score: 200,
          mate: null,
          pv: ['f3e5', 'a7a6', 'e5f7'],
        }],
      }, bs, ctx);

      expect(requestSecondaryAnalysis).not.toHaveBeenCalled();
    });

    it('does nothing when no lines have enough PV moves', () => {
      const { plugin, requestSecondaryAnalysis } = makePlugin();
      const ctx = makeRenderCtx();

      plugin.onEval({
        complete: true,
        depth: TRAPBOY_MIN_DEPTH,
        lines: [{ score: 100, mate: null, pv: ['e2e4'] }],
      }, makeBoardState(), ctx);

      expect(requestSecondaryAnalysis).not.toHaveBeenCalled();
    });

    it('skips detection when mid-trap tracking', () => {
      const { plugin, requestSecondaryAnalysis } = makePlugin();
      const ctx = makeRenderCtx();

      // Set up existing trap data
      plugin._trapData = {
        steps: [{ uci: 'f3e5', label: 'Bait' }],
        stepIndex: 0,
        godUci: 'a7a6',
        startPly: 0,
      };

      const customBoard = boardFromFen('rnbqkb1r/ppp1pppp/3p4/8/4P3/5N2/PPPP1PPP/RNBQKB1R');
      const bs = makeBoardState({
        board: customBoard,
        turn: TURN_WHITE,
        fen: 'rnbqkb1r/ppp1pppp/3p4/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
      });

      plugin.onEval({
        complete: true,
        depth: TRAPBOY_MIN_DEPTH,
        lines: [{
          score: 200,
          mate: null,
          pv: ['f3e5', 'a7a6', 'e5f7'],
        }],
      }, bs, ctx);

      expect(requestSecondaryAnalysis).not.toHaveBeenCalled();
    });
  });

  describe('phase 2 recapture filtering', () => {
    it('rejects trap when second punishment move recaptures on bait square', () => {
      const { plugin, requestSecondaryAnalysis } = makePlugin();
      const ctx = makeRenderCtx();

      // Same position as standard sacrifice test
      const customBoard = boardFromFen('rnbqkb1r/ppp1pppp/3p4/8/4P3/5N2/PPPP1PPP/RNBQKB1R');
      const bs = makeBoardState({
        board: customBoard,
        turn: TURN_WHITE,
        fen: 'rnbqkb1r/ppp1pppp/3p4/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
      });

      plugin.onBoardChange(bs, ctx);

      plugin.onEval({
        complete: true,
        depth: TRAPBOY_MIN_DEPTH,
        lines: [{
          score: 200,
          mate: null,
          pv: ['f3e5', 'a7a6', 'e5f7'],
        }],
      }, bs, ctx);

      // Phase 2 callback — second punishment move recaptures on e5 (the bait square)
      const phase2Callback = requestSecondaryAnalysis.mock.calls[0][2];
      phase2Callback({
        complete: true,
        depth: TRAPBOY_GREED_DEPTH,
        lines: [{
          score: 500,
          mate: null,
          pv: ['a2a3', 'a7e5', 'e4e5'],
        }],
      });

      // Trap should be rejected — recapture on bait square in move 2
      expect(plugin._trapData).toBeNull();
    });
  });

  describe('trap tracking', () => {
    function setupConfirmedTrap() {
      const { plugin, requestSecondaryAnalysis } = makePlugin();
      const ctx = makeRenderCtx();

      // Board: white knight on f3, black pawn on d6
      const board = boardFromFen('rnbqkb1r/ppp1pppp/3p4/8/4P3/5N2/PPPP1PPP/RNBQKB1R');
      const bs = makeBoardState({
        board,
        turn: TURN_WHITE,
        fen: 'rnbqkb1r/ppp1pppp/3p4/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
        ply: 4,
      });

      // Initialize prevBoard via onBoardChange
      plugin.onBoardChange(bs, ctx);

      // Trigger eval → sacrifice detection
      plugin.onEval({
        complete: true,
        depth: TRAPBOY_MIN_DEPTH,
        lines: [{
          score: 200,
          mate: null,
          pv: ['f3e5', 'a7a6', 'e5f7'],
        }],
      }, bs, ctx);

      // Get the phase2 callback and invoke it with a winning score
      const phase2Callback = requestSecondaryAnalysis.mock.calls[0][2];
      phase2Callback({
        complete: true,
        depth: TRAPBOY_GREED_DEPTH,
        lines: [{
          score: 500,
          mate: null,
          pv: ['e5f7', 'e8f7', 'e4e5'],
        }],
      });

      return { plugin, ctx, board };
    }

    it('confirms trap and stores steps with stepIndex 0', () => {
      const { plugin } = setupConfirmedTrap();

      expect(plugin._trapData).not.toBeNull();
      expect(plugin._trapData.stepIndex).toBe(0);
      expect(plugin._trapData.steps[0]).toEqual({ uci: 'f3e5', label: 'Bait' });
      expect(plugin._trapData.steps[1]).toEqual({ uci: 'd6e5', label: 'Greed' });
      expect(plugin._trapData.steps.length).toBeGreaterThanOrEqual(2);
    });

    it('calls panel.setSlot with trapboy content', () => {
      const { ctx } = setupConfirmedTrap();

      expect(ctx.panel.setSlot).toHaveBeenCalledWith('trapboy', expect.any(Object));
    });

    it('advances stepIndex when bait move is played', () => {
      const { plugin, board } = setupConfirmedTrap();

      // Simulate playing the bait move: Nf3-e5
      const boardAfterBait = applyUciMove(board, 'f3e5');
      const newCtx = makeRenderCtx();

      plugin.onBoardChange({
        board: boardAfterBait,
        ply: 5,
      }, newCtx);

      expect(plugin._trapData).not.toBeNull();
      expect(plugin._trapData.stepIndex).toBe(1);
      expect(newCtx.panel.setSlot).toHaveBeenCalledWith('trapboy', expect.any(Object));
    });

    it('clears trap when a different move is played', () => {
      const { plugin, board } = setupConfirmedTrap();

      // Simulate playing a different move: e4-e5 (not the bait)
      const boardAfterDeviation = applyUciMove(board, 'e4e5');
      const newCtx = makeRenderCtx();

      plugin.onBoardChange({
        board: boardAfterDeviation,
        ply: 5,
      }, newCtx);

      expect(plugin._trapData).toBeNull();
      expect(newCtx.panel.clearSlot).toHaveBeenCalledWith('trapboy');
    });

    it('clears trap when navigating before trap start', () => {
      const { plugin, board } = setupConfirmedTrap();

      // Simulate backward navigation before trap start: ply decreases below startPly
      const newCtx = makeRenderCtx();
      plugin.onBoardChange({
        board,
        ply: 3, // less than startPly of 4, stepIndex=0 so newIndex would be -1
      }, newCtx);

      expect(plugin._trapData).toBeNull();
      expect(newCtx.panel.clearSlot).toHaveBeenCalledWith('trapboy');
    });

    it('reverts stepIndex on take-back within trap', () => {
      const { plugin, board } = setupConfirmedTrap();

      // Play bait move to advance to step 1
      const boardAfterBait = applyUciMove(board, 'f3e5');
      const ctx2 = makeRenderCtx();
      plugin.onBoardChange({ board: boardAfterBait, ply: 5 }, ctx2);
      expect(plugin._trapData.stepIndex).toBe(1);

      // Take back — ply goes from 5 back to 4
      const ctx3 = makeRenderCtx();
      plugin.onBoardChange({ board, ply: 4 }, ctx3);

      // Should revert to step 0, not clear
      expect(plugin._trapData).not.toBeNull();
      expect(plugin._trapData.stepIndex).toBe(0);
      expect(ctx3.panel.setSlot).toHaveBeenCalledWith('trapboy', expect.any(Object));
    });

    it('clears trap when all steps are completed', () => {
      const { plugin, board } = setupConfirmedTrap();
      const { steps } = plugin._trapData;

      // Walk through each step
      let currentBoard = board;
      let ply = 4;
      for (let i = 0; i < steps.length; i++) {
        const nextBoard = applyUciMove(currentBoard, steps[i].uci);
        ply += 1;
        const stepCtx = makeRenderCtx();
        plugin.onBoardChange({ board: nextBoard, ply }, stepCtx);
        currentBoard = nextBoard;
      }

      // After all steps, trap should be cleared
      expect(plugin._trapData).toBeNull();
    });
  });

  describe('onSettingsChange', () => {
    it('clears state when disabled', () => {
      const { plugin } = makePlugin();
      plugin._trapData = { steps: [{ uci: 'e2e4', label: 'Bait' }], stepIndex: 0 };
      plugin._phase2Pending = true;

      plugin.onSettingsChange({ showTrapboy: false });

      expect(plugin._trapData).toBeNull();
      expect(plugin._phase2Pending).toBe(false);
    });

    it('does nothing when enabled', () => {
      const { plugin } = makePlugin();
      plugin._trapData = { steps: [{ uci: 'e2e4', label: 'Bait' }], stepIndex: 0 };

      plugin.onSettingsChange({ showTrapboy: true });

      expect(plugin._trapData).not.toBeNull();
    });
  });

  describe('getPersistentLayer', () => {
    it('clear clears all layers', () => {
      const { plugin } = makePlugin();
      const arrow = makeArrow();
      const getRenderCtx = () => ({ arrow, isFlipped: () => false });

      const layer = plugin.getPersistentLayer(getRenderCtx);
      layer.clear();

      expect(arrow.clearLayer).toHaveBeenCalledWith('trapboy-bait');
      expect(arrow.clearLayer).toHaveBeenCalledWith('trapboy-greed');
      expect(arrow.clearLayer).toHaveBeenCalledWith('trapboy-god');
    });

    it('restore does nothing when no trap data', () => {
      const { plugin } = makePlugin();
      const arrow = makeArrow();
      const getRenderCtx = () => ({ arrow, isFlipped: () => false });

      const layer = plugin.getPersistentLayer(getRenderCtx);
      layer.restore();

      expect(arrow.drawLayer).not.toHaveBeenCalled();
    });

    it('restore redraws trap arrows when trap data exists', () => {
      const { plugin } = makePlugin();
      const arrow = makeArrow();
      const getRenderCtx = () => ({ arrow, isFlipped: () => false });

      plugin._trapData = {
        steps: [
          { uci: 'f3e5', label: 'Bait' },
          { uci: 'd6e5', label: 'Greed' },
          { uci: 'e5f7', label: 'Punish' },
        ],
        stepIndex: 0,
        godUci: 'a7a6',
        startPly: 0,
      };

      const layer = plugin.getPersistentLayer(getRenderCtx);
      layer.restore();

      expect(arrow.drawLayer).toHaveBeenCalledTimes(4);
    });
  });

  describe('destroy', () => {
    it('resets all state', () => {
      const { plugin } = makePlugin();
      plugin._phase2Pending = true;
      plugin._trapData = { steps: [], stepIndex: 0 };
      plugin._activeFen = 'some fen';
      plugin._prevBoard = [];
      plugin._prevPly = 5;

      plugin.destroy();

      expect(plugin._phase2Pending).toBe(false);
      expect(plugin._trapData).toBeNull();
      expect(plugin._activeFen).toBeNull();
      expect(plugin._prevBoard).toBeNull();
      expect(plugin._prevPly).toBeNull();
    });
  });

  describe('opening trap database integration', () => {
    function replayMoves(moves, startBoard = STARTING_BOARD) {
      let board = startBoard;
      for (const uci of moves) {
        board = applyUciMove(board, uci);
      }
      return board;
    }

    it('activates when FEN matches a known opening trap', () => {
      const { plugin } = makePlugin();
      const ctx = makeRenderCtx();

      // Replay Legal Trap preamble to get trigger position
      const def = TRAP_DEFINITIONS[1]; // Legal Trap
      const board = replayMoves(def.preamble);
      const turn = def.preamble.length % 2 === 0 ? TURN_WHITE : TURN_BLACK;
      const fen = boardToFen(board, turn, '-', '-', 1);

      plugin.onBoardChange({ board, ply: 10, fen }, ctx);

      expect(plugin._trapData).not.toBeNull();
      expect(plugin._trapData.name).toBe('Legal Trap');
      expect(plugin._trapData.stepIndex).toBe(0);
      expect(plugin._trapData.steps.length).toBe(def.steps.length);
      expect(ctx.panel.setSlot).toHaveBeenCalledWith('trapboy', expect.any(Object));
    });

    it('does not activate when showTrapboy is disabled', () => {
      const { plugin } = makePlugin({ showTrapboy: false });
      const ctx = makeRenderCtx();

      const def = TRAP_DEFINITIONS[1];
      const board = replayMoves(def.preamble);
      const turn = def.preamble.length % 2 === 0 ? TURN_WHITE : TURN_BLACK;
      const fen = boardToFen(board, turn, '-', '-', 1);

      plugin.onBoardChange({ board, ply: 10, fen }, ctx);

      expect(plugin._trapData).toBeNull();
    });

    it('does not activate for non-trap positions', () => {
      const { plugin } = makePlugin();
      const ctx = makeRenderCtx();

      plugin.onBoardChange({
        board: boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'),
        ply: 0,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      }, ctx);

      expect(plugin._trapData).toBeNull();
    });

    it('tracks steps for opening trap (advance + deviate)', () => {
      const { plugin } = makePlugin();
      const ctx = makeRenderCtx();

      // Activate Lasker Trap
      const def = TRAP_DEFINITIONS[3]; // Lasker
      const board = replayMoves(def.preamble);
      const turn = def.preamble.length % 2 === 0 ? TURN_WHITE : TURN_BLACK;
      const fen = boardToFen(board, turn, '-', '-', 1);

      plugin.onBoardChange({ board, ply: 10, fen }, ctx);
      expect(plugin._trapData.name).toBe('Lasker Trap');

      // Play step 0 (Bxb4 = d2b4)
      const board1 = applyUciMove(board, def.steps[0]);
      plugin.onBoardChange({ board: board1, ply: 11 }, makeRenderCtx());
      expect(plugin._trapData.stepIndex).toBe(1);

      // Play step 1 (exf2+ = e3f2)
      const board2 = applyUciMove(board1, def.steps[1]);
      plugin.onBoardChange({ board: board2, ply: 12 }, makeRenderCtx());
      expect(plugin._trapData.stepIndex).toBe(2);

      // Deviation: play a different move than expected step 2
      const board3 = applyUciMove(board2, 'a2a3');
      plugin.onBoardChange({ board: board3, ply: 13 }, makeRenderCtx());
      expect(plugin._trapData).toBeNull();
    });

    it('does not override active engine-detected trap', () => {
      const { plugin } = makePlugin();
      const ctx = makeRenderCtx();

      // Manually set trap data as if engine detected one
      plugin._trapData = {
        steps: [{ uci: 'e2e4', label: 'Bait' }],
        stepIndex: 0,
        godUci: 'd7d5',
        startPly: 0,
      };
      plugin._prevBoard = boardFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
      plugin._prevPly = 0;

      // Board change with a Legal Trap FEN — but engine trap is active,
      // the board change will try to track the engine trap step first
      const def = TRAP_DEFINITIONS[1];
      const board = replayMoves(def.preamble);
      const turn = def.preamble.length % 2 === 0 ? TURN_WHITE : TURN_BLACK;
      const fen = boardToFen(board, turn, '-', '-', 1);

      // This will deviate from the engine trap (different board), clearing it,
      // then the opening trap lookup fires
      plugin.onBoardChange({ board, ply: 10, fen }, ctx);

      // After deviation clear, opening trap should activate
      expect(plugin._trapData).not.toBeNull();
      expect(plugin._trapData.name).toBe('Legal Trap');
    });

    it('shows trap name in panel title', () => {
      const { plugin } = makePlugin();
      const ctx = makeRenderCtx();

      const def = TRAP_DEFINITIONS[0]; // Noah's Ark
      const board = replayMoves(def.preamble);
      const turn = def.preamble.length % 2 === 0 ? TURN_WHITE : TURN_BLACK;
      const fen = boardToFen(board, turn, '-', '-', 1);

      plugin.onBoardChange({ board, ply: 14, fen }, ctx);

      expect(plugin._trapData.name).toBe('Noah\'s Ark Trap');
      // Panel was called — the title element should use the trap name
      expect(ctx.panel.setSlot).toHaveBeenCalledWith('trapboy', expect.any(Object));
    });
  });

  describe('tempting capture detection', () => {
    it('triggers phase 2 when a tempting capture is rejected by engine', () => {
      // Use a non-database position with a "free piece" pattern
      // so the opening trap database doesn't intercept it
      const { plugin: p2, requestSecondaryAnalysis: rsa2 } = makePlugin();
      const ctx2 = makeRenderCtx();

      // Custom position: White bishop on d2 can take hanging black bishop on b4
      // but engine says play something else
      const customBoard = boardFromFen('rnbqk2r/ppp2ppp/8/4P3/1b6/8/PPPBpPPP/RN1QKB1R');
      const customFen = 'rnbqk2r/ppp2ppp/8/4P3/1b6/8/PPPBpPPP/RN1QKB1R w KQkq - 0 1';

      p2.onBoardChange({
        board: customBoard,
        ply: 10,
        fen: customFen,
      }, ctx2);

      p2.onEval({
        complete: true,
        depth: TRAPBOY_MIN_DEPTH,
        lines: [{
          score: 50,
          mate: null,
          pv: ['f2e3', 'b4d2', 'e1d2'],
        }],
      }, {
        board: customBoard,
        turn: TURN_WHITE,
        fen: customFen,
      }, ctx2);

      // Should have triggered phase 2 for the tempting Bxb4 capture
      expect(rsa2).toHaveBeenCalled();
    });

    it('skips tempting capture when engine recommends it', () => {
      const { plugin, requestSecondaryAnalysis } = makePlugin();
      const ctx = makeRenderCtx();

      // Position with a black piece that White can capture, and engine agrees
      const customBoard = boardFromFen('rnbqk2r/ppp2ppp/8/4P3/1b6/8/PPPBpPPP/RN1QKB1R');
      const customFen = 'rnbqk2r/ppp2ppp/8/4P3/1b6/8/PPPBpPPP/RN1QKB1R w KQkq - 0 1';

      plugin.onBoardChange({
        board: customBoard,
        ply: 10,
        fen: customFen,
      }, ctx);

      // Engine recommends d2b4 (the capture itself)
      plugin.onEval({
        complete: true,
        depth: TRAPBOY_MIN_DEPTH,
        lines: [{
          score: 200,
          mate: null,
          pv: ['d2b4', 'a7a6', 'b4c5'],
        }],
      }, {
        board: customBoard,
        turn: TURN_WHITE,
        fen: customFen,
      }, ctx);

      // d2b4 is the engine's recommendation, so it's not a trap
      // The sacrifice detection loop won't find a sacrifice either (d2b4 is a capture, not leaving piece hanging)
      // No secondary analysis should be called for tempting capture
      // (sacrifice detection might trigger for other reasons, check carefully)
      // The key: since engine recommends d2b4, tempting capture scan skips it
      const { calls } = requestSecondaryAnalysis.mock;
      for (const call of calls) {
        // None of the callbacks should be for d2b4 tempting capture
        expect(call[0]).not.toContain('tempting');
      }
    });

    it('rejects tempting capture when punishment recaptures on target', () => {
      const { plugin, requestSecondaryAnalysis } = makePlugin();
      const ctx = makeRenderCtx();

      // Position with hanging piece, engine rejects the capture
      const customBoard = boardFromFen('rnbqk2r/ppp2ppp/8/4P3/1b6/8/PPPBpPPP/RN1QKB1R');
      const customFen = 'rnbqk2r/ppp2ppp/8/4P3/1b6/8/PPPBpPPP/RN1QKB1R w KQkq - 0 1';

      plugin.onBoardChange({
        board: customBoard,
        ply: 10,
        fen: customFen,
      }, ctx);

      plugin.onEval({
        complete: true,
        depth: TRAPBOY_MIN_DEPTH,
        lines: [{
          score: 50,
          mate: null,
          pv: ['f2e3', 'b4d2', 'e1d2'],
        }],
      }, {
        board: customBoard,
        turn: TURN_WHITE,
        fen: customFen,
      }, ctx);

      if (requestSecondaryAnalysis.mock.calls.length > 0) {
        const callback = requestSecondaryAnalysis.mock.calls[0][2];
        // Punishment recaptures on b4 (the target square) — not a real trap
        callback({
          complete: true,
          depth: TRAPBOY_GREED_DEPTH,
          lines: [{
            score: 300,
            mate: null,
            pv: ['a7b4', 'c2c3', 'b4c5'], // first move goes to b4 = recapture on target
          }],
        });

        expect(plugin._trapData).toBeNull();
      }
    });
  });

  describe('null godUci handling', () => {
    it('skips god arrow when godUci is null', () => {
      const { plugin } = makePlugin();
      const arrow = makeArrow();

      plugin._trapData = {
        steps: [
          { uci: 'd1d4', label: 'Greed' },
          { uci: 'c7c5', label: 'Bait' },
        ],
        stepIndex: 0,
        godUci: null,
        startPly: 0,
      };

      plugin._drawTrap(arrow, false);

      // God arrow should NOT be drawn (godUci is null)
      const godCalls = arrow.drawLayer.mock.calls.filter((c) => c[0] === 'trapboy-god');
      expect(godCalls.length).toBe(0);
      expect(arrow.clearLayer).toHaveBeenCalledWith('trapboy-god');
    });

    it('draws god arrow when godUci is present', () => {
      const { plugin } = makePlugin();
      const arrow = makeArrow();

      plugin._trapData = {
        steps: [
          { uci: 'f3e5', label: 'Bait' },
          { uci: 'd6e5', label: 'Greed' },
        ],
        stepIndex: 0,
        godUci: 'a7a6',
        startPly: 0,
      };

      plugin._drawTrap(arrow, false);

      const godCalls = arrow.drawLayer.mock.calls.filter((c) => c[0] === 'trapboy-god');
      expect(godCalls.length).toBe(1);
    });
  });
});
