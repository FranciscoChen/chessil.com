"""Build the website's paired development starts from the project's Polyglot book.

Usage: python development-openings.py book.bin match-directory [match-directory ...]
Requires python-chess. Writes eight-ply UCI prefixes to stdout.
"""
import csv
import random
import sys
from pathlib import Path

import chess
import chess.polyglot

rng = random.Random(62572026)
excluded = set()
prefixes = set()
for directory in sys.argv[2:]:
    for path in Path(directory).rglob("*.csv"):
        with path.open(errors="replace") as source:
            rows = csv.DictReader(source)
            if "opening_uci" in (rows.fieldnames or []):
                prefixes.update(row["opening_uci"] for row in rows if row.get("opening_uci"))

def key(board):
    return " ".join(board.fen().split()[:4])

for line in prefixes:
    board = chess.Board()
    for ply, move in enumerate(line.split(), 1):
        board.push_uci(move)
        if ply == 8:
            excluded.add(key(board))
            break

with chess.polyglot.open_reader(sys.argv[1]) as book:
    kept = 0
    while kept < 4096:
        board = chess.Board()
        for _ in range(8):
            entries = list(book.find_all(board))
            if not entries:
                break
            # Flatten the priors slightly to include less common sound openings.
            board.push(rng.choices(entries, weights=[e.weight ** 0.65 for e in entries])[0].move)
        position = key(board)
        if board.ply() == 8 and not board.is_game_over() and position not in excluded:
            excluded.add(position)
            print(" ".join(move.uci() for move in board.move_stack))
            kept += 1
