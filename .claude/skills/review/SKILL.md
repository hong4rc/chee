---
name: review
description: Review code changes for architectural consistency, convention adherence, and logic bugs
disable-model-invocation: true
argument-hint: "[file-or-scope]"
---

Review code changes for the Chee Chrome extension. If `$ARGUMENTS` is provided, focus on those files or scope. Otherwise, review all uncommitted changes.

## Step 1: Gather Changes

- If a file/scope argument is given, read those files
- Otherwise, run `git diff` and `git diff --cached` to see all changes
- Read every changed file in full to understand context

## Step 2: Parallel Architecture & Logic Analysis

Use the Agent tool to launch **parallel** review agents simultaneously:

### Agent 1: Architecture review (`subagent_type: "Explore"`)
Explore the changed files and verify they follow the established patterns:
- **Adapter pattern**: Site-specific DOM logic in `adapters/`, not core. Adapters extend `BoardAdapter`, implement `readPieces()`, `isFlipped()`, `detectPly()`
- **Plugin architecture**: New features extend `AnalysisPlugin`, self-register in `setup()`, use `setSlot`/`clearSlot`, communicate via `broadcastToPlugins`/`onPluginEvent`. Coordinator NOT coupled to plugins
- **Module boundaries**: engine.js = Stockfish only, panel.js = DOM only, arrow.js = SVG only, board-diff.js = diff only, coordinator.js = orchestration only, lib/ = pure utilities
- **Entry points**: content.js = content script, popup.js = popup UI with `data-key` auto-wiring

### Agent 2: Convention & security review (`subagent_type: "Explore"`)
Check all changed code for:
- ES6 modules with explicit `.js` extensions
- lodash-es named imports (tree-shakeable)
- Constants from `src/constants.js` — no hardcoded `'w'`/`'b'`, no magic numbers, no magic strings (e.g. `'0-0'` → `SAN_CASTLE_KING_ZEROS`)
- Private members prefixed with `_`
- Debug logging via `createDebug('chee:namespace')` — no `console.log`, no printf format strings
- Max line length 120 chars
- No XSS vectors (innerHTML with user/DOM content), no eval(), no Function() with dynamic strings

### Agent 3: Logic bug analysis (`subagent_type: "Explore"`)
Check changed code for common pitfalls:
- **DOM timing**: Code relying on DOM state that may not be updated yet (clocks, move lists, highlights lag behind pieces)
- **Board diff**: Is board diff used for move/turn detection instead of fragile DOM reads?
- **Ply tracking**: Forward/backward navigation uses `ply > prevPly`?
- **Engine state machine**: States (IDLE/INITIALIZING/READY/ANALYZING) handled correctly?
- **Eval depth**: Classifications gated on minimum depth? Shallow evals = false classifications
- **Puzzle mode**: Hint-page forced overrides respected? Storage changes to forced keys filtered?
- **Race conditions**: MutationObserver → 100ms debounce → read → analyze. Unguarded async sequences?
- **Memory leaks**: Observers, listeners, intervals cleaned up?
- **Cross-site**: Works on both chess.com and lichess? Different DOM structures
- **Secondary analysis isolation**: When `requestSecondaryAnalysis` uses `searchmoves` on the same FEN as main analysis, leftover evals leak into `_applyEval` after the secondary clears — contaminating `_lastEvalData`, panel lines, and plugin state. Always use `_dropUntilNewAnalysis` flag and restore `savedEval`. After restoring, only resume engine if `savedEval` was incomplete.
- **MultiPV partial fills**: At shallow depth (e.g., 8), Stockfish may not fill all MultiPV lines. Don't wait for all lines — process what's available and treat unfilled moves as bad (Stockfish fills best-to-worst).
- **Hardcoded constants in tests**: Never use magic numbers like `toBe(22)` — import and use the named constant (`SEARCH_DEPTH`, `GUARD_DEPTH`) so tests stay correct when values change.

### Agent 4: Performance review (`subagent_type: "Explore"`)
Check for wasteful computation and redundant DOM updates:
- **Settings changes**: Does toggling a setting trigger work in unrelated plugins? Each plugin should handle its own ON/OFF in `onSettingsChange` — avoid broadcast patterns that fire `onEval` on all plugins
- **Double-render**: Does a visual get cleared then immediately redrawn in the same flow?
- **DOM mutations**: Are arrows/overlays cleared and redrawn unnecessarily?
- **Engine work**: Does a setting change trigger re-analysis when cached data would suffice?
- **Shared settings**: When plugins store settings references, do changes break the reference (e.g., replacing `this._settings` with a partial update object)?
- **Log serialization**: Objects passed to `log()` calls are stored in a ring buffer via `String()` — objects become `[object Object]`. Use `JSON.stringify()` or template literals for objects in log arguments

## Step 3: Synthesize Results

Collect results from all agents and produce a structured review:

1. **Architecture issues** — violations of adapter/plugin/module patterns
2. **Convention issues** — style, imports, constants, naming
3. **Logic bugs** — potential runtime errors, race conditions, incorrect assumptions
4. **Security issues** — if any
5. **Verdict** — LGTM or list of required changes with specific file:line references
