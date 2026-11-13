import json
from pathlib import Path
import tempfile
import unittest
import expand_policy as expansion
from test_generate import g,synthetic


class PolicyExpansionTest(unittest.TestCase):
    def test_preserves_entries_resumes_and_reaches_deep_positions(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            store=g.Store(root/'checkpoint.sqlite3',{'test':True})
            g.generate(store,synthetic,16000,stop_after=35)
            before=dict(store.db.execute('SELECT key,policy FROM positions'))
            g.export(store,root/'before.bin')
            initial=sum(len(json.loads(p)) for p in before.values())
            config=expansion.prepare(store,(initial+18000)*16,{'complete':True})
            self.assertFalse(expansion.expand(store,synthetic,config,stop_after=12))
            store.db.close()
            store=g.Store(root/'checkpoint.sqlite3',{'test':True})
            config=expansion.prepare(store,(initial+18000)*16,{'complete':False})
            self.assertTrue(expansion.expand(store,synthetic,config))
            after=dict(store.db.execute('SELECT key,policy FROM positions'))
            self.assertTrue(set(before).issubset(after))
            for key,policy in before.items():self.assertEqual(policy,after[key])
            self.assertGreater(store.db.execute('SELECT COUNT(*) FROM policy_added WHERE ply=16').fetchone()[0],0)
            self.assertLessEqual(store.db.execute('SELECT MAX(ply) FROM policy_frontier').fetchone()[0],16)
            report=g.export(store,root/'expanded.bin')
            self.assertLessEqual(report['bytes'],config['max_bytes'])
            from verify_preserved import verify
            self.assertEqual(verify(root/'before.bin',root/'expanded.bin',config['max_bytes'])['existing_positions_preserved'],len(before))
            with self.assertRaises(ValueError):expansion.prepare(store,config['max_bytes']+16,{})
            with self.assertRaises(ValueError):expansion.new_round(store,{'complete':False})
            prior={'complete':True,'policy_expansion':{'preservation_verification':{'existing_positions_preserved':len(before)}}}
            expansion.new_round(store,prior)
            second=expansion.prepare(store,config['max_bytes']+64000,prior,deep_weight=8)
            self.assertEqual(second['depth_weights'][16],8)
            self.assertEqual(second['initial_entries'],report['entries'])
            self.assertTrue(expansion.expand(store,synthetic,second))
            for key,policy in after.items():
                self.assertEqual(store.db.execute('SELECT policy FROM positions WHERE key=?',(key,)).fetchone()[0],policy)
            self.assertEqual(store.db.execute("SELECT COUNT(*) FROM metadata WHERE key LIKE 'policy_expansion_archive_%'").fetchone()[0],1)


if __name__=='__main__':unittest.main()
