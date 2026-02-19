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

## Theme System

Catppuccin color palette (Latte, Frappé, Macchiato, Mocha) plus a "Match Site" option. Applied via CSS custom properties (`--chee-base`, `--chee-text`, etc.) on the panel element.
