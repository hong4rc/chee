# Chee

Live chess analysis overlay powered by Stockfish WASM. A Chrome extension that reads the board from chess.com and lichess.org, runs Stockfish via WebAssembly, and displays evaluation + best lines in a panel beside the board.

## Setup

```bash
npm install
npm run build
```

Then load the extension in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder

## Development

```bash
npm run watch    # rebuild on file changes
npm run lint     # check code style
npm run lint:fix # auto-fix lint issues
```

Enable debug logging via the extension popup (toggle **Debug logging**), or manually in the browser console:

```js
localStorage.debug = 'chee:*'
```

## Supported Sites

- **chess.com** — `/game/*` and `/play/*` pages (full analysis panel)
- **chess.com** — `/puzzles/*` pages: rated, rush, battle, learning (best move arrow only, each togglable)
- **chess.com** — `/daily/*` pages (best move arrow, live-togglable, enabled by default)
- **lichess.org** — all game pages (full analysis panel)
- **lichess.org** — `/training`, `/storm`, `/racer`, `/streak` (best move arrow, each togglable)

## Features

### Analysis
- Multi-line analysis (configurable 3–5 lines) with per-line eval scores
- Configurable search depth (15–22) with optional wait-for-full-depth
- Arrow overlays showing suggested moves
- Move classification (Brilliant, Best, Excellent, Good, Inaccuracy, Mistake, Blunder) with board icons and panel badges
- Insight arrows showing the best move on Mistake/Blunder
- Pre-move hint arrows for clearly best moves
- Best move arrow toggle (always-on option)
- Move guard — pick up a piece to see which destination squares are bad (! badges on blunder moves)
- Book move detection with continuation arrows from ECO database
- Trap detection (sacrifice traps, tempting captures, 10 known opening traps)
- Crazy sacrifice detection (wild material sacrifices that maintain advantage)

### Display
- Board preview — hover analysis line moves to see predicted positions on the board
- W/D/L bar with win/draw/loss percentages
- Eval score chart with hover tooltip showing game progress over time
- Opening name display (193-entry ECO database)
- Running accuracy percentage (chess.com-style formula)
- Catppuccin theme system (Latte, Frappé, Macchiato, Mocha) + site-matching mode

### Export & Debug
- Copy annotated PGN to clipboard (DOM-based with full move list, or diff-based fallback)
- Copy FEN to clipboard
- Copy debug info — one-click diagnostic dump (settings, page state, recent logs) for troubleshooting

### Puzzle / Hint Mode
- Hint mode: best move arrow on chess.com and lichess puzzles (depth 15)
- Supported: chess.com puzzles (rated, rush, battle, learning, daily), lichess (training, storm, racer, streak)

### UI
- Compact 2-column popup layout with section headers
- Hide/show and minimize panel controls (Alt+C keyboard shortcut)
- Draggable and resizable analysis panel
- All settings apply in real-time — no page reload needed

## License

[GPL-3.0](LICENSE)
