from pathlib import Path
import unittest
from tools.package_release import include_path

class PackagingPolicyTests(unittest.TestCase):
    def test_private_history_and_generated_excluded(self):
        for name in ['releases/frozen.zip','src/forum_system/research/steam.json',
                     'src/forum_system/backups/original.zip','src/forum_system/.DS_Store',
                     'src/forum_system/art/source/latest-set.blend1',
                     'src/forum_system/tests/audio-debug.cjs',
                     'src/forum_system/tests/v4-save-fixture.json',
                     'src/forum_system/tests/screenshots-v5/snow-scene.png',
                     'src/forum_system/tests/validation.log','FREEZE-MANIFEST.json',
                     '.env','src/forum_system/node_modules/playwright/package.json']:
            with self.subTest(path=name): self.assertFalse(include_path(Path(name)))
    def test_required_sources_and_showcase_included(self):
        for name in ['.gitignore','main.py','demo/run_demo.py','src/forum_system/data.js',
                     'src/forum_system/soundscape.js','src/forum_system/art/source/latest-set.blend',
                     'src/forum_system/assets/scenes/lamp.jpg','assets/screenshots/forum-home.png',
                     'cases/catalog.json','cases/exclusive-folk-cases/soul-lamp.md',
                     'cases/playable/lantern/case.json','tests/test_packaging.py']:
            with self.subTest(path=name): self.assertTrue(include_path(Path(name)))

if __name__=='__main__': unittest.main()
