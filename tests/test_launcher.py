import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import urlopen
from http.server import ThreadingHTTPServer
from src.utils.paths import ROOT
from src.utils.server import GameHandler

class QuietHandler(GameHandler):
    def log_message(self,*args): pass

class LauncherTests(unittest.TestCase):
    def test_any_working_directory(self):
        with tempfile.TemporaryDirectory() as d:
            for entry in ['main.py','demo/run_demo.py']:
                result=subprocess.run([sys.executable,str(ROOT/entry),'--check'],cwd=d,capture_output=True,text=True)
                self.assertEqual(result.returncode,0,result.stderr)
                self.assertIn('58',result.stdout);self.assertIn('9',result.stdout)
    def test_web_routes(self):
        server=ThreadingHTTPServer(('127.0.0.1',0),QuietHandler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        base=f'http://127.0.0.1:{server.server_port}'
        try:
            for path in ['/','/data.js','/immersion.css','/soundscape.js','/assets/textures/paper-fibers.webp','/assets/textures/archive-cloth.webp','/case_engine/engine.js','/utils/config.js','/assets/scenes/lamp.jpg','/presentation/cinematic.css','/presentation/cinematic.js','/presentation/inspector.js','/vendor/three.module.js','/assets/scenes-v6/hall.jpg']:
                with urlopen(base+path) as r:
                    self.assertEqual(r.status,200,path); r.read()
            for path in ['/backups/migration-v4-cases.json','/research/steam.json','/assets/','/../README.md','/%2e%2e/README.md','/cases/catalog.json']:
                with self.assertRaises(HTTPError) as error: urlopen(base+path)
                self.assertEqual(error.exception.code,404,path)
        finally: server.shutdown();server.server_close();thread.join()
    def test_port_collision(self):
        server=ThreadingHTTPServer(('127.0.0.1',0),QuietHandler)
        try:
            result=subprocess.run([sys.executable,str(ROOT/'main.py'),'--no-browser','--port',str(server.server_port)],capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0);self.assertIn('--port 4174',result.stderr)
        finally: server.server_close()

if __name__=='__main__': unittest.main()
