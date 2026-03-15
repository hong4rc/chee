// Opening trap database — known traps by FEN position lookup.
// Easy to add: define preamble (UCI moves from start) + steps (UCI from trigger).
// Labels and FEN keys are auto-generated at module init.

import { applyUciMove } from './san.js';
import { boardToFen } from './fen.js';
import { TURN_WHITE, TURN_BLACK } from '../constants.js';

const STARTING_BOARD = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'.split('/').map((rank) => {
  const row = [];
  for (const ch of rank) {
    if (ch >= '1' && ch <= '8') {
      for (let i = 0; i < Number(ch); i++) row.push(null);
    } else {
      row.push(ch);
    }
  }
  return row;
});

/**
 * Each trap definition:
 *   name     — display name
 *   side     — who benefits ('w' or 'b')
 *   preamble — UCI moves from starting position to the trigger
 *   steps    — UCI moves from the trigger position onward
 */
export const TRAP_DEFINITIONS = [
  {
    name: 'Noah\'s Ark Trap',
    side: TURN_BLACK,
    preamble: [
      'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6',
      'b5a4', 'd7d6', 'd2d4', 'b7b5', 'a4b3', 'c6d4',
      'f3d4', 'e5d4',
    ],
    steps: [
      'd1d4', 'c7c5', 'd4d5', 'c8e6',
      'd5c6', 'e6d7', 'c6d5', 'c5c4',
    ],
  },
  {
    name: 'Legal Trap',
    side: TURN_WHITE,
    preamble: [
      'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'd7d6',
      'b1c3', 'c8g4', 'h2h3', 'g4h5',
    ],
    steps: ['f3e5', 'h5d1', 'c4f7', 'e8e7', 'c3d5'],
  },
  {
    name: 'Elephant Trap',
    side: TURN_BLACK,
    preamble: [
      'd2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6',
      'c1g5', 'b8d7', 'c4d5', 'e6d5',
    ],
    steps: [
      'c3d5', 'f6d5', 'g5d8', 'f8b4',
      'd1d2', 'b4d2', 'e1d2', 'e8d8',
    ],
  },
  {
    name: 'Lasker Trap',
    side: TURN_BLACK,
    preamble: [
      'd2d4', 'd7d5', 'c2c4', 'e7e5', 'd4e5', 'd5d4',
      'e2e3', 'f8b4', 'c1d2', 'd4e3',
    ],
    steps: ['d2b4', 'e3f2', 'e1e2', 'f2g1n', 'e2e1', 'd8h4'],
  },
  {
    name: 'Rubinstein Trap',
    side: TURN_WHITE,
    preamble: [
      'd2d4', 'd7d5', 'g1f3', 'g8f6', 'c2c4', 'e7e6',
      'c1g5', 'b8d7', 'e2e3', 'f8e7', 'b1c3', 'e8g8',
      'a1c1', 'f8e8', 'd1c2', 'a7a6', 'c4d5', 'e6d5',
      'f1d3', 'c7c6', 'e1g1', 'f6e4', 'g5f4', 'f7f5',
    ],
    steps: ['c3d5', 'c6d5', 'f4c7'],
  },
  {
    name: 'Siberian Trap',
    side: TURN_BLACK,
    preamble: [
      'e2e4', 'c7c5', 'd2d4', 'c5d4', 'c2c3', 'd4c3',
      'b1c3', 'b8c6', 'g1f3', 'e7e6', 'f1c4', 'd8c7',
      'e1g1', 'g8f6', 'd1e2', 'f6g4',
    ],
    steps: ['h2h3', 'c6d4', 'f3d4', 'c7h2'],
  },
  {
    name: 'Fajarowicz Trap',
    side: TURN_BLACK,
    preamble: [
      'd2d4', 'g8f6', 'c2c4', 'e7e5', 'd4e5', 'f6e4',
      'g1f3', 'd7d6', 'e5d6', 'f8d6',
    ],
    steps: ['g2g3', 'e4f2', 'e1f2', 'd6g3'],
  },
  {
    name: 'Blackburne Shilling Trap',
    side: TURN_BLACK,
    preamble: [
      'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'c6d4',
    ],
    steps: [
      'f3e5', 'd8g5', 'e5f7', 'g5g2',
      'h1f1', 'g2e4', 'c4e2', 'd4f3',
    ],
  },
  {
    name: 'Englund Gambit Trap',
    side: TURN_BLACK,
    preamble: [
      'd2d4', 'e7e5', 'd4e5', 'b8c6', 'g1f3', 'd8e7',
      'c1f4', 'e7b4', 'f4d2', 'b4b2', 'd2c3', 'f8b4',
    ],
    steps: ['d1d2', 'b4c3', 'd2c3', 'b2c1'],
  },
  {
    name: 'Fishing Pole Trap',
    side: TURN_BLACK,
    preamble: [
      'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'g8f6',
      'e1g1', 'f6g4', 'h2h3', 'h7h5',
    ],
    steps: [
      'h3g4', 'h5g4', 'f3e1', 'd8h4',
      'f2f3', 'g4g3', 'd2d4', 'h4h2',
    ],
  },
];

/**
 * Assign step labels based on which side benefits.
 * Benefiting side's first move → "Bait", subsequent → "Punish" / "Punish N"
 * Opponent's moves → "Greed" (no arrows drawn)
 */
function labelSteps(stepUcis, side, triggerTurn) {
  let punishCount = 0;
  let firstBenefitSeen = false;
  let currentTurn = triggerTurn;

  return stepUcis.map((uci) => {
    const isBenefitingSide = currentTurn === side;
    currentTurn = currentTurn === TURN_WHITE ? TURN_BLACK : TURN_WHITE;

    if (!isBenefitingSide) {
      return { uci, label: 'Greed' };
    }
    if (!firstBenefitSeen) {
      firstBenefitSeen = true;
      return { uci, label: 'Bait' };
    }
    punishCount++;
    return { uci, label: punishCount === 1 ? 'Punish' : `Punish ${punishCount}` };
  });
}

function buildTrapMap() {
  const map = new Map();

  for (const def of TRAP_DEFINITIONS) {
    // Replay preamble to reach the trigger position
    let board = STARTING_BOARD;
    for (const uci of def.preamble) {
      board = applyUciMove(board, uci);
    }

    const triggerTurn = def.preamble.length % 2 === 0 ? TURN_WHITE : TURN_BLACK;
    const fen = boardToFen(board, triggerTurn, '-', '-', 1);
    const key = fen.split(' ').slice(0, 2).join(' ');

    const steps = labelSteps(def.steps, def.side, triggerTurn);

    map.set(key, {
      name: def.name,
      side: def.side,
      steps,
      godUci: null,
    });
  }

  return map;
}

const TRAP_MAP = buildTrapMap();

/**
 * Look up a known opening trap by FEN.
 * Returns { name, side, steps: [{uci, label}], godUci } or null.
 */
export function lookupOpeningTrap(fen) {
  if (!fen) return null;
  const key = fen.split(' ').slice(0, 2).join(' ');
  return TRAP_MAP.get(key) || null;
}
