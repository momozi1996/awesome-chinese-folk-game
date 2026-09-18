"""Loopback-first static game server. Private sources/backups are not web-served."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import webbrowser
from .paths import ROOT, FORUM
from src.folk_parser.library import compile_library, load_library

class GameHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        parts=Path(unquote(urlsplit(path).path).lstrip('/')).parts
        denied=FORUM/'__not_public__'
        if any(p.startswith('.') or p=='..' for p in parts): return str(denied)
        if not parts: return str(FORUM/'index.html')
        route='/'.join(parts)
        shared={'case_engine/engine.js':ROOT/'src/case_engine/engine.js',
                'utils/config.js':ROOT/'src/utils/config.js'}
        if route in shared: return str(shared[route])
        if parts[0] not in {'index.html','app.js','data.js','style.css','immersion.css','soundscape.js','assets'}: return str(denied)
        candidate=(FORUM/route).resolve()
        if FORUM.resolve() not in candidate.parents: return str(denied)
        return str(candidate)
    def list_directory(self,path):
        self.send_error(404,'Directory listing disabled')
        return None
    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()

def main(argv=None):
    parser=argparse.ArgumentParser(description='未明旧案柜 · local offline forum game')
    parser.add_argument('--host',default='127.0.0.1')
    parser.add_argument('--port',type=int,default=4173)
    parser.add_argument('--no-browser',action='store_true')
    parser.add_argument('--check',action='store_true',help='validate content and exit without serving')
    args=parser.parse_args(argv)
    if not 1<=args.port<=65535: parser.error('port must be 1–65535')
    try: entries,cases=load_library() if args.check else compile_library()
    except (ValueError,KeyError,TypeError,OSError) as e: parser.exit(1,f'Content error: {e}\n')
    print(f'内容校验通过：{len(cases)} 个可玩案卷 / {sum(e["kind"]=="theme" for e in entries)} 个待开发主题',flush=True)
    if args.check: return
    try: server=ThreadingHTTPServer((args.host,args.port),GameHandler)
    except OSError as e: parser.exit(1,f'无法启动 {args.host}:{args.port}：{e}\n请关闭占用端口的程序，或使用 --port 4174。不同端口的浏览器存档不互通。\n')
    url=f'http://{args.host}:{args.port}/'
    print(f'游戏地址：{url}\n按 Ctrl+C 停止。存档只在浏览器本地；换地址前请导出。',flush=True)
    if not args.no_browser: webbrowser.open(url)
    try: server.serve_forever()
    except KeyboardInterrupt: print('\n已停止。')
    finally: server.server_close()
