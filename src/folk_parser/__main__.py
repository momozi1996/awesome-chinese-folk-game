import argparse
from .library import compile_library, load_library

def main():
    parser=argparse.ArgumentParser(description='Validate/build the local Markdown and playable JSON library')
    parser.add_argument('command',choices=['build','check','list'],default='check',nargs='?')
    args=parser.parse_args()
    try: entries,cases=compile_library() if args.command=='build' else load_library()
    except (ValueError,KeyError,TypeError,OSError) as e: parser.exit(1,f'Library error: {e}\n')
    if args.command=='list':
        for e in entries: print(f'{e["status"]:8} {e["id"]:26} {e["title"]}')
    print(f'OK: {len(cases)} playable cases; {sum(e["kind"]=="theme" for e in entries)} planned themes')
if __name__=='__main__': main()
