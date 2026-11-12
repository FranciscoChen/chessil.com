"""Protocol/coverage checks use deterministic synthetic priors, never production data."""
import importlib.util
import tempfile
from pathlib import Path
import unittest

import chess
import chess.polyglot

spec = importlib.util.spec_from_file_location('generator', Path(__file__).with_name('generate.py'))
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)


def synthetic(path):
    moves = sorted(move.uci() for move in g.board_for(path).legal_moves)
    weights = [1 / (i + 1) ** 2 for i in range(len(moves))]
    return dict(zip(moves, [value / sum(weights) for value in weights]))


class GeneratorTest(unittest.TestCase):
    def test_round_trip_includes_ply16_and_full_shallow_coverage(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            store = g.Store(base / 'resume.sqlite', {'test': True})
            self.assertFalse(g.generate(store, synthetic, 16000, stop_after=25))
            store.db.close()
            store = g.Store(base / 'resume.sqlite', {'test': True})
            self.assertTrue(g.generate(store, synthetic, 16000))
            report = g.export(store, base / 'book.bin')
            self.assertLessEqual(report['entries'], 16000)
            self.assertEqual((base / 'book.bin').stat().st_size, report['entries'] * 16)
            self.assertIn(16, report['positions_by_minimum_ply'])
            self.assertEqual(store.db.execute('SELECT MAX(ply) FROM tasks').fetchone()[0], 16)
            self.assertEqual(store.db.execute('SELECT COUNT(*) FROM tasks WHERE ply<=2 AND done!=1').fetchone()[0], 0)
            self.assertEqual(store.db.execute('SELECT COUNT(*) FROM positions WHERE ply<=2').fetchone()[0], 421)
            with self.assertRaises(ValueError):
                g.Store(base / 'resume.sqlite', {'test': False})

    def test_polyglot_special_moves(self):
        for fen, moves in [('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', ['e1g1', 'e1c1']),
                           ('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1', ['e8g8', 'e8c8']),
                           ('7k/P7/8/8/8/8/8/7K w - - 0 1', ['a7a8q', 'a7a8r', 'a7a8b', 'a7a8n'])]:
            board = chess.Board(fen)
            with tempfile.NamedTemporaryFile() as file:
                for uci in moves:
                    file.write(g.RECORD.pack(chess.polyglot.zobrist_hash(board), g.raw_move(board, chess.Move.from_uci(uci)), 1, 0))
                file.flush()
                with chess.polyglot.open_reader(file.name) as reader:
                    self.assertEqual({e.move.uci() for e in reader.find_all(board)}, set(moves))


if __name__ == '__main__':
    unittest.main()
