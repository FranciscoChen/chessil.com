'use strict';

// Static curriculum data; no rules, rendering, network or engine dependencies.
// Every move is UCI. Non-opening side is the learner's colour at the seed FEN.
// Opening namesakePly is one-based relative to fen; each line ends exactly one
// ply beyond the first position identified by its title. Repertoire is the
// learner's repertoire, not necessarily the colour moving at the seed FEN.
// Strategy lines demonstrate intended plans, not uniquely best engine moves.
// The seven endgame seeds were externally tablebase-vetted by the backend agent;
// uniqueness claims apply only to these exact positions and their WDL outcome.
module.exports = {
  "tutorial": [
    {
      "id": "tutorial-coordinates",
      "title": "Read files, ranks and squares",
      "summary": "Read files, ranks and squares.",
      "concept": "Files run a to h and ranks run 1 to 8 from White’s side. Move the king from e4 to d5; a board rotated for Black keeps the same square names.",
      "fen": "7k/8/8/8/4K3/8/8/8 w - - 0 1",
      "moves": [
        "e4d5"
      ],
      "side": "w",
      "notes": [
        "Files run a to h and ranks run 1 to 8 from White’s side. Move the king from e4 to d5; a board rotated for Black keeps the same square names."
      ]
    },
    {
      "id": "tutorial-rook-file",
      "title": "Move a rook along a file",
      "summary": "Move a rook along a file.",
      "concept": "Rooks move any unobstructed distance horizontally or vertically. Move the a1 rook up the a-file.",
      "fen": "7k/8/8/8/8/8/8/R5K1 w - - 0 1",
      "moves": [
        "a1a7"
      ],
      "side": "w",
      "notes": [
        "Rooks move any unobstructed distance horizontally or vertically. Move the a1 rook up the a-file."
      ]
    },
    {
      "id": "tutorial-rook-rank",
      "title": "Move a rook along a rank",
      "summary": "Move a rook along a rank.",
      "concept": "A rook also moves sideways. It cannot jump over another piece.",
      "fen": "7k/8/8/8/8/8/8/R5K1 w - - 0 1",
      "moves": [
        "a1d1"
      ],
      "side": "w",
      "notes": [
        "A rook also moves sideways. It cannot jump over another piece."
      ]
    },
    {
      "id": "tutorial-bishop",
      "title": "Move a bishop diagonally",
      "summary": "Move a bishop diagonally.",
      "concept": "Bishops move along clear diagonals and always stay on their original square colour.",
      "fen": "7k/8/8/8/8/8/8/2B3K1 w - - 0 1",
      "moves": [
        "c1f4"
      ],
      "side": "w",
      "notes": [
        "Bishops move along clear diagonals and always stay on their original square colour."
      ]
    },
    {
      "id": "tutorial-queen",
      "title": "Move the queen",
      "summary": "Move the queen.",
      "concept": "The queen combines rook and bishop movement. Move diagonally from d1 to h5. The queen cannot jump over pieces.",
      "fen": "k7/8/8/8/8/8/8/3Q2K1 w - - 0 1",
      "moves": [
        "d1h5"
      ],
      "side": "w",
      "notes": [
        "The queen combines rook and bishop movement. Move diagonally from d1 to h5. The queen cannot jump over pieces."
      ]
    },
    {
      "id": "tutorial-knight",
      "title": "Jump with a knight",
      "summary": "Jump with a knight.",
      "concept": "A knight moves two squares in one direction and one perpendicular. It may jump over pieces; its destination must not contain a friendly piece.",
      "fen": "7k/8/8/8/8/8/PPP5/1N2K3 w - - 0 1",
      "moves": [
        "b1c3"
      ],
      "side": "w",
      "notes": [
        "A knight moves two squares in one direction and one perpendicular. It may jump over pieces; its destination must not contain a friendly piece."
      ]
    },
    {
      "id": "tutorial-king",
      "title": "Move the king safely",
      "summary": "Move the king safely.",
      "concept": "The king moves one square in any direction. Kings may never stand next to each other; a king may not move onto an attacked square. Kings are never captured.",
      "fen": "8/4k3/8/8/4K3/8/8/8 w - - 0 1",
      "moves": [
        "e4d4"
      ],
      "side": "w",
      "notes": [
        "The king moves one square in any direction. Kings may never stand next to each other; a king may not move onto an attacked square. Kings are never captured."
      ]
    },
    {
      "id": "tutorial-pawn-one",
      "title": "Advance a pawn",
      "summary": "Advance a pawn.",
      "concept": "White pawns move toward rank 8. A pawn moves one square into an empty square and cannot move backward.",
      "fen": "7k/8/8/8/8/4P3/8/4K3 w - - 0 1",
      "moves": [
        "e3e4"
      ],
      "side": "w",
      "notes": [
        "White pawns move toward rank 8. A pawn moves one square into an empty square and cannot move backward."
      ]
    },
    {
      "id": "tutorial-pawn-two",
      "title": "Advance two squares from home",
      "summary": "Advance two squares from home.",
      "concept": "On its first move from its starting rank a pawn may advance two squares if both squares are empty. A pawn cannot jump over a piece.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4"
      ],
      "side": "w",
      "notes": [
        "On its first move from its starting rank a pawn may advance two squares if both squares are empty. A pawn cannot jump over a piece."
      ]
    },
    {
      "id": "tutorial-black-pawn",
      "title": "Move a black pawn",
      "summary": "Move a black pawn.",
      "concept": "Black pawns move toward rank 1. From e7 this pawn can move to e6 or, if clear, e5.",
      "fen": "4k3/4p3/8/8/8/8/8/4K3 b - - 0 1",
      "moves": [
        "e7e5"
      ],
      "side": "b",
      "notes": [
        "Black pawns move toward rank 1. From e7 this pawn can move to e6 or, if clear, e5."
      ]
    },
    {
      "id": "tutorial-pawn-capture",
      "title": "Capture diagonally with a pawn",
      "summary": "Capture diagonally with a pawn.",
      "concept": "Pawns capture one square diagonally forward, not straight ahead. The pawn on e4 captures the black pawn on d5.",
      "fen": "7k/8/8/3p4/4P3/8/8/4K3 w - - 0 1",
      "moves": [
        "e4d5"
      ],
      "side": "w",
      "notes": [
        "Pawns capture one square diagonally forward, not straight ahead. The pawn on e4 captures the black pawn on d5."
      ]
    },
    {
      "id": "tutorial-capture",
      "title": "Capture an opposing piece",
      "summary": "Capture an opposing piece.",
      "concept": "A capture removes the enemy piece and places your piece on its square. You cannot capture your own pieces.",
      "fen": "7k/8/n7/8/8/8/8/R5K1 w - - 0 1",
      "moves": [
        "a1a6"
      ],
      "side": "w",
      "notes": [
        "A capture removes the enemy piece and places your piece on its square. You cannot capture your own pieces."
      ]
    },
    {
      "id": "tutorial-blockers",
      "title": "Respect blockers",
      "summary": "Respect blockers.",
      "concept": "A sliding piece cannot pass through an occupied square. Capture the first opposing piece on the file; the rook cannot reach a8 yet.",
      "fen": "r6k/8/8/8/n7/8/8/R5K1 w - - 0 1",
      "moves": [
        "a1a4"
      ],
      "side": "w",
      "notes": [
        "A sliding piece cannot pass through an occupied square. Capture the first opposing piece on the file; the rook cannot reach a8 yet."
      ]
    },
    {
      "id": "tutorial-turn",
      "title": "Take turns",
      "summary": "Take turns.",
      "concept": "White moves first and then the players alternate. Practise a White knight move followed by a Black knight reply. Passing a turn is not legal.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "g1f3",
        "g8f6"
      ],
      "side": "w",
      "notes": [
        "White develops a knight.",
        "Black replies with a knight move."
      ],
      "playBoth": true
    },
    {
      "id": "tutorial-check-escape",
      "title": "Escape a check",
      "summary": "Escape a check.",
      "concept": "A check attacks the king. You must remove it immediately by moving the king, capturing the checking piece, or blocking a sliding attack when possible.",
      "fen": "k3r3/8/8/8/8/8/8/4K3 w - - 0 1",
      "moves": [
        "e1d2"
      ],
      "side": "w",
      "notes": [
        "A check attacks the king. You must remove it immediately by moving the king, capturing the checking piece, or blocking a sliding attack when possible."
      ]
    },
    {
      "id": "tutorial-check-capture",
      "title": "Capture the checking piece",
      "summary": "Capture the checking piece.",
      "concept": "The king may capture the checking piece only if its destination is safe. Here the rook on e2 is undefended.",
      "fen": "k7/8/8/8/8/8/4r3/4K3 w - - 0 1",
      "moves": [
        "e1e2"
      ],
      "side": "w",
      "notes": [
        "The king may capture the checking piece only if its destination is safe. Here the rook on e2 is undefended."
      ]
    },
    {
      "id": "tutorial-check-block",
      "title": "Block a sliding check",
      "summary": "Block a sliding check.",
      "concept": "A bishop may interpose on e2 to interrupt a rook’s attack on the king. A knight’s check cannot be blocked.",
      "fen": "k3r3/8/8/8/8/8/8/4KB2 w - - 0 1",
      "moves": [
        "f1e2"
      ],
      "side": "w",
      "notes": [
        "A bishop may interpose on e2 to interrupt a rook’s attack on the king. A knight’s check cannot be blocked."
      ]
    },
    {
      "id": "tutorial-pin-legality",
      "title": "Keep your king protected",
      "summary": "Keep your king protected.",
      "concept": "The rook on e2 shields its king from the rook on e8. Moving sideways would expose check and is illegal; capturing up the file removes the attacker.",
      "fen": "k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1",
      "moves": [
        "e2e8"
      ],
      "side": "w",
      "notes": [
        "The rook on e2 shields its king from the rook on e8. Moving sideways would expose check and is illegal; capturing up the file removes the attacker."
      ]
    },
    {
      "id": "tutorial-double-check",
      "title": "Answer double check with a king move",
      "summary": "Answer double check with a king move.",
      "concept": "Both the rook and bishop check the king. Only a king move can answer a double check.",
      "fen": "k3r3/8/8/8/1b6/8/8/4K3 w - - 0 1",
      "moves": [
        "e1f1"
      ],
      "side": "w",
      "notes": [
        "Both the rook and bishop check the king. Only a king move can answer a double check."
      ]
    },
    {
      "id": "tutorial-castle-kingside",
      "title": "Castle kingside",
      "summary": "Castle kingside.",
      "concept": "Castling moves the king two squares toward its rook and places that rook beside it. Neither may have moved, the path must be clear, and the king cannot start in, cross, or finish in check.",
      "fen": "4k3/8/8/8/8/8/8/4K2R w K - 0 1",
      "moves": [
        "e1g1"
      ],
      "side": "w",
      "notes": [
        "Castling moves the king two squares toward its rook and places that rook beside it. Neither may have moved, the path must be clear, and the king cannot start in, cross, or finish in check."
      ]
    },
    {
      "id": "tutorial-castle-queenside",
      "title": "Castle queenside",
      "summary": "Castle queenside.",
      "concept": "Queenside castling puts the king on c1 and rook on d1. The b1, c1 and d1 squares must be empty; attacks on b1 alone do not forbid it. A rook may be attacked while castling.",
      "fen": "4k3/8/8/8/8/8/8/R3K3 w Q - 0 1",
      "moves": [
        "e1c1"
      ],
      "side": "w",
      "notes": [
        "Queenside castling puts the king on c1 and rook on d1. The b1, c1 and d1 squares must be empty; attacks on b1 alone do not forbid it. A rook may be attacked while castling."
      ]
    },
    {
      "id": "tutorial-castle-black",
      "title": "Castle as Black",
      "summary": "Castle as Black.",
      "concept": "Black castles by the same rules: the king goes from e8 to g8 and the h8 rook goes to f8. Castling rights cannot be restored by returning a moved king or rook.",
      "fen": "4k2r/8/8/8/8/8/8/4K3 b k - 0 1",
      "moves": [
        "e8g8"
      ],
      "side": "b",
      "notes": [
        "Black castles by the same rules: the king goes from e8 to g8 and the h8 rook goes to f8. Castling rights cannot be restored by returning a moved king or rook."
      ]
    },
    {
      "id": "tutorial-en-passant",
      "title": "Capture en passant",
      "summary": "Capture en passant.",
      "concept": "Immediately after an adjacent enemy pawn advances two squares, a pawn on its fifth rank may capture it as if it moved one. This right expires after the next move and may not expose your king.",
      "fen": "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1",
      "moves": [
        "e5d6"
      ],
      "side": "w",
      "notes": [
        "Immediately after an adjacent enemy pawn advances two squares, a pawn on its fifth rank may capture it as if it moved one. This right expires after the next move and may not expose your king."
      ]
    },
    {
      "id": "tutorial-en-passant-black",
      "title": "Capture en passant as Black",
      "summary": "Capture en passant as Black.",
      "concept": "Black’s pawn on d4 captures the white pawn that just advanced e2-e4, landing on e3. The captured pawn disappears from e4.",
      "fen": "4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1",
      "moves": [
        "d4e3"
      ],
      "side": "b",
      "notes": [
        "Black’s pawn on d4 captures the white pawn that just advanced e2-e4, landing on e3. The captured pawn disappears from e4."
      ]
    },
    {
      "id": "tutorial-promotion",
      "title": "Promote a pawn",
      "summary": "Promote a pawn.",
      "concept": "A pawn reaching the last rank must become a queen, rook, bishop or knight of its own colour. It cannot remain a pawn or become a king; a captured piece is not required.",
      "fen": "8/P6k/8/8/8/8/8/6K1 w - - 0 1",
      "moves": [
        "a7a8q"
      ],
      "side": "w",
      "notes": [
        "A pawn reaching the last rank must become a queen, rook, bishop or knight of its own colour. It cannot remain a pawn or become a king; a captured piece is not required."
      ]
    },
    {
      "id": "tutorial-underpromotion",
      "title": "Underpromote with check",
      "summary": "Underpromote with check.",
      "concept": "Promotion need not be to a queen. This knight promotion checks the king on h6 and attacks the rook on e7.",
      "fen": "8/4r1P1/7k/8/8/8/8/6K1 w - - 0 1",
      "moves": [
        "g7g8n"
      ],
      "side": "w",
      "notes": [
        "Promotion need not be to a queen. This knight promotion checks the king on h6 and attacks the rook on e7."
      ]
    },
    {
      "id": "tutorial-promotion-capture",
      "title": "Capture while promoting",
      "summary": "Capture while promoting.",
      "concept": "A pawn can capture diagonally onto the last rank and promote on the same move.",
      "fen": "7r/k5P1/8/8/8/8/8/6K1 w - - 0 1",
      "moves": [
        "g7h8q"
      ],
      "side": "w",
      "notes": [
        "A pawn can capture diagonally onto the last rank and promote on the same move."
      ]
    },
    {
      "id": "tutorial-checkmate",
      "title": "Deliver checkmate",
      "summary": "Deliver checkmate.",
      "concept": "Checkmate ends the game: the king is attacked and no legal response removes the check. Here Qg7 is protected by the white king and leaves Black no escape.",
      "fen": "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
      "moves": [
        "g6g7"
      ],
      "side": "w",
      "notes": [
        "Checkmate ends the game: the king is attacked and no legal response removes the check. Here Qg7 is protected by the white king and leaves Black no escape."
      ]
    },
    {
      "id": "tutorial-stalemate",
      "title": "Recognize stalemate",
      "summary": "Recognize stalemate.",
      "concept": "Stalemate is an immediate draw: the side to move has no legal move and is not in check. Qg6 creates that position, so it throws away a win.",
      "fen": "7k/5K2/8/6Q1/8/8/8/8 w - - 0 1",
      "moves": [
        "g5g6"
      ],
      "side": "w",
      "notes": [
        "Stalemate is an immediate draw: the side to move has no legal move and is not in check. Qg6 creates that position, so it throws away a win."
      ]
    },
    {
      "id": "tutorial-dead-position",
      "title": "Recognize a dead position",
      "summary": "Recognize a dead position.",
      "concept": "A dead position is drawn when neither player can ever checkmate by any legal sequence. Capturing this last knight leaves king against king. King and bishop versus king or king and knight versus king are also dead positions.",
      "fen": "7k/8/8/8/8/6n1/5K2/8 w - - 0 1",
      "moves": [
        "f2g3"
      ],
      "side": "w",
      "notes": [
        "A dead position is drawn when neither player can ever checkmate by any legal sequence. Capturing this last knight leaves king against king. King and bishop versus king or king and knight versus king are also dead positions."
      ]
    },
    {
      "id": "tutorial-threefold",
      "title": "Claim a threefold repetition",
      "summary": "Claim a threefold repetition.",
      "concept": "A player may claim a draw when the same position occurs for the third time, or before a move that will produce it. Side to move and legal possibilities, including castling and en passant, must match; the occurrences need not be consecutive.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "g1f3",
        "g8f6",
        "f3g1",
        "f6g8",
        "g1f3",
        "g8f6",
        "f3g1",
        "f6g8"
      ],
      "side": "w",
      "playBoth": true
    },
    {
      "id": "tutorial-fifty-move",
      "title": "Understand the fifty-move claim",
      "summary": "Understand the fifty-move claim.",
      "concept": "After fifty moves by each side without a pawn move or capture, a player may claim a draw, including before a qualifying intended move. This quiet rook move brings the halfmove clock from 99 to 100. A pawn move or capture resets it.",
      "fen": "7k/8/8/8/8/8/8/R5K1 w - - 99 1",
      "moves": [
        "a1a2"
      ],
      "side": "w",
      "notes": [
        "After fifty moves by each side without a pawn move or capture, a player may claim a draw, including before a qualifying intended move. This quiet rook move brings the halfmove clock from 99 to 100. A pawn move or capture resets it."
      ]
    },
    {
      "id": "tutorial-automatic-draw",
      "title": "Know automatic draw rules",
      "summary": "Know automatic draw rules.",
      "concept": "Five occurrences of the same position, or seventy-five moves by each side without a pawn move or capture, automatically draw. This move brings the clock to 150 halfmoves. Checkmate on the final move takes precedence over the seventy-five-move rule.",
      "fen": "7k/8/8/8/8/8/8/R5K1 w - - 149 1",
      "moves": [
        "a1a2"
      ],
      "side": "w",
      "notes": [
        "Five occurrences of the same position, or seventy-five moves by each side without a pawn move or capture, automatically draw. This move brings the clock to 150 halfmoves. Checkmate on the final move takes precedence over the seventy-five-move rule."
      ]
    },
    {
      "id": "tutorial-agreement",
      "title": "Agreement, resignation and time",
      "summary": "Agreement, resignation and time.",
      "concept": "Players may agree a draw under the event rules, or resign. A flag fall normally loses, but draws if the opponent cannot checkmate by any possible legal sequence. Here keep playing by developing a knight; none of those outcomes is forced by this move.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "g1f3"
      ],
      "side": "w",
      "notes": [
        "Players may agree a draw under the event rules, or resign. A flag fall normally loses, but draws if the opponent cannot checkmate by any possible legal sequence. Here keep playing by developing a knight; none of those outcomes is forced by this move."
      ]
    }
  ],
  "openings": [
    {
      "id": "openings-d4-root",
      "title": "Queen’s Pawn: 1.d4",
      "summary": "Build a repertoire around 1.d4.",
      "concept": "The d-pawn claims central space and is protected by the queen.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "g8f6"
      ],
      "side": "w",
      "repertoire": "d4",
      "family": "queensPawn",
      "namesakePly": 1
    },
    {
      "id": "openings-d4-queens-gambit",
      "title": "Queen’s Gambit",
      "summary": "Offer the c-pawn to challenge d5.",
      "concept": "The Queen’s Gambit begins at 2.c4; ...e6 leads toward the Declined family.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "d7d5",
        "c2c4",
        "e7e6"
      ],
      "side": "w",
      "repertoire": "d4",
      "family": "queensGambit",
      "namesakePly": 3
    },
    {
      "id": "openings-d4-qgd",
      "title": "Queen’s Gambit Declined",
      "summary": "Meet a defended central pawn chain.",
      "concept": "Black declines the gambit with ...e6; White develops and increases central pressure.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "d7d5",
        "c2c4",
        "e7e6",
        "b1c3"
      ],
      "side": "w",
      "repertoire": "d4",
      "family": "queensGambit",
      "namesakePly": 4
    },
    {
      "id": "openings-d4-qga",
      "title": "Queen’s Gambit Accepted",
      "summary": "Develop before recovering the pawn.",
      "concept": "Acceptance is defined by ...dxc4. White need not rush to recapture.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "d7d5",
        "c2c4",
        "d5c4",
        "g1f3"
      ],
      "side": "w",
      "repertoire": "d4",
      "family": "queensGambit",
      "namesakePly": 4
    },
    {
      "id": "openings-d4-slav",
      "title": "Slav Defence",
      "summary": "Recognize support from the c-pawn.",
      "concept": "The Slav’s ...c6 supports d5 while leaving the c8 bishop’s diagonal open.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "d7d5",
        "c2c4",
        "c7c6",
        "g1f3"
      ],
      "side": "w",
      "repertoire": "d4",
      "family": "slav",
      "namesakePly": 4
    },
    {
      "id": "openings-d4-queens-indian",
      "title": "Queen’s Indian Defence",
      "summary": "Meet the queenside fianchetto.",
      "concept": "The defining ...b6 prepares ...Bb7. The position after ...e6 alone is not yet a Queen’s Indian.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "g8f6",
        "c2c4",
        "e7e6",
        "g1f3",
        "b7b6",
        "g2g3"
      ],
      "side": "w",
      "repertoire": "d4",
      "family": "queensIndian",
      "namesakePly": 6
    },
    {
      "id": "openings-d4-kings-indian",
      "title": "King’s Indian Defence",
      "summary": "Build a centre against the kingside fianchetto.",
      "concept": "Black’s ...d6 supports a King’s Indian setup. This is a d4 defence, distinct from the King’s Indian Attack.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "g8f6",
        "c2c4",
        "g7g6",
        "b1c3",
        "f8g7",
        "e2e4",
        "d7d6",
        "g1f3"
      ],
      "side": "w",
      "repertoire": "d4",
      "family": "kingsIndian",
      "namesakePly": 8
    },
    {
      "id": "openings-d4-dutch",
      "title": "Dutch Defence: bishop development",
      "summary": "Meet ...f5 with active development.",
      "concept": "The Dutch begins at ...f5. Bg5 develops the bishop before choosing the rest of the setup.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "f7f5",
        "c1g5"
      ],
      "side": "w",
      "repertoire": "d4",
      "family": "dutch",
      "namesakePly": 2
    },
    {
      "id": "openings-d4-french",
      "title": "French Defence: Advance via 1.d4",
      "summary": "Transpose to an Advance French.",
      "concept": "The e5 pawn establishes the Advance structure; Black challenges its base with ...c5.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "e7e6",
        "e2e4",
        "d7d5",
        "e4e5",
        "c7c5"
      ],
      "side": "w",
      "repertoire": "d4",
      "family": "french",
      "namesakePly": 5
    },
    {
      "id": "openings-d4-caro",
      "title": "Caro-Kann Defence: Advance via 1.d4",
      "summary": "Transpose to an Advance Caro-Kann.",
      "concept": "Black develops the light-squared bishop before playing ...e6.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "c7c6",
        "e2e4",
        "d7d5",
        "e4e5",
        "c8f5"
      ],
      "side": "w",
      "repertoire": "d4",
      "family": "caroKann",
      "namesakePly": 5
    },
    {
      "id": "openings-d4-nimzo",
      "title": "Nimzo-Indian Defence",
      "summary": "Meet the pin on c3.",
      "concept": "...Bb4 after Nc3 identifies the Nimzo-Indian. White reinforces the centre with e3.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "g8f6",
        "c2c4",
        "e7e6",
        "b1c3",
        "f8b4",
        "e2e3"
      ],
      "side": "w",
      "repertoire": "d4",
      "family": "nimzoIndian",
      "namesakePly": 6
    },
    {
      "id": "openings-d4-ragozin",
      "title": "Ragozin Defence",
      "summary": "Combine Queen’s Gambit structure with a pin.",
      "concept": "Both ...d5 and ...Bb4 distinguish this Ragozin position from the Nimzo-Indian.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "g8f6",
        "c2c4",
        "e7e6",
        "g1f3",
        "d7d5",
        "b1c3",
        "f8b4",
        "e2e3"
      ],
      "side": "w",
      "repertoire": "d4",
      "family": "ragozin",
      "namesakePly": 8
    },
    {
      "id": "openings-d4-catalan",
      "title": "Catalan Opening",
      "summary": "Pressure the centre on the long diagonal.",
      "concept": "The g3-Bg2 fianchetto alongside d4 and c4 defines the Catalan setup; b3 is not the Catalan fianchetto.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "g8f6",
        "c2c4",
        "e7e6",
        "g2g3",
        "d7d5",
        "f1g2",
        "f8e7"
      ],
      "side": "w",
      "repertoire": "d4",
      "family": "catalan",
      "namesakePly": 7
    },
    {
      "id": "openings-e4-root",
      "title": "King’s Pawn: 1.e4",
      "summary": "Claim space and open development lines.",
      "concept": "The e-pawn opens the queen and bishop and invites several distinct black defences.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e5"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "kingsPawn",
      "namesakePly": 1
    },
    {
      "id": "openings-e4-spanish",
      "title": "Spanish Opening (Ruy Lopez)",
      "summary": "Pressure the knight defending e5.",
      "concept": "The Spanish bishop goes to b5, not g5. Black’s ...a6 asks it to decide.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "f1b5",
        "a7a6"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "spanish",
      "namesakePly": 5
    },
    {
      "id": "openings-e4-spanish-berlin",
      "title": "Spanish: Berlin Defence",
      "summary": "Recognize immediate counterpressure on e4.",
      "concept": "...Nf6 identifies the Berlin. White can castle rather than defend e4 directly.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "f1b5",
        "g8f6",
        "e1g1"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "spanish",
      "namesakePly": 6
    },
    {
      "id": "openings-e4-spanish-exchange",
      "title": "Spanish: Exchange Variation",
      "summary": "Exchange the bishop for the c6 knight.",
      "concept": "The exchange changes Black’s pawn structure, but gives Black the bishop pair.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "f1b5",
        "a7a6",
        "b5c6",
        "d7c6"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "spanish",
      "namesakePly": 7
    },
    {
      "id": "openings-e4-italian",
      "title": "Italian Game",
      "summary": "Develop toward f7.",
      "concept": "Bc4 defines the Italian; ...Bc5 develops Black’s bishop in reply.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "f1c4",
        "f8c5"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "italian",
      "namesakePly": 5
    },
    {
      "id": "openings-e4-italian-piano",
      "title": "Italian: Giuoco Piano",
      "summary": "Prepare a supported central advance.",
      "concept": "The ...Bc5 branch is the Giuoco Piano. The c-pawn can support a later d4.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "f1c4",
        "f8c5",
        "c2c3"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "italian",
      "namesakePly": 6
    },
    {
      "id": "openings-e4-italian-two-knights",
      "title": "Italian: Two Knights Defence",
      "summary": "Meet a direct attack on e4.",
      "concept": "...Nf6 defines the Two Knights Defence; d3 is a quiet way to support e4.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "f1c4",
        "g8f6",
        "d2d3"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "italian",
      "namesakePly": 6
    },
    {
      "id": "openings-e4-sicilian",
      "title": "Sicilian Defence",
      "summary": "Meet the asymmetric c-pawn challenge.",
      "concept": "...c5 contests d4 from the flank. Nf3 prepares development and often d4.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "c7c5",
        "g1f3"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "sicilian",
      "namesakePly": 2
    },
    {
      "id": "openings-e4-scandinavian",
      "title": "Scandinavian Defence",
      "summary": "Answer an immediate central challenge.",
      "concept": "The Scandinavian starts at ...d5; White can capture the central pawn.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "d7d5",
        "e4d5"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "scandinavian",
      "namesakePly": 2
    },
    {
      "id": "openings-e4-caro",
      "title": "Caro-Kann Defence",
      "summary": "Build the centre before ...d5.",
      "concept": "...c6 defines the Caro-Kann and prepares ...d5.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "c7c6",
        "d2d4"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "caroKann",
      "namesakePly": 2
    },
    {
      "id": "openings-e4-french",
      "title": "French Defence",
      "summary": "Build a centre against ...e6.",
      "concept": "...e6 defines the French and prepares ...d5, at the cost of restricting the c8 bishop.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e6",
        "d2d4"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "french",
      "namesakePly": 2
    },
    {
      "id": "openings-e4-pirc",
      "title": "Pirc Defence",
      "summary": "Develop behind a broad pawn centre.",
      "concept": "The Pirc combines ...d6, ...Nf6 and ...g6; White develops rather than overextending immediately.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "d7d6",
        "d2d4",
        "g8f6",
        "b1c3",
        "g7g6",
        "g1f3"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "pirc",
      "namesakePly": 6
    },
    {
      "id": "openings-e4-modern",
      "title": "Modern Defence",
      "summary": "Occupy the centre against ...g6.",
      "concept": "The Modern begins with ...g6 without committing the g8 knight to f6.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "g7g6",
        "d2d4"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "modern",
      "namesakePly": 2
    },
    {
      "id": "openings-e4-kia",
      "title": "King’s Indian Attack",
      "summary": "Reach the kingside fianchetto formation.",
      "concept": "The name refers to White’s coordinated d3, Nd2, Nf3, g3 and Bg2 setup, reached here on ply eleven. This is not the King’s Indian Defence.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e6",
        "d2d3",
        "d7d5",
        "b1d2",
        "g8f6",
        "g1f3",
        "c7c5",
        "g2g3",
        "b8c6",
        "f1g2",
        "f8e7"
      ],
      "side": "w",
      "repertoire": "e4",
      "family": "kingsIndianAttack",
      "namesakePly": 11
    },
    {
      "id": "openings-black-indian",
      "title": "Indian Defence: flexible ...Nf6",
      "summary": "Answer 1.d4 flexibly.",
      "concept": "...Nf6 controls e4. After c4 Black can choose a particular Indian defence; ...e6 alone does not establish the Queen’s Indian.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "g8f6",
        "c2c4"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "indian",
      "namesakePly": 2
    },
    {
      "id": "openings-black-queens-indian",
      "title": "Queen’s Indian Defence as Black",
      "summary": "Prepare the bishop on b7.",
      "concept": "The ...b6 move establishes this Queen’s Indian branch.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "g8f6",
        "c2c4",
        "e7e6",
        "g1f3",
        "b7b6",
        "g2g3"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "queensIndian",
      "namesakePly": 6
    },
    {
      "id": "openings-black-nimzo",
      "title": "Nimzo-Indian Defence as Black",
      "summary": "Pin the knight supporting e4.",
      "concept": "Against Nc3, ...Bb4 identifies the Nimzo-Indian.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "g8f6",
        "c2c4",
        "e7e6",
        "b1c3",
        "f8b4",
        "e2e3"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "nimzoIndian",
      "namesakePly": 6
    },
    {
      "id": "openings-black-bogo",
      "title": "Bogo-Indian Defence",
      "summary": "Check before White develops the b1 knight.",
      "concept": "...Bb4+ against Nf3 is the Bogo-Indian, not the Nimzo-Indian or Catalan.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "g8f6",
        "c2c4",
        "e7e6",
        "g1f3",
        "f8b4",
        "c1d2"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "bogoIndian",
      "namesakePly": 6
    },
    {
      "id": "openings-black-ragozin",
      "title": "Ragozin Defence as Black",
      "summary": "Pin c3 in a Queen’s Gambit structure.",
      "concept": "The combination of ...d5 and ...Bb4 defines this Ragozin position.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "g8f6",
        "c2c4",
        "e7e6",
        "g1f3",
        "d7d5",
        "b1c3",
        "f8b4",
        "e2e3"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "ragozin",
      "namesakePly": 8
    },
    {
      "id": "openings-black-open-game",
      "title": "Open Game against 1.e4",
      "summary": "Challenge the centre symmetrically.",
      "concept": "...e5 stakes out central space; Nf3 develops while attacking that pawn.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e5",
        "g1f3"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "openGame",
      "namesakePly": 2
    },
    {
      "id": "openings-black-berlin",
      "title": "Berlin Defence as Black",
      "summary": "Counterattack e4 in the Spanish.",
      "concept": "The bishop on b5 establishes the Spanish; ...Nf6 is the Berlin branch.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "f1b5",
        "g8f6",
        "e1g1"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "spanish",
      "namesakePly": 6
    },
    {
      "id": "openings-black-italian",
      "title": "Giuoco Piano as Black",
      "summary": "Develop the bishop against the Italian.",
      "concept": "...Bc5 defines the Giuoco Piano branch of the Italian Game.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "f1c4",
        "f8c5",
        "c2c3"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "italian",
      "namesakePly": 6
    },
    {
      "id": "openings-black-scotch",
      "title": "Scotch Game",
      "summary": "Meet the early central break.",
      "concept": "The Scotch begins at d4 after both knights have developed; Black captures in reply.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e5",
        "g1f3",
        "b8c6",
        "d2d4",
        "e5d4"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "scotch",
      "namesakePly": 5
    },
    {
      "id": "openings-black-vienna",
      "title": "Vienna Game",
      "summary": "Meet 2.Nc3 with active development.",
      "concept": "Nc3 defines the Vienna; ...Nf6 challenges e4. Later Nf3 Nc6 can transpose to the Four Knights.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e5",
        "b1c3",
        "g8f6"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "vienna",
      "namesakePly": 3
    },
    {
      "id": "openings-black-english",
      "title": "English Opening: ...e5",
      "summary": "Occupy the centre against a flank opening.",
      "concept": "The English begins at c4. The ...e5 reply produces a reversed Sicilian structure, not a reversed Spanish.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "c2c4",
        "e7e5",
        "b1c3"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "english",
      "namesakePly": 2
    },
    {
      "id": "openings-black-reti",
      "title": "Réti Opening: 1.Nf3",
      "summary": "Take central space against a flexible knight move.",
      "concept": "The 1.Nf3 opening is often called Réti; a later c4 challenge can reach more specific Réti structures.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "g1f3",
        "d7d5"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "reti",
      "namesakePly": 1
    },
    {
      "id": "openings-black-g3",
      "title": "King’s Fianchetto Opening",
      "summary": "Take the centre while White prepares Bg2.",
      "concept": "The early g3 is a kingside fianchetto opening; do not label it a complete King’s Indian Attack yet.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "g2g3",
        "d7d5"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "kingsFianchetto",
      "namesakePly": 1
    },
    {
      "id": "openings-black-e3",
      "title": "Van ’t Kruijs Opening",
      "summary": "Develop against the modest 1.e3.",
      "concept": "White releases the f1 bishop but claims little space. Black develops flexibly.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e3",
        "g8f6"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "vanTKruijs",
      "namesakePly": 1
    },
    {
      "id": "openings-black-h3",
      "title": "Clemenz Opening",
      "summary": "Claim central space against 1.h3.",
      "concept": "The opening name for 1.h3 is Clemenz, not Spanish reversed.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "h2h3",
        "e7e5"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "clemenz",
      "namesakePly": 1
    },
    {
      "id": "openings-black-kings-gambit",
      "title": "King’s Gambit Accepted",
      "summary": "Recognize the open f-file gambit.",
      "concept": "...exf4 accepts the King’s Gambit; White develops before trying to regain the pawn.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "e2e4",
        "e7e5",
        "f2f4",
        "e5f4",
        "g1f3"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "kingsGambit",
      "namesakePly": 4
    },
    {
      "id": "openings-black-englund",
      "title": "Englund Gambit",
      "summary": "Recognize the immediate pawn offer.",
      "concept": "...e5 against 1.d4 is the Englund Gambit. Learn the structure without assuming the gambit is sound.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "e7e5",
        "d4e5"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "englund",
      "namesakePly": 2
    },
    {
      "id": "openings-black-benko",
      "title": "Benko Gambit",
      "summary": "Recognize a queenside pawn offer.",
      "concept": "...b5 offers a pawn for queenside files in the Benko; White accepts with cxb5 in this illustration.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4",
        "g8f6",
        "c2c4",
        "c7c5",
        "d4d5",
        "b7b5",
        "c4b5"
      ],
      "side": "b",
      "repertoire": "black",
      "family": "benko",
      "namesakePly": 6
    }
  ],
  "endgames": [
    {
      "id": "endgames-direct-opposition",
      "title": "Take direct opposition",
      "summary": "Take direct opposition.",
      "concept": "Black’s Kf4 faces White’s king on f2 with one square between them. It is the only drawing move in this exact position; opposition alone does not make every similar position drawn.",
      "fen": "8/8/8/8/4k3/8/4PK2/8 b - - 0 1",
      "moves": [
        "e4f4"
      ],
      "side": "b",
      "notes": [
        "Black’s Kf4 faces White’s king on f2 with one square between them. It is the only drawing move in this exact position; opposition alone does not make every similar position drawn."
      ]
    },
    {
      "id": "endgames-support-promotion",
      "title": "Support the pawn before promoting",
      "summary": "Support the pawn before promoting.",
      "concept": "Kc7 supports b8 and is the only winning move here. Immediate promotion on b8 lets the black king capture the new piece.",
      "fen": "8/kP6/2K5/8/8/8/8/8 w - - 0 1",
      "moves": [
        "c6c7"
      ],
      "side": "w",
      "notes": [
        "Kc7 supports b8 and is the only winning move here. Immediate promotion on b8 lets the black king capture the new piece."
      ]
    },
    {
      "id": "endgames-king-catches-runner",
      "title": "Capture the imminent passed pawn",
      "summary": "Capture the imminent passed pawn.",
      "concept": "Kxg2 is the only drawing move. Remove the pawn before it promotes; the resulting king-only position is a dead-position draw.",
      "fen": "8/8/8/8/8/5K2/6p1/4k3 w - - 0 1",
      "moves": [
        "f3g2"
      ],
      "side": "w",
      "notes": [
        "Kxg2 is the only drawing move. Remove the pawn before it promotes; the resulting king-only position is a dead-position draw."
      ]
    },
    {
      "id": "endgames-rook-behind-runner",
      "title": "Put the rook behind the enemy runner",
      "summary": "Put the rook behind the enemy runner.",
      "concept": "Ra4 is the only drawing move here. The rook controls the a-file from behind the a2 pawn and retains checking distance against the black king; moving to c3 is too close in this exact position.",
      "fen": "8/8/8/8/2R5/8/pk6/5K2 w - - 0 1",
      "moves": [
        "c4a4"
      ],
      "side": "w",
      "notes": [
        "Ra4 is the only drawing move here. The rook controls the a-file from behind the a2 pawn and retains checking distance against the black king; moving to c3 is too close in this exact position."
      ]
    },
    {
      "id": "endgames-promotion-tempo",
      "title": "Promote with check to gain time",
      "summary": "Promote with check to gain time.",
      "concept": "g8=Q+ is the only winning move. The check gains a tempo to deal with Black’s a-pawn; alternative promotions do not preserve the win.",
      "fen": "8/6P1/8/8/8/1k1K4/p7/8 w - - 0 1",
      "moves": [
        "g7g8q"
      ],
      "side": "w",
      "notes": [
        "g8=Q+ is the only winning move. The check gains a tempo to deal with Black’s a-pawn; alternative promotions do not preserve the win."
      ]
    },
    {
      "id": "endgames-bishop-promotion-diagonal",
      "title": "Control the promotion square with a bishop",
      "summary": "Control the promotion square with a bishop.",
      "concept": "Bd5 is the only drawing move. The bishop controls the diagonal d5-e4-f3-g2-h1 and prevents a safe promotion. This is control of the promotion square, not a physical pawn blockade.",
      "fen": "8/8/8/8/2B5/8/5k1p/K7 w - - 0 1",
      "moves": [
        "c4d5"
      ],
      "side": "w",
      "notes": [
        "Bd5 is the only drawing move. The bishop controls the diagonal d5-e4-f3-g2-h1 and prevents a safe promotion. This is control of the promotion square, not a physical pawn blockade."
      ]
    },
    {
      "id": "endgames-knight-catches-runner",
      "title": "Stop the runner with a knight",
      "summary": "Stop the runner with a knight.",
      "concept": "Nxh2+ is the only drawing move. The knight captures the imminent runner with check, leaving king and knight against king, a dead-position draw.",
      "fen": "8/8/8/8/8/5N2/7p/K4k2 w - - 0 1",
      "moves": [
        "f3h2"
      ],
      "side": "w",
      "notes": [
        "Nxh2+ is the only drawing move. The knight captures the imminent runner with check, leaving king and knight against king, a dead-position draw."
      ]
    }
  ],
  "tactics": [
    {
      "id": "tactics-hanging-piece",
      "title": "Capture an undefended piece",
      "summary": "Capture an undefended piece.",
      "concept": "The rook on a6 is undefended and can be captured immediately.",
      "fen": "7k/8/r7/8/Q7/8/8/6K1 w - - 0 1",
      "moves": [
        "a4a6"
      ],
      "side": "w",
      "notes": [
        "The rook on a6 is undefended and can be captured immediately."
      ]
    },
    {
      "id": "tactics-knight-fork",
      "title": "Fork king and rook",
      "summary": "Fork king and rook.",
      "concept": "Nd6+ checks the king on e8 and attacks the rook on f7. After the king moves to f8 in this line, capture the rook.",
      "fen": "4k3/5r2/8/8/4N3/8/8/6K1 w - - 0 1",
      "moves": [
        "e4d6",
        "e8f8",
        "d6f7"
      ],
      "side": "w",
      "notes": [
        "Fork the king on e8 and rook on f7 with check.",
        "The king moves to f8 in this line.",
        "Capture the forked rook."
      ]
    },
    {
      "id": "tactics-absolute-pin",
      "title": "Exploit an absolute pin",
      "summary": "Exploit an absolute pin.",
      "concept": "The knight on e7 cannot move off the e-file without exposing its king to the rook. Capture it with the bishop.",
      "fen": "4k3/4n3/8/2B5/8/8/8/4R1K1 w - - 0 1",
      "moves": [
        "c5e7"
      ],
      "side": "w",
      "notes": [
        "The knight on e7 cannot move off the e-file without exposing its king to the rook. Capture it with the bishop."
      ]
    },
    {
      "id": "tactics-skewer",
      "title": "Skewer king and rook",
      "summary": "Skewer king and rook.",
      "concept": "Ra8+ drives the king away from the eighth rank, exposing the rook behind it.",
      "fen": "3k3r/8/8/8/8/8/8/R5K1 w - - 0 1",
      "moves": [
        "a1a8",
        "d8e7",
        "a8h8"
      ],
      "side": "w",
      "notes": [
        "Check along the eighth rank.",
        "Black moves off the rook’s line.",
        "Capture the exposed rook."
      ]
    },
    {
      "id": "tactics-discovered-attack",
      "title": "Uncover a rook attack with tempo",
      "summary": "Uncover a rook attack with tempo.",
      "concept": "Moving the bishop to b5 gives check and uncovers the rook’s attack on the queen on e7.",
      "fen": "8/3kq3/8/8/8/8/4B3/4R1K1 w - - 0 1",
      "moves": [
        "e2b5",
        "d7c7",
        "e1e7"
      ],
      "side": "w",
      "notes": [
        "Give check while clearing the e-file.",
        "Black moves the king.",
        "Capture the queen on the opened file."
      ]
    },
    {
      "id": "tactics-double-check",
      "title": "Create a double check",
      "summary": "Create a double check.",
      "concept": "Bb5+ uncovers the rook on e1 while the bishop also attacks e8. Black must move the king.",
      "fen": "4k3/8/8/8/8/8/4B3/4R1K1 w - - 0 1",
      "moves": [
        "e2b5"
      ],
      "side": "w",
      "notes": [
        "Bb5+ uncovers the rook on e1 while the bishop also attacks e8. Black must move the king."
      ]
    },
    {
      "id": "tactics-back-rank",
      "title": "Use the back-rank weakness",
      "summary": "Use the back-rank weakness.",
      "concept": "The black king’s own pawns block its escape; Re8 gives mate along the back rank.",
      "fen": "6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1",
      "moves": [
        "e1e8"
      ],
      "side": "w",
      "notes": [
        "The black king’s own pawns block its escape; Re8 gives mate along the back rank."
      ]
    },
    {
      "id": "tactics-remove-defender",
      "title": "Remove the defender before capturing",
      "summary": "Remove the defender before capturing.",
      "concept": "The e6 knight defends the queen on d8. Remove it with check; after the king moves, take the queen.",
      "fen": "3qk3/8/4n3/6B1/8/8/8/4R1K1 w - - 0 1",
      "moves": [
        "e1e6",
        "e8f8",
        "g5d8"
      ],
      "side": "w",
      "notes": [
        "Remove the knight with check.",
        "Black moves the king in this line.",
        "The bishop takes the now undefended queen."
      ]
    },
    {
      "id": "tactics-higher-value-target",
      "title": "Capture a higher-value target",
      "summary": "Win the queen for a rook.",
      "concept": "Rxd7 captures the queen. The rook on d8 can recapture, but White has exchanged a rook for a queen. Compare what both sides lose rather than rejecting every defended capture.",
      "fen": "3r2k1/3q4/8/8/8/8/4Q3/3R2K1 w - - 0 1",
      "moves": [
        "d1d7"
      ],
      "side": "w",
      "notes": [
        "Capture the queen; even ...Rxd7 leaves White with the queen-for-rook material gain."
      ]
    },
    {
      "id": "tactics-promotion-fork",
      "title": "Underpromote to fork with check",
      "summary": "Underpromote to fork with check.",
      "concept": "g8=N+ checks h6 and forks the rook on e7. A knight promotion can produce a different forcing pattern from a queen promotion.",
      "fen": "8/4r1P1/7k/8/8/8/8/6K1 w - - 0 1",
      "moves": [
        "g7g8n"
      ],
      "side": "w",
      "notes": [
        "g8=N+ checks h6 and forks the rook on e7. A knight promotion can produce a different forcing pattern from a queen promotion."
      ]
    },
    {
      "id": "tactics-zwischenzug",
      "title": "Insert a check before recapturing",
      "summary": "Insert a check before recapturing.",
      "concept": "Instead of immediately capturing the knight on c3, use the bishop check first. The illustrated king reply permits the rook to capture the knight; the intermediate check is an example, not a claim of a forced win.",
      "fen": "4k3/8/8/8/8/R1n5/4B3/6K1 w - - 0 1",
      "moves": [
        "e2h5",
        "e8f8",
        "a3c3"
      ],
      "side": "w",
      "notes": [
        "Give an intermediate check.",
        "The king moves.",
        "Capture the knight after the check."
      ]
    },
    {
      "id": "tactics-mate-net",
      "title": "Coordinate queen and king",
      "summary": "Coordinate queen and king.",
      "concept": "The queen moves next to the king under protection of the white king. Black has no safe king move and cannot capture the queen.",
      "fen": "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
      "moves": [
        "g6g7"
      ],
      "side": "w",
      "notes": [
        "The queen moves next to the king under protection of the white king. Black has no safe king move and cannot capture the queen."
      ]
    }
  ],
  "strategy": [
    {
      "id": "strategy-centre-occupation",
      "title": "Occupy the centre",
      "summary": "Occupy the centre.",
      "concept": "Advance d4 to claim central squares and release the c1 bishop. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4"
      ],
      "side": "w",
      "notes": [
        "Advance d4 to claim central squares and release the c1 bishop. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-centre-denial",
      "title": "Deny the opponent central space",
      "summary": "Deny the opponent central space.",
      "concept": "The pawn on d4 controls e5 and c5, reducing Black’s central choices. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "d2d4"
      ],
      "side": "w",
      "notes": [
        "The pawn on d4 controls e5 and c5, reducing Black’s central choices. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-development",
      "title": "Develop before launching an attack",
      "summary": "Develop before launching an attack.",
      "concept": "Nf3 brings a new piece into play and controls e5 and d4. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "g1f3"
      ],
      "side": "w",
      "notes": [
        "Nf3 brings a new piece into play and controls e5 and d4. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-king-safety",
      "title": "Improve king safety",
      "summary": "Improve king safety.",
      "concept": "Castle while the route is safe, connect the rook to the centre, and keep the pawn shelter intact. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "4k3/8/8/8/8/8/PPP2PPP/4K2R w K - 0 1",
      "moves": [
        "e1g1"
      ],
      "side": "w",
      "notes": [
        "Castle while the route is safe, connect the rook to the centre, and keep the pawn shelter intact. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-central-break",
      "title": "Challenge the centre with a pawn break",
      "summary": "Challenge the centre with a pawn break.",
      "concept": "The c-pawn challenges White’s d4 pawn, the base of the e5-d4 chain. Prepare central counterplay before a slow wing operation. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "4k3/2p5/4p3/3pP3/3P4/8/8/4K3 b - - 0 1",
      "moves": [
        "c7c5"
      ],
      "side": "b",
      "notes": [
        "The c-pawn challenges White’s d4 pawn, the base of the e5-d4 chain. Prepare central counterplay before a slow wing operation. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-space",
      "title": "Gain space with a supported pawn",
      "summary": "Gain space with a supported pawn.",
      "concept": "The d-pawn supports e5, which takes space and controls d6 and f6. Pawn advances also leave squares behind them, so check counterplay first. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/8/3p4/8/3PP3/8/8/6K1 w - - 0 1",
      "moves": [
        "e4e5"
      ],
      "side": "w",
      "notes": [
        "The d-pawn supports e5, which takes space and controls d6 and f6. Pawn advances also leave squares behind them, so check counterplay first. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-outpost",
      "title": "Use a pawn-supported outpost",
      "summary": "Use a pawn-supported outpost.",
      "concept": "Nd5 places the knight on a central square protected by e4. No black c- or e-pawn can drive it away in this exercise. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/p6p/8/8/4P3/2N5/8/6K1 w - - 0 1",
      "moves": [
        "c3d5"
      ],
      "side": "w",
      "notes": [
        "Nd5 places the knight on a central square protected by e4. No black c- or e-pawn can drive it away in this exercise. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-open-file",
      "title": "Occupy an open file",
      "summary": "Occupy an open file.",
      "concept": "Place the rook on the open d-file to gain access to the opponent’s position. An open file has no pawns of either colour. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/p6p/8/8/8/8/8/R5K1 w - - 0 1",
      "moves": [
        "a1d1"
      ],
      "side": "w",
      "notes": [
        "Place the rook on the open d-file to gain access to the opponent’s position. An open file has no pawns of either colour. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-long-diagonal",
      "title": "Use a long diagonal",
      "summary": "Use a long diagonal.",
      "concept": "Fianchetto the bishop on g2, where it can influence the long diagonal. Check for pawn blockers before assuming the whole diagonal is open. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/8/8/8/8/6P1/8/5BK1 w - - 0 1",
      "moves": [
        "f1g2"
      ],
      "side": "w",
      "notes": [
        "Fianchetto the bishop on g2, where it can influence the long diagonal. Check for pawn blockers before assuming the whole diagonal is open. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-mobility",
      "title": "Improve the least active piece",
      "summary": "Improve the least active piece.",
      "concept": "The knight returns from the rim to c4, gaining access to more central squares. Look at both sides’ mobility after the move. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/p6p/8/8/8/N7/8/6K1 w - - 0 1",
      "moves": [
        "a3c4"
      ],
      "side": "w",
      "notes": [
        "The knight returns from the rim to c4, gaining access to more central squares. Look at both sides’ mobility after the move. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-restrict-options",
      "title": "Restrict the enemy knight",
      "summary": "Restrict the enemy knight.",
      "concept": "The bishop on c4 controls b5, so the knight on a7 cannot use that square. It still has other moves: restriction is a concrete reduction of options. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "7k/n7/8/8/8/8/4B3/6K1 w - - 0 1",
      "moves": [
        "e2c4"
      ],
      "side": "w",
      "notes": [
        "The bishop on c4 controls b5, so the knight on a7 cannot use that square. It still has other moves: restriction is a concrete reduction of options. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-prophylaxis",
      "title": "Make room for the king",
      "summary": "Make room for the king.",
      "concept": "h3 provides a future h2 escape square and prevents a piece from using g4. Check the cost of weakening the pawn shelter before making luft automatically. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/8/8/8/8/8/5PPP/5RK1 w - - 0 1",
      "moves": [
        "h2h3"
      ],
      "side": "w",
      "notes": [
        "h3 provides a future h2 escape square and prevents a piece from using g4. Check the cost of weakening the pawn shelter before making luft automatically. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-overdefence",
      "title": "Add a defender to a central pawn",
      "summary": "Add a defender to a central pawn.",
      "concept": "Nd2 adds protection to e4, which is already defended by d3. Extra defence may let another piece take on a new job. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/8/8/8/4P3/3P4/8/1N4K1 w - - 0 1",
      "moves": [
        "b1d2"
      ],
      "side": "w",
      "notes": [
        "Nd2 adds protection to e4, which is already defended by d3. Extra defence may let another piece take on a new job. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-blockade",
      "title": "Blockade an isolated passed pawn",
      "summary": "Blockade an isolated passed pawn.",
      "concept": "Nd4 sits directly in front of the black d5 pawn. The knight is supported by e3 and stops that pawn from advancing for now. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/8/8/3p4/8/4PN2/8/6K1 w - - 0 1",
      "moves": [
        "f3d4"
      ],
      "side": "w",
      "notes": [
        "Nd4 sits directly in front of the black d5 pawn. The knight is supported by e3 and stops that pawn from advancing for now. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-second-weakness",
      "title": "Create play on the other wing",
      "summary": "Create play on the other wing.",
      "concept": "With the centre fixed, b4 takes queenside space instead of committing everything to a kingside attack. A second target can stretch the defender’s pieces. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/8/4p2p/3pP3/3P4/8/1P6/6K1 w - - 0 1",
      "moves": [
        "b2b4"
      ],
      "side": "w",
      "notes": [
        "With the centre fixed, b4 takes queenside space instead of committing everything to a kingside attack. A second target can stretch the defender’s pieces. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-active-king",
      "title": "Activate the king after the queens leave",
      "summary": "Activate the king after the queens leave.",
      "concept": "Bring the king toward the centre when checks and tactics allow. Kings become useful attackers in simplified positions. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "8/p4k2/6p1/8/8/6P1/P4K2/8 w - - 0 1",
      "moves": [
        "f2e3"
      ],
      "side": "w",
      "notes": [
        "Bring the king toward the centre when checks and tactics allow. Kings become useful attackers in simplified positions. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-passed-pawn",
      "title": "Advance a supported passed pawn",
      "summary": "Advance a supported passed pawn.",
      "concept": "The king on e5 supports d6, bringing the passed d-pawn closer to promotion. Check blockade squares and enemy king routes before pushing. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/8/8/3PK3/8/8/8/8 w - - 0 1",
      "moves": [
        "d5d6"
      ],
      "side": "w",
      "notes": [
        "The king on e5 supports d6, bringing the passed d-pawn closer to promotion. Check blockade squares and enemy king routes before pushing. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-pawn-structure",
      "title": "Recapture toward the centre",
      "summary": "Recapture toward the centre.",
      "concept": "After ...Bxb3, axb3 replaces an outer pawn with a pawn nearer the centre and opens the a-file. Recapture direction depends on the actual position. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/8/8/8/8/1b6/PP6/6K1 w - - 0 1",
      "moves": [
        "a2b3"
      ],
      "side": "w",
      "notes": [
        "After ...Bxb3, axb3 replaces an outer pawn with a pawn nearer the centre and opens the a-file. Recapture direction depends on the actual position. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-bishop-activity",
      "title": "Free a restricted bishop",
      "summary": "Free a restricted bishop.",
      "concept": "e4 opens the c1-d2-e3-f4 diagonal for the bishop. A bishop’s usefulness depends on pawn placement and available targets. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/8/8/3p4/8/4P3/3P4/2B3K1 w - - 0 1",
      "moves": [
        "e3e4"
      ],
      "side": "w",
      "notes": [
        "e4 opens the c1-d2-e3-f4 diagonal for the bishop. A bishop’s usefulness depends on pawn placement and available targets. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-king-attack",
      "title": "Bring another piece into an attack",
      "summary": "Bring another piece into an attack.",
      "concept": "Qh5 adds pressure to h7 alongside the bishop on d3. Coordinate attackers and calculate defensive resources rather than assuming an attack must work. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/6pp/8/8/8/3B4/8/3Q2K1 w - - 0 1",
      "moves": [
        "d1h5"
      ],
      "side": "w",
      "notes": [
        "Qh5 adds pressure to h7 alongside the bishop on d3. Coordinate attackers and calculate defensive resources rather than assuming an attack must work. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-trade-active-piece",
      "title": "Trade an active enemy piece",
      "summary": "Trade an active enemy piece.",
      "concept": "Exchange Black’s centralized knight on d5 with the bishop on c4. Consider the resulting pawn structure and remaining pieces before every exchange. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/8/4p3/3n4/2B5/8/8/6K1 w - - 0 1",
      "moves": [
        "c4d5"
      ],
      "side": "w",
      "notes": [
        "Exchange Black’s centralized knight on d5 with the bishop on c4. Consider the resulting pawn structure and remaining pieces before every exchange. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-maximum-usefulness",
      "title": "Choose a move that does several jobs",
      "summary": "Choose a move that does several jobs.",
      "concept": "Nf3 develops a piece, controls d4 and e5, and helps prepare castling. A useful move can serve several priorities at once. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "g1f3"
      ],
      "side": "w",
      "notes": [
        "Nf3 develops a piece, controls d4 and e5, and helps prepare castling. A useful move can serve several priorities at once. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-vision-calculation-plan",
      "title": "Look, calculate, then make a plan",
      "summary": "Look, calculate, then make a plan.",
      "concept": "Scan checks, captures, threats and undefended pieces before planning. Here Nf3 develops safely and attacks e5; inspect Black’s replies before continuing. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
      "moves": [
        "g1f3"
      ],
      "side": "w",
      "notes": [
        "Scan checks, captures, threats and undefended pieces before planning. Here Nf3 develops safely and attacks e5; inspect Black’s replies before continuing. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-rook-behind-passer",
      "title": "Support a passed pawn from behind",
      "summary": "Support a passed pawn from behind.",
      "concept": "Ra1 places the rook behind the a5 pawn so it can support further advances from a distance. This guideline depends on king activity and concrete tactics. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/8/8/P7/8/8/8/3R2K1 w - - 0 1",
      "moves": [
        "d1a1"
      ],
      "side": "w",
      "notes": [
        "Ra1 places the rook behind the a5 pawn so it can support further advances from a distance. This guideline depends on king activity and concrete tactics. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-counterplay",
      "title": "Meet a wing plan with central counterplay",
      "summary": "Meet a wing plan with central counterplay.",
      "concept": "Challenge e4 with ...d5 rather than spending every move on passive defence. A central break may change which wing plans are feasible. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/8/3pp3/8/4P2P/8/8/6K1 b - - 0 1",
      "moves": [
        "d6d5"
      ],
      "side": "b",
      "notes": [
        "Challenge e4 with ...d5 rather than spending every move on passive defence. A central break may change which wing plans are feasible. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-flexibility",
      "title": "Keep flexible pawn options",
      "summary": "Keep flexible pawn options.",
      "concept": "Nf3 develops while leaving the central pawns free to advance one or two squares later. Avoid unnecessary commitments when useful developing moves exist. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "moves": [
        "g1f3"
      ],
      "side": "w",
      "notes": [
        "Nf3 develops while leaving the central pawns free to advance one or two squares later. Avoid unnecessary commitments when useful developing moves exist. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-tempo",
      "title": "Develop while attacking the queen",
      "summary": "Develop while attacking the queen.",
      "concept": "Nc3 develops the knight and attacks the queen on d5, making the opponent spend time responding. Check whether the queen has a forcing counterthreat. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "4k3/8/8/3q4/4P3/8/8/1N2K3 w - - 0 1",
      "moves": [
        "b1c3"
      ],
      "side": "w",
      "notes": [
        "Nc3 develops the knight and attacks the queen on d5, making the opponent spend time responding. Check whether the queen has a forcing counterthreat. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-simplification",
      "title": "Simplify with a material advantage",
      "summary": "Simplify with a material advantage.",
      "concept": "Trade rooks while retaining an extra rook. Exchanges can reduce counterplay, but always inspect the resulting ending rather than applying a rule blindly. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "r5k1/8/8/8/8/8/8/R3R1K1 w - - 0 1",
      "moves": [
        "a1a8"
      ],
      "side": "w",
      "notes": [
        "Trade rooks while retaining an extra rook. Exchanges can reduce counterplay, but always inspect the resulting ending rather than applying a rule blindly. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-reposition",
      "title": "Give a piece a new job",
      "summary": "Give a piece a new job.",
      "concept": "Bring the bishop to d3 to support central play and look toward the kingside. Reassess a piece’s purpose after the structure changes. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "6k1/8/3p4/8/4P3/8/8/1B4K1 w - - 0 1",
      "moves": [
        "b1d3"
      ],
      "side": "w",
      "notes": [
        "Bring the bishop to d3 to support central play and look toward the kingside. Reassess a piece’s purpose after the structure changes. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-colour-complex",
      "title": "Use squares the enemy bishop cannot contest",
      "summary": "Use squares the enemy bishop cannot contest.",
      "concept": "The white bishop moves to d5 on the light squares while the black bishop on g7 operates on dark squares. Opposite-coloured bishops may favour attacks with other pieces but often draw in simplified endings. This is an illustrative plan; other moves may also be reasonable.",
      "fen": "7k/6b1/8/8/2B5/8/8/6K1 w - - 0 1",
      "moves": [
        "c4d5"
      ],
      "side": "w",
      "notes": [
        "The white bishop moves to d5 on the light squares while the black bishop on g7 operates on dark squares. Opposite-coloured bishops may favour attacks with other pieces but often draw in simplified endings. This is an illustrative plan; other moves may also be reasonable."
      ]
    },
    {
      "id": "strategy-kingside-castle-h-pawn",
      "title": "Attack a kingside castle with the h-pawn",
      "summary": "Use a stable centre to bring the h-pawn toward the shelter.",
      "concept": "Against the regular f7-g7-h7 shelter, h5 gains contact distance for h6 or a later opening of the h-file. White’s king is on the opposite wing and the d/e pawn chains are locked. Count defenders and check central breaks before committing. This is an illustrative intended plan, not a uniquely best move.",
      "fen": "5rk1/5ppp/4p3/3pP3/3P3P/3B4/3Q4/2K4R w - - 0 1",
      "moves": [
        "h4h5"
      ],
      "side": "w",
      "notes": [
        "Against the regular f7-g7-h7 shelter, h5 gains contact distance for h6 or a later opening of the h-file. White’s king is on the opposite wing and the d/e pawn chains are locked. Count defenders and check central breaks before committing. This is an illustrative intended plan, not a uniquely best move."
      ]
    },
    {
      "id": "strategy-queenside-castle-pawns",
      "title": "Attack a queenside castle with a- and b-pawns",
      "summary": "Bring queenside pawns toward the a7-b7-c7 shelter.",
      "concept": "a5 gains space toward Black’s queenside castle and is supported by b4. A later a6 or b5 may create contact and open files; the choice depends on Black’s reply. White’s king is on g1 and the centre is fixed. This is an illustrative intended plan, not a uniquely best move.",
      "fen": "2kr4/ppp5/4p3/3pP3/PP1P4/8/8/3Q1RK1 w - - 0 1",
      "moves": [
        "a4a5"
      ],
      "side": "w",
      "notes": [
        "a5 gains space toward Black’s queenside castle and is supported by b4. A later a6 or b5 may create contact and open files; the choice depends on Black’s reply. White’s king is on g1 and the centre is fixed. This is an illustrative intended plan, not a uniquely best move."
      ]
    },
    {
      "id": "strategy-fianchetto-h-file",
      "title": "Attack a fianchetto on the h-file",
      "summary": "Create contact with the g6 pawn before opening lines.",
      "concept": "Against ...g6 and ...Bg7, h5 threatens hxg6 and can encourage ...gxh5, when the h-rook may recapture along the h-file. The fianchetto bishop remains a defender: calculate its diagonal and Black’s central counterplay rather than assuming the file opens by force. This is an illustrative intended plan, not a uniquely best move.",
      "fen": "5rk1/6bp/4p1p1/3pP3/3P3P/3B4/3Q4/2K4R w - - 0 1",
      "moves": [
        "h4h5"
      ],
      "side": "w",
      "notes": [
        "Against ...g6 and ...Bg7, h5 threatens hxg6 and can encourage ...gxh5, when the h-rook may recapture along the h-file. The fianchetto bishop remains a defender: calculate its diagonal and Black’s central counterplay rather than assuming the file opens by force. This is an illustrative intended plan, not a uniquely best move."
      ]
    },
    {
      "id": "strategy-remove-knight-shield",
      "title": "Exchange the knight shielding the king",
      "summary": "Remove a defender before increasing king pressure.",
      "concept": "Bxf6 exchanges the bishop for the knight that shields the castled king and defends h7. If Black chooses ...gxf6, the pawn shelter changes and the g-file opens; the rook on f8 cannot recapture through its own f7 pawn. Inspect the resulting pawn structure before choosing this plan. This is an illustrative intended plan, not a uniquely best move.",
      "fen": "5rk1/5ppp/5n2/6B1/8/8/8/3Q2K1 w - - 0 1",
      "moves": [
        "g5f6"
      ],
      "side": "w",
      "notes": [
        "Bxf6 exchanges the bishop for the knight that shields the castled king and defends h7. If Black chooses ...gxf6, the pawn shelter changes and the g-file opens; the rook on f8 cannot recapture through its own f7 pawn. Inspect the resulting pawn structure before choosing this plan. This is an illustrative intended plan, not a uniquely best move."
      ]
    },
    {
      "id": "strategy-rook-file-bishop-diagonal",
      "title": "Coordinate an open file and a bishop diagonal",
      "summary": "Combine rook pressure with control of king escape squares.",
      "concept": "Rg1+ occupies the open g-file against the king on g8 while Bd3 bears on h7. The rook’s file and bishop’s diagonal attack different parts of the shelter. Black has defensive replies, so this is coordination practice rather than a forced-mate claim. This is an illustrative intended plan, not a uniquely best move.",
      "fen": "5rk1/5p1p/8/8/8/3B4/3Q4/2K4R w - - 0 1",
      "moves": [
        "h1g1"
      ],
      "side": "w",
      "notes": [
        "Rg1+ occupies the open g-file against the king on g8 while Bd3 bears on h7. The rook’s file and bishop’s diagonal attack different parts of the shelter. Black has defensive replies, so this is coordination practice rather than a forced-mate claim. This is an illustrative intended plan, not a uniquely best move."
      ]
    },
    {
      "id": "strategy-stabilize-before-flank",
      "title": "Stabilize the centre before flank play",
      "summary": "Close the centre before considering a slow pawn storm.",
      "concept": "e5 locks the e-pawns against ...e6 alongside the d4/d5 pair. That reduces immediate central exchanges and may provide time for a wing plan. The centre is not permanently secure: continue checking breaks such as ...c5 and ...f6. This is an illustrative intended plan, not a uniquely best move.",
      "fen": "5rk1/2p2ppp/4p3/3p4/3PP3/8/3Q3P/2K4R w - - 0 1",
      "moves": [
        "e4e5"
      ],
      "side": "w",
      "notes": [
        "e5 locks the e-pawns against ...e6 alongside the d4/d5 pair. That reduces immediate central exchanges and may provide time for a wing plan. The centre is not permanently secure: continue checking breaks such as ...c5 and ...f6. This is an illustrative intended plan, not a uniquely best move."
      ]
    },
    {
      "id": "strategy-two-front-switch",
      "title": "Switch fronts to create a second weakness",
      "summary": "Use a queen transfer to change the point of pressure.",
      "concept": "Qa4 switches attention toward the a7 pawn from an attack near h5. The queen still keeps access to the fourth rank, and the rook on h1 retains kingside influence. Make the defender cover two fronts and reassess rather than forcing an uncertain first attack. This is an illustrative intended plan, not a uniquely best move.",
      "fen": "5rk1/pp4pp/4p3/3pP3/7Q/3P4/PP6/6KR w - - 0 1",
      "moves": [
        "h4a4"
      ],
      "side": "w",
      "notes": [
        "Qa4 switches attention toward the a7 pawn from an attack near h5. The queen still keeps access to the fourth rank, and the rook on h1 retains kingside influence. Make the defender cover two fronts and reassess rather than forcing an uncertain first attack. This is an illustrative intended plan, not a uniquely best move."
      ]
    },
    {
      "id": "strategy-lockdown",
      "title": "Lock down a counterplay square",
      "summary": "Use a supported knight to restrict a planned pawn break.",
      "concept": "Nd3, supported by c2, controls c5 and e5. With Black’s c-pawn still on c7, c5 is now an attacked destination for its two-square break. The break may still work tactically, so restriction means reducing useful options, not forbidding every legal move. This is an illustrative intended plan, not a uniquely best move.",
      "fen": "6k1/2p5/4p3/3pP3/3P4/8/2P5/4N1K1 w - - 0 1",
      "moves": [
        "e1d3"
      ],
      "side": "w",
      "notes": [
        "Nd3, supported by c2, controls c5 and e5. With Black’s c-pawn still on c7, c5 is now an attacked destination for its two-square break. The break may still work tactically, so restriction means reducing useful options, not forbidding every legal move. This is an illustrative intended plan, not a uniquely best move."
      ]
    }
  ]
};
