import io
import json
from pathlib import Path
import sqlite3
import tempfile
import types
import unittest
from unittest.mock import patch
import chess.pgn
import human_coverage as human
from test_generate import g, synthetic


class HumanCoverageTest(unittest.TestCase):
    def test_real_pgn_opening_and_rating_groups(self):
        text = '[WhiteElo "1200"]\n[BlackElo "1400"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 *\n'
        headers, moves = chess.pgn.read_game(io.StringIO(text), Visitor=human.Opening)
        self.assertEqual(len(moves), 17)
        self.assertEqual(moves[-1], 'h2h3')
        self.assertEqual(human.cohort(headers), 'below1600')
        self.assertEqual(human.cohort({'WhiteElo':'1800','BlackElo':'1900'}), '1600to2199')
        self.assertEqual(human.cohort({'WhiteElo':'2400','BlackElo':'2500'}), '2200plus')
        self.assertIsNone(human.cohort({'WhiteElo':'1000','BlackElo':'1200','WhiteTitle':'BOT'}))

    def test_frequency_adds_positions_without_replacing_policy(self):
        with tempfile.TemporaryDirectory() as folder:
            work = Path(folder)
            output = work / 'book.bin'
            store = g.Store(work/'checkpoint.sqlite3', {'backend':'synthetic','backend_options':''})
            g.generate(store, synthetic, 16000, stop_after=1)
            report = g.export(store, output)
            report['complete'] = True
            output.with_suffix('.json').write_text(json.dumps(report))
            old = set(store.db.execute('SELECT key FROM positions'))
            frequencies = sqlite3.connect(':memory:')
            frequencies.executescript('CREATE TABLE months(month,games,accepted,complete,first_utc,last_utc);CREATE TABLE frequency(cohort,path,n);')
            frequencies.executemany('INSERT INTO frequency VALUES (?,?,?)', [('below1600','',100),('below1600','e2e4',60),('below1600','e2e4 e7e5',40)])
            args = types.SimpleNamespace(work=work, output=output, weights=work/'unused', min_games=10)
            with patch.object(human, 'NativePolicy', return_value=synthetic):
                human.augment(args, frequencies)
            self.assertTrue(old.issubset(set(store.db.execute('SELECT key FROM positions'))))
            self.assertEqual(store.db.execute('SELECT COUNT(*) FROM positions').fetchone()[0], 3)
            self.assertEqual(json.loads(store.db.execute("SELECT policy FROM positions WHERE ply=2").fetchone()[0]), synthetic('e2e4 e7e5'))
            self.assertGreater(output.stat().st_size, report['bytes'])


if __name__ == '__main__':
    unittest.main()
