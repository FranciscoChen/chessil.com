"""Browser reader parity against python-chess, including en passant and special moves."""
import json
from pathlib import Path
import random
import struct
import subprocess
import tempfile
import unittest
import chess
import chess.polyglot
from test_generate import g


class ReaderTest(unittest.TestCase):
    def test_hash_and_move_parity(self):
        rng = random.Random(7)
        boards = [chess.Board()]
        for _ in range(50):
            board = chess.Board()
            for _ in range(rng.randrange(1, 65)):
                if board.is_game_over():
                    break
                board.push(rng.choice(list(board.legal_moves)))
            boards.append(board)
        boards += [chess.Board(fen) for fen in [
            'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
            'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1',
            '7k/P7/8/8/8/8/8/7K w - - 0 1',
            '7k/8/8/8/8/8/p7/7K b - - 0 1',
            '4k3/8/8/8/8/8/8/4R2K w - - 0 1']]
        records = []
        fixtures = []
        for board in boards:
            key = chess.polyglot.zobrist_hash(board)
            fixtures.append({'fen': board.fen(en_passant='fen'), 'hash': str(key), 'moves': sorted(move.uci() for move in board.legal_moves)})
            records += [(key, g.raw_move(board, move), 1) for move in board.legal_moves]
        records = sorted(set(records))
        with tempfile.TemporaryDirectory() as folder:
            binary = Path(folder) / 'book.bin'
            binary.write_bytes(b''.join(struct.pack('>QHHI', key, move, weight, 0) for key, move, weight in records))
            source = Path(__file__).parent
            script = (source / 'polyglot-random.js').read_text() + (source / 'polyglot.js').read_text() + '''
const fs=require('fs'),assert=require('assert');
const fixture=JSON.parse(fs.readFileSync(0,'utf8')),bytes=fs.readFileSync(process.argv[1]);
const book=new ChessilPolyglotBook(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
for(const item of fixture){assert.equal(String(ChessilPolyglotBook.hash(item.fen)),item.hash);assert.deepEqual(book.lookup(item.fen,16).map(x=>x.uci).sort(),item.moves);assert.deepEqual(book.lookup(item.fen,17),[]);}
'''
            subprocess.run(['node', '-e', script, str(binary)], input=json.dumps(fixtures), text=True, check=True)


if __name__ == '__main__':
    unittest.main()
