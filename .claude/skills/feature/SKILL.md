---
name: feature
description: Full flow — plan, implement, lint, test, and review a feature for the Chee Chrome extension
disable-model-invocation: true
argument-hint: "<feature-description>"
---

Implement a complete feature for the Chee Chrome extension: $ARGUMENTS

Execute the full flow below. Use the TodoWrite tool to track progress through all phases. Stop and ask if anything is unclear at any step.

---

## Phase 1: Plan (use Agent tools for parallel exploration)

Launch **parallel** Explore agents to investigate the codebase:
- **Agent 1**: Search for similar existing functionality and related modules
- **Agent 2**: Read files that will need changes (adapters, plugins, core, popup)
- **Agent 3**: Check how existing plugins wire up (setup, slots, events, coordinator registration)

Then synthesize findings into a plan:
1. Determine the right architectural approach (plugin, adapter, core, popup, hint-page)
2. Write a numbered implementation checklist using TodoWrite
3. **Present the plan and wait for user approval before proceeding**

---

## Phase 2: Implement

After the plan is approved, implement each step:

1. Follow the plan checklist in order
2. Follow all project conventions:
   - ES6 modules with `.js` extensions
   - Constants in `src/constants.js`
   - Private members prefixed with `_`
   - Debug logging via `createDebug('chee:namespace')`
   - No `console.log`, no magic numbers, no magic strings — use named constants from `src/constants.js`
   - Max 120 char lines
3. Keep changes minimal — only what the plan specifies
4. Mark each TodoWrite item done as you complete it
5. **When debugging**: ask the user for clarification — what they see, what they expected, exact reproduction steps — before diving into code. Guessing wastes time.
6. **When fixing a bug**: immediately update `.claude/skills/review/SKILL.md` and `.claude/skills/feature/SKILL.md` with the lesson learned — don't defer to Phase 6. Capture the pitfall while context is fresh. This prevents repeating the same mistake in the same session or future sessions.

---

## Phase 3: Validate

Run validation tools in parallel where possible:

1. `npx eslint` on changed files — fix any errors
2. `npm test` — fix any failures
3. `npm run build` — verify the build succeeds

---

## Phase 4: Review (use Agent tools for parallel review)

Launch **parallel** review agents on your own changes:
- **Agent 1 (Architecture)**: Verify adapter/plugin/module patterns are followed
- **Agent 2 (Conventions)**: Check imports, constants, naming, debug logging
- **Agent 3 (Logic bugs)**: Check DOM timing, board diff usage, ply tracking, engine states, race conditions, cross-site compatibility
- **Agent 4 (Performance)**: Check for redundant work, unnecessary redraws, and wasted computation. Key checklist:
  - Settings changes: does toggling a setting trigger work in unrelated plugins? Each plugin should handle its own ON/OFF in `onSettingsChange` — avoid broadcast-replay patterns that fire `onEval` on all plugins
  - Double-render cycles: does a visual get cleared then immediately redrawn in the same settings change flow?
  - DOM updates: are arrows/overlays being cleared and redrawn unnecessarily? Each clear+draw is a DOM mutation
  - Engine work: does a setting change trigger engine re-analysis when cached data would suffice?
  - Shared state: when plugins store references to settings objects, do settings changes cause plugins to lose their reference (e.g., replacing `this._settings` with partial update object)?
  - Secondary analysis leaks: when `requestSecondaryAnalysis` uses `searchmoves` on the same FEN, leftover evals contaminate main analysis after secondary clears. Use `_dropUntilNewAnalysis` + `savedEval` restore. Only resume engine if savedEval was incomplete.
  - MultiPV partial fills: at shallow depth, Stockfish may not fill all MultiPV lines. Process available lines and treat unfilled moves as worst-case — don't wait forever for all lines.
  - Hardcoded constants in tests: use named imports (`GUARD_DEPTH`, `SEARCH_DEPTH`) not magic numbers.

Fix any issues found during review. Re-run validation if fixes were needed.

---

## Phase 5: Verify in Browser

**IMPORTANT**: This is a Chrome extension — code changes only take effect after reload.

1. Remind the user: **"Reload the extension in `chrome://extensions` and refresh the chess page to test"**
2. Ask if the feature works correctly in the browser
3. If bugs are found, fix and re-run Phase 3-4

---

## Phase 6: Documentation & Skill Update

### Check if docs need updating
- If new plugin added → update plugin list in `CLAUDE.md` (Architecture, Plugins section)
- If new setting/toggle added → update `CLAUDE.md` (Settings, Panel Features)
- If new hint page added → update `CLAUDE.md` (Puzzle / Hint Mode)
- If new adapter or adapter change → update `CLAUDE.md` (DOM structure sections)
- If new constants → verify they're documented in the relevant section
- **Only update docs that are affected** — don't touch unrelated sections

### Learn and improve skills
Most skill updates should already be done (Phase 2 step 6 — update on each bug fix). Final check:
- Any remaining lessons not yet captured? → Add to `/review` or `/feature` skill
- Was a new architectural pattern used? → Add to `/plan` skill's approach section
- SVG/CSS rendering issues (icon not visible, wrong font, bad sizing) → Add to `/review` skill's rendering checklist

---

## Phase 7: Commit

After everything passes:

1. Stage the relevant files (including any doc/skill updates from Phase 6)
2. Create a Conventional Commits message (`feat:`, `fix:`, `refactor:`)
3. If the feature touches multiple concerns, suggest split commits
4. **Ask the user before committing**
