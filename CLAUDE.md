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
5. Commits, tags (`v1.x.x`), and creates a GitHub release
6. After release, run `npm run pack` to create the zip for Chrome Web Store upload

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
- `core/panel.js` — panel DOM creation and updates, extends `lib/emitter.js` for events
- `core/arrow.js` — SVG arrow overlay for suggested moves
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
- **Move detection wrong**: Highlight squares (`square-XY` on chess.com, `square.last-move` on lichess) can flicker, producing ghost moves like `e2f7`. Fix: `boardDiffToUci()` in `move-classifier.js` diffs previous/current board arrays — handles normal moves, captures, castling, en passant, and promotion.
- **Move count wrong**: Adapter counts all moves in the DOM move list, but during game review the user may be at an earlier position. Fix: find the selected/active move node first, count up to that index. Selector varies by site (chess.com: `.node-highlight-content.selected`; lichess: `kwdb.a1t` / `.tview2 move.active`).

**Rule of thumb for new adapters**: implement `readPieces()` and `isFlipped()` accurately. Turn detection and move detection are handled by the board-diff layer in `content.js` and `move-classifier.js` — adapter-level `detectTurn()` is only a fallback.

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

## Move Classification

`core/move-classifier.js` — compares eval before/after each move to classify as Best/Excellent/Good/Inaccuracy/Mistake/Blunder. Shows colored arrow on board + badge in panel header. Togglable via popup (default off).

- `core/classify.js` — pure classification logic: `computeCpLoss()` and `classify()`
- Board diff detects played move (no DOM highlight dependency)
- Classification starts at depth 10, locks at depth 16 to prevent flickering
- Thresholds: Best (engine's #1), Excellent (≤10cp), Good (≤30), Inaccuracy (≤80), Mistake (≤200), Blunder (>200)

## Theme System

Catppuccin color palette (Latte, Frappé, Macchiato, Mocha) plus a "Match Site" option. Applied via CSS custom properties (`--chee-base`, `--chee-text`, etc.) on the panel element.
