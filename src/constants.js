// ─── Chess ────────────────────────────────────────────────────
export const BOARD_SIZE = 8;
export const LAST_RANK = 7; // BOARD_SIZE - 1, used for rank flipping
export const FILES = 'abcdefgh';
export const CHAR_CODE_A = 97; // 'a'.charCodeAt(0)
export const FEN_NONE = '-'; // FEN placeholder for empty castling/en passant

// Piece characters
export const WHITE_KING = 'K';
export const WHITE_QUEEN = 'Q';
export const WHITE_ROOK = 'R';
export const WHITE_BISHOP = 'B';
export const WHITE_KNIGHT = 'N';
export const WHITE_PAWN = 'P';
export const BLACK_KING = 'k';
export const BLACK_QUEEN = 'q';
export const BLACK_ROOK = 'r';
export const BLACK_BISHOP = 'b';
export const BLACK_KNIGHT = 'n';
export const BLACK_PAWN = 'p';

// Turn
export const TURN_WHITE = 'w';
export const TURN_BLACK = 'b';
export function toggleTurn(t) { return t === TURN_WHITE ? TURN_BLACK : TURN_WHITE; }

// Castling positions (file indices)
export const KING_START_FILE = 4;
export const KINGSIDE_ROOK_FILE = 7;
export const QUEENSIDE_ROOK_FILE = 0;
export const KINGSIDE_ROOK_DEST = 5;
export const QUEENSIDE_ROOK_DEST = 3;
export const CASTLING_DISTANCE = 2;

// Board array row indices (rank 1 = row 7, rank 8 = row 0)
export const WHITE_BACK_ROW = 7;
export const BLACK_BACK_ROW = 0;

// ─── Timing ──────────────────────────────────────────────────
export const DEBOUNCE_MS = 100;
export const POLL_INTERVAL_MS = 500;
export const BOARD_TIMEOUT_MS = 60000;
export const MAX_PIECE_ATTEMPTS = 60;

// ─── Engine resources ────────────────────────────────────────
export const WORKER_FILE = 'stockfish-worker.js';
export const STOCKFISH_JS_FILE = 'stockfish.js';
export const STOCKFISH_WASM_FILE = 'stockfish.wasm';

// ─── Event / message names ───────────────────────────────────
export const EVT_READY = 'ready';
export const EVT_EVAL = 'eval';
export const EVT_ERROR = 'error';
export const EVT_LINE_HOVER = 'line:hover';
export const EVT_LINE_LEAVE = 'line:leave';
export const EVT_CLASSIFY_SHOW = 'classify:show';
export const EVT_CLASSIFY_CLEAR = 'classify:clear';
export const EVT_CLASSIFY_LOCK = 'classify:lock';
export const EVT_ACCURACY_UPDATE = 'accuracy:update';

// ─── Plugin names ───────────────────────────────────────────
export const PLUGIN_CLASSIFICATION = 'classification';
export const PLUGIN_HINT = 'hint';
export const PLUGIN_PGN = 'pgn';
export const PLUGIN_GUARD = 'guard';
export const PLUGIN_BOOK = 'book';
export const PLUGIN_TRAPBOY = 'trapboy';

export const EVT_PGN_COPY = 'pgn:copy';

// ─── Worker message types ────────────────────────────────────
export const MSG_SETUP = '__setup';
export const MSG_READY = EVT_READY;
export const MSG_EVAL = EVT_EVAL;
export const MSG_ERROR = EVT_ERROR;
export const MSG_POSITION = 'position';
export const MSG_STOP = 'stop';
export const MSG_RECONFIGURE = 'reconfigure';

// ─── Engine config ───────────────────────────────────────────
export const SEARCH_DEPTH = 22;
export const SETTINGS_DEFAULTS = {
  numLines: 3,
  searchDepth: SEARCH_DEPTH,
  theme: 'site',
  showClassifications: true,
  showCrazy: false,
  showBestMove: true,
  waitForComplete: true,
  showGuard: true,
  showTrapboy: false,
  previewLastMove: false,
  showBookMoves: true,
  showChart: true,
  panelMinimized: false,
  panelHidden: false,
  panelLeft: null,
  panelTop: null,
  panelWidth: null,
  debugMode: false,
  enablePuzzles: false,
  enablePuzzleRush: false,
  enablePuzzleBattle: false,
  enablePuzzleLearning: false,
  enableDaily: true,
  enableLichessTraining: false,
  enableLichessStorm: false,
  enableLichessRacer: false,
  enableLichessStreak: false,
};

// ─── Classification ─────────────────────────────────────────
export const CLASSIFICATION_MIN_DEPTH = 10;
export const CLASSIFICATION_LOCK_DEPTH = 16;
export const CLASSIFICATION_MATE_LOSS = 1000;
export const CLASSIFICATION_BRILLIANT_THRESHOLD = -50;
export const CRAZY_MIN_SACRIFICE = 3;
export const CRAZY_MAX_CP_LOSS = 30;

// Classification labels
export const LABEL_BRILLIANT = 'Brilliant';
export const LABEL_BEST = 'Best';
export const LABEL_EXCELLENT = 'Excellent';
export const LABEL_GOOD = 'Good';
export const LABEL_INACCURACY = 'Inaccuracy';
export const LABEL_MISTAKE = 'Mistake';
export const LABEL_CRAZY = 'Crazy';
export const LABEL_BLUNDER = 'Blunder';
export const LABEL_BOOK = 'Book';

export const CLASSIFICATION_BRILLIANT = { label: LABEL_BRILLIANT, symbol: '!!', color: '#1baca6' };
export const CLASSIFICATION_BEST = { label: LABEL_BEST, symbol: '\u2605', color: '#96bc4b' };
export const CLASSIFICATION_CRAZY = { label: LABEL_CRAZY, symbol: '!?', color: '#d946ef' };
export const CLASSIFICATION_BLUNDER = { label: LABEL_BLUNDER, symbol: '??', color: '#ca3431' };
export const CLASSIFICATION_BOOK = {
  label: LABEL_BOOK, symbol: '\u{1F4D6}', color: '#7a4a1e', cpLoss: 0,
};
export const CLASSIFICATION_THRESHOLDS = [
  {
    max: 10, label: LABEL_EXCELLENT, symbol: '\u2713', color: '#96bc4b',
  },
  {
    max: 30, label: LABEL_GOOD, symbol: '', color: '#97af8b',
  },
  {
    max: 80, label: LABEL_INACCURACY, symbol: '?!', color: '#f7c631',
  },
  {
    max: 200, label: LABEL_MISTAKE, symbol: '\u2715', color: '#e04040',
  },
];

// ─── Accuracy scores per classification ─────────────────────
export const ACCURACY_SCORES = {
  [LABEL_BRILLIANT]: 100,
  [LABEL_BEST]: 100,
  [LABEL_CRAZY]: 100,
  [LABEL_EXCELLENT]: 90,
  [LABEL_GOOD]: 70,
  [LABEL_INACCURACY]: 30,
  [LABEL_MISTAKE]: 10,
  [LABEL_BLUNDER]: 0,
};

// ─── PGN NAG codes (Numeric Annotation Glyphs) ─────────────
export const PGN_NAGS = {
  [LABEL_BRILLIANT]: '$3',
  [LABEL_BEST]: '$1',
  [LABEL_EXCELLENT]: '$1',
  [LABEL_CRAZY]: '$5',
  [LABEL_INACCURACY]: '$6',
  [LABEL_MISTAKE]: '$2',
  [LABEL_BLUNDER]: '$4',
};

// ─── Book continuation arrows ────────────────────────────────
export const BOOK_ARROW_OPACITY = 0.4;

// ─── Pre-move hints (spread = score gap between line 1 and 2) ─
export const HINT_MIN_DEPTH = 14;
export const HINT_ARROW_OPACITY = 0.5;
export const HINT_THRESHOLDS = [
  {
    min: 200, label: LABEL_BRILLIANT, symbol: '!!', color: '#1baca6',
  },
  {
    min: 80, label: LABEL_EXCELLENT, symbol: '\u2713', color: '#96bc4b',
  },
];

// ─── Panel / eval display ────────────────────────────────────
export const PANEL_ID = 'chee-analysis-panel';
export const NUM_LINES = 3;
export const MAX_PV_MOVES = 8;
export const CENTIPAWN_DIVISOR = 100;
export const MATE_PREFIX = 'M';
export const MATE_NEG_PREFIX = '-M';

// ─── DOM exploration limits ──────────────────────────────────
export const MAX_EXPLORE_CHILDREN = 30;
export const MAX_EXPLORE_DEPTH = 3;
export const MAX_EXPLORE_DEPTH_LAYOUT = 4;
export const MAX_LOG_SAMPLES = 3;
export const MAX_ATTR_DISPLAY_LEN = 40;
export const MAX_CLASS_DISPLAY_LEN = 80;
export const MIN_PIECE_CONTAINER_COUNT = 2;

// ─── SAN notation ───────────────────────────────────────────
export const SAN_CASTLE_KING = 'O-O';
export const SAN_CASTLE_QUEEN = 'O-O-O';
export const SAN_CASTLE_KING_ZEROS = '0-0'; // Alternate notation (zeros)
export const SAN_CASTLE_QUEEN_ZEROS = '0-0-0';

// ─── UCI move parsing ────────────────────────────────────────
export const UCI_MIN_LEN = 4;
export const UCI_PROMO_LEN = 5;

// ─── Blunder guard (piece selection warning) ────────────────
export const GUARD_CIRCLE_RADIUS = 0.38;
export const GUARD_OPACITY = 0.35;
export const GUARD_COLOR = '#ca3431';
export const GUARD_DEPTH = 8;
export const GUARD_CP_THRESHOLD = 100; // cp loss above this → warn

// ─── Trapboy (sacrifice-based trap detection) ───────────────
export const TRAPBOY_MIN_DEPTH = 12;
export const TRAPBOY_GREED_DEPTH = 8;
export const TRAPBOY_MIN_SACRIFICE_VALUE = 1;
export const TRAPBOY_TRAP_THRESHOLD = 200;
export const TRAPBOY_MAX_DEFENDERS = 1; // max defenders of bait square — more looks suspicious to humans
export const TRAPBOY_BAIT_COLOR = '#d946ef';
export const TRAPBOY_GREED_COLOR = '#ca3431';
export const TRAPBOY_GOD_COLOR = '#96bc4b';
export const TRAPBOY_ARROW_OPACITY = 0.65;
export const TRAPBOY_GREED_ARROW_OPACITY = 0.5;
export const TRAPBOY_GOD_ARROW_OPACITY = 0.5;
export const TRAPBOY_GOD_DASH = '6,4';
export const TRAPBOY_OPPONENT_COLOR = '#f59e0b';
export const TRAPBOY_OPPONENT_OPACITY = 0.45;
export const TRAPBOY_OPPONENT_DASH = '4,3';

// ─── Insight arrow (best move after mistake/blunder) ────────
export const INSIGHT_ARROW_OPACITY = 0.55;
export const INSIGHT_ARROW_DASH = '6,4';

// ─── Arrow overlay ───────────────────────────────────────────
export const ARROW_COLOR_WHITE = '#4a90d9'; // blue — white's moves
export const ARROW_COLOR_BLACK = '#e8833a'; // orange — black's moves
export const ARROW_OPACITY_MAX = 0.85;
export const ARROW_OPACITY_MIN = 0.3;
export const ARROW_HEAD_SIZE = 0.3; // fraction of square size
export const ARROW_WIDTH = 0.15; // fraction of square size
export const ARROW_OVERLAY_ID = 'chee-arrow-overlay';
export const ARROW_OVERLAY_Z = '999';
export const ARROW_ORIGIN_RADIUS = 0.22; // fraction of square size
export const ARROW_SHORTEN_FACTOR = 0.8; // shorten line so arrowhead doesn't overshoot
export const ARROW_MARKER_WIDTH = 4;
export const ARROW_MARKER_HEIGHT = 4;
export const ARROW_MARKER_REF_X = 2.5;
export const ARROW_MARKER_REF_Y = 2;

// ─── Board preview overlay ──────────────────────────────────
export const PREVIEW_OVERLAY_ID = 'chee-board-preview';
export const PREVIEW_OVERLAY_Z = '998'; // below arrow overlay (999)
export const PREVIEW_LIGHT_SQUARE = '#f0d9b5';
export const PREVIEW_DARK_SQUARE = '#b58863';

// ─── chess.com square class ──────────────────────────────────
export const SQUARE_PREFIX = 'square-';
export const SQUARE_CLASS_MIN_LEN = 9; // 'square-' (7) + 2 digits
