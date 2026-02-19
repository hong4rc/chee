# Changelog

## [1.2.0](https://github.com/hong4rc/chee/compare/v1.1.0...v1.2.0) (2026-02-19)

### Features

* add accuracy tracker showing running accuracy % in status bar ([c5af113](https://github.com/hong4rc/chee/commit/c5af113fd028cbc8df9ea595c9a828fae85fe197))
* add best move arrow toggle in popup settings ([dfc92d2](https://github.com/hong4rc/chee/commit/dfc92d2fa245ef2c4d9aa6a4f89f7853c4384bc1))
* add classification symbols, Brilliant tier, and revert-safe ply tracking ([bd8c8b7](https://github.com/hong4rc/chee/commit/bd8c8b76c74fb9fa3314119de84ee223c0dd1f84)), closes [#1](https://github.com/hong4rc/chee/issues/1)
* add dashed insight arrow showing best move on board for mistakes/blunders ([bc6fc09](https://github.com/hong4rc/chee/commit/bc6fc091f40315d850e2926730e3edead78544ab))
* add eval score chart and remove status text ([2bd3ad1](https://github.com/hong4rc/chee/commit/2bd3ad1500ae7fe419755184674c71205323bf79))
* add pre-move hint arrows for clearly best moves ([c660f03](https://github.com/hong4rc/chee/commit/c660f038788d9630e54063b61d95ad6b1b3b72eb))
* add threat indicator showing opponent's best response in status bar ([3d873d9](https://github.com/hong4rc/chee/commit/3d873d956dbc3b726c0ba4d23c3dea9b7174d119))
* add W/D/L bar with win/draw/loss percentages alongside eval score ([0bb61f9](https://github.com/hong4rc/chee/commit/0bb61f9e66e75cd5cf68418b450847063b695aad))
* auto-show best move arrow on mistake/blunder ([f4fedaf](https://github.com/hong4rc/chee/commit/f4fedafcf032095e6f5ca20a908595ae452db09a))
* show opening name in panel header with 193-entry ECO lookup ([bc418dc](https://github.com/hong4rc/chee/commit/bc418dc2a3681f980761a6b14fe6b1ca4db2c219))
* show per-line score badges with bordered line cards ([ae1741c](https://github.com/hong4rc/chee/commit/ae1741c8bece3f6499bda653c263138657bc649b))
* show tactical insight for Mistake/Blunder moves ([8650d1f](https://github.com/hong4rc/chee/commit/8650d1f721ed7c542b45cfddeea23d551ff31be0))

### Bug Fixes

* add labels to accuracy and threat, show arrow on threat hover ([57bf08f](https://github.com/hong4rc/chee/commit/57bf08f1dd8807bb9801a16a8473e97a1666ec41))
* move FEN button from header to status bar to prevent overlay ([6f23c6f](https://github.com/hong4rc/chee/commit/6f23c6f87fcee56ef43e9d043275b681dd73564f))
* prevent Stockfish WASM crash from UCI race condition ([887cef9](https://github.com/hong4rc/chee/commit/887cef9fa665e9a37007d2502524d0e735d1d715))
* require minimum prevEval depth for all classifications ([066da4b](https://github.com/hong4rc/chee/commit/066da4b7b27a9b3f454314cac2722396ca937885))
* require minimum prevEval depth for Brilliant classification ([f45ff94](https://github.com/hong4rc/chee/commit/f45ff9418ba86d3aadbf155014c750f60a826c9a))
* show opponent's move as threat instead of user's response ([248280d](https://github.com/hong4rc/chee/commit/248280d1bc4e66cb86f54f2a60b59c5d2f204f76))

## 1.1.0 (2026-02-19)

### Features

* add Lichess support and fix Chee panel overlay ([5ff4373](https://github.com/hong4rc/chee/commit/5ff4373939f37d5b722330d1e4d5c763eaecab4d))
* add log levels (info/warn/error) and debug toggle setting ([f7a292d](https://github.com/hong4rc/chee/commit/f7a292d23550dd7713a1548404b80345e05d4270))
* add move classification (Best/Good/Inaccuracy/Mistake/Blunder) ([4cc4fe9](https://github.com/hong4rc/chee/commit/4cc4fe92904481012ee4dd0fcd767b28373e3f92))
* **arrows:** progressive arrow display on move hover ([3d21ae0](https://github.com/hong4rc/chee/commit/3d21ae05193cc87ac9a0564ce1f951f622eb22ac))
* **init:** chess.com live analysis extension with stockfish wasm ([40d7b14](https://github.com/hong4rc/chee/commit/40d7b1444f087dc3f1d938ffde36b405f7904780))
* **panel:** add copy FEN button to header ([db17748](https://github.com/hong4rc/chee/commit/db17748e356b77931a8457ec0fcbd82c1989a8b3))
* **panel:** add hide/show toggle and minimize button ([4bd4a2a](https://github.com/hong4rc/chee/commit/4bd4a2aa4d2b9c11818e57fa5e8a126dd2a44173))
* **panel:** redesign header with inline score, horizontal eval bar ([3d1e620](https://github.com/hong4rc/chee/commit/3d1e620ac4dcc7fe60403eae8b0f67af5f093814))
* **popup:** add settings for analysis lines and search depth ([17197de](https://github.com/hong4rc/chee/commit/17197dec2883ebbf1241642f03a4f1aa62d8a039))
* **popup:** show version and commit hash in header ([41ab600](https://github.com/hong4rc/chee/commit/41ab60053ca394811aa7228d36744b3f551fa766))
* **theme:** add theme picker with Catppuccin flavors and site-matching ([97bb723](https://github.com/hong4rc/chee/commit/97bb72349cf8288a017f7345156bdc4d438c230f))

### Bug Fixes

* replace DOM-based turn/move detection with board diff ([ba9349f](https://github.com/hong4rc/chee/commit/ba9349fa848d719e438d2fa19a2e87e312cd1214))
