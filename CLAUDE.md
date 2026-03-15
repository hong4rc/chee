# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Chee is a Chrome extension (Manifest v3) that provides real-time Stockfish analysis on chess.com and lichess.org. It reads the board DOM, generates a FEN, runs Stockfish via WebAssembly in a Web Worker, and renders an analysis panel beside the board. Also supports puzzle/hint pages on both sites (chess.com: rated, rush, battle, learning, daily; lichess: training, storm, racer, streak) in a lightweight arrow-only hint mode.

## Commands

All commands run cross-platform via bash, zsh, or git-bash. On Windows, use WSL, Git Bash, or any shell that has `node` in PATH—no PowerShell wrapper needed.

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

Three GitHub Actions workflows (`.github/workflows/`):

1. **`ci.yml`** — triggered on push to `main` and PRs. Runs ESLint on changed files (with inline PR annotations via `add-matcher`) and Vitest test suite.
2. **`release.yml`** — triggered on `v*` tag push. Creates a GitHub Release with changelog body extracted from `CHANGELOG.md`.
3. **`publish.yml`** — triggered when a GitHub Release is published. Builds, zips, uploads zip to the release, and publishes to Chrome Web Store.

Release flow:
```bash
git push origin main        # push commits
npm run release             # bump, changelog, commit, tag
git push origin main --tags # triggers release.yml → publish.yml
```

GitHub Secrets required: `EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`.

## Git Hooks (lefthook)

Hooks are auto-installed via `postinstall`. Configured in `lefthook.yml`:

- **pre-commit** — ESLint on staged `.js`/`.mjs` files
- **commit-msg** — Conventional Commits validation via commitlint
- **pre-push** — runs `npm test`, skips if tests already passed for current HEAD (`.test-passed` marker)

Line endings are enforced as LF on all platforms via `.gitattributes`.

## Architecture

**Two entry points** bundled by Rollup:
- `src/content.js` — injected into chess pages, orchestrates board reading → FEN → engine → panel. Uses a data-driven `HINT_PAGES` config array to detect hint pages (chess.com puzzles/daily + lichess training/storm/racer/streak). First-match-wins URL matching, hint mode applies fixed depth 15, no panel, best move arrow only. Daily toggle live-controls the arrow.
- `src/popup.js` — extension popup with tabbed UI: Settings (lines, depth, theme, toggles with icons, debug) and Puzzles (two-column grid: chess.com + lichess toggles). Checkboxes auto-wired via `data-key` attributes to `chrome.storage`.

**Adapter pattern** for multi-site support:
- `adapters/base.js` — abstract `BoardAdapter` interface (findBoard, readPieces, detectTurn, etc.)
- `adapters/chesscom.js` — chess.com: piece classes like `wp`, `br`; square classes like `square-45`
- `adapters/lichess.js` — lichess: chessground DOM, `piece` elements with `translate()` transforms, turn detection via move list (`l4x kwdb` elements)
- `adapters/factory.js` — hostname-based auto-detection, returns the right adapter

**Core modules:**
- `core/engine.js` — Stockfish worker lifecycle (state machine: IDLE→INITIALIZING→READY→ANALYZING), UCI protocol, auto-recovery with max 2 retry attempts per crashing position
- `core/panel.js` — panel DOM creation and updates (eval display, W/D/L bar, opening name, analysis lines, score chart, accuracy, trap status), extends `lib/emitter.js` for events
- `core/arrow.js` — SVG arrow overlay (analysis arrows, classification badges, hint arrows, insight arrows, guard circles, trap arrows)
- `core/board-diff.js` — board diff → UCI move detection (`detectMoveFromBoards()`, `boardDiffToUci()`), shared by classifier, PGN plugin, and trapboy
- `core/attacks.js` — pure utility: `isSquareAttacked(board, file, rank, byColor)` checks if a square is attacked by a given color
- `core/classify.js` — pure classification logic: `computeCpLoss()` and `classify()`
- `core/insight.js` — tactical insight detection for Mistake/Blunder (right piece, right square, delayed move)
- `core/move-classifier.js` — classification state machine, accuracy tracking, ply cache
- `core/openings.js` — 193-entry ECO opening lookup by FEN position
- `core/opening-traps.js` — 10-entry opening trap database (Noah's Ark, Legal, Elephant, Lasker, Rubinstein, Siberian, Fajarowicz, Blackburne Shilling, Englund Gambit, Fishing Pole). FEN-keyed Map lookup, auto-labeled steps (Bait/Greed/Punish)
- `core/fen.js` / `core/san.js` — FEN generation and PV-to-SAN conversion
- `core/board-preview.js` — HTML overlay for showing predicted board positions on hover. Renders piece images (read from site's own CSS via `getComputedStyle`) and board-colored square masks. Caches metrics, board background, and piece images for performance.
- `core/coordinator.js` — mediates between engine, panel, arrow, adapter, board preview, and plugins; owns orchestration state; highlight-based turn detection fallback for puzzle pages. Decoupled from plugins — plugins self-register events in `setup()`.
- `core/board-state.js` — value object: board array, ply, FEN, turn; diff-based turn detection
- `core/plugin.js` — base `AnalysisPlugin` class (lifecycle hooks: `setup`, `onBoardChange`, `onEval`, `onSettingsChange`, `onEngineReset`, `onBoardMouseDown`, `onBoardMouseUp`, `onPanelEvent`, `onPluginEvent`)
- `core/renderers/header-renderer.js` — generic slot system (`setSlot`/`clearSlot`) for plugin UI in the panel header

**Plugins** (`core/plugins/`):
- `classification-plugin.js` — move classification (Brilliant → Blunder), board badge + insight arrow. Self-wires classifier events in `setup()`, broadcasts `classification:lock` for PGN.
- `hint-plugin.js` — pre-move hint arrows (classification-based spread or always-on best move). Waits for engine to reach full depth before drawing when `waitForComplete` is enabled (default on) or in puzzle mode.
- `pgn-plugin.js` — PGN export with eval comments, classification symbols, NAG codes. Receives classifications via `onPluginEvent('classification:lock')`.
- `guard-plugin.js` — blunder guard: warns when clicked piece isn't in any engine top line. Uses `onBoardMouseDown`/`onBoardMouseUp`.
- `book-plugin.js` — book move detection and continuation arrows from ECO opening database
- `trapboy-plugin.js` — trap detection via three methods: sacrifice detection, tempting capture detection, and opening trap database lookup. Uses generic panel slots and `requestSecondaryAnalysis`.

**Shared utilities** (`lib/`):
- `lib/dom.js` — DOM helpers: `el()`, `svgEl()`, `indexOfNode()`, `eventToSquare(e, boardEl, isFlipped)` (mouse event → `{ file, rank }`, works on both sites)
- `lib/uci.js` — `parseUci(uciMove)` → `{ fromFile, fromRank, toFile, toRank, promotion }`
- `lib/emitter.js` — simple event emitter mixin
- `lib/debug.js` — `createDebug('chee:namespace')` wrapper
- `lib/format.js` — shared eval formatters: `advantageCls()`, `formatMate()`, `formatCp()`
- `lib/lru.js` — LRU cache for eval results
- `lib/themes.js` — Catppuccin theme application
- `lib/settings.js` — Chrome storage load/save
- `lib/poll.js` — `pollUntil()` async polling helper

**Flow:** MutationObserver detects board change → 100ms debounce → adapter reads pieces + turn → FEN built → engine analyzes → panel + arrows update.

## Key Conventions

- **ES6 modules** with explicit `.js` extensions in all imports (ESLint-enforced)
- **lodash-es** for utilities (tree-shakeable named imports)
- **Constants** centralized in `src/constants.js` — always use named constants instead of hardcoded values. This includes chess logic (`TURN_WHITE`/`TURN_BLACK` not `'w'`/`'b'`), display strings (`MATE_PREFIX` not `'M'`), DOM IDs, colors, thresholds, and any value used in more than one place. When adding new functionality, define constants first.
- **Private members** prefixed with `_` (e.g., `this._observer`)
- **Debug logging**: `createDebug('chee:namespace')` — enable with `localStorage.debug = 'chee:*'`
- **No console.log** — ESLint `no-console: 'error'`
- **Max line length**: 120 chars
- **Function call formatting**: when a function call has multiple arguments that don't fit on one line, put each argument on its own line with a trailing comma (ESLint `function-paren-newline` + `function-call-argument-newline`)
- **Commit style**: Conventional Commits (`feat:`, `fix:`, `refactor:`)
- **No co-author** lines in commits
- **Data-driven popup**: checkbox toggles use `data-key` attributes auto-wired to `chrome.storage` — adding a toggle requires only HTML
- **Plugin architecture**: plugins self-register in `setup()`, use generic panel slots (`setSlot`/`clearSlot`), communicate via `broadcastToPlugins`/`onPluginEvent`

## Static Assets (not bundled)

`static/stockfish-worker.js`, `stockfish.js`, `stockfish.wasm` are loaded at runtime via `chrome.runtime.getURL()`. Rollup copies them to `dist/` via the copy plugin.

## Common Pitfalls & Fixes

### DOM-based detection is fragile — prefer board diff

Chess sites update DOM elements (clocks, move lists, highlights) at unpredictable times relative to piece positions. This causes:

- **Turn detection wrong**: `detectTurn()` reads clock/move-list DOM, but these may not have updated when the MutationObserver fires on piece movement. Fix: `detectTurnFromDiff()` in `content.js` compares previous board array to current — if a white piece arrived, it's black's turn. Falls back to highlight-based detection (check piece color at the `to` square of the last move highlight), then to adapter `detectTurn()` for initial position or large jumps (>4 squares changed). The highlight fallback is essential for puzzle pages which have no clocks or move list.
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

The analysis panel displays (top to bottom): header (classification badge, eval score, depth), opening name, insight text, plugin slots (generic via `setSlot`/`clearSlot`), W/D/L bar with percentages, analysis lines, eval chart, status bar (accuracy, PGN button, FEN button).

### W/D/L bar

Three-segment bar showing Win/Draw/Loss percentages. Uses sigmoid model: `winRaw = 1 / (1 + exp(-0.00368208 * cp))` with Gaussian draw component. Mate → 100/0/0 or 0/0/100.

### Opening name

`core/openings.js` — 193-entry ECO lookup Map keyed by first two FEN fields (position + turn). Shows opening name below the header row. Hidden for starting position or unknown positions.

### Eval score chart

SVG area chart plotting white-perspective eval at each ply. Togglable via popup (`showChart`, default on). White area fills from bottom up to the score line (more white = white winning). Dark background = black's territory. Orange cursor line marks current ply. Scores clamped to ±500cp, mate = ±500. Updates live as engine depth increases, persists through navigation.

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
- Tiers: Brilliant (`!!`, teal, cpLoss ≤ −50 and not engine's #1), Crazy (`!?`, purple, sacrifice ≥ 3 material and cpLoss ≤ 30), Best (`★`, green, engine's PV[0]), Excellent (`✓`, green, ≤10cp), Good (muted green, ≤30), Inaccuracy (`?!`, yellow, ≤80), Mistake (`✕`, orange, ≤200), Blunder (`??`, red, >200)

### Insight arrows

For Mistake/Blunder moves, a **dashed arrow** always shows the engine's best move on the board (what the player should have played). Uses `chee-insight-el` class so it persists during line hover. Drawn at lock depth alongside the classification badge. Cached and restored on revert navigation.

### Pre-move hints

Two modes (can both be active):
1. **Classification hints** — when `showClassifications` is enabled and engine finds a clearly best move (score spread ≥ 80cp between line 1 and 2), shows a badged arrow. ≥200cp → Brilliant hint (teal), ≥80cp → Excellent hint (green). Requires depth ≥ 14.
2. **Best move arrow** — when `showBestMove` is enabled, always shows PV[0] as a team-colored arrow (blue for white, orange for black). No badge.

### Blunder guard (piece selection warning)

`core/plugins/guard-plugin.js` — warns when a user clicks a piece that isn't in any of the engine's top analysis lines. Togglable via popup (`showGuard`, default off). Mousedown on the board → `eventToSquare()` from `lib/dom.js` converts coords to `{ file, rank }` → `checkSquare()` tests if any line's PV[0] starts from that square → if none match, `arrow.drawGuard()` renders a semi-transparent red circle (`.chee-guard-el`). Cleared on mouseup, board change, or next mousedown.

### Trapboy (trap detection)

`core/plugins/trapboy-plugin.js` — detects traps via three methods: sacrifice detection, tempting capture detection, and opening trap database. Togglable via popup (`showTrapboy`, default off).

**Method 1 — Sacrifice detection (engine-based):**
1. **Phase 1 (depth ≥ 12):** Scans engine PV lines for sacrifice candidates. For each line, applies the first move (`sacrificeUci`) and checks if the destination piece is attacked by the opponent. Filters require:
   - Bait piece value ≥ `TRAPBOY_MIN_SACRIFICE_VALUE` (1)
   - Bait value ≥ capturer value (capture must be tempting — no human trades a knight for a pawn)
   - Opponent's best response (`godModeUci`) is NOT the greedy capture (otherwise it's not a trap)
2. **Phase 2 (depth 8):** Requests secondary analysis of the position after sacrifice + greedy capture. If the score ≥ `TRAPBOY_TRAP_THRESHOLD` (200cp), and the first punishment move doesn't recapture on the bait square (must be non-obvious), the trap is confirmed.

**Method 2 — Tempting capture detection (human-oriented):**
Scans for hanging opponent pieces that the engine rejects capturing — models human behavior (humans take free pieces). `findTemptingCaptures()` finds pieces where target value ≥ capturer value, sorted by value. For each tempting capture not in engine's top lines, requests secondary analysis. If the resulting position is winning (≥ threshold) and punishment isn't a simple recapture, the trap is confirmed. This catches traps like the Lasker Trap where Bxb4 looks like a free bishop but leads to disaster.

**Method 3 — Opening trap database:**
`core/opening-traps.js` stores 10 famous opening traps (Noah's Ark, Legal, Elephant, Lasker, Rubinstein, Siberian, Fajarowicz, Blackburne Shilling, Englund Gambit, Fishing Pole). On each `onBoardChange`, `lookupOpeningTrap(fen)` checks the current position against the FEN-keyed Map (O(1) lookup using position + turn). Instant activation without engine analysis. Panel shows the trap name.

**Move validation:** Before confirming, `validateMoveSequence()` simulates the full step sequence with `applyUciMove()`, checking each source square has a piece.

**Trap tracking:** Once confirmed, `_trapData` stores the full step sequence (`steps[]` with `uci` + `label`, `stepIndex`, `godUci`, `startPly`, optional `name`). On each `onBoardChange`:
- Forward move matching `steps[stepIndex].uci` → advance `stepIndex`, redraw arrows/panel
- Forward move not matching → clear trap (player deviated)
- Backward navigation within trap range → revert `stepIndex` (take-back friendly)
- Navigation before trap start → clear trap

**Panel display:** Shows status throughout: "Searching..." → "Verifying..." → "No trap" or trap steps. Shows trap name (e.g., "Legal Trap") for database traps, "TRAP" for engine-detected traps. Steps show with `.chee-trapboy-done` (dimmed/strikethrough) for completed steps and `.chee-trapboy-active` (bold/underline) for the current step.

**Arrow layers:** Four persistent layers: `trapboy-bait` (magenta, your bait move), `trapboy-opponent` (amber dashed, opponent's expected response), `trapboy-greed` (red, punishment moves), `trapboy-god` (green dashed, opponent's safe escape — only for engine-detected traps). Layers update as steps advance.

**Key utility:** `core/attacks.js` provides `isSquareAttacked()` for checking if a piece is hanging after a move.

### Board preview (move hover visualization)

`core/board-preview.js` — shows predicted board positions when hovering analysis line moves or trapboy steps. Togglable via popup (`showBoardPreview`, default on).

**How it works:** Creates an HTML overlay div (`#chee-board-preview`, z-index 998) positioned over the board. On hover:
1. Applies the hovered UCI move sequence via `applyUciMove()` to get the target board state
2. Diffs current board vs. target board (64-square scan)
3. For each changed square: renders a **square mask** (board background or fallback light/dark color) to cover the original piece, then a **piece image** on top if a piece exists in the new state

**Piece images** are read from the site's own piece elements via `getComputedStyle(el).backgroundImage` (adapter method `getPieceImageMap()`). This ensures pieces match the site's current theme/piece set regardless of chess.com or lichess.

**Board background** is detected by walking up the DOM from the board element looking for a `backgroundImage` in computed styles. Falls back to standard board colors (`#f0d9b5` / `#b58863`).

**Performance:** All expensive operations are cached — piece images (once per mount), board background (once per mount), board metrics/position (invalidated on board change). Redundant `show()` calls with the same moves are skipped via `_lastMovesKey` deduplication.

**Hover gap handling:** When the mouse moves between spans within a line or trapboy panel, the preview persists instead of flickering. Analysis lines ignore `mouseover` events that don't target a `.chee-move` span. Trapboy uses container-level `mouseleave` on the `.chee-trapboy` wrapper instead of per-span `mouseleave`.

**Integration points:**
- **Analysis lines**: Coordinator listens to `EVT_LINE_HOVER` → calls `boardPreview.show()`. `EVT_LINE_LEAVE` → `boardPreview.clear()`.
- **Trapboy steps**: Plugin adds `mouseenter` on each future step span, `mouseleave` on the wrapper. Uses `getRenderCtx().boardPreview` to render.

### Move revert / navigation detection

`detectPly()` in each adapter returns the half-move index from the active move in the DOM move list. The classifier only treats a board diff as a played move when `ply > _prevPly`. Backward navigation restores the cached classification for that ply (panel badge + board icon + insight arrow).

## Puzzle / Hint Mode

Hint pages are defined in a data-driven `HINT_PAGES` config array in `content.js`. Each entry has `{ pattern, key, label, daily? }`. First match wins (specific patterns before general ones). To add a new hint page: add one entry to `HINT_PAGES`, a toggle in `popup.html`, and a default in `constants.js`.

**Supported hint pages:**
- **chess.com**: `/puzzles` (rated), `/puzzles/rush`, `/puzzles/battle`, `/puzzles/learning`, `/daily`
- **lichess**: `/training`, `/storm`, `/racer`, `/streak`

Each page type has its own enable toggle (all default off except `enableDaily`).

When a hint page is detected and the corresponding toggle is on:
- **No panel** — the analysis panel is mounted but hidden (`display: none`)
- **Forced overrides**: `numLines=1`, `searchDepth=15`, `showBestMove=true`, `showClassifications=false`, `showChart=false`, `showGuard=false`, `showCrazy=false`
- Only `HintPlugin` is registered (no classification, PGN, guard plugins)
- Turn detection uses highlight-based fallback (`_detectTurnFromHighlights`) since puzzles lack clocks and move lists
- Storage changes to forced keys are filtered out so popup changes don't override hint overrides

**Daily chess** (`/daily/*`): The `enableDaily` toggle in the popup live-toggles the arrow: off clears it immediately, on replays the cached eval via `coordinator.replayEval()` so the arrow reappears without re-analysis.

The popup has a **Puzzles** tab with a two-column grid (chess.com / lichess) for hint toggles.

## Theme System

Catppuccin color palette (Latte, Frappé, Macchiato, Mocha) plus a "Match Site" option. Applied via CSS custom properties (`--chee-base`, `--chee-text`, etc.) on the panel element.
