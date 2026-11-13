import json
import sqlite3
import unittest
import chess
import chess.polyglot
from coverage import measure


class ConditionalCoverageTest(unittest.TestCase):
    def test_reports_parent_probability_and_excludes_intentional_ply17(self):
        database=sqlite3.connect(':memory:')
        database.execute('CREATE TABLE positions(key,fen,policy,ply)')
        board=chess.Board()
        for move in 'd2d4 g8f6 c2c4 e7e6 g1f3 d7d5 b1c3'.split():board.push_uci(move)
        fen=' '.join(board.fen(en_passant='xfen').split()[:4])
        database.execute('INSERT INTO positions VALUES (?,?,?,?)',(f'{chess.polyglot.zobrist_hash(board):016x}',fen,json.dumps({'f8b4':0.168}),7))
        row=measure(database)['depths'][7]
        self.assertEqual(row['highest_missing_parent_probability'],0.168)
        self.assertEqual(row['example']['san'],'Bb4')
        self.assertEqual(row['example']['resulting_ply'],8)
        board.push_uci('f8b4')
        database.execute('INSERT INTO positions VALUES (?,?,?,?)',(f'{chess.polyglot.zobrist_hash(board):016x}',' '.join(board.fen(en_passant='xfen').split()[:4]),json.dumps({'c1g5':1}),16))
        row=measure(database)['depths'][7]
        self.assertIsNone(row['highest_missing_parent_probability'])
        self.assertEqual(sum(row['missing_resulting_positions'] for row in measure(database)['depths']),0)


if __name__=='__main__':unittest.main()
