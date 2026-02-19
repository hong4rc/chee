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

Enable debug logging in the browser console:

```js
localStorage.debug = 'chee:*'
```

## Supported Sites

- **chess.com** — `/game/*` and `/play/*` pages
- **lichess.org** — all game pages

## Features

- Multi-line analysis (configurable 3-5 lines)
- Configurable search depth (19-22)
- Arrow overlays showing suggested moves
- Eval bar and score with white/black advantage indicator
- Hide/show and minimize panel controls
- Copy FEN to clipboard
- Catppuccin theme system (Latte, Frappe, Macchiato, Mocha) + site-matching mode

## License

[GPL-3.0](LICENSE)
