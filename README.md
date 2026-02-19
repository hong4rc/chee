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

- **chess.com** — `/game/*` and `/play/*` pages
- **lichess.org** — all game pages

## Features

- Multi-line analysis (configurable 3-5 lines) with per-line eval scores
- Configurable search depth (19-22)
- Arrow overlays showing suggested moves
- Move classification (Brilliant, Best, Excellent, Good, Inaccuracy, Mistake, Blunder) with board icons and panel badges
- Insight arrows showing the best move on Mistake/Blunder
- Pre-move hint arrows for clearly best moves
- Best move arrow toggle (always-on option)
- W/D/L bar with win/draw/loss percentages
- Eval score chart showing game progress over time
- Opening name display (193-entry ECO database)
- Running accuracy percentage
- Copy FEN to clipboard
- Hide/show and minimize panel controls
- Catppuccin theme system (Latte, Frappe, Macchiato, Mocha) + site-matching mode

## License

[GPL-3.0](LICENSE)
