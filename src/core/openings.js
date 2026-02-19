// ECO opening names — compact lookup by position + turn
const OPENINGS = new Map([
  // ─── Starting Position ──────────────────────────────────────
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w', 'Starting Position'],

  // ─── 1.e4 ───────────────────────────────────────────────────
  ['rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b', 'King\'s Pawn Opening'],

  // 1.e4 e5
  ['rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w', 'Open Game'],
  // 1.e4 e5 2.Nf3
  ['rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b', 'King\'s Knight Opening'],
  // 1.e4 e5 2.Nf3 Nc6
  ['r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w', 'King\'s Knight Opening'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5
  ['r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b', 'Ruy Lopez'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6
  ['r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w', 'Ruy Lopez: Morphy Defense'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4
  ['r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R b', 'Ruy Lopez: Morphy Defense'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6
  ['r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w', 'Ruy Lopez: Morphy Defense'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O
  ['r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 b', 'Ruy Lopez: Closed'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7
  ['r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 w', 'Ruy Lopez: Closed'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d5
  ['r1bq1rk1/2ppbppp/p1n2n2/1p1pp3/4P3/1BP2N2/PP1P1PPP/RNBQR1K1 w', 'Ruy Lopez: Marshall Attack'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6
  ['r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w', 'Ruy Lopez: Berlin Defense'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4
  ['r1bqkb1r/pppp1ppp/2n5/1B2p3/4n3/5N2/PPPP1PPP/RNBQ1RK1 w', 'Ruy Lopez: Berlin Defense, Rio de Janeiro'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Nxe4 5.d4 Nd6 6.Bxc6 dxc6 7.dxe5 Nf5 8.Qxd8+ Kxd8
  ['r1bk1b1r/ppp2ppp/2p5/4Pn2/8/5N2/PPP2PPP/RNB2RK1 w', 'Ruy Lopez: Berlin Endgame'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 f5
  ['r1bqkbnr/pppp2pp/2n5/1B2pp2/4P3/5N2/PPPP1PPP/RNBQK2R w', 'Ruy Lopez: Schliemann Defense'],

  // ─── Italian Game ───────────────────────────────────────────
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4
  ['r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b', 'Italian Game'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5
  ['r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w', 'Italian Game: Giuoco Piano'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3
  ['r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R b', 'Italian Game: Giuoco Piano'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4
  ['r1bqk1nr/pppp1ppp/2n5/2b1p3/1PB1P3/5N2/P1PP1PPP/RNBQK2R b', 'Italian Game: Evans Gambit'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6
  ['r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w', 'Italian Game: Two Knights Defense'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5
  ['r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b', 'Italian Game: Fried Liver Attack'],
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.d3
  ['r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b', 'Italian Game: Giuoco Pianissimo'],

  // ─── Scotch ─────────────────────────────────────────────────
  // 1.e4 e5 2.Nf3 Nc6 3.d4
  ['r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b', 'Scotch Game'],
  // 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Nxd4
  ['r1bqkbnr/pppp1ppp/2n5/8/3NP3/8/PPP2PPP/RNBQKB1R b', 'Scotch Game'],

  // ─── Petrov ─────────────────────────────────────────────────
  // 1.e4 e5 2.Nf3 Nf6
  ['rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w', 'Petrov\'s Defense'],
  // 1.e4 e5 2.Nf3 Nf6 3.Nxe5
  ['rnbqkb1r/pppp1ppp/5n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R b', 'Petrov\'s Defense: Classical'],
  // 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4
  ['rnbqkb1r/ppp2ppp/3p4/8/3Pn3/5N2/PPP2PPP/RNBQKB1R b', 'Petrov\'s Defense: Steinitz Attack'],

  // ─── Philidor ───────────────────────────────────────────────
  // 1.e4 e5 2.Nf3 d6
  ['rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w', 'Philidor Defense'],

  // ─── King's Gambit ──────────────────────────────────────────
  // 1.e4 e5 2.f4
  ['rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b', 'King\'s Gambit'],
  // 1.e4 e5 2.f4 exf4
  ['rnbqkbnr/pppp1ppp/8/8/4Pp2/8/PPPP2PP/RNBQKBNR w', 'King\'s Gambit Accepted'],
  // 1.e4 e5 2.f4 d5
  ['rnbqkbnr/ppp2ppp/8/3pp3/4PP2/8/PPPP2PP/RNBQKBNR w', 'King\'s Gambit: Falkbeer Countergambit'],

  // ─── Vienna ─────────────────────────────────────────────────
  // 1.e4 e5 2.Nc3
  ['rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b', 'Vienna Game'],

  // ─── Bishop's Opening ──────────────────────────────────────
  // 1.e4 e5 2.Bc4
  ['rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b', 'Bishop\'s Opening'],

  // ─── Sicilian Defense ───────────────────────────────────────
  // 1.e4 c5
  ['rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w', 'Sicilian Defense'],
  // 1.e4 c5 2.Nf3
  ['rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b', 'Sicilian Defense'],
  // 1.e4 c5 2.Nf3 d6
  ['rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w', 'Sicilian Defense'],
  // 1.e4 c5 2.Nf3 d6 3.d4
  ['rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b', 'Sicilian Defense: Open'],
  // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4
  ['rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b', 'Sicilian Defense: Open'],
  // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3
  ['rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b', 'Sicilian Defense: Open'],
  // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6
  ['rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w', 'Sicilian: Najdorf'],
  // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5
  ['rnbqkb1r/1p2pppp/p2p1n2/6B1/3NP3/2N5/PPP2PPP/R2QKB1R b', 'Sicilian: Najdorf, Classical'],
  // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be2
  ['rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP1BPPP/R1BQK2R b', 'Sicilian: Najdorf, English Attack Prep'],
  // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3
  ['rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b', 'Sicilian: Najdorf, English Attack'],
  // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.f3
  ['rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N2P2/PPP3PP/R1BQKB1R b', 'Sicilian: Najdorf, f3'],
  // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6
  ['rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w', 'Sicilian: Dragon'],
  // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3
  ['rnbqk2r/pp2ppbp/3p1np1/8/3NP3/2N1BP2/PPP3PP/R2QKB1R b', 'Sicilian: Dragon, Yugoslav Attack'],
  // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6
  ['rnbqkb1r/pp3ppp/3ppn2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w', 'Sicilian: Scheveningen'],
  // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6
  ['r1bqkb1r/pp2pppp/2np1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w', 'Sicilian: Classical'],
  // 1.e4 c5 2.Nf3 Nc6
  ['r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w', 'Sicilian Defense'],
  // 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5
  ['r1bqkb1r/pp1p1ppp/2n2n2/4p3/3NP3/2N5/PPP2PPP/R1BQKB1R w', 'Sicilian: Sveshnikov'],
  // 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6
  ['r1bqkb1r/pp3ppp/2np1n2/1N2p3/4P3/2N5/PPP2PPP/R1BQKB1R w', 'Sicilian: Sveshnikov'],
  // 1.e4 c5 2.Nf3 Nc6 3.Bb5
  ['r1bqkbnr/pp1ppppp/2n5/1Bp5/4P3/5N2/PPPP1PPP/RNBQK2R b', 'Sicilian: Rossolimo'],
  // 1.e4 c5 2.Nf3 e6
  ['rnbqkbnr/pp1p1ppp/4p3/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w', 'Sicilian Defense'],
  // 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 a6
  ['rnbqkbnr/1p1p1ppp/p3p3/8/3NP3/8/PPP2PPP/RNBQKB1R w', 'Sicilian: Kan'],
  // 1.e4 c5 2.Nf3 e6 3.d4 cxd4 4.Nxd4 Nc6
  ['r1bqkbnr/pp1p1ppp/2n1p3/8/3NP3/8/PPP2PPP/RNBQKB1R w', 'Sicilian: Taimanov'],
  // 1.e4 c5 2.c3
  ['rnbqkbnr/pp1ppppp/8/2p5/4P3/2P5/PP1P1PPP/RNBQKBNR b', 'Sicilian: Alapin'],
  // 1.e4 c5 2.d4 cxd4 3.c3
  ['rnbqkbnr/pp1ppppp/8/8/3pP3/2P5/PP3PPP/RNBQKBNR b', 'Sicilian: Smith-Morra Gambit'],
  // 1.e4 c5 2.Nc3
  ['rnbqkbnr/pp1ppppp/8/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR b', 'Sicilian: Closed'],
  // 1.e4 c5 2.f4
  ['rnbqkbnr/pp1ppppp/8/2p5/4PP2/8/PPPP2PP/RNBQKBNR b', 'Sicilian: Grand Prix Attack'],

  // ─── French Defense ─────────────────────────────────────────
  // 1.e4 e6
  ['rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w', 'French Defense'],
  // 1.e4 e6 2.d4
  ['rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b', 'French Defense'],
  // 1.e4 e6 2.d4 d5
  ['rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w', 'French Defense'],
  // 1.e4 e6 2.d4 d5 3.Nc3
  ['rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b', 'French Defense: Paulsen'],
  // 1.e4 e6 2.d4 d5 3.Nc3 Bb4
  ['rnbqk1nr/ppp2ppp/4p3/3p4/1b1PP3/2N5/PPP2PPP/R1BQKBNR w', 'French Defense: Winawer'],
  // 1.e4 e6 2.d4 d5 3.Nc3 Nf6
  ['rnbqkb1r/ppp2ppp/4pn2/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR w', 'French Defense: Classical'],
  // 1.e4 e6 2.d4 d5 3.Nc3 dxe4
  ['rnbqkbnr/ppp2ppp/4p3/8/3Pp3/2N5/PPP2PPP/R1BQKBNR w', 'French Defense: Rubinstein'],
  // 1.e4 e6 2.d4 d5 3.Nd2
  ['rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPPN1PPP/R1BQKBNR b', 'French Defense: Tarrasch'],
  // 1.e4 e6 2.d4 d5 3.e5
  ['rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b', 'French Defense: Advance'],
  // 1.e4 e6 2.d4 d5 3.exd5
  ['rnbqkbnr/ppp2ppp/4p3/3P4/3P4/8/PPP2PPP/RNBQKBNR b', 'French Defense: Exchange'],

  // ─── Caro-Kann Defense ──────────────────────────────────────
  // 1.e4 c6
  ['rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w', 'Caro-Kann Defense'],
  // 1.e4 c6 2.d4
  ['rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b', 'Caro-Kann Defense'],
  // 1.e4 c6 2.d4 d5
  ['rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w', 'Caro-Kann Defense'],
  // 1.e4 c6 2.d4 d5 3.Nc3
  ['rnbqkbnr/pp2pppp/2p5/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b', 'Caro-Kann: Classical'],
  // 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4
  ['rnbqkbnr/pp2pppp/2p5/8/3PN3/8/PPP2PPP/R1BQKBNR b', 'Caro-Kann: Classical'],
  // 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5
  ['rn1qkbnr/pp2pppp/2p5/5b2/3PN3/8/PPP2PPP/R1BQKBNR w', 'Caro-Kann: Classical, Bf5'],
  // 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7
  ['r1bqkbnr/pp1npppp/2p5/8/3PN3/8/PPP2PPP/R1BQKBNR w', 'Caro-Kann: Karpov'],
  // 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nf6 5.Nxf6+ exf6
  ['rnbqkb1r/pp3ppp/2p2p2/8/3P4/8/PPP2PPP/R1BQKBNR w', 'Caro-Kann: Bronstein-Larsen'],
  // 1.e4 c6 2.d4 d5 3.e5
  ['rnbqkbnr/pp2pppp/2p5/3pP3/3P4/8/PPP2PPP/RNBQKBNR b', 'Caro-Kann: Advance'],
  // 1.e4 c6 2.d4 d5 3.exd5 cxd5
  ['rnbqkbnr/pp2pppp/8/3p4/3P4/8/PPP2PPP/RNBQKBNR w', 'Caro-Kann: Exchange'],
  // 1.e4 c6 2.d4 d5 3.f3
  ['rnbqkbnr/pp2pppp/2p5/3p4/3PP3/5P2/PPP3PP/RNBQKBNR b', 'Caro-Kann: Fantasy'],

  // ─── Pirc / Modern ──────────────────────────────────────────
  // 1.e4 d6
  ['rnbqkbnr/ppp1pppp/3p4/8/4P3/8/PPPP1PPP/RNBQKBNR w', 'Pirc Defense'],
  // 1.e4 d6 2.d4 Nf6 3.Nc3
  ['rnbqkb1r/ppp1pppp/3p1n2/8/3PP3/2N5/PPP2PPP/R1BQKBNR b', 'Pirc Defense'],
  // 1.e4 d6 2.d4 Nf6 3.Nc3 g6
  ['rnbqkb1r/ppp1pp1p/3p1np1/8/3PP3/2N5/PPP2PPP/R1BQKBNR w', 'Pirc Defense: Classical'],
  // 1.e4 g6
  ['rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w', 'Modern Defense'],

  // ─── Scandinavian ───────────────────────────────────────────
  // 1.e4 d5
  ['rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w', 'Scandinavian Defense'],
  // 1.e4 d5 2.exd5 Qxd5
  ['rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w', 'Scandinavian Defense'],
  // 1.e4 d5 2.exd5 Nf6
  ['rnbqkb1r/ppp1pppp/5n2/3P4/8/8/PPPP1PPP/RNBQKBNR w', 'Scandinavian: Modern'],

  // ─── Alekhine's Defense ─────────────────────────────────────
  // 1.e4 Nf6
  ['rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w', 'Alekhine\'s Defense'],
  // 1.e4 Nf6 2.e5 Nd5
  ['rnbqkb1r/pppppppp/8/3nP3/8/8/PPPP1PPP/RNBQKBNR w', 'Alekhine\'s Defense'],

  // ─── Nimzowitsch Defense ────────────────────────────────────
  // 1.e4 Nc6
  ['r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w', 'Nimzowitsch Defense'],

  // ─── Owen's Defense ─────────────────────────────────────────
  // 1.e4 b6
  ['rnbqkbnr/p1pppppp/1p6/8/4P3/8/PPPP1PPP/RNBQKBNR w', 'Owen\'s Defense'],

  // ─── 1.d4 ───────────────────────────────────────────────────
  ['rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b', 'Queen\'s Pawn Opening'],

  // 1.d4 d5
  ['rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w', 'Queen\'s Pawn Game'],

  // ─── Queen's Gambit ─────────────────────────────────────────
  // 1.d4 d5 2.c4
  ['rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b', 'Queen\'s Gambit'],
  // 1.d4 d5 2.c4 dxc4
  ['rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR w', 'Queen\'s Gambit Accepted'],
  // 1.d4 d5 2.c4 e6
  ['rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w', 'Queen\'s Gambit Declined'],
  // 1.d4 d5 2.c4 e6 3.Nc3 Nf6
  ['rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w', 'Queen\'s Gambit Declined'],
  // 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5
  ['rnbqkb1r/ppp2ppp/4pn2/3p2B1/2PP4/2N5/PP2PPPP/R2QKBNR b', 'QGD: Orthodox'],
  // 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 Be7 5.Bf4
  ['rnbqk2r/ppp1bppp/4pn2/3p4/2PP1B2/2N2N2/PP2PPPP/R2QKB1R b', 'QGD: London System'],
  // 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5
  ['rnbqkb1r/ppp2ppp/5n2/3p4/3P4/2N5/PP2PPPP/R1BQKBNR w', 'QGD: Exchange'],
  // 1.d4 d5 2.c4 c6
  ['rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w', 'Slav Defense'],
  // 1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 dxc4
  ['rnbqkb1r/pp2pppp/2p2n2/8/2pP4/2N2N2/PP2PPPP/R1BQKB1R w', 'Semi-Slav Defense'],
  // 1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6
  ['rnbqkb1r/pp3ppp/2p1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w', 'Semi-Slav Defense'],
  // 1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6 5.Bg5 h6 6.Bxf6 Qxf6
  // Removed — too specific for this map; keeping Semi-Slav above

  // ─── Catalan ────────────────────────────────────────────────
  // 1.d4 d5 2.c4 e6 3.Nf3 Nf6 4.g3
  ['rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/5NP1/PP2PP1P/RNBQKB1R b', 'Catalan Opening'],
  // 1.d4 d5 2.c4 e6 3.g3
  ['rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/6P1/PP2PP1P/RNBQKBNR b', 'Catalan Opening'],

  // ─── 1.d4 Nf6 systems ──────────────────────────────────────
  // 1.d4 Nf6
  ['rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w', 'Indian Defense'],
  // 1.d4 Nf6 2.c4
  ['rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b', 'Indian Defense'],

  // ─── Nimzo-Indian ───────────────────────────────────────────
  // 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4
  ['rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w', 'Nimzo-Indian Defense'],
  // 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.e3
  ['rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N1P3/PP3PPP/R1BQKBNR b', 'Nimzo-Indian: Rubinstein'],
  // 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2
  ['rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PPQ1PPPP/R1B1KBNR b', 'Nimzo-Indian: Classical'],
  // 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.f3
  ['rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N2P2/PP2P1PP/R1BQKBNR b', 'Nimzo-Indian: Kmoch'],

  // ─── Queen's Indian ─────────────────────────────────────────
  // 1.d4 Nf6 2.c4 e6 3.Nf3 b6
  ['rnbqkb1r/p1pp1ppp/1p2pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R w', 'Queen\'s Indian Defense'],

  // ─── Bogo-Indian ────────────────────────────────────────────
  // 1.d4 Nf6 2.c4 e6 3.Nf3 Bb4+
  ['rnbqk2r/pppp1ppp/4pn2/8/1bPP4/5N2/PP2PPPP/RNBQKB1R w', 'Bogo-Indian Defense'],

  // ─── King's Indian Defense ──────────────────────────────────
  // 1.d4 Nf6 2.c4 g6
  ['rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w', 'King\'s Indian Defense'],
  // 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7
  ['rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w', 'King\'s Indian Defense'],
  // 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6
  ['rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR w', 'King\'s Indian Defense'],
  // 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5
  ['rnbq1rk1/ppp2pbp/3p1np1/4p3/2PPP3/2N2N2/PP2BPPP/R1BQK2R w', 'King\'s Indian: Classical'],
  // 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.f3
  ['rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N2P2/PP4PP/R1BQKBNR b', 'King\'s Indian: Saemisch'],
  // 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nc6 8.d5 Ne7
  ['r1bq1rk1/ppp1npbp/3p1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 w', 'King\'s Indian: Mar del Plata'],
  // 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Be2 O-O 6.Bg5
  ['rnbq1rk1/ppp1ppbp/3p1np1/6B1/2PPP3/2N5/PP2BPPP/R2QK1NR b', 'King\'s Indian: Averbakh'],
  // 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.d5
  ['rnbq1rk1/ppp2pbp/3p1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQK2R b', 'King\'s Indian: Petrosian'],

  // ─── Grunfeld ───────────────────────────────────────────────
  // 1.d4 Nf6 2.c4 g6 3.Nc3 d5
  ['rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w', 'Grunfeld Defense'],
  // 1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7
  ['rnbqk2r/ppp1ppbp/6p1/8/3PP3/2P5/P4PPP/R1BQKBNR w', 'Grunfeld: Exchange'],
  // 1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.Nf3
  ['rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R b', 'Grunfeld: Russian System'],

  // ─── Benoni ─────────────────────────────────────────────────
  // 1.d4 Nf6 2.c4 c5 3.d5
  ['rnbqkb1r/pp1ppppp/5n2/2pP4/2P5/8/PP2PPPP/RNBQKBNR b', 'Benoni Defense'],
  // 1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 exd5 5.cxd5 d6
  ['rnbqkb1r/pp3ppp/3p1n2/2pP4/8/2N5/PP2PPPP/R1BQKBNR w', 'Modern Benoni'],

  // ─── Dutch Defense ──────────────────────────────────────────
  // 1.d4 f5
  ['rnbqkbnr/ppppp1pp/8/5p2/3P4/8/PPP1PPPP/RNBQKBNR w', 'Dutch Defense'],
  // 1.d4 f5 2.c4 Nf6 3.g3 e6 4.Bg2 Be7
  ['rnbqk2r/ppppb1pp/4pn2/5p2/2PP4/6P1/PP2PPBP/RNBQK1NR w', 'Dutch: Classical'],
  // 1.d4 f5 2.c4 Nf6 3.g3 g6
  ['rnbqkb1r/ppppp2p/5np1/5p2/2PP4/6P1/PP2PP1P/RNBQKBNR w', 'Dutch: Leningrad'],
  // 1.d4 f5 2.g3 e6 3.Bg2 Nf6 4.Nf3 d5
  ['rnbqkb1r/ppp3pp/4pn2/3p1p2/3P4/5NP1/PPP1PPBP/RNBQK2R w', 'Dutch: Stonewall'],

  // ─── London System ──────────────────────────────────────────
  // 1.d4 d5 2.Bf4
  ['rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b', 'London System'],
  // 1.d4 Nf6 2.Bf4
  ['rnbqkb1r/pppppppp/5n2/8/3P1B2/8/PPP1PPPP/RN1QKBNR b', 'London System'],
  // 1.d4 d5 2.Nf3 Nf6 3.Bf4
  ['rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R b', 'London System'],

  // ─── Trompowsky ─────────────────────────────────────────────
  // 1.d4 Nf6 2.Bg5
  ['rnbqkb1r/pppppppp/5n2/6B1/3P4/8/PPP1PPPP/RN1QKBNR b', 'Trompowsky Attack'],

  // ─── Torre Attack ───────────────────────────────────────────
  // 1.d4 Nf6 2.Nf3 e6 3.Bg5
  ['rnbqkb1r/pppp1ppp/4pn2/6B1/3P4/5N2/PPP1PPPP/RN1QKB1R b', 'Torre Attack'],

  // ─── Colle System ───────────────────────────────────────────
  // 1.d4 d5 2.Nf3 Nf6 3.e3
  ['rnbqkb1r/ppp1pppp/5n2/3p4/3P4/4PN2/PPP2PPP/RNBQKB1R b', 'Colle System'],

  // ─── 1.c4 English ───────────────────────────────────────────
  ['rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b', 'English Opening'],
  // 1.c4 e5
  ['rnbqkbnr/pppp1ppp/8/4p3/2P5/8/PP1PPPPP/RNBQKBNR w', 'English: Reversed Sicilian'],
  // 1.c4 c5
  ['rnbqkbnr/pp1ppppp/8/2p5/2P5/8/PP1PPPPP/RNBQKBNR w', 'English: Symmetrical'],
  // 1.c4 c5 2.Nf3 Nf6 3.Nc3 Nc6
  ['r1bqkb1r/pp1ppppp/2n2n2/2p5/2P5/2N2N2/PP1PPPPP/R1BQKB1R w', 'English: Four Knights'],
  // 1.c4 Nf6
  ['rnbqkb1r/pppppppp/5n2/8/2P5/8/PP1PPPPP/RNBQKBNR w', 'English Opening'],
  // 1.c4 e6
  ['rnbqkbnr/pppp1ppp/4p3/8/2P5/8/PP1PPPPP/RNBQKBNR w', 'English Opening'],
  // 1.c4 c6
  ['rnbqkbnr/pp1ppppp/2p5/8/2P5/8/PP1PPPPP/RNBQKBNR w', 'English: Caro-Kann Setup'],
  // 1.c4 g6
  ['rnbqkbnr/pppppp1p/6p1/8/2P5/8/PP1PPPPP/RNBQKBNR w', 'English Opening'],

  // ─── 1.Nf3 Reti ────────────────────────────────────────────
  ['rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b', 'Reti Opening'],
  // 1.Nf3 d5
  ['rnbqkbnr/ppp1pppp/8/3p4/8/5N2/PPPPPPPP/RNBQKB1R w', 'Reti Opening'],
  // 1.Nf3 d5 2.c4
  ['rnbqkbnr/ppp1pppp/8/3p4/2P5/5N2/PP1PPPPP/RNBQKB1R b', 'Reti Opening'],
  // 1.Nf3 d5 2.g3
  ['rnbqkbnr/ppp1pppp/8/3p4/8/5NP1/PPPPPP1P/RNBQKB1R b', 'King\'s Indian Attack'],
  // 1.Nf3 Nf6
  ['rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w', 'Reti Opening'],
  // 1.Nf3 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6
  // → transposes to KID, covered above

  // ─── 1.g3 / 1.b3 / 1.f4 ───────────────────────────────────
  ['rnbqkbnr/pppppppp/8/8/8/6P1/PPPPPP1P/RNBQKBNR b', 'Hungarian Opening'],
  ['rnbqkbnr/pppppppp/8/8/8/1P6/P1PPPPPP/RNBQKBNR b', 'Larsen\'s Opening'],
  ['rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b', 'Bird\'s Opening'],
  // 1.f4 d5
  ['rnbqkbnr/ppp1pppp/8/3p4/5P2/8/PPPPP1PP/RNBQKBNR w', 'Bird\'s Opening'],
  // 1.f4 e5
  ['rnbqkbnr/pppp1ppp/8/4p3/5P2/8/PPPPP1PP/RNBQKBNR w', 'Bird\'s Opening: From Gambit'],

  // ─── Grob / Misc ────────────────────────────────────────────
  ['rnbqkbnr/pppppppp/8/8/6P1/8/PPPPPP1P/RNBQKBNR b', 'Grob\'s Attack'],

  // ─── 1.d4 d6 / 1.d4 g6 — Old Indian / King's Indian setups ─
  // 1.d4 d6
  ['rnbqkbnr/ppp1pppp/3p4/8/3P4/8/PPP1PPPP/RNBQKBNR w', 'Old Indian Defense'],
  // 1.d4 g6
  ['rnbqkbnr/pppppp1p/6p1/8/3P4/8/PPP1PPPP/RNBQKBNR w', 'Modern Defense'],

  // ─── 1.d4 e6 — can transpose to French/QGD ─────────────────
  // 1.d4 e6
  ['rnbqkbnr/pppp1ppp/4p3/8/3P4/8/PPP1PPPP/RNBQKBNR w', 'Indian Game'],

  // ─── 1.e4 b5 — Polish/Owen ─────────────────────────────────
  // Handled under Owen above

  // ─── Uncommon but known 1.e4 responses ──────────────────────
  // 1.e4 e5 2.d4 exd4 3.Qxd4
  ['rnbqkbnr/pppp1ppp/8/8/3QP3/8/PPP2PPP/RNB1KBNR b', 'Center Game'],
  // 1.e4 e5 2.d4 exd4 3.c3
  ['rnbqkbnr/pppp1ppp/8/8/3pP3/2P5/PP3PPP/RNBQKBNR b', 'Danish Gambit'],

  // ─── Four Knights ───────────────────────────────────────────
  // 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6
  ['r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w', 'Four Knights Game'],

  // ─── Three Knights ──────────────────────────────────────────
  // 1.e4 e5 2.Nf3 Nc6 3.Nc3
  ['r1bqkbnr/pppp1ppp/2n5/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R b', 'Three Knights Game'],

  // ─── Hungarian / Giuoco Piano ───────────────────────────────
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Be7
  ['r1bqk1nr/ppppbppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w', 'Hungarian Defense'],

  // ─── Queen's Pawn misc ─────────────────────────────────────
  // 1.d4 Nf6 2.c4 e6 3.Nf3
  ['rnbqkb1r/pppp1ppp/4pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R b', 'Indian Game'],
  // 1.d4 Nf6 2.c4 e6
  ['rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w', 'Indian Game'],

  // ─── Chigorin ───────────────────────────────────────────────
  // 1.d4 d5 2.c4 Nc6
  ['r1bqkbnr/ppp1pppp/2n5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w', 'Chigorin Defense'],

  // ─── Tarrasch Defense ───────────────────────────────────────
  // 1.d4 d5 2.c4 e6 3.Nc3 c5
  ['rnbqkbnr/pp3ppp/4p3/2pp4/2PP4/2N5/PP2PPPP/R1BQKBNR w', 'Tarrasch Defense'],

  // ─── Albin Countergambit ────────────────────────────────────
  // 1.d4 d5 2.c4 e5
  ['rnbqkbnr/ppp2ppp/8/3pp3/2PP4/8/PP2PPPP/RNBQKBNR w', 'Albin Countergambit'],

  // ─── Budapest Gambit ────────────────────────────────────────
  // 1.d4 Nf6 2.c4 e5
  ['rnbqkb1r/pppp1ppp/5n2/4p3/2PP4/8/PP2PPPP/RNBQKBNR w', 'Budapest Gambit'],

  // ─── Benko Gambit ───────────────────────────────────────────
  // 1.d4 Nf6 2.c4 c5 3.d5 b5
  ['rnbqkb1r/p2ppppp/5n2/1ppP4/2P5/8/PP2PPPP/RNBQKBNR w', 'Benko Gambit'],

  // ─── King's Indian Attack (as White system) ────────────────
  // 1.Nf3 d5 2.g3 Nf6 3.Bg2 g6
  ['rnbqkb1r/ppp1pp1p/5np1/3p4/8/5NP1/PPPPPPBP/RNBQK2R w', 'King\'s Indian Attack'],
  // 1.e4 e6 2.d3 d5 3.Nd2 Nf6 4.Ngf3 Nc6 — KIA vs French not included (too specific)

  // ─── Ponziani ───────────────────────────────────────────────
  // 1.e4 e5 2.Nf3 Nc6 3.c3
  ['r1bqkbnr/pppp1ppp/2n5/4p3/4P3/2P2N2/PP1P1PPP/RNBQKB1R b', 'Ponziani Opening'],

  // ─── Latvian Gambit ─────────────────────────────────────────
  // 1.e4 e5 2.Nf3 f5
  ['rnbqkbnr/pppp2pp/8/4pp2/4P3/5N2/PPPP1PPP/RNBQKB1R w', 'Latvian Gambit'],

  // ─── Sicilian: Accelerated Dragon ──────────────────────────
  // 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6
  ['r1bqkbnr/pp1ppp1p/2n3p1/8/3NP3/8/PPP2PPP/RNBQKB1R w', 'Sicilian: Accelerated Dragon'],

  // ─── Sicilian: Kalashnikov ─────────────────────────────────
  // 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 e5 5.Nb5 d6
  ['r1bqkbnr/pp3ppp/2np4/1N2p3/4P3/8/PPP2PPP/RNBQKB1R w', 'Sicilian: Kalashnikov'],

  // ─── Sicilian: Hyper-Accelerated Dragon ────────────────────
  // 1.e4 c5 2.Nf3 g6
  ['rnbqkbnr/pp1ppp1p/6p1/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w', 'Sicilian: Hyper-Accelerated Dragon'],

  // ─── QGD: Ragozin ───────────────────────────────────────────
  // 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 Bb4
  ['rnbqk2r/ppp2ppp/4pn2/3p4/1bPP4/2N2N2/PP2PPPP/R1BQKB1R w', 'QGD: Ragozin'],

  // ─── QGD: Semi-Tarrasch ─────────────────────────────────────
  // 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 c5
  ['rnbqkb1r/pp3ppp/4pn2/2pp4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w', 'QGD: Semi-Tarrasch'],

  // ─── King's Fianchetto (Benko Opening) ─────────────────────
  // 1.g3 d5
  ['rnbqkbnr/ppp1pppp/8/3p4/8/6P1/PPPPPP1P/RNBQKBNR w', 'Benko Opening'],

  // ─── Zukertort / Reti systems ──────────────────────────────
  // 1.Nf3 d5 2.c4 c6
  ['rnbqkbnr/pp2pppp/2p5/3p4/2P5/5N2/PP1PPPPP/RNBQKB1R w', 'Reti: Anti-Slav'],
  // 1.Nf3 d5 2.c4 e6
  ['rnbqkbnr/ppp2ppp/4p3/3p4/2P5/5N2/PP1PPPPP/RNBQKB1R w', 'Reti Opening'],

  // ─── 1.e4 rare but named lines ─────────────────────────────
  // 1.e4 e5 2.Nf3 d5 — Elephant Gambit
  ['rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R w', 'Elephant Gambit'],

  // 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Bc4 — Scotch Gambit
  ['r1bqkbnr/pppp1ppp/2n5/8/2BpP3/5N2/PPP2PPP/RNBQK2R b', 'Scotch Gambit'],

  // ─── Symmetrical English ────────────────────────────────────
  // 1.c4 c5 2.Nc3 Nc6
  ['r1bqkbnr/pp1ppppp/2n5/2p5/2P5/2N5/PP1PPPPP/R1BQKBNR w', 'English: Symmetrical'],

  // ─── English: Botvinnik System ──────────────────────────────
  // 1.c4 e5 2.Nc3 Nc6 3.g3 g6 4.Bg2 Bg7 5.e4
  // Too deep; keeping simpler English entries

  // ─── Semi-Slav: Meran ───────────────────────────────────────
  // 1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6 5.e3 Nbd7 6.Bd3 dxc4 7.Bxc4 b5
  ['r1bqkb1r/p2n1ppp/2p1pn2/1p6/2BP4/2N1PN2/PP3PPP/R1BQK2R w', 'Semi-Slav: Meran'],

  // ─── Slav: main line ────────────────────────────────────────
  // 1.d4 d5 2.c4 c6 3.Nf3 Nf6
  ['rnbqkb1r/pp2pppp/2p2n2/3p4/2PP4/5N2/PP2PPPP/RNBQKB1R w', 'Slav Defense'],
  // 1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3
  ['rnbqkb1r/pp2pppp/2p2n2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R b', 'Slav Defense'],

  // ─── Blackmar-Diemer Gambit ─────────────────────────────────
  // 1.d4 d5 2.e4 dxe4 3.Nc3
  ['rnbqkbnr/ppp1pppp/8/8/3Pp3/2N5/PPP2PPP/R1BQKBNR b', 'Blackmar-Diemer Gambit'],

  // ─── QGD: Vienna / Anti-Vienna ──────────────────────────────
  // 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Nf3 dxc4
  ['rnbqkb1r/ppp2ppp/4pn2/8/2pP4/2N2N2/PP2PPPP/R1BQKB1R w', 'QGD: Vienna'],

  // ─── Ruy Lopez: Exchange ────────────────────────────────────
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6
  ['r1bqkbnr/1ppp1ppp/p1B5/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b', 'Ruy Lopez: Exchange'],

  // ─── Ruy Lopez: Open ───────────────────────────────────────
  // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4
  ['r1bqkb1r/1ppp1ppp/p1n5/4p3/B3n3/5N2/PPPP1PPP/RNBQ1RK1 w', 'Ruy Lopez: Open'],

  // ─── Caro-Kann: Two Knights ─────────────────────────────────
  // 1.e4 c6 2.Nf3 d5 3.Nc3
  ['rnbqkbnr/pp2pppp/2p5/3p4/4P3/2N2N2/PPPP1PPP/R1BQKB1R b', 'Caro-Kann: Two Knights'],
]);

export function lookupOpening(fen) {
  const key = fen.split(' ').slice(0, 2).join(' ');
  return OPENINGS.get(key) || null;
}
