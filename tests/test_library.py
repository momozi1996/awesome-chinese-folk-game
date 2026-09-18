import json
import tempfile
import unittest
from pathlib import Path
from src.folk_parser.library import load_library, compile_library, read_markdown, validate_case
from src.utils.paths import ROOT, FORUM

class LibraryTests(unittest.TestCase):
    def test_counts_and_unique_titles(self):
        entries,cases=load_library()
        self.assertEqual(len(cases),9)
        themes=[e for e in entries if e['kind']=='theme']
        self.assertEqual(len(themes),58)
        self.assertEqual(len({e['title'] for e in themes}),58)
        self.assertEqual(sum(e['batch']=='classic-folk-cases' for e in themes),28)
        self.assertEqual(sum(e['batch']=='exclusive-folk-cases' for e in themes),30)
    def test_deterministic_build(self):
        outputs=[FORUM/'data.js',ROOT/'cases/catalog.json',ROOT/'docs/case_list.md']
        compile_library();first=[p.read_bytes() for p in outputs]
        compile_library();self.assertEqual(first,[p.read_bytes() for p in outputs])
    def test_playable_sources_roundtrip(self):
        _,cases=load_library()
        for c in cases.values():
            self.assertEqual(c,json.loads((ROOT/f'cases/playable/{c["id"]}/case.json').read_text()))
    def test_bad_frontmatter(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'bad.md'
            for text in ['no frontmatter','---\nid: one\nid: two\n---\n','---\nid: ../escape\ntitle: X\nkind: theme\nstatus: planned\n---\n']:
                p.write_text(text)
                with self.assertRaises(ValueError): read_markdown(p)
    def test_unsafe_source(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'playable/escape/case.md';p.parent.mkdir(parents=True)
            p.write_text('---\nid: escape\ntitle: X\nkind: playable\nstatus: playable\nsource: ../../../../secret.json\n---\n')
            with self.assertRaisesRegex(ValueError,'unsafe'): load_library(d)
    def test_graph_rejects_unknown_and_unreachable(self):
        _,cases=load_library()
        c=json.loads(json.dumps(cases['lamplife']))
        c['posts'][0]['requires']=['missing']
        with self.assertRaisesRegex(ValueError,'unknown'): validate_case(c,'fixture')
        c=json.loads(json.dumps(cases['lamplife']))
        c['posts'][0]['requires']=['signal']
        with self.assertRaisesRegex(ValueError,'unreachable'): validate_case(c,'fixture')
    def test_asset_escape(self):
        _,cases=load_library();c=dict(cases['lamplife'],art='../../README.md')
        with self.assertRaisesRegex(ValueError,'asset'): validate_case(c,'fixture')

if __name__=='__main__': unittest.main()
