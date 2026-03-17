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
- **Adapter pattern**: Site-specific DOM logic in `adapters/`, not core. Adapters extend `BoardAdapter`
- **Plugin architecture**: Features extend `AnalysisPlugin`, self-register in `setup()`, use `setSlot`/`clearSlot`, communicate via `broadcastToPlugins`/`onPluginEvent`. Coordinator NOT coupled to plugins
- **Module boundaries**: engine.js = Stockfish only, panel.js = DOM only, arrow.js = SVG only, coordinator.js = orchestration only
- **Entry points**: content.js = content script, popup.js = popup UI with `data-key` auto-wiring

### Agent 2: Convention & security review (`subagent_type: "Explore"`)
- ES6 modules with explicit `.js` extensions
- lodash-es named imports (tree-shakeable)
- Constants from `src/constants.js` — no magic numbers, no magic strings
- Private members prefixed with `_`
- Debug logging via `createDebug('chee:namespace')` — no `console.log`, no printf format strings
- Max line length 120 chars
- No XSS vectors (innerHTML with user/DOM content), no eval()
- Tests use named constant imports, not hardcoded values (`GUARD_DEPTH` not `8`, `SEARCH_DEPTH` not `22`)

### Agent 3: Logic bug analysis (`subagent_type: "Explore"`)
- **DOM timing**: Code relying on DOM state that may not be updated yet (clocks, move lists, highlights lag behind pieces)
- **Board diff**: Is board diff used for move/turn detection instead of fragile DOM reads?
- **Ply tracking**: Forward/backward navigation uses `ply > prevPly`?
- **Engine state machine**: States (IDLE/INITIALIZING/READY/ANALYZING) handled correctly?
- **Eval depth**: Classifications gated on minimum depth? Shallow evals = false classifications
- **Puzzle mode**: Hint-page forced overrides respected? Storage changes to forced keys filtered?
- **Race conditions**: MutationObserver → 100ms debounce → read → analyze. Unguarded async sequences? In-flight evals arriving after `engine.stop()`?
- **Memory leaks**: Observers, listeners, intervals cleaned up?
- **Cross-site**: Works on both chess.com and lichess? Different DOM structures
- **Secondary analysis isolation**: `requestSecondaryAnalysis` with `searchmoves` on the same FEN — leftover evals leak into `_applyEval` after secondary clears, contaminating `_lastEvalData` and panel. Must use `_dropUntilNewAnalysis` flag + `savedEval` restore. Resume engine only if savedEval was incomplete (`!savedEval.complete`).
- **MultiPV partial fills**: At shallow depth, Stockfish may not fill all MultiPV lines. Don't wait for all lines — process what's available and treat unfilled moves as worst-case (Stockfish fills best-to-worst).
- **Settings real-time**: Each plugin handles own ON/OFF in `onSettingsChange(settings, renderCtx)`. No broadcast replay patterns. Plugin must clear visuals on toggle-off and restore from cached data on toggle-on.
- **localStorage storage event**: Only fires cross-tab, not same-page. After setting `localStorage.debug`, must call `refreshDebugFlag()` explicitly.
- **Hover gaps**: Flex `gap` creates dead zones (target = parent, not child) that break mouseover delegation. Use `margin` on children instead. Child elements must fill full parent height (`align-items: stretch`) so vertical padding doesn't create dead zones above/below text.

### Agent 4: Performance review (`subagent_type: "Explore"`)
- **Settings changes**: Does toggling trigger work in unrelated plugins? Each plugin self-handles
- **Double-render**: Visual cleared then immediately redrawn in same flow?
- **DOM mutations**: Arrows/overlays cleared and redrawn unnecessarily?
- **Engine work**: Re-analysis when cache/savedEval would suffice? After secondary completes with complete savedEval, don't `forceAnalyze` — just restore
- **Shared settings**: Settings reference replaced with partial update object?
- **Log serialization**: Objects passed to `log()` are stored in ring buffer via `String()` — become `[object Object]`. Use `JSON.stringify()` or template literals
- **SVG rendering**: Unicode chars may render differently across platforms. Prefer simple text (`!`, `?`) over emoji/symbols (`⚠`). Check circle radius, font-size, and positioning are proportional to square size
- **Hover event dedup**: Event emitters that fire on `mouseover` must deduplicate consecutive identical emits (track last emitted key). Without dedup, moving between children that emit the same data causes clear+redraw flash. Also check that `boardPreview.clear()` is called when preview moves become empty (e.g. `previewLastMove` off + single-move hover → `slice(0,-1)` is empty)

## Step 3: Synthesize Results

Collect results from all agents and produce a structured review:

1. **Architecture issues** — violations of adapter/plugin/module patterns
2. **Convention issues** — style, imports, constants, naming
3. **Logic bugs** — potential runtime errors, race conditions, incorrect assumptions
4. **Performance issues** — redundant work, unnecessary redraws, engine waste
5. **Security issues** — if any
6. **Verdict** — LGTM or list of required changes with specific file:line references
