## Summary

<!-- Brief description of what this PR does and why -->

## Checklist

- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, etc.)
- [ ] No `console.log` — use `createDebug('chee:namespace')` instead
- [ ] All imports use explicit `.js` extensions
- [ ] Constants used instead of hardcoded values (`TURN_WHITE` not `'w'`)
- [ ] Private members prefixed with `_`
- [ ] Lines within 120 characters
- [ ] ESLint passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Tested manually in Chrome on chess.com / lichess.org

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation
- [ ] CI / build
