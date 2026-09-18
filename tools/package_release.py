"""Reproducible source + offline demo archive. Never overwrite a different baseline."""
from pathlib import Path
import argparse
import hashlib
import json
import posixpath
import re
import sys
import tempfile
import zipfile
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from src.folk_parser.library import compile_library

EXCLUDE={'releases','backups','research','node_modules','.git','__pycache__','.venv'}
PREFIX='awesome-chinese-folk-game/'
MANIFEST='FREEZE-MANIFEST.json'

def include_path(rel):
    """Shared policy for packaging and per-file audit; rel is repository-relative."""
    if any(x in EXCLUDE for x in rel.parts): return False
    if any(x.startswith('.') and x!='.gitignore' for x in rel.parts): return False
    if 'tests' in rel.parts and any(x.startswith('screenshots') for x in rel.parts): return False
    if rel.name.endswith(('.pyc','.blend1','-fixture.json','.log','-results.json')): return False
    # The payload manifest is generated in the ZIP, never recursively hashed.
    if rel.as_posix()==MANIFEST: return False
    # Historical autoplay probe, not part of the maintained automated test suite.
    if rel.as_posix()=='src/forum_system/tests/audio-debug.cjs': return False
    return True

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',default='releases/awesome-chinese-folk-game-v5.0.zip',help='repository-relative new ZIP path; existing differing archives are protected')
    args=parser.parse_args(argv)
    out=(ROOT/args.output).resolve()
    if ROOT/'releases' not in out.parents or out.suffix!='.zip': parser.error('output must be a .zip inside releases/')
    compile_library();out.parent.mkdir(parents=True,exist_ok=True)
    payload=[]
    for p in sorted(ROOT.rglob('*')):
        rel=p.relative_to(ROOT)
        if not include_path(rel): continue
        if p.is_symlink(): raise ValueError(f'Symlinks cannot enter release: {rel}')
        if p.is_file(): payload.append((rel.as_posix(),p.read_bytes(),0o100755 if p.suffix=='.command' else 0o100644))
    manifest={'schemaVersion':1,'baseline':'V5.0 / freeze audit 2026-09-18','algorithm':'SHA-256',
        'scope':'Every payload file except this manifest; archive checksum is stored in the external .sha256 sidecar.',
        'files':[{'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'mode':oct(mode)} for name,data,mode in payload]}
    payload.append((MANIFEST,(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode(),0o100644))
    with tempfile.NamedTemporaryFile(dir=out.parent,suffix='.zip.tmp',delete=False) as f: temp=Path(f.name)
    try:
        with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
            for name,data,mode in sorted(payload):
                info=zipfile.ZipInfo(PREFIX+name,date_time=(2026,9,18,0,0,0))
                info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=mode<<16
                z.writestr(info,data)
        with zipfile.ZipFile(temp) as z:
            assert z.testzip() is None
            files=set(z.namelist());htmlbase=PREFIX+'src/forum_system/'
            for src in re.findall(r'(?:src|href)="([^"]+)"',z.read(htmlbase+'index.html').decode()):
                if not src.startswith('#'): assert posixpath.normpath(htmlbase+src) in files,src
            for name in ['soundscape.js','immersion.css']: assert htmlbase+name in files
            assert len([x for x in files if '/assets/textures/' in x and x.endswith('.webp')])==2
            assert len([x for x in files if '/assets/scenes/' in x and x.endswith('.jpg')])==12
            assert len([x for x in files if '/cases/classic-folk-cases/' in x and x.endswith('.md')])==28
            assert len([x for x in files if '/cases/exclusive-folk-cases/' in x and x.endswith('.md')])==30
            assert not any('/research/' in x or '/backups/' in x or '-fixture.json' in x for x in files)
        sha=hashlib.sha256(temp.read_bytes()).hexdigest()
        if out.exists():
            if hashlib.sha256(out.read_bytes()).hexdigest()!=sha:
                raise FileExistsError(f'Existing baseline differs; not overwritten. Choose a new --output: {out.name}')
        else: temp.replace(out)
        out.with_suffix('.zip.sha256').write_text(sha+'  '+out.name+'\n',encoding='utf-8')
        print(f'{out}\n{out.stat().st_size/1024/1024:.2f} MiB / {len(files)} files / SHA256 {sha}')
    finally: temp.unlink(missing_ok=True)
if __name__=='__main__': main()
