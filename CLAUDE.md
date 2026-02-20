# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Chee is a Chrome extension (Manifest v3) that provides real-time Stockfish analysis on chess.com and lichess.org. It reads the board DOM, generates a FEN, runs Stockfish via WebAssembly in a Web Worker, and renders an analysis panel beside the board.

## Commands

```bash
npm run build      # Rollup → dist/ (IIFE bundles: content.js, popup.js + static assets)
npm run watch      # Rollup watch mode
npm run lint       # ESLint check
npm run lint:fix   # ESLint auto-fix
npm run clean      # Remove dist/
```

After building, load `dist/` as an unpacked Chrome extension.

## Releasing

Uses `release-it` with `@release-it/conventional-changelog`. Reads Conventional Commits to auto-generate `CHANGELOG.md` and determine the version bump.

```bash
npm run release          # auto patch/minor/major based on commits (feat: → minor, fix: → patch)
npm run release:minor    # force minor bump
npm run release:major    # force major bump
```

What `npm run release` does:
1. Bumps version in `package.json`
2. Runs `scripts/sync-manifest-version.js` to sync version into `static/manifest.json`
3. Runs `npm run build` to rebuild dist/
4. Updates `CHANGELOG.md` from conventional commits
5. Commits and tags (`v1.x.x`)

## CI/CD

Two GitHub Actions workflows (`.github/workflows/`):

1. **`release.yml`** — triggered on `v*` tag push. Creates a GitHub Release with changelog body extracted from `CHANGELOG.md`.
2. **`publish.yml`** — triggered when a GitHub Release is published. Builds, zips, uploads zip to the release, and publishes to Chrome Web Store.

Release flow:
```bash
git push origin main        # push commits
npm run release             # bump, changelog, commit, tag
git push origin main --tags # triggers release.yml → publish.yml
```

GitHub Secrets required: `EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`.

## Architecture

**Two entry points** bundled by Rollup:
- `src/content.js` — injected into chess pages, orchestrates board reading → FEN → engine → panel
- `src/popup.js` — extension popup for settings (lines, depth, theme)

**Adapter pattern** for multi-site support:
- `adapters/base.js` — abstract `BoardAdapter` interface (findBoard, readPieces, detectTurn, etc.)
- `adapters/chesscom.js` — chess.com: piece classes like `wp`, `br`; square classes like `square-45`
- `adapters/lichess.js` — lichess: chessground DOM, `piece` elements with `translate()` transforms, turn detection via move list (`l4x kwdb` elements)
- `adapters/factory.js` — hostname-based auto-detection, returns the right adapter

**Core modules:**
- `core/engine.js` — Stockfish worker lifecycle (state machine: IDLE→INITIALIZING→READY→ANALYZING), UCI protocol
- `core/panel.js` — panel DOM creation and updates (eval display, W/D/L bar, opening name, analysis lines, score chart, accuracy), extends `lib/emitter.js` for events
- `core/arrow.js` — SVG arrow overlay (analysis arrows, classification badges, hint arrows, insight arrows)
- `core/board-diff.js` — board diff → UCI move detection (`detectMoveFromBoards()`, `boardDiffToUci()`), shared by classifier and PGN plugin
- `core/classify.js` — pure classification logic: `computeCpLoss()` and `classify()`
- `core/insight.js` — tactical insight detection for Mistake/Blunder (right piece, right square, delayed move)
- `core/move-classifier.js` — classification state machine, accuracy tracking, ply cache
- `core/openings.js` — 193-entry ECO opening lookup by FEN position
- `core/fen.js` / `core/san.js` — FEN generation and PV-to-SAN conversion

**Flow:** MutationObserver detects board change → 100ms debounce → adapter reads pieces + turn → FEN built → engine analyzes → panel + arrows update.

## Key Conventions

- **ES6 modules** with explicit `.js` extensions in all imports (ESLint-enforced)
- **lodash-es** for utilities (tree-shakeable named imports)
- **Constants** centralized in `src/constants.js`
- **Private members** prefixed with `_` (e.g., `this._observer`)
- **Debug logging**: `createDebug('chee:namespace')` — enable with `localStorage.debug = 'chee:*'`
- **No console.log** — ESLint `no-console: 'error'`
- **Max line length**: 120 chars
- **Commit style**: Conventional Commits (`feat:`, `fix:`, `refactor:`)
- **No co-author** lines in commits

## Static Assets (not bundled)

`static/stockfish-worker.js`, `stockfish.js`, `stockfish.wasm` are loaded at runtime via `chrome.runtime.getURL()`. Rollup copies them to `dist/` via the copy plugin.

## Common Pitfalls & Fixes

### DOM-based detection is fragile — prefer board diff

Chess sites update DOM elements (clocks, move lists, highlights) at unpredictable times relative to piece positions. This causes:

- **Turn detection wrong**: `detectTurn()` reads clock/move-list DOM, but these may not have updated when the MutationObserver fires on piece movement. Fix: `detectTurnFromDiff()` in `content.js` compares previous board array to current — if a white piece arrived, it's black's turn. Falls back to adapter only for initial position or large jumps (>4 squares changed).
- **Move detection wrong**: Highlight squares (`square-XY` on chess.com, `square.last-move` on lichess) can flicker, producing ghost moves like `e2f7`. Fix: `boardDiffToUci()` in `core/board-diff.js` diffs previous/current board arrays — handles normal moves, captures, castling, en passant, and promotion.
- **Move count wrong**: Adapter counts all moves in the DOM move list, but during game review the user may be at an earlier position. Fix: find the selected/active move node first, count up to that index. Selector varies by site (chess.com: `.node-highlight-content.selected`; lichess: `kwdb.a1t` / `.tview2 move.active`).

**Rule of thumb for new adapters**: implement `readPieces()`, `isFlipped()`, and `detectPly()` accurately. Turn detection and move detection are handled by the board-diff layer in `core/board-diff.js` and `move-classifier.js` — adapter-level `detectTurn()` is only a fallback. `detectPly()` is critical for distinguishing new moves from backward navigation (revert).

### chess.com DOM structure (as of 2025)

- Move list: `wc-simple-move-list` → `.main-line-row` → `.node.white-move` / `.node.black-move` → `span.node-highlight-content` (`.selected` on active move)
- Clocks: `.clock-component.clock-white` / `.clock-component.clock-black`, active has `.clock-player-turn`
- Highlights: `.highlight.square-XY` (XY = file+rank, 1-indexed)
- Pieces: `.piece` with two-char color+type class (`wp`, `br`) and `square-XY` class

### lichess DOM structure (as of 2025)

- Move list: `l4x kwdb` elements (`.a1t` = active) or `.tview2 move` (`.active` = active)
- Board: `cg-board` inside `.cg-wrap` (`.orientation-black` when flipped)
- Pieces: `piece` elements with color class (`white`/`black`) + type class (`king`, `pawn`, etc.), positioned via `translate(Xpx, Ypx)`
- Highlights: `square.last-move` positioned via `translate()`

### Debug logging

- Use `log()` for verbose trace, `log.info()` for milestones, `log.warn()` for degraded states, `log.error()` for failures
- **Never use printf format strings** (`%s`, `%d`) — the debug library prepends a `[namespace]` tag as the first `console.log` argument, which shifts format strings to position 2 where they print literally. Use comma-separated args with inline objects instead.
- Debug toggle in popup sets `localStorage.debug = 'chee:*'`; Chrome DevTools can filter by level (info/warn/error)

## Panel Features

The analysis panel displays (top to bottom): header (classification badge, eval score, depth), opening name, insight text, W/D/L bar with percentages, analysis lines, eval chart, status bar (accuracy, PGN button, FEN button).

### W/D/L bar

Three-segment bar showing Win/Draw/Loss percentages. Uses sigmoid model: `winRaw = 1 / (1 + exp(-0.00368208 * cp))` with Gaussian draw component. Mate → 100/0/0 or 0/0/100.

### Opening name

`core/openings.js` — 193-entry ECO lookup Map keyed by first two FEN fields (position + turn). Shows opening name below the header row. Hidden for starting position or unknown positions.

### Eval score chart

SVG area chart plotting white-perspective eval at each ply. White area fills from bottom up to the score line (more white = white winning). Dark background = black's territory. Orange cursor line marks current ply. Scores clamped to ±500cp, mate = ±500. Updates live as engine depth increases, persists through navigation.

### Accuracy tracker

Running accuracy percentage in the status bar. Formula: `103.1668 * exp(-0.04354 * acpl) - 3.1668` (chess.com style). Updates when classifications lock. Only visible when `showClassifications` is enabled.

### Per-line scores

Each analysis line shows its own eval score badge (cp or mate) next to the rank number. Lines are bordered cards with hover highlight.

### PGN export

`core/plugins/pgn-plugin.js` — accumulates moves, evals, and classifications during analysis. Click PGN button in status bar → copies annotated PGN to clipboard.

- Uses `boardDiffToUci()` from `core/board-diff.js` + `uciToSan()` from `core/san.js` to record SAN moves
- Only records forward moves (`ply > prevPly`), backward navigation is ignored
- Stores best eval (highest depth) per ply, and locked classifications via `receiveClassification()`
- Output includes: PGN headers (Event, Site, Date, White, Black, Result), eval comments (`{+0.3/22}`), inline classification symbols (`e5?!`, `Nc6??`), and NAG codes (`$1` Best/Excellent, `$2` Mistake, `$3` Brilliant, `$4` Blunder, `$6` Inaccuracy; none for Good)
- Mid-game loads include `[SetUp "1"]` and `[FEN "..."]` headers when the starting position differs from standard

## Move Classification

`core/move-classifier.js` — compares eval before/after each move to classify moves. Shows symbol badge on board square + badge in panel header. Togglable via popup (default off).

- `core/classify.js` — pure classification logic: `computeCpLoss()` and `classify()`
- Classification labels defined as `LABEL_*` constants in `constants.js`
- Board diff detects played move (no DOM highlight dependency)
- Classification starts at depth 10 (panel badge only), locks at depth 16 (board icon appears)
- Both `prevEval` and current eval must have `depth >= CLASSIFICATION_MIN_DEPTH` — shallow evals produce false classifications
- Tiers: Brilliant (`!!`, teal, cpLoss ≤ −50 and not engine's #1), Best (`★`, green, engine's PV[0]), Excellent (`✓`, green, ≤10cp), Good (muted green, ≤30), Inaccuracy (`?!`, yellow, ≤80), Mistake (`✕`, orange, ≤200), Blunder (`??`, red, >200)

### Insight arrows

For Mistake/Blunder moves, a **dashed arrow** always shows the engine's best move on the board (what the player should have played). Uses `chee-insight-el` class so it persists during line hover. Drawn at lock depth alongside the classification badge. Cached and restored on revert navigation.

### Pre-move hints

Two modes (can both be active):
1. **Classification hints** — when `showClassifications` is enabled and engine finds a clearly best move (score spread ≥ 80cp between line 1 and 2), shows a badged arrow. ≥200cp → Brilliant hint (teal), ≥80cp → Excellent hint (green). Requires depth ≥ 14.
2. **Best move arrow** — when `showBestMove` is enabled, always shows PV[0] as a team-colored arrow (blue for white, orange for black). No badge.

### Move revert / navigation detection

`detectPly()` in each adapter returns the half-move index from the active move in the DOM move list. The classifier only treats a board diff as a played move when `ply > _prevPly`. Backward navigation restores the cached classification for that ply (panel badge + board icon + insight arrow).

## Theme System

Catppuccin color palette (Latte, Frappé, Macchiato, Mocha) plus a "Match Site" option. Applied via CSS custom properties (`--chee-base`, `--chee-text`, etc.) on the panel element.
