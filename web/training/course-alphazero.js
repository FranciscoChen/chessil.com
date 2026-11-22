'use strict';

// Positions and moves from the publisher’s game scores and the variations cited below.
// Each exercise has original English, Spanish and Chinese coaching.
module.exports = [
  {
    id: "strategy-az-king-target",
    chapter: 5,
    source: "Exactly how to attack, 13.Rg1",
    fen: "rnb2rk1/1pp2ppp/3pp3/pP6/2PP4/P3Pq2/2Q2P1P/R1B1KB1R w KQ - 0 13",
    side: "w",
    focus: "h1",
    cueSquare: "e2",
    moves: ["h1g1", "b8d7", "f1e2"],
    title: [
      "Aim at the king",
      "Apunta al rey",
      "瞄准对方的王"
    ],
    intro: [
      "Black’s queen has taken the pawn on f3. Look for a way to bring a rook into play before the queen can get back to defend g7.",
      "La dama negra se ha comido el peón de f3. Busca cómo activar una torre antes de que la dama vuelva a defender g7.",
      "黑后吃掉了 f3 的兵。趁它还没回去保护 g7，想办法让一辆车加入进攻。"
    ],
    note: [
      "The rook now looks straight up the g-file at g7. Developing the bishop gives White another attacker and clears the way for the king to castle long.",
      "La torre apunta a g7 por la columna g. Al desarrollar el alfil, las blancas suman un atacante y despejan el camino para enrocar en largo.",
      "车沿着 g 线瞄准 g7。出象既增加了进攻力量，也给白王的长易位让出了道路。"
    ],
    point: 1,
  },
  {
    id: "strategy-az-king-shelter",
    chapter: 5,
    source: "Exactly how to attack, 17.Rg3",
    fen: "r1b2rk1/1ppn1ppp/3pp3/pP6/2PP2R1/P3P3/1BQ1BP1q/R3K3 w Q - 0 17",
    side: "w",
    focus: "g4",
    cueSquare: "c1",
    moves: ["g4g3", "f7f5", "e1c1"],
    title: [
      "Give your own king shelter",
      "Pon a salvo a tu rey",
      "先给自己的王找个安全处"
    ],
    intro: [
      "White can use the g-file without keeping the king in the middle. First move the rook to a square where the f2-pawn protects it from the queen, then get the king to safety.",
      "Las blancas pueden usar la columna g sin dejar a su rey en el centro. Primero lleva la torre a una casilla donde el peón de f2 la proteja de la dama y luego pon al rey a salvo.",
      "白方可以利用 g 线，同时把王撤出中央。先让车走到有 f2 兵保护的格子，让黑后不能白吃，再把王送到安全处。"
    ],
    note: [
      "Long castling puts the king on c1 and brings the other rook to d1 in a single move. The g3 rook can keep attacking.",
      "El enroque largo lleva el rey a c1 y la otra torre a d1 en una sola jugada. La torre de g3 puede seguir atacando.",
      "长易位一步就把王送到 c1，并让另一辆车来到 d1。g3 的车仍可继续进攻。"
    ],
    point: 2,
  },
  {
    id: "strategy-az-shield-and-centre",
    chapter: 5,
    source: "AlphaZero’s new approach in the Carlsbad, 12.gxf3",
    fen: "r2qr1k1/pp3ppp/n1pb1n2/3p2B1/3P4/1QNBPb2/PP3PPP/R3R1K1 w - - 0 12",
    side: "w",
    focus: "g2",
    cueSquare: "d1",
    moves: ["g2f3", "a8b8", "b3d1"],
    title: [
      "Open a file without losing the center",
      "Abre una columna sin ceder el centro",
      "打开纵线，也要守住中央"
    ],
    intro: [
      "The bishop on f3 has taken your knight. Which recapture opens the g-file and gives you a pawn that can guard e4?",
      "El alfil de f3 se ha comido tu caballo. ¿Con qué pieza puedes recuperar, abrir la columna g y dejar un peón que controle e4?",
      "f3 的黑象吃了你的马。怎样吃回，才能既打开 g 线，又让一个兵守住 e4？"
    ],
    note: [
      "The pawn on f3 covers e4, a square Black’s knight would like to use. With the center under control, the queen can head from d1 toward the kingside.",
      "El peón de f3 cubre e4, una casilla útil para el caballo negro. Con el centro controlado, la dama puede dirigirse desde d1 hacia el flanco de rey.",
      "f3 的兵守住了黑马想去的 e4。中央稳住后，白后就能从 d1 向王翼调动。"
    ],
    point: 3,
  },
  {
    id: "strategy-az-fix-centre",
    chapter: 5,
    source: "Python squeeze, 10.e5",
    fen: "rn1q1rk1/pb2bppp/1pp1pn2/3p4/2PPPB2/2N2NP1/PP3PBP/R2QK2R w KQ - 0 10",
    side: "w",
    focus: "e4",
    cueSquare: "d5",
    moves: ["e4e5", "f6e4", "c4d5"],
    title: [
      "Settle the center first",
      "Estabiliza primero el centro",
      "先稳住中央"
    ],
    intro: [
      "Black has just played …d5. Move the e-pawn so that Black’s e6-pawn can no longer advance into the center.",
      "Las negras acaban de jugar …d5. Avanza tu peón de e de modo que el de e6 ya no pueda entrar en el centro.",
      "黑方刚走了 …d5。向前走 e 兵，让 e6 的黑兵不能再往中央推进。"
    ],
    note: [
      "When Black recaptures on d5 with the c-pawn, d4 and d5 also face each other. With fewer central pawn breaks available, White will have time to build on the wing.",
      "Cuando las negras recuperen en d5 con el peón de c, d4 y d5 también quedarán enfrentados. Con menos rupturas en el centro, las blancas tendrán tiempo para preparar el juego en el flanco.",
      "黑方用 c 兵在 d5 吃回后，d4 和 d5 的兵也会顶住。中央较难打开，白方就有时间在侧翼准备。"
    ],
    point: 4,
  },
  {
    id: "strategy-az-early-lines",
    chapter: 5,
    source: "No pawn is better than the g-pawn, 11.Nd2",
    fen: "r2q1rk1/1bpn1ppp/1p1ppn2/p5B1/2PP4/P1QBPN2/1P3PPP/R3K2R w KQ - 2 11",
    side: "w",
    focus: "f3",
    cueSquare: "g1",
    moves: ["f3d2", "b7g2", "h1g1"],
    title: [
      "Offer a pawn for an attacking file",
      "Ofrece un peón para abrir una columna",
      "弃一个兵，换一条进攻纵线"
    ],
    intro: [
      "The bishop on b7 has a long view of g2. Can you bring the knight into play and let the bishop open a path for your rook?",
      "El alfil de b7 ve g2 desde lejos. ¿Puedes desarrollar el caballo y dejar que el alfil abra camino a tu torre?",
      "b7 的象远远瞄着 g2。能不能先出马，再借黑象之手给车开一条路？"
    ],
    note: [
      "The knight helps guard e4. After the bishop takes on g2, the rook can attack it from g1 and stay on the same file as the black king.",
      "El caballo ayuda a controlar e4. Cuando el alfil captura en g2, la torre puede atacarlo desde g1 y quedarse en la misma columna que el rey negro.",
      "马帮助守住 e4。黑象吃到 g2 后，白车从 g1 赶象，并留在黑王所在的纵线上。"
    ],
    point: 5,
  },
  {
    id: "strategy-az-file-diagonal",
    chapter: 5,
    source: "AlphaZero’s new approach in the Carlsbad, 20.Rg1",
    fen: "1r4k1/ppn1rppp/2pq1n2/3p1B2/3P1P2/2N1P2Q/PP3P1P/R3R2K w - - 6 20",
    side: "w",
    focus: "e1",
    cueSquare: "d3",
    moves: ["e1g1", "g8h8", "f5d3"],
    title: [
      "Attack along a file and a diagonal",
      "Combina una columna y una diagonal",
      "纵线与斜线配合"
    ],
    intro: [
      "The g-file has no pawns. After bringing a rook to it, find the diagonal that lets your bishop aim at h7.",
      "En la columna g no hay peones. Lleva allí una torre y luego busca la diagonal desde la que el alfil pueda apuntar a h7.",
      "g 线上没有兵。先把车调上去，再找一条能让象瞄准 h7 的斜线。"
    ],
    note: [
      "From d3 the bishop looks along e4, f5 and g6 toward h7. The rook applies pressure on an entirely different route, the g-file.",
      "Desde d3, el alfil mira por e4, f5 y g6 hasta h7. La torre presiona por otra vía, la columna g.",
      "d3 的象沿 e4、f5、g6 瞄准 h7；车则从另一条路线，也就是 g 线，施加压力。"
    ],
    point: 6,
  },
  {
    id: "strategy-az-opposite-bishops",
    chapter: 5,
    source: "The matrix, 38.f5",
    fen: "4rr2/1k3q1p/ppb1p3/2bpP2P/2pN1Pp1/P1B3P1/1PP4Q/2K1RR2 w - - 6 38",
    side: "w",
    focus: "f4",
    cueSquare: "g1",
    moves: ["f4f5", "c5d4", "c3d4", "e6f5", "h2g1"],
    title: [
      "Attack with opposite-colored bishops",
      "Ataca con alfiles de distinto color",
      "用异色象进攻"
    ],
    intro: [
      "White’s bishop on c3 moves on dark squares. Follow AlphaZero’s pawn offer to draw out the black bishop that can challenge it.",
      "El alfil blanco de c3 se mueve por casillas negras. Sigue el sacrificio de peón de AlphaZero para atraer al alfil negro que puede disputárselas.",
      "c3 的白象走深色格。试试阿尔法零的弃兵，诱出唯一能和它争夺这些格子的黑象。"
    ],
    note: [
      "Only a light-square bishop remains for Black. The queen on g1 and the bishop on d4 can work along the same dark diagonal toward a7.",
      "A las negras solo les queda un alfil de casillas blancas. La dama de g1 y el alfil de d4 pueden colaborar por la misma diagonal negra hacia a7.",
      "黑方只剩浅格象。g1 的后与 d4 的象可以沿同一条深色斜线向 a7 发力。"
    ],
    point: 7,
  },
  {
    id: "strategy-az-knight-post",
    chapter: 5,
    source: "Putting the king in a box, 26.Nc5",
    fen: "r5kb/2R2p1p/p3p1pP/1p2Pn2/3PN3/3BB3/b2K1P2/8 w - - 0 26",
    side: "w",
    focus: "e4",
    cueSquare: "d7",
    moves: ["e4c5", "a2d5", "c5d7"],
    title: [
      "Bring the knight within reach",
      "Acerca el caballo a la acción",
      "把马调到进攻范围内"
    ],
    intro: [
      "Your knight is on e4. Look for a route through c5 to a square nearer the black king where a pawn cannot drive it away.",
      "Tu caballo está en e4. Busca una ruta por c5 hacia una casilla más cercana al rey negro de la que ningún peón pueda echarlo.",
      "白马在 e4。找一条经过 c5 的路线，走到更靠近黑王、又不会被兵赶走的格子。"
    ],
    note: [
      "On d7 the knight attacks f8, cutting off a square next to the king. White has given up two pawns, but the rook on c7 and the knight now work together.",
      "En d7, el caballo domina f8, junto al rey. Las blancas han cedido dos peones, pero ahora el caballo y la torre de c7 trabajan juntos.",
      "马在 d7 控制了黑王旁边的 f8。白方虽少了两个兵，c7 的车与马已经能合力进攻。"
    ],
    point: 8,
  },
  {
    id: "strategy-az-patient-wing",
    chapter: 5,
    source: "Python squeeze, 15.h4",
    fen: "r2q1rk1/p3bppp/bpn1p3/3pP3/3P1B2/2P2NP1/P4PBP/R2QR1K1 w - - 3 15",
    side: "w",
    focus: "h2",
    cueSquare: "g5",
    moves: ["h2h4", "a8c8", "e1e3", "c8c7", "f3g5"],
    title: [
      "Build slowly behind a fixed center",
      "Prepara el ataque con calma",
      "中央锁定后，耐心布阵"
    ],
    intro: [
      "The d- and e-pawns are locked. Use that time to gain space on the kingside, then bring the rook and knight closer.",
      "Los peones de d y e están bloqueados. Aprovecha el tiempo para ganar espacio en el flanco de rey y acercar la torre y el caballo.",
      "d 兵和 e 兵已经顶住。趁这个机会在王翼争取空间，再把车和马调近。"
    ],
    note: [
      "The rook can swing sideways from e3 while the knight pressures h7. White has built up the attack without having to force open a file yet.",
      "La torre de e3 puede desplazarse lateralmente y el caballo presiona h7. Las blancas han preparado el ataque sin forzar todavía la apertura de una columna.",
      "e3 的车可以横向调动，马则给 h7 施压。白方还没急着打开纵线，进攻力量已就位。"
    ],
    point: 9,
  },
  {
    id: "strategy-az-trade-active",
    chapter: 5,
    source: "Python squeeze, 48.Rxb6",
    fen: "1q3nkr/p2b1pp1/1r2p2p/3pPP1N/3P2PP/5R2/PR3Q1K/5B2 w - - 17 48",
    side: "w",
    focus: "b2",
    cueSquare: "f6",
    moves: ["b2b6", "a7b6", "f5f6"],
    title: [
      "Trade the active rook",
      "Cambia la torre que tiene juego",
      "换掉对方活跃的车"
    ],
    intro: [
      "Black’s rook on b6 can get into your position. Its partner on h8 is waiting for a pawn exchange. Deal with the active rook first.",
      "La torre negra de b6 puede entrar en tu posición. Su compañera de h8 espera un cambio de peones. Ocúpate primero de la torre activa.",
      "b6 的黑车有机会侵入白方阵地，h8 的另一辆车还在等兵交换。先处理活跃的那辆。"
    ],
    note: [
      "After the trade, f6 takes away g7. The rook on h8 still has its own h6-pawn in the way, and Black has lost the rook that was doing useful work.",
      "Tras el cambio, f6 quita g7 a las negras. La torre de h8 sigue estorbada por su peón de h6 y las negras han perdido la torre que sí tenía juego.",
      "换车后，f6 控制了 g7。h8 的黑车仍被自己的 h6 兵挡着，真正能活动的那辆车却已被换掉。"
    ],
    point: 10,
  },
  {
    id: "strategy-az-complicate",
    chapter: 5,
    source: "Anything for open lines!, 8…c4",
    fen: "r1bq1rk1/pp2ppbp/n2p1np1/2pP4/4PP2/2NB1N2/PPP3PP/R1BQ1RK1 b - - 0 8",
    side: "b",
    focus: "c5",
    cueSquare: "e4",
    moves: ["c5c4", "d3c4", "b7b5", "c3b5", "f6e4"],
    title: [
      "Create counterplay under pressure",
      "Crea contrajuego bajo presión",
      "受压时制造反击"
    ],
    intro: [
      "White has more space. Try AlphaZero’s pawn offer that draws the bishop onto c4 and gives Black a chance to attack e4.",
      "Las blancas tienen más espacio. Prueba el sacrificio que atrae al alfil a c4 y permite a las negras atacar e4.",
      "白方空间更大。试着弃兵把白象引到 c4，为黑方争取攻击 e4 的机会。"
    ],
    note: [
      "Black is still a pawn down. The point is to make White respond to threats instead of letting White build up freely. In a real game, check the tactics before taking this kind of risk.",
      "Las negras siguen con un peón de menos. La idea es obligar a las blancas a responder a amenazas en vez de dejarlas mejorar libremente. En una partida, comprueba la táctica antes de arriesgar así.",
      "黑方仍然少一个兵。这样做是为了迫使白方应对威胁，不能从容改善阵形。实战里，冒这种险前要先算清战术。"
    ],
    point: 11,
  },
  {
    id: "strategy-az-king-file",
    chapter: 5,
    source: "The h-file is never safe, 18.Kh2",
    fen: "r1rq2k1/pb2bp1p/1pn1p3/3p3p/3P1B2/4QNP1/PP2PPB1/R4RK1 w - - 0 18",
    side: "w",
    focus: "g1",
    cueSquare: "h1",
    moves: ["g1h2", "e7f8", "f1h1"],
    title: [
      "Choose the file that reaches the king",
      "Elige la columna que llega al rey",
      "找一条直通对方王的纵线"
    ],
    intro: [
      "The open c-file is tempting, but Black’s g-pawn has captured your h-pawn on h5. Move your king to clear a path for your rook to reach the h-file.",
      "La columna c abierta tienta, pero el peón negro de g se ha comido el tuyo de h en h5. Mueve tu rey para que la torre pueda llegar a la columna h.",
      "开放的 c 线很诱人，但黑方 g 兵刚在 h5 吃掉了你的 h 兵。挪一下王，让车能走到 h 线上。"
    ],
    note: [
      "The king on h2 leaves the first rank and the rook can go to h1. The rook can pressure h5 and, if that pawn falls, h7 behind it.",
      "El rey de h2 deja libre la primera fila y la torre llega a h1. La torre puede presionar h5 y, si ese peón cae, apuntar a h7.",
      "王走到 h2，让开了第一横线，车就能到 h1。车可以先攻击 h5；如果这个兵被吃掉，就能瞄准后面的 h7。"
    ],
    point: 12,
  },
  {
    id: "strategy-az-restrict-king",
    chapter: 5,
    source: "Endgame class, 33…g4",
    fen: "3rk3/3bb3/1p6/2p1Pppr/5P1p/N1P4P/P2RRBPK/8 b - - 0 33",
    side: "b",
    focus: "g5",
    cueSquare: "g3",
    moves: ["g5g4", "h2g1", "g4g3"],
    title: [
      "Take away the king’s exits",
      "Quita las salidas al rey",
      "封住王的出口"
    ],
    intro: [
      "Even without queens, the white king can be boxed in. Advance the pawn that can take both f2 and h2 away from it.",
      "Incluso sin damas, puedes encerrar al rey blanco. Avanza el peón que puede quitarle tanto f2 como h2.",
      "即使双方都没有后，也可以困住白王。推进能同时控制 f2 和 h2 的那个兵。"
    ],
    note: [
      "On g3 the pawn covers both exits. A rook arriving on the first rank will be much more dangerous because the king has less room to escape.",
      "Desde g3, el peón cubre las dos salidas. Una torre en la primera fila será mucho más peligrosa porque el rey tiene menos espacio para escapar.",
      "g3 的兵封住了两个出口。白王退路少，黑车一旦进入第一横线就格外危险。"
    ],
    point: 13,
  },
  {
    id: "strategy-az-switch-wings",
    chapter: 5,
    source: "Feint on the queenside, punch on the kingside!, 25…g5",
    fen: "r5k1/3b1pp1/2Npqn2/1B1n4/pP1Pp2p/Q3P2P/P1RB1PP1/6K1 b - - 0 25",
    side: "b",
    focus: "g7",
    cueSquare: "g4",
    moves: ["g7g5", "a3c1", "g5g4", "h3g4", "e6g4"],
    title: [
      "Switch wings when the defenders leave",
      "Cambia de flanco cuando se alejen los defensores",
      "守军离开后立刻转攻"
    ],
    intro: [
      "White’s knight and bishop have moved to c6 and b5. Black has a chance to act before those pieces can get back to their king.",
      "El caballo y el alfil blancos se han ido a c6 y b5. Las negras pueden actuar antes de que esas piezas vuelvan a defender a su rey.",
      "白马和白象都跑到了 c6、b5。趁它们还来不及回防，黑方可以马上在另一翼动手。"
    ],
    note: [
      "The g-pawn has opened a direct route for the queen. Compare how close the queen on g4 is to the white king and how far away the knight on c6 still is.",
      "El peón de g ha abierto camino a la dama. Compara lo cerca que está la dama de g4 del rey blanco con lo lejos que sigue el caballo de c6.",
      "g 兵为黑后打开了通路。看看 g4 的后离白王多近，再看看 c6 的白马还离得多远。"
    ],
    point: 14,
  },
  {
    id: "strategy-az-pawn-h6",
    chapter: 9,
    source: "Putting the king in a box, 17.h4",
    fen: "r4rk1/3b1pbp/p1n1p1p1/1p2P3/3P4/3BBN2/P2K1PPP/1R5R w - - 0 17",
    side: "w",
    focus: "h2",
    cueSquare: "h6",
    moves: ["h2h4", "c6e7", "h4h5", "d7c6", "h5h6"],
    title: [
      "When the h-pawn can reach h6",
      "Cuando el peón de h puede llegar a h6",
      "h 兵能一路走到 h6 时"
    ],
    intro: [
      "Black’s king is already on g8 and the center is blocked. Advance the h-pawn as far as you can while Black moves its pieces.",
      "El rey negro ya está en g8 y el centro está cerrado. Lleva el peón de h lo más lejos posible mientras las negras mueven sus piezas.",
      "黑王已经在 g8，中央也堵住了。趁黑方调动棋子，把 h 兵尽量向前推。"
    ],
    note: [
      "The pawn on h6 attacks the bishop on g7 and will guard g7 if the bishop retreats. If Black had played …g6 earlier, the pawn would still take away g7, but the h-file would stay closed.",
      "El peón de h6 ataca al alfil de g7 y controlará g7 si este se retira. Si las negras hubieran jugado …g6 antes, el peón aún controlaría g7, pero la columna h seguiría cerrada.",
      "h6 的兵攻击 g7 的象。象退走后，兵仍控制 g7。如果黑方早先走了 …g6，白兵照样能封住 g7，但 h 线不会打开。"
    ],
  },
  {
    id: "strategy-az-pawn-h6-g6",
    chapter: 9,
    source: "Inexorable constriction, 16.h6",
    fen: "r2q1rk1/pp3ppp/n2b4/2pP3P/3p4/3P1QP1/PP3PB1/R1B2RK1 w - - 1 16",
    side: "w",
    focus: "h5",
    cueSquare: "e1",
    moves: ["h5h6", "g7g6", "f1e1"],
    title: [
      "When …g6 leaves a hole on f6",
      "Cuando …g6 deja un hueco en f6",
      "…g6 让出 f6 时"
    ],
    intro: [
      "Push the h-pawn once more. Notice where Black’s g-pawn can go to avoid being captured.",
      "Avanza una vez más el peón de h. Fíjate en adónde puede ir el peón de g negro para evitar la captura.",
      "再推进一步 h 兵。留意黑方的 g 兵会走到哪里来躲开吃兵。"
    ],
    note: [
      "With the black pawn on g6, the white pawn on h6 guards g7 and no enemy pawn covers f6. The h-file stays closed, so use the weak squares rather than expecting to bring a rook up that file.",
      "Con el peón negro en g6, el peón blanco de h6 controla g7 y ningún peón enemigo cubre f6. La columna h sigue cerrada: aprovecha las casillas débiles para entrar.",
      "黑兵走到 g6 后，白兵守住 g7，也没有黑兵再控制 f6。h 线仍堵着，进攻要利用这些弱格。"
    ],
  },
  {
    id: "strategy-az-pawn-h6-capture",
    chapter: 9,
    source: "Attaquer comme Kasparov!, 15.h6",
    fen: "r1b1k2r/pp3ppp/4p3/3pnn1P/4q3/P4N2/2PBBPP1/1R1Q1K1R w kq - 0 15",
    side: "w",
    focus: "h5",
    cueSquare: "d3",
    moves: ["h5h6", "g7h6", "f3e5", "e4e5", "e2d3"],
    title: [
      "When …gxh6 pulls the shield away",
      "Cuando …gxh6 aparta un peón del escudo",
      "…gxh6 牵走 g 兵时"
    ],
    intro: [
      "You can offer your h-pawn even though the black king has not castled. Watch what happens to the g-file if Black accepts.",
      "Puedes ofrecer el peón de h aunque el rey negro aún no haya enrocado. Fíjate en qué le pasa a la columna g si las negras aceptan.",
      "黑王虽还没易位，你也可以送出 h 兵。看看黑方吃兵后，g 线会发生什么。"
    ],
    note: [
      "Black’s g-pawn is now on h6. The bishop on d3 aims at h7. White can now use the rook too, as the missing g-pawn has opened lines around the king.",
      "El peón negro de g ha acabado en h6. El alfil de d3 apunta a h7. Las blancas ya pueden activar también la torre, pues el peón que salió de la columna g dejó líneas abiertas alrededor del rey.",
      "黑方的 g 兵到了 h6。d3 的白象瞄着 h7。g 兵离开后，王的附近打开了线路，白车也能参与进攻。"
    ],
  },
  {
    id: "strategy-az-block-h5",
    chapter: 9,
    source: "You don’t need a queen to attack, 19.Bg5",
    fen: "r2r2k1/1p1b1pb1/p3p1p1/4P2p/1n1PB2P/4BN2/P2K1PP1/2R3R1 w - - 7 19",
    side: "w",
    focus: "e3",
    cueSquare: "g1",
    moves: ["e3g5", "d8b8", "a2a3", "b4d5", "g2g4", "h5g4", "g1g4", "b8c8", "c1g1"],
    title: [
      "Against …h5, break with g4",
      "Contra …h5, rompe con g4",
      "遇到 …h5，用 g4 打开线路"
    ],
    intro: [
      "The pawns on h4 and h5 are nose to nose. First put the dark-square bishop on g5, then use the g-pawn to challenge h5.",
      "Los peones de h4 y h5 están frente a frente. Coloca primero el alfil de casillas negras en g5 y luego ataca h5 con el peón de g.",
      "h4 和 h5 的兵顶住了。先把深格象摆到 g5，再用 g 兵冲击 h5。"
    ],
    note: [
      "Trading pawns made the g-file available to the rooks even though White’s h-pawn never advanced again. The rooks can line up on g1 and g4, and the bishop still covers f6.",
      "El cambio de peones dio a las torres acceso a la columna g aunque el peón blanco de h no avanzó más. Las torres se alinean en g1 y g4, y el alfil sigue controlando f6.",
      "h 兵没再向前走，换兵照样让车能沿 g 线进攻。两辆车可以在 g1、g4 排成一列，象还守着 f6。"
    ],
  },
  {
    id: "strategy-az-block-h6",
    chapter: 9,
    source: "Kasparov–Nakamura, 12.g4",
    fen: "rnbq1rk1/p4pp1/4pn1p/2p4P/2Q5/P4N2/1P2PPP1/R1B1KB1R w KQ - 0 12",
    side: "w",
    focus: "g2",
    cueSquare: "g5",
    moves: ["g2g4", "d8d5", "c4d5", "f6d5", "g4g5", "h6g5", "c1g5"],
    title: [
      "Against …h6, advance g4–g5",
      "Contra …h6, avanza g4–g5",
      "遇到 …h6，推进 g4–g5"
    ],
    intro: [
      "Your h5-pawn cannot pass the blocker on h6. Use your neighboring pawn to attack h6, even if the queens come off first.",
      "Tu peón de h5 no puede pasar. Usa el peón vecino para atacar h6, aunque antes se cambien las damas.",
      "h5 的兵被挡住了。即使先换后，也可以用旁边的兵冲击 h6。"
    ],
    note: [
      "The h6-pawn was forced to decide whether to capture on g5. In this line the bishop recaptures, the g-file is half-open and White’s h5-pawn can still cramp Black.",
      "El peón de h6 tuvo que decidir si capturaba en g5. En esta línea el alfil recupera, la columna g queda semiabierta y el peón blanco de h5 aún limita a las negras.",
      "h6 的兵必须决定是否吃 g5。这里白象吃回，g 线半开放，h5 的白兵还能限制黑方。"
    ],
  },
  {
    id: "strategy-az-block-h3",
    chapter: 9,
    source: "Feint on the queenside, punch on the kingside!, 26…g4",
    fen: "r5k1/3b1p2/2Npqn2/1B1n2p1/pP1Pp2p/4P2P/P1RB1PP1/2Q3K1 b - - 1 26",
    side: "b",
    focus: "g5",
    cueSquare: "g4",
    moves: ["g5g4", "h3g4", "e6g4"],
    title: [
      "With Black, break against h3",
      "Con negras, rompe contra h3",
      "执黑时，冲击 h3"
    ],
    intro: [
      "White’s pawn on h3 is fixed by your pawn on h4. Use the g-pawn to make a hole in the white king’s cover.",
      "Tu peón de h4 inmoviliza el peón blanco de h3. Usa el peón de g para abrir un hueco en el refugio del rey blanco.",
      "你的 h4 兵钉住了白方 h3 的兵。用 g 兵在白王的兵盾上打开一个缺口。"
    ],
    note: [
      "After White captures, the queen replaces the g-pawn and attacks from g4. White’s g2-pawn is still there, so Black can use the half-open g-file to apply pressure.",
      "Tras la captura blanca, la dama toma el lugar del peón y ataca desde g4. El peón blanco de g2 sigue ahí y las negras pueden presionar por la columna g semiabierta.",
      "白兵吃过来后，黑后接替 g 兵，从 g4 发起进攻。白方 g2 的兵还在，黑方可以沿半开放的 g 线施压。"
    ],
  },
  {
    id: "strategy-az-block-h6-rook",
    chapter: 9,
    source: "Karpov–Taimanov, 29.g5",
    fen: "r5k1/1q1b1pp1/2n1p2p/3pP2P/p2N2P1/1P2QN2/P4P2/2R3K1 w - - 1 29",
    side: "w",
    focus: "g4",
    cueSquare: "g3",
    moves: ["g4g5", "c6d4", "f3d4", "h6g5", "e3g5", "g8h7", "c1c3", "b7b4", "c3g3"],
    title: [
      "Bring a rook through the third rank",
      "Lleva una torre por la tercera fila",
      "沿第三横线调车助攻"
    ],
    intro: [
      "White’s h-pawn is stuck on h5. Start with the break on g5 and look for a way to bring the rook from c1 across to the king’s wing.",
      "El peón blanco de h5 está bloqueado. Empieza con la ruptura en g5 y busca cómo llevar la torre de c1 al flanco de rey.",
      "h5 的白兵被堵住了。先用 g5 打开线路，再想办法把 c1 的车调到王翼。"
    ],
    note: [
      "The queen reached g5 after the pawns traded. The rook took the route c1–c3–g3 to support it along the g-file. Look for this route when the rook has no direct path from the first rank.",
      "La dama llegó a g5 tras el cambio de peones. La torre usó la ruta c1–c3–g3 para apoyarla por la columna g. Busca este recorrido si la torre no tiene paso directo por la primera fila.",
      "换兵后，后到了 g5。车经 c1–c3–g3 沿 g 线支援白后。如果车不能沿第一横线直接走过来，就找这样的绕行路线。"
    ],
  },
  {
    id: "strategy-az-capture-on-g6",
    chapter: 9,
    source: "Never safe in the ending!, 19.hxg6",
    fen: "r3b1k1/1p3pbp/p1n1p1p1/3rP2P/2RP4/3BBN2/P2K1PP1/7R w - - 1 19",
    side: "w",
    focus: "h5",
    cueSquare: "e4",
    moves: ["h5g6", "h7g6", "d3e4"],
    title: [
      "Capture to open the h-file",
      "Captura para abrir la columna h",
      "吃兵打开 h 线"
    ],
    intro: [
      "This time Black’s pawn is already on g6 and Black’s minor pieces have little room. Instead of pushing past it, use the h-pawn to clear a line.",
      "Esta vez el peón negro ya está en g6 y sus piezas menores tienen poco espacio. En vez de avanzar el peón de h, úsalo para abrir una línea.",
      "这次黑兵已在 g6，黑方轻子也缺少活动空间。别让 h 兵绕过去，用它吃兵打开纵线。"
    ],
    note: [
      "After the h-pawns trade on g6, the h-file is clear. The bishop on e4 angles toward Black’s new g6-pawn, giving White a second line into the pawn shield.",
      "Tras el cambio de los peones de h en g6, la columna h queda libre. El alfil de e4 apunta al peón negro que acaba de llegar a g6 y crea una segunda vía hacia el refugio del rey.",
      "双方 h 兵在 g6 交换后，h 线便清空了。e4 的白象又沿斜线瞄准刚到 g6 的黑兵，给白方提供了第二条进攻路线。"
    ],
  },
  {
    id: "strategy-az-h-file-trap",
    chapter: 9,
    source: "The pincer movement (analysis variation), 14…hxg5",
    fen: "r2q1rk1/pb1pbpp1/1p3n2/2pP2p1/7P/P5P1/1PQBPPB1/R3K2R w KQ - 0 15",
    side: "w",
    setup: {"fen": "r2q1rk1/pb1pbpp1/1p3n1p/2pP2N1/7P/P5P1/1PQBPPB1/R3K2R b KQ - 0 14", "move": "h6g5"},
    focus: "h4",
    cueSquare: "h7",
    moves: ["h4g5", "f6d5", "c2h7"],
    title: [
      "If the blocker captures, open the h-file",
      "Si el peón captura, abre la columna h",
      "挡路的兵一吃，h 线就打开"
    ],
    intro: [
      "Black has just taken the knight on g5 in this variation. Recapture with the pawn that clears a path for the rook on h1.",
      "En esta variante, las negras acaban de tomar el caballo de g5. Recupera con el peón que deja paso libre a la torre de h1.",
      "在这个变例里，黑方刚吃掉 g5 的马。用能给 h1 白车让路的那个兵吃回。"
    ],
    note: [
      "The rook guards h7 up the open file, so the king cannot take the queen there. Keeping the rook on h1 was the reason White delayed castling kingside.",
      "La torre protege h7 por la columna abierta, así que el rey no puede tomar allí la dama. Mantener la torre en h1 fue el motivo para aplazar el enroque corto.",
      "车沿着开放的 h 线保护 h7，黑王就不能吃掉那里的白后。为了让车留在 h1，白方才推迟了短易位。"
    ],
  },
  {
    id: "strategy-az-rook-lift-a3",
    chapter: 9,
    source: "The pincer movement (analysis variation), 15.a4",
    fen: "r2q1rk1/pb2bpp1/1p1p1n1p/2pP2N1/7P/P5P1/1PQBPPB1/R3K2R w KQ - 0 15",
    side: "w",
    focus: "a3",
    cueSquare: "g4",
    moves: ["a3a4", "a7a6", "a1a3", "b6b5", "g3g4"],
    title: [
      "Put the other rook on the third rank",
      "Sube la otra torre a la tercera fila",
      "让另一辆车走上第三横线"
    ],
    intro: [
      "The h1-rook is already useful. To bring the a1-rook into the attack, first clear the square its own a-pawn is blocking.",
      "La torre de h1 ya cumple su función. Para que la de a1 participe en el ataque, despeja primero la casilla que bloquea su peón de a.",
      "h1 的车已经在发挥作用。要让 a1 的车也来进攻，先让挡在前面的 a 兵腾出格子。"
    ],
    note: [
      "From a3, the rook can go sideways, for example to f3 to pressure f6. The g-pawn starts the attack while the second rook is ready to join.",
      "Desde a3, la torre puede ir de lado, por ejemplo a f3 para presionar f6. El peón de g inicia el ataque y la segunda torre está lista para sumarse.",
      "车从 a3 可以横向调动，例如去 f3 压迫 f6。g 兵先动手，第二辆车已准备好加入。"
    ],
  },
  {
    id: "strategy-az-bishop-post",
    chapter: 7,
    source: "The file that matters, 39…Bg3",
    fen: "2r3k1/5np1/2pb1p2/p2p1q2/3P3p/1PP2P1P/1N3BP1/3QR1K1 b - - 6 39",
    side: "b",
    focus: "d6",
    cueSquare: "d6",
    moves: ["d6g3", "b2d3", "f7d6"],
    title: [
      "A bishop outpost beside the king",
      "Una casilla avanzada para el alfil",
      "把象放到王身边的据点"
    ],
    intro: [
      "White’s knight has moved to b2. Use your bishop to occupy an advanced square next to the rook on e1 and the white king.",
      "El caballo blanco se ha ido a b2. Coloca tu alfil en una casilla avanzada cerca de la torre de e1 y del rey blanco.",
      "白马走到了 b2。把象放到靠近 e1 白车和白王的前沿格。"
    ],
    note: [
      "The bishop on g3 attacks the e1-rook and is backed by the h4-pawn. If White later trades bishops on g3, …hxg3 puts a more permanent obstacle beside the white king.",
      "El alfil de g3 ataca la torre de e1 y está protegido por el peón de h4. Si más adelante las blancas cambian alfiles en g3, …hxg3 deja un obstáculo más duradero junto al rey.",
      "g3 的象攻击 e1 白车，还有 h4 的兵保护。白方以后若在 g3 换象，…hxg3 就会在白王身边留下一个更难赶走的兵。"
    ],
  },
  {
    id: "strategy-az-queen-post",
    chapter: 7,
    source: "Outpost for the queen, 40.Qg6",
    fen: "2r1r1k1/3q2p1/bp2pp1p/p2p3P/1bPP4/1P1QBBP1/P1R2P2/2R3K1 w - - 0 40",
    side: "w",
    focus: "d3",
    cueSquare: "d1",
    moves: ["d3g6", "b4a3", "c1d1"],
    title: [
      "Give the queen a protected foothold",
      "Dale a la dama un puesto protegido",
      "让后站上有保护的据点"
    ],
    intro: [
      "Black has played …h6, so that pawn can no longer capture on g6. Put the queen on a nearby square where White’s h-pawn protects her.",
      "Las negras han jugado …h6 y ese peón ya no puede capturar en g6. Lleva la dama a una casilla cercana donde la proteja tu peón de h.",
      "黑方走了 …h6，这个兵就不能再吃 g6。找一个靠近黑王、又有己方 h 兵保护的格子给后。"
    ],
    note: [
      "From g6 the queen attacks h6 and f7. If the queens are later exchanged on g6, the h5-pawn can recapture and take away h7 and f7 itself.",
      "Desde g6 la dama ataca h6 y f7. Si más adelante se cambian las damas en g6, el peón de h5 puede recuperar y dominar h7 y f7.",
      "后在 g6 攻击 h6 和 f7。以后如果在 g6 换后，h5 的兵可以吃回，自己守住 h7 和 f7。"
    ],
  },
  {
    id: "strategy-az-rook-post",
    chapter: 7,
    source: "Risky rooks, 21.Rd6",
    fen: "r1q1rbk1/p2pnp1p/1pb3p1/2p1P2n/5BQ1/4NNPP/PP3PB1/R2R2K1 w - - 3 21",
    side: "w",
    focus: "d1",
    cueSquare: "f6",
    moves: ["d1d6", "h5g7", "d6f6"],
    title: [
      "Use outposts for a rook",
      "Usa casillas avanzadas para la torre",
      "车也能占据前沿据点"
    ],
    intro: [
      "The d-file lets your rook reach d6. Try blocking Black’s d7-pawn before turning the rook toward f7.",
      "La columna d permite a tu torre llegar a d6. Bloquea primero el peón negro de d7 y luego dirige la torre hacia f7.",
      "车能沿 d 线走到 d6。先挡住 d7 的黑兵，再把车转向 f7。"
    ],
    note: [
      "On d6 the rook prevents …d5. On f6 it switches jobs and attacks f7, with the e5-pawn supporting it.",
      "En d6 la torre impide …d5. En f6 cambia de tarea y ataca f7 con el apoyo del peón de e5.",
      "车在 d6 阻止 …d5。到了 f6，它换了任务，在 e5 白兵的保护下攻击 f7。"
    ],
  },
  {
    id: "strategy-az-king-post",
    chapter: 7,
    source: "The matrix, 72.Kb2",
    fen: "4q3/1k5p/r1bR4/p1Q2p2/2p3p1/2P1B1P1/8/K7 w - - 8 72",
    side: "w",
    focus: "a1",
    cueSquare: "a2",
    moves: ["a1b2", "e8b8", "b2a2"],
    title: [
      "Use a safe post for your king",
      "Busca un refugio para tu rey",
      "给王选一个安全据点"
    ],
    intro: [
      "White’s king has almost no pawn cover. Before renewing the attack, start moving it toward a3, away from the queen’s easiest checks.",
      "El rey blanco apenas tiene abrigo de peones. Antes de reanudar el ataque, acércalo a a3 para alejarlo de los jaques más fáciles de la dama.",
      "白王几乎没有兵盾。再次进攻前，先往 a3 走，让黑后没那么容易连续将军。"
    ],
    note: [
      "From a2 the king can reach a3. Black has a queen, so check which lines it can use before assuming that any edge square is safe.",
      "Desde a2 el rey puede llegar a a3. Las negras tienen dama: comprueba por qué líneas puede dar jaque antes de dar por segura cualquier casilla del borde.",
      "白王从 a2 就能走到 a3。黑方还有后，别以为靠边就安全，要看看黑后能从哪些线路将军。"
    ],
  },
  {
    id: "strategy-az-knight-outposts",
    chapter: 7,
    source: "Bold Sir Lancelot, 34.Nf4",
    fen: "2brr1k1/p4qp1/1p3b1p/n2p1p1P/P1pP4/2P2BPN/R3PP1K/1QBR4 w - - 15 34",
    side: "w",
    focus: "h3",
    cueSquare: "e5",
    moves: ["h3f4", "f6g5", "f4g6", "g5c1", "b1c1", "c8e6", "g6e5"],
    title: [
      "Give a knight two useful posts",
      "Dale al caballo dos buenas casillas",
      "给马准备两个好据点"
    ],
    intro: [
      "Black’s f-pawn is on f5 and the h-pawn is on h6. Neither can attack a white knight on g6 or e5. Find the route from h3 that uses both squares.",
      "El peón negro de f está en f5 y el de h en h6. Ninguno puede atacar a un caballo blanco situado en g6 o e5. Busca una ruta desde h3 que aproveche ambas casillas.",
      "黑方的 f 兵在 f5，h 兵在 h6，都赶不走 g6 或 e5 的马。找一条从 h3 出发、能利用这两个格子的路线。"
    ],
    note: [
      "Both g6 and e5 are useful. The knight on g6 attacks e7 and f8, while from e5 it attacks f7 and controls d7. A second good square lets the knight stay active even when a piece attacks its first post.",
      "Tanto g6 como e5 son útiles. El caballo en g6 ataca e7 y f8, y desde e5 ataca f7 y controla d7. Una segunda buena casilla le permite seguir activo aunque una pieza ataque su primer puesto.",
      "g6 和 e5 都有用。马在 g6 攻击 e7 和 f8，在 e5 则攻击 f7 并控制 d7。有了第二个好格子，第一处据点被攻击时，马仍能保持活跃。"
    ],
  },
  {
    id: "strategy-az-new-file",
    chapter: 8,
    source: "Get the rooks into action with a pawn transaction, 26.c3",
    fen: "1r4k1/1r3p1p/1q2p1pP/2npP1N1/pp3P2/8/PPP2QPK/3R1R2 w - - 2 26",
    side: "w",
    focus: "c2",
    cueSquare: "d4",
    moves: ["c2c3", "b4c3", "b2c3", "b6c7", "c3c4", "d5c4", "d1d4"],
    title: [
      "Open a file your rook can use",
      "Abre una columna útil para tu torre",
      "打开一条自己的车能用的纵线"
    ],
    intro: [
      "Black already has heavy pieces on the b-file. Instead of fighting them there, use your c-pawn to make a different route for your rook.",
      "Las negras ya tienen piezas pesadas en la columna b. En vez de disputarles esa columna, usa el peón de c para crear otra vía para tu torre.",
      "黑方已经在 b 线布置了重子。与其在那里硬争，不如用 c 兵为白车另开一条路。"
    ],
    note: [
      "The exchanges cleared d4, and the rook can move up the d-file. Black’s pieces on the b-file didn’t stop White from creating a threat elsewhere.",
      "Los cambios despejaron d4 y la torre puede subir por la columna d. Las piezas negras de la columna b no impidieron que las blancas crearan una amenaza en otro lugar.",
      "换兵清出了 d4，车能沿 d 线进入。黑方的重子占着 b 线，也挡不住白方在别处制造威胁。"
    ],
  },
  {
    id: "strategy-az-fortress",
    chapter: 8,
    source: "Exchanging all the dark-square defenders (analysis variation), 59.Bf3",
    fen: "2k1r3/p1q4p/P1b2QpP/2Pp1p2/1Rp2P2/4P3/5PBK/8 w - - 0 59",
    side: "w",
    focus: "g2",
    cueSquare: "c6",
    moves: ["g2f3", "e8d8", "b4c4", "d5c4", "f3c6"],
    title: [
      "Break a fortress with a sacrifice",
      "Rompe una fortaleza con un sacrificio",
      "用弃子打破堡垒"
    ],
    intro: [
      "The black bishop on c6 blocks your queen’s diagonal. Set up the bishop on f3, then make Black’s d5-pawn leave the square where it blocks your bishop’s path to c6.",
      "El alfil negro de c6 corta la diagonal de tu dama. Coloca tu alfil en f3 y después obliga al peón de d5 a abandonar la casilla desde la que corta el paso de tu alfil a c6.",
      "c6 的黑象挡住了白后的斜线。先把象调到 f3，再引开挡住白象通往 c6 的 d5 黑兵。"
    ],
    note: [
      "White gave up a rook for a bishop and a pawn, but the bishop on c6 now works with the queen against the boxed-in king. Black’s new passed c-pawn is the risk White accepted.",
      "Las blancas dieron una torre por un alfil y un peón, pero ahora el alfil de c6 colabora con la dama contra el rey encerrado. El nuevo peón pasado de c es el riesgo que aceptaron.",
      "白方用一辆车换了一象一兵。现在 c6 的象能和后一起攻击退路很少的黑王。代价是黑方得到一个 c 线通路兵。"
    ],
  },
  {
    id: "strategy-az-defender-distance",
    chapter: 8,
    source: "Feint on the queenside, punch on the kingside!, 23…a5",
    fen: "r5k1/3b1pp1/p1Npqn2/1p1n4/3Pp2p/Q3P2P/PPRBBPP1/6K1 b - - 3 23",
    side: "b",
    focus: "a6",
    cueSquare: "g5",
    moves: ["a6a5", "b2b4", "a5a4", "e2b5", "g7g5"],
    title: [
      "Keep a defender far from its king",
      "Mantén a un defensor lejos de su rey",
      "让防守棋子离王远一点"
    ],
    intro: [
      "White’s knight has reached c6. Instead of chasing it, advance your a-pawn and watch where the white bishop goes.",
      "El caballo blanco ha llegado a c6. En vez de perseguirlo, avanza el peón de a y fíjate en adónde va el alfil blanco.",
      "白马已经到了 c6。别忙着赶它，先推 a 兵，看看白象会去哪里。"
    ],
    note: [
      "The bishop has gone to b5 and the knight is still on c6. Black lets both stay there and starts the kingside attack while neither can defend h3 in time.",
      "El alfil se ha ido a b5 y el caballo sigue en c6. Las negras los dejan allí y atacan en el flanco de rey mientras ninguno puede defender h3 a tiempo.",
      "白象到了 b5，白马还在 c6。黑方让它们留在那里，趁两子来不及保护 h3，开始攻王。"
    ],
  },
  {
    id: "strategy-az-remove-bishop",
    chapter: 10,
    source: "Exchanging all the dark-square defenders, 17.Bf4",
    fen: "2r2rk1/pb1q2pp/nppb4/3p1p2/1P1P3P/P1Q2NPB/3BPP2/1R2K2R w K - 0 17",
    side: "w",
    focus: "d2",
    cueSquare: "f4",
    moves: ["d2f4", "d6f4", "g3f4"],
    title: [
      "Remove the dark-square defender",
      "Cambia el defensor de las casillas negras",
      "换掉深色格守卫"
    ],
    intro: [
      "Black’s bishop on d6 can defend a whole network of dark squares. Offer to trade it while opening a file for your rook if Black accepts.",
      "El alfil negro de d6 puede defender toda una red de casillas negras. Ofrécele el cambio, de modo que si acepta se abra una columna para tu torre.",
      "d6 的黑象能守住一大片深色格。主动提出交换；对方接受，白车就能得到一条开放纵线。"
    ],
    note: [
      "The black dark-square bishop is gone and the f4-pawn covers e5 and g5. The g-file is clear, so a rook can use it to approach the king.",
      "El alfil negro de casillas negras ha desaparecido y el peón de f4 domina e5 y g5. La columna g está libre para que una torre se acerque al rey.",
      "黑方的深格象已经没了，f4 的兵控制 e5 和 g5。g 线也空了，白车可以沿线接近黑王。"
    ],
  },
  {
    id: "strategy-az-open-second-line",
    chapter: 10,
    source: "The matrix, 45.e6",
    fen: "4r1r1/1k1b3p/p1q5/1p1pPp1P/2pQ2p1/P5P1/1PPB4/2K1RR2 w - - 8 45",
    side: "w",
    focus: "e5",
    cueSquare: "e3",
    moves: ["e5e6", "d7e6", "d2e3"],
    title: [
      "Open a file beside a strong diagonal",
      "Abre una columna junto a tu diagonal fuerte",
      "有了斜线，再打开一条纵线"
    ],
    intro: [
      "White already commands the diagonal toward a7, but there is no direct way for the rooks to join. Use the e-pawn to clear a second route.",
      "Las blancas ya dominan la diagonal hacia a7, pero sus torres no tienen un camino directo. Usa el peón de e para abrir otra vía.",
      "白方已控制通往 a7 的斜线，但车还不能直接加入。用 e 兵打开第二条路线。"
    ],
    note: [
      "The bishop on e3 points toward a7 while the black bishop on e6 now has to deal with pressure down the e-file. Both routes matter to the same attack.",
      "El alfil de e3 apunta a a7, mientras el alfil negro de e6 tendrá que soportar presión por la columna e. Las dos vías sirven al mismo ataque.",
      "e3 的白象瞄准 a7，e6 的黑象则要应付 e 线上的压力。两条线路服务于同一次进攻。"
    ],
  },
  {
    id: "strategy-az-sacrifice-time",
    chapter: 11,
    source: "The not-so-Quiet Game, 13…Ne7",
    fen: "r2q1r1k/bpp2p1p/p1np3p/3Bp2b/P3P3/2PP1N1P/1P1N1PP1/R2Q1RK1 b - - 3 13",
    side: "b",
    focus: "c6",
    cueSquare: "f4",
    moves: ["c6e7", "d5b7", "a8b8", "b7a6", "f7f5", "g1h1", "e7g6", "e4f5", "g6f4"],
    title: [
      "Give up pawns to save time",
      "Cede peones para ganar tiempo",
      "舍掉几个兵，争取调马的时间"
    ],
    intro: [
      "White’s bishop can take two pawns on the queenside. Use that time to move your knight from c6 toward f4.",
      "El alfil blanco puede tomar dos peones en el flanco de dama. Aprovecha esas jugadas para llevar tu caballo desde c6 hacia f4.",
      "白象能在后翼吃两个兵。趁它花时间吃兵，把 c6 的马调往 f4。"
    ],
    note: [
      "The knight traveled c6–e7–g6–f4. From f4 it attacks h3 and works beside the bishop on h5, while White’s bishop is still on a6.",
      "El caballo recorrió c6–e7–g6–f4. Desde f4 ataca h3 y colabora con el alfil de h5, mientras el alfil blanco sigue en a6.",
      "马走了 c6–e7–g6–f4。它在 f4 攻击 h3，还能与 h5 的象配合；白象却还在 a6。"
    ],
  },
  {
    id: "strategy-az-sacrifice-space",
    chapter: 11,
    source: "Raking bishops, 6…c6",
    fen: "r1bqkb1r/ppp2ppp/5n2/nB1Pp1N1/8/8/PPPP1PPP/RNBQK2R b KQkq - 2 6",
    side: "b",
    focus: "c7",
    cueSquare: "d6",
    moves: ["c7c6", "d5c6", "b7c6", "b5d3", "f6d5", "g5f3", "f8d6"],
    title: [
      "Offer a pawn to make room for your pieces",
      "Ofrece un peón para dar espacio a tus piezas",
      "弃兵为自己的棋子腾出空间"
    ],
    intro: [
      "The bishop on b5 is giving check. Try the pawn block that lets you recapture toward the center and bring your pieces forward.",
      "El alfil de b5 da jaque. Tápalo con el peón para poder recuperar hacia el centro y adelantar tus piezas.",
      "b5 的白象正在将军。试试用兵挡，之后就能朝中央吃回，再把棋子调上去。"
    ],
    note: [
      "The knight on d5 has room to jump toward f4, and the bishop on d6 points toward h2. Black accepted a pawn deficit to put pieces to work sooner.",
      "El caballo de d5 tiene espacio para saltar hacia f4 y el alfil de d6 apunta a h2. Las negras aceptaron un peón de menos para activar sus piezas antes.",
      "d5 的马有空间跳到 f4，d6 的象瞄准 h2。黑方用一个兵换来了更快出动的机会。"
    ],
  },
  {
    id: "strategy-az-sacrifice-shield",
    chapter: 11,
    source: "Not enough time to defend, not enough time to counterattack, 9.g4",
    fen: "r1bq1rk1/pp1nbpp1/2p1pn1p/3p4/2PP1B2/2N1PN2/PPQ2PPP/R3KB1R w KQ - 4 9",
    side: "w",
    focus: "g2",
    cueSquare: "g7",
    moves: ["g2g4", "d5c4", "h1g1", "f6d5", "g4g5", "d5f4", "g5h6", "f4h5", "h6g7"],
    title: [
      "Tear away the pawn shield",
      "Desmonta el refugio de peones",
      "拆掉王前的兵盾"
    ],
    intro: [
      "Black’s h6-pawn gives your g-pawn a target. Keep following that target even when Black’s knight takes your bishop.",
      "El peón negro de h6 le da un objetivo a tu peón de g. Sigue ese plan incluso cuando el caballo negro capture tu alfil.",
      "h6 的黑兵给了 g 兵一个进攻目标。即使黑马吃了你的象，也试着继续这条线路。"
    ],
    note: [
      "White’s pawn has removed both the h6- and g7-pawns. The rook on g1 now has a route into the broken shield, which is what White got for the bishop.",
      "El peón blanco ha eliminado los peones de h6 y g7. La torre de g1 tiene una vía hacia el refugio abierto: esa es la compensación por el alfil.",
      "白兵吃掉了 h6 和 g7 的黑兵。g1 的白车现在有路打进破开的兵盾，这就是送象换来的机会。"
    ],
  },
  {
    id: "strategy-az-sacrifice-wedge",
    chapter: 11,
    source: "Wizard chess, 14…f5",
    fen: "r2qr1k1/pppn1pp1/3b3p/2pPp3/2P1P3/2P2N2/P4PPP/R1BQR1K1 b - - 0 14",
    side: "b",
    focus: "f7",
    cueSquare: "h4",
    moves: ["f7f5", "e4f5", "e5e4", "f3d2", "e4e3", "f2e3", "d8h4"],
    title: [
      "Pull a shield pawn out of position",
      "Desvía un peón del refugio del rey",
      "把王前的保护兵引开"
    ],
    intro: [
      "White’s d5-pawn has gained space. Use Black’s f-pawn to draw away White’s e-pawn, then advance Black’s e-pawn toward the king.",
      "El peón blanco de d5 ha ganado espacio. Atrae al peón blanco de e con tu peón de f y después avanza tu peón de e hacia el rey.",
      "白方的 d5 兵争到了空间。先用黑方 f 兵引走白方 e 兵，再让黑方 e 兵向白王推进。"
    ],
    note: [
      "White’s f2-pawn left the shield when it took on e3. The queen reaches h4 and can attack closer to the king. Count the threats you gain before offering a second pawn.",
      "El peón blanco de f2 salió del refugio para capturar en e3. La dama llega a h4 y puede atacar de cerca. Cuenta las amenazas que ganas antes de ofrecer un segundo peón.",
      "白方 f2 兵离开兵盾去 e3 吃兵。黑后就能走到 h4，贴近白王进攻。送出第二个兵之前，先数清楚自己能制造哪些威胁。"
    ],
  },
  {
    id: "strategy-az-opposite-black",
    chapter: 12,
    source: "Cross-court decoy, 15…g3",
    fen: "2kr3r/1ppnqp2/2pbb3/4p2p/P3P1p1/3P4/1PPBQPPP/RN1RN1K1 b - - 1 15",
    side: "b",
    focus: "g4",
    cueSquare: "h4",
    moves: ["g4g3", "f2g3", "h5h4", "g3h4", "e7h4"],
    title: [
      "Storm the king with Black",
      "Ataca al rey con las negras",
      "执黑时，向白王推兵"
    ],
    intro: [
      "The kings are on opposite wings. White has taken your a-pawn, but your g-pawn can now meet two pawns in front of White’s king.",
      "Los reyes están en flancos opuestos. Las blancas se han comido tu peón de a, pero tu peón de g ya puede enfrentarse a dos peones delante de su rey.",
      "两王在不同侧翼。白方吃了你的 a 兵，但你的 g 兵已经能接触白王前面的两个兵。"
    ],
    note: [
      "The sacrifices pulled the f-pawn and g-pawn out of their original positions. The queen enters on h4 and the rooks have open paths on the kingside.",
      "Los sacrificios sacaron a los peones de f y g de sus posiciones. La dama entra por h4 y las torres tienen vías por el flanco de rey.",
      "弃兵把白方 f 兵和 g 兵从原位引开。后从 h4 进入，黑车在王翼也有了通路。"
    ],
  },
  {
    id: "strategy-az-opposite-white",
    chapter: 12,
    source: "Everything bar the kitchen sink!, 13.g4",
    fen: "r1br2k1/1p2bppp/p1n1pn2/q2p4/2P2B1P/P1N1PN2/1PQ2PP1/1K1R1B1R w - - 2 13",
    side: "w",
    focus: "g2",
    cueSquare: "g1",
    moves: ["g2g4", "d5c4", "d1d8", "e7d8", "f1c4", "f6g4", "h1g1"],
    title: [
      "Storm the king with White",
      "Ataca al rey con las blancas",
      "执白时，向黑王推兵"
    ],
    intro: [
      "The white king is already on b1. Advance a kingside pawn even if Black can take it, then bring the rook to the file it leaves behind.",
      "El rey blanco ya está en b1. Avanza un peón del flanco de rey aunque las negras puedan tomarlo y lleva la torre a la columna que deje libre.",
      "白王已经在 b1。即使黑方能吃，也试着推进王翼兵，再把车摆到它腾出的纵线。"
    ],
    note: [
      "The rook on g1 attacks the knight on g4 and looks toward g7. Your king is across the board, so opening this file doesn’t expose it in the same way.",
      "La torre de g1 ataca al caballo de g4 y apunta a g7. Tu rey está al otro lado del tablero, por lo que abrir esta columna no lo expone del mismo modo.",
      "g1 的车攻击 g4 的马，并瞄准 g7。白王在棋盘另一侧，打开这条纵线不会直接暴露白王。"
    ],
  },
  {
    id: "strategy-az-defensive-foothold",
    chapter: 13,
    source: "Defence and attack of the gods, 9…d5",
    fen: "rn1q1rk1/p1pp1p1p/1p2pPp1/6B1/1bPP4/2NB4/PP3PbP/R2QK1NR b KQ - 1 9",
    side: "b",
    focus: "d7",
    cueSquare: "c4",
    moves: ["d7d5", "d1g4", "g2h1", "e1c1", "d5c4"],
    title: [
      "Defend by striking the center",
      "Defiéndete golpeando el centro",
      "用中央反击防守"
    ],
    intro: [
      "White’s pieces are pointing toward your king. As Stockfish, find the pawn move that claims a central square and later makes the bishop on d3 move.",
      "Las piezas blancas apuntan a tu rey. Juega como Stockfish: busca la jugada de peón que ocupa una casilla central y luego obliga a moverse al alfil de d3.",
      "白子都瞄着你的王。扮演斯托克菲什，找一步先占中央、接着能逼走 d3 白象的兵步。"
    ],
    note: [
      "…dxc4 attacks the bishop on d3 and gives Black time to bring a piece to the space vacated on d5. A central counterattack can buy time when you are under pressure.",
      "…dxc4 ataca al alfil de d3 y da tiempo a las negras para llevar una pieza a la casilla d5 que dejó el peón. Un contraataque central puede darte tiempo cuando estás bajo presión.",
      "…dxc4 攻击 d3 的白象，也为黑方争取时间，让其他棋子能占据空出的 d5。受压时，中央反击能争取时间。"
    ],
  },
  {
    id: "strategy-az-defend-other-wing",
    chapter: 13,
    source: "Using a queenside file to defend the kingside, 26…Qb4",
    fen: "r1r3k1/p3qp2/1p2p1p1/3pP1Pp/P2P1QP1/8/1P3P2/R3R1K1 b - - 2 26",
    side: "b",
    focus: "e7",
    cueSquare: "h5",
    moves: ["e7b4", "g4h5", "g6h5"],
    title: [
      "Defend across the board",
      "Defiende desde el otro flanco",
      "在另一侧反击来防守"
    ],
    intro: [
      "White’s pieces are gathering around your king. As Stockfish, find a queen move on the other wing that attacks d4 instead of attending to the h-pawn at once.",
      "Las piezas blancas se acercan a tu rey. Juega como Stockfish y busca una jugada de dama en el otro flanco que ataque d4 antes de atender al peón de h.",
      "白子正在向你的王聚拢。扮演斯托克菲什，在另一翼找一步能攻击 d4 的后步，而不是立刻处理 h 兵。"
    ],
    note: [
      "The queen threatens d4 and Black can recapture on h5. White must now think about threats on two wings, which slows the attack.",
      "La dama amenaza d4 y las negras pueden recuperar en h5. Las blancas deben contar con amenazas en dos flancos, lo que frena su ataque.",
      "黑后威胁 d4，黑方也能在 h5 吃回。白方现在得顾及两翼的威胁，进攻就慢了。"
    ],
  },
  {
    id: "strategy-az-counterplay-pawns",
    chapter: 13,
    source: "Not your average Grünfeld, 10…f4",
    fen: "r1bq1rk1/ppp1p1bp/1nn3p1/4Pp2/3P4/2N1BP2/PP1Q2PP/2KR1BNR b - - 0 10",
    side: "b",
    focus: "f5",
    cueSquare: "c6",
    moves: ["f5f4", "e3f4", "c6b4", "a2a3", "b4c6"],
    title: [
      "Make the attacker react",
      "Obliga al atacante a reaccionar",
      "迫使进攻方作出应对"
    ],
    intro: [
      "White has castled long and would like to attack on the kingside. Try AlphaZero’s pawn offer, then use the knight to make White spend a move on the other wing.",
      "Las blancas han enrocado en largo y quieren atacar en el flanco de rey. Prueba el sacrificio de AlphaZero y usa el caballo para hacerles gastar una jugada en el otro flanco.",
      "白方长易位后想从王翼进攻。试试阿尔法零的弃兵，再用马迫使白方在另一翼花一步应对。"
    ],
    note: [
      "…Nb4 made White play a3. The knight returned to c6, but White’s pawn cover had changed and Black could look for a new way to open lines near the king.",
      "…Cb4 hizo que las blancas jugaran a3. El caballo volvió a c6, pero el refugio de peones había cambiado y las negras podían buscar cómo abrir líneas junto al rey.",
      "…Nb4 迫使白方走 a3。马回到 c6，但白王前的兵形已经改变，黑方可以找机会在王旁打开线路。"
    ],
  },
];
