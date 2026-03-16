---
name: plan
description: Plan a feature implementation for the Chee Chrome extension
disable-model-invocation: true
argument-hint: "<feature-description>"
---

Plan the implementation of: $ARGUMENTS

## Step 1: Assess Scope

Before exploring code, determine if this even needs a plan:
- **Pure CSS/UI change** (font sizes, colors, layout) → skip exploration, just list files and changes
- **Simple toggle/setting** → add to popup.html + constants.js, done
- **Design question** ("should I...?") → give a recommendation with tradeoffs, don't plan
- **Bug report** → diagnose first, plan only if fix is non-trivial
- **Multi-file feature** → proceed to Step 2

## Step 2: Explore Existing Code

Use the Agent tool with `subagent_type: "Explore"` to run **parallel** exploration searches:

- **Agent 1**: Search for similar existing functionality, find related modules
- **Agent 2**: Read the specific files that will need changes
- **Agent 3**: Check how existing plugins/modules wire up

Understand the data flow: MutationObserver → adapter → FEN → engine → panel/arrows

## Step 3: Determine Architecture Approach

### Plugin?
Features hooking into analysis lifecycle → extend `AnalysisPlugin`, self-register in `setup()`, use panel slots, communicate via `broadcastToPlugins`/`onPluginEvent`

### Adapter change?
Site-specific DOM reading → `adapters/chesscom.js` or `adapters/lichess.js`

### Core module change?
Engine/panel/arrow/coordinator → keep module boundaries clean, coordinator orchestrates only

### Popup/settings?
Toggle → `data-key` in `popup.html` + default in `constants.js` (auto-wired)

### Hint-page?
New puzzle page → entry in `HINT_PAGES` + toggle in popup + default in constants

### Engine protocol extension?
New UCI features (e.g., `searchmoves`, temporary MultiPV) → changes in `stockfish-worker.js` + `engine.js` + coordinator. Key pitfalls:
- **Same-FEN secondary analysis**: searchmoves evals leak into main pipeline. Need `savedEval` + `_dropUntilNewAnalysis` isolation.
- **Temporary MultiPV**: must restore after `bestmove`. Worker handles via `tempMultiPV` flag.
- **Partial MultiPV fills**: at shallow depth, not all lines filled. Process available, treat unfilled as worst-case.

## Step 4: Write the Plan

1. **Files to create/modify** and what changes
2. **Implementation order** — dependencies between steps
3. **Constants/settings** — new constants, storage keys, defaults
4. **Testing** — what to verify, edge cases
5. **Performance** — does this add engine work, DOM mutations, or redundant redraws?

Keep minimal — only what's needed.

## Step 5: Present for Approval

Use TodoWrite to create a checklist. Present clearly so the user can approve, modify, or reject before implementation.
