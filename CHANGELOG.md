# Changelog

## [2.0.0](https://github.com/hong4rc/chee/compare/v1.7.0...v2.0.0) (2026-03-16)

### Features

* add Alt+C keyboard shortcut to toggle panel visibility ([13d9484](https://github.com/hong4rc/chee/commit/13d948452f190ef9c9ee69f6fbb3fc68d8d8f9ee))
* add board preview overlay on move hover ([60ce5bc](https://github.com/hong4rc/chee/commit/60ce5bc74da116fcb742ed0878796053fa47643b))
* add debug info copy button with log buffer and page diagnostics ([a1931e6](https://github.com/hong4rc/chee/commit/a1931e60b4ee17629a613538663a880d10fb4910))
* add depth progress bar under panel header ([a961648](https://github.com/hong4rc/chee/commit/a961648536787201a0dc895e76caf6369fdd2689))
* add eval chart hover tooltip and extract mate display constants ([664cb0d](https://github.com/hong4rc/chee/commit/664cb0d8fb04ea8de8c2726ee62730bb20eef103))
* add fade-in animation for board preview overlay ([443ddee](https://github.com/hong4rc/chee/commit/443ddee1ac458fbe02c066a560f55272a8829993))
* add opening trap database with 10 known traps ([c9bb818](https://github.com/hong4rc/chee/commit/c9bb81842f4bbb1fb3b6680f1e9984a3c86727b4))
* add pop-in animation for classification badges ([e40bdd4](https://github.com/hong4rc/chee/commit/e40bdd4d2d844a0763649df06f361769082b5cb1))
* add pulsing loading indicator while engine initializes ([3122a25](https://github.com/hong4rc/chee/commit/3122a251a02c2fb3b0a5ebd702b9de1af149f3d4))
* add sanToUci converter for SAN-to-UCI move translation ([d8a7c25](https://github.com/hong4rc/chee/commit/d8a7c25f07c11e62dc7636d44503314b98ee9236))
* add smooth fade-in animation for arrows and board overlays ([c847168](https://github.com/hong4rc/chee/commit/c84716820486d0f137712f30b0f27d2f0d80b8ab))
* add tooltip descriptions to all popup toggles ([d1245ab](https://github.com/hong4rc/chee/commit/d1245ab9b4e2072875da4082c83684fa2b05514d))
* add visual feedback for PGN/FEN copy buttons ([e1e63f0](https://github.com/hong4rc/chee/commit/e1e63f002b3f915b86ae7a7605965bfba66faa20))
* color-code accuracy display and show placeholder from start ([2686a6f](https://github.com/hong4rc/chee/commit/2686a6f567e0b5ee9669d153b46e55eedb9c5498))
* dom-based PGN export with spec-compliant formatting ([2673c91](https://github.com/hong4rc/chee/commit/2673c91a35675b37414c90a7bb5ab0c491ef1c10))
* enable classifications, best move, and guard by default ([b718ea3](https://github.com/hong4rc/chee/commit/b718ea3f3656e762f8eab50b7a43cefa1f9e4ce8))
* improve trapboy with tempting capture detection, opening trap integration, and opponent arrows ([8c2eafe](https://github.com/hong4rc/chee/commit/8c2eafe4c1b7c4e823319a2c0e00e869ebcc2373))
* reorganize popup with section headers and clearer labels ([111e5b2](https://github.com/hong4rc/chee/commit/111e5b2d74721cf21260f7165ef932d03ef3fc30))
* replace showBoardPreview with previewLastMove setting ([4f9793d](https://github.com/hong4rc/chee/commit/4f9793d2cb74c172a9ffedaf6371da1388937040))
* rewrite guard plugin with searchmoves-based per-square warnings ([da4a366](https://github.com/hong4rc/chee/commit/da4a366af7c5b793cb1b002ed1b38e1c6f7c67ff))

### Bug Fixes

* add d22 to depth button group matching the default ([8ebd9cf](https://github.com/hong4rc/chee/commit/8ebd9cfad93de126fc6521e7ef35ee0dc2dd970b))
* align arrow overlay SVG to board element instead of parent ([b6e76c5](https://github.com/hong4rc/chee/commit/b6e76c56ab1c37debc192c045cc20452abf9bd09))
* apply setting toggles in real-time via plugin onSettingsChange ([c5f8210](https://github.com/hong4rc/chee/commit/c5f82102924ef05a718bee504ae4c4f4f02299b7))
* avoid unnecessary engine reconfigure and improve crash recovery ([d3264b0](https://github.com/hong4rc/chee/commit/d3264b09b41f390018608e6d8427da976f6897cd))
* convert Unicode figurine chars to SAN letters in move list ([2819394](https://github.com/hong4rc/chee/commit/28193946b68456ca74f0c4d06a6c3345aaa7b8d8))
* exclude SVG marker elements from fade-in animation ([50172ce](https://github.com/hong4rc/chee/commit/50172ce565c1fb6c961ba7b16da16250828d7b3f))
* pawn move generation skips captures on own pieces ([7714266](https://github.com/hong4rc/chee/commit/77142666067dedae51904609166127841cb7c33f))
* prevent arrow/preview flicker when hovering between move spans ([827dc0c](https://github.com/hong4rc/chee/commit/827dc0c2c8046b9891d37caf779380b539281237))
* refresh debug flag in same tab when toggling debug mode ([b2cfed9](https://github.com/hong4rc/chee/commit/b2cfed9d17286f0d5c3289d5cb4a2eab48e76800))
* serialize objects in log calls for debug buffer readability ([d00279c](https://github.com/hong4rc/chee/commit/d00279c0b82fbfef5756da812770ec700b9370a0))
* suppress Trapboy "No trap" noise in panel ([42fdeda](https://github.com/hong4rc/chee/commit/42fdedaa63003271e533b4f26474bc9388451953))
* tag eval messages with FEN and drop stale evals for wrong position ([e3f2ebc](https://github.com/hong4rc/chee/commit/e3f2ebc239e86a68875d6b6352984615765a47de))
* use pointer cursor on panel hide and toggle buttons ([c738a5a](https://github.com/hong4rc/chee/commit/c738a5ad5da7defe62ad3f924bd6a1dac5acba76))

## [1.7.0](https://github.com/hong4rc/chee/compare/v1.6.0...v1.7.0) (2026-03-10)

### Features

* add depth 15 option, configure mise to load .env ([4affa14](https://github.com/hong4rc/chee/commit/4affa14c08c59a12a565422719c0acf5a8bdc175))
* add lichess puzzle support, data-driven hint page detection, popup UI improvements ([55653d5](https://github.com/hong4rc/chee/commit/55653d5360867144a919c789ac02a2eac177c64d))

### Bug Fixes

* **ci:** allow devDependencies and console in config and scripts ([9a4a45e](https://github.com/hong4rc/chee/commit/9a4a45e376b6529301b18e85bf7a359988e31b45))
* clean up unused imports and lint errors in test files ([0e61a56](https://github.com/hong4rc/chee/commit/0e61a561a92134bc1b325c142ee80f1d5fee7fb2))

## [1.6.0](https://github.com/hong4rc/chee/compare/v1.5.0...v1.6.0) (2026-02-26)

### Features

* add book move classification and continuation arrows ([afbecf4](https://github.com/hong4rc/chee/commit/afbecf448514d23c30ec48445a5a8f815b2b4857))
* add trapboy plugin with trap tracking, validation, and status display ([4b200a4](https://github.com/hong4rc/chee/commit/4b200a48de825d404189ebf743442441c664464f))
* reconfigure engine via UCI instead of destroying and recreating ([24e2619](https://github.com/hong4rc/chee/commit/24e26195b9cfb25f111909ef7326186655acba64))
* split accuracy by side with classification-based scoring ([6d4ec68](https://github.com/hong4rc/chee/commit/6d4ec68716ba8550c47a3026a11a5c6f881e0f4b))
* wire trapboy into coordinator, engine, popup, and content ([0a75726](https://github.com/hong4rc/chee/commit/0a75726a112099e2e275dd7b2485e5810090d7e1))

### Bug Fixes

* live-toggle book continuation arrows on settings change ([c8d015a](https://github.com/hong4rc/chee/commit/c8d015a4f3dc8bad0fd487adbe819954db08fb6b))
* validate book continuation moves and update book color ([953968d](https://github.com/hong4rc/chee/commit/953968dfc19e94e886d6fb10e650eb9504b97576)), closes [#9ca8ce](https://github.com/hong4rc/chee/issues/9ca8ce) [#7a4a1e](https://github.com/hong4rc/chee/issues/7a4a1e)

## [1.5.0](https://github.com/hong4rc/chee/compare/v1.4.0...v1.5.0) (2026-02-25)

### Features

* add chess.com puzzle support with best move arrow ([5dac21e](https://github.com/hong4rc/chee/commit/5dac21ef5b8f434d49e2a718423d1beaaad71e1a))
* add daily chess support with live-togglable best move arrow ([7f32196](https://github.com/hong4rc/chee/commit/7f321962aeec7fd17cad9d6e0f15b74227b4d5c9))
* add Puzzle Battle support and puzzle depth setting ([387f625](https://github.com/hong4rc/chee/commit/387f625802f4410fe332f5691c88deb83f869d42))
* add Puzzle Learning toggle for chess.com/puzzles/learning ([7674563](https://github.com/hong4rc/chee/commit/76745632f09792b95b2683ca1dc8f9c2dfaee24a))
* add Puzzle Rush support with separate toggle ([22f504d](https://github.com/hong4rc/chee/commit/22f504d39eab5f9e74ce11c6bee8c29aff9228d7))
* add wait-for-complete option to show arrow only after full depth ([82016a2](https://github.com/hong4rc/chee/commit/82016a23ef49cb5db22165fcfbbf820a12fff423))
* expand openings database with improved ECO API search strategy ([8573b98](https://github.com/hong4rc/chee/commit/8573b982ba98b0ad990d03aa46fb45a3d38acec4))

### Bug Fixes

* limit engine auto-recovery to 2 attempts per position ([67c5416](https://github.com/hong4rc/chee/commit/67c541617e626a3a21bd5167b7d894040d5187b7))

## [1.4.0](https://github.com/hong4rc/chee/compare/v1.3.0...v1.4.0) (2026-02-24)

### Features

* add resizable panel via bottom-right grip handle ([bc619de](https://github.com/hong4rc/chee/commit/bc619de349413e25c53647de6806807ea960cbe2))
* auto-show Crazy classification independent of showClassifications ([38eaee7](https://github.com/hong4rc/chee/commit/38eaee7ded3b0045907f7474c6b15e0a2d19f3d2))
* expand opening database to 850 entries from chess.com ECO ([efcfd13](https://github.com/hong4rc/chee/commit/efcfd1369f7d4b26e1884c505673b3e8268b985b))
* make analysis panel draggable with persistent position ([b55eedd](https://github.com/hong4rc/chee/commit/b55eeddb5fb0602066511fc981b4325d91010391))

### Bug Fixes

* clamp panel to viewport on window resize and panel resize ([ebe0404](https://github.com/hong4rc/chee/commit/ebe04045c70abc0fc3cca3b030f7d94834baa904))

## [1.3.0](https://github.com/hong4rc/chee/compare/v1.2.0...v1.3.0) (2026-02-21)

### Features

* add blunder guard with togglable showGuard setting ([129c9c9](https://github.com/hong4rc/chee/commit/129c9c97da65f8789c6bf077705347e7c8293153))
* add Crazy classification for material sacrifices ([e720100](https://github.com/hong4rc/chee/commit/e720100c0062399ec015fd1378f099bd523b04ab))
* add LRU eval cache to skip redundant Stockfish analysis on navigation ([61def02](https://github.com/hong4rc/chee/commit/61def02b019bfaf1abe82ae17c3592f8db0da6a0))
* add PGN export plugin with annotated move output ([b3e9902](https://github.com/hong4rc/chee/commit/b3e9902f46a73b93ecd71476dcf1151c0485ae6b))
* add showChart setting toggle for eval chart (default on) ([adc3b37](https://github.com/hong4rc/chee/commit/adc3b375b2c634995ede115f8307a9b4c582a233))
* persist panel minimized/hidden state across page loads ([dd8fb52](https://github.com/hong4rc/chee/commit/dd8fb523950dde9f1ec9d39f6b07c846ca11fd6e))

### Bug Fixes

* drop stale eval messages after position change ([36ae0c2](https://github.com/hong4rc/chee/commit/36ae0c2db08ce59d04c152f5a35de3c459ad1aca))
* skip turn re-detection when board is unchanged ([2c5b802](https://github.com/hong4rc/chee/commit/2c5b8026de31e0af18a5937204e089b40f470d3c))

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
