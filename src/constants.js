// ─── Chess ────────────────────────────────────────────────────
export const BOARD_SIZE = 8;
export const LAST_RANK = 7; // BOARD_SIZE - 1, used for rank flipping
export const FILES = 'abcdefgh';
export const CHAR_CODE_A = 97; // 'a'.charCodeAt(0)

// Piece characters
export const WHITE_KING = 'K';
export const WHITE_QUEEN = 'Q';
export const WHITE_ROOK = 'R';
export const WHITE_BISHOP = 'B';
export const WHITE_KNIGHT = 'N';
export const WHITE_PAWN = 'P';

// Turn
export const TURN_WHITE = 'w';
export const TURN_BLACK = 'b';

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
export const EXPLORE_TRIGGER_ATTEMPT = 5;
export const LOG_INTERVAL_ATTEMPTS = 10;

// ─── Engine resources ────────────────────────────────────────
export const WORKER_FILE = 'stockfish-worker.js';
export const STOCKFISH_JS_FILE = 'stockfish.js';
export const STOCKFISH_WASM_FILE = 'stockfish.wasm';

// ─── Worker message types ────────────────────────────────────
export const MSG_SETUP = '__setup';
export const MSG_READY = 'ready';
export const MSG_EVAL = 'eval';
export const MSG_ERROR = 'error';
export const MSG_POSITION = 'position';
export const MSG_STOP = 'stop';

// ─── Engine config ───────────────────────────────────────────
export const SEARCH_DEPTH = 22;
export const HASH_SIZE_MB = 32;

// ─── Panel / eval display ────────────────────────────────────
export const PANEL_ID = 'chee-analysis-panel';
export const NUM_LINES = 3;
export const MAX_PV_MOVES = 8;
export const CENTIPAWN_DIVISOR = 100;
export const EVAL_BAR_MIN_PCT = 2;
export const EVAL_BAR_MAX_PCT = 98;
export const EVAL_BAR_CENTER_PCT = 50;

// ─── DOM exploration limits ──────────────────────────────────
export const MAX_EXPLORE_CHILDREN = 30;
export const MAX_EXPLORE_DEPTH = 3;
export const MAX_EXPLORE_DEPTH_LAYOUT = 4;
export const MAX_LOG_SAMPLES = 3;
export const MAX_ATTR_DISPLAY_LEN = 40;
export const MAX_CLASS_DISPLAY_LEN = 80;
export const MIN_PIECE_CONTAINER_COUNT = 2;

// ─── UCI move parsing ────────────────────────────────────────
export const UCI_MIN_LEN = 4;
export const UCI_PROMO_LEN = 5;

// ─── Arrow overlay ───────────────────────────────────────────
export const ARROW_COLORS = ['#5d9948', '#4a90d9', '#e8833a']; // green, blue, orange
export const ARROW_OPACITY = 0.8;
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

// ─── chess.com square class ──────────────────────────────────
export const SQUARE_PREFIX = 'square-';
export const SQUARE_CLASS_MIN_LEN = 9; // 'square-' (7) + 2 digits
