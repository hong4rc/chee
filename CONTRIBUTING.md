# Contributing to Chee

## Setup

```bash
git clone https://github.com/hong4rc/chee.git
cd chee
npm install
npm run build
```

Load `dist/` as an unpacked extension in `chrome://extensions` (enable Developer mode).

## Development

```bash
npm run watch    # rebuild on changes
npm run lint     # check code style
npm run lint:fix # auto-fix lint issues
npm run test     # run tests
```

## Code conventions

- **ES6 modules** with explicit `.js` extensions in all imports
- **Constants** from `src/constants.js` — no hardcoded values (`TURN_WHITE` not `'w'`)
- **Private members** prefixed with `_`
- **Debug logging** via `createDebug('chee:namespace')` — never `console.log`
- **Max line length**: 120 characters
- **lodash-es** for utilities (tree-shakeable named imports)

## Commit style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `test:` — adding or updating tests
- `docs:` — documentation only
- `ci:` — CI/CD changes
- `chore:` — maintenance tasks

## Pull requests

1. Create a feature branch from `main`
2. Make your changes with conventional commits
3. Ensure `npm run lint` and `npm run test` pass
4. Open a PR against `main` — the template checklist will guide you
5. CI runs ESLint (with inline annotations) and tests automatically

## Architecture overview

See [CLAUDE.md](./CLAUDE.md) for detailed architecture docs, module descriptions, and common pitfalls.

## Debugging

Enable debug logging in the browser console:

```js
localStorage.debug = 'chee:*'
```

Or toggle it from the extension popup (Hints tab → Debug logging).
