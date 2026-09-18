"""Read-only, per-file pre-freeze audit. Optional dev tools: Pillow, ffmpeg, zstd.
Never executes archived scripts. JSON report contains paths/hashes, not matched secrets.
The report itself is excluded to avoid self-reference; rerun after all edits/tests.
"""
import argparse
import ast
from collections import Counter
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import unicodedata
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET
import zipfile

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from tools.package_release import include_path
from src.folk_parser.library import load_library

TEXT={'.py','.js','.cjs','.css','.html','.md','.json','.txt','.command','.log','.sha256','.svg'}
IMAGES={'.png','.jpg','.jpeg','.webp','.gif'}
HISTORIC={'src/forum_system/TEST-REPORT.md','src/forum_system/DESIGN.md','docs/history/README-v4.md'}

def category(rel):
    if 'research' in rel.parts: return 'private-research'
    if 'backups' in rel.parts: return 'historical-backup'
    if rel.parts[0]=='releases': return 'local-release-and-audit'
    if not include_path(rel): return 'local-generated-or-debug'
    if rel.as_posix() in HISTORIC or rel.name.startswith('preview'): return 'published-history'
    return 'published-source-content-assets'

def unique_json(pairs):
    d={}
    for k,v in pairs:
        if k in d: raise ValueError('duplicate JSON key')
        d[k]=v
    return d

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',default='releases/freeze-v5.0-20260918-inventory.json')
    args=parser.parse_args(argv);output=(ROOT/args.output).resolve()
    if ROOT/'releases' not in output.parents: parser.error('keep audit output under releases/')
    records=[];collisions={};global_errors=[]
    for p in sorted(ROOT.rglob('*')):
        if p.resolve()==output or not (p.is_file() or p.is_symlink()): continue
        rel=p.relative_to(ROOT);name=rel.as_posix();published=include_path(rel)
        record={'path':name,'category':category(rel),'in_payload':published,'checks':[],'findings':[]}
        records.append(record)
        def check(label,fn):
            try: fn();record['checks'].append(label)
            except Exception as e: record['findings'].append(f'{label}: {type(e).__name__}: {str(e)[:180]}')
        if p.is_symlink():
            record['findings'].append('symlink: not followed');continue
        data=p.read_bytes();record.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
        key=unicodedata.normalize('NFC',name).casefold()
        if key in collisions: record['findings'].append('case/unicode filename collision: '+collisions[key])
        collisions[key]=name
        if not data and p.name!='__init__.py': record['findings'].append('empty file')
        text=None
        if p.suffix in TEXT or p.name=='.gitignore':
            try: text=data.decode('utf8');record['checks'].append('UTF-8')
            except UnicodeError: record['findings'].append('UTF-8 decode failed')
        if text is not None:
            # Never print matched values; only line numbers. Findings need human review.
            patterns={'merge-conflict':r'^(?:<{7}|>{7}) ',
                'possible-secret':r'(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)',
                'machine-home-path':r'/(?:Users|home)/[A-Za-z0-9_.-]+/'}
            for label,pattern in patterns.items():
                for m in re.finditer(pattern,text,re.M):
                    record['findings'].append(f'{label}: line {text[:m.start()].count(chr(10))+1} (value omitted)')
            record['checks'].append('conflict/credential/home-path pattern scan')
        if p.suffix=='.json': check('JSON (unique keys)',lambda:json.loads(text,object_pairs_hook=unique_json))
        if p.suffix=='.py': check('Python AST',lambda:ast.parse(text,filename=name))
        if p.suffix in {'.js','.cjs'}:
            def syntax():
                r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
                if r.returncode: raise ValueError('node syntax check failed')
            check('JavaScript syntax (not executed)',syntax)
        if p.suffix=='.command':
            def shell():
                r=subprocess.run(['zsh','-n',str(p)],capture_output=True)
                if r.returncode: raise ValueError('zsh syntax check failed')
            check('zsh syntax (not executed)',shell)
        if p.suffix=='.svg':
            def svg():
                tree=ET.fromstring(data)
                if not tree.tag.endswith('svg'): raise ValueError('not SVG')
            check('SVG XML',svg)
        if p.suffix in IMAGES:
            def image():
                from PIL import Image
                with Image.open(p) as im:
                    record['image']={'size':list(im.size),'format':im.format,'frames':getattr(im,'n_frames',1)}
                    for i in range(record['image']['frames']): im.seek(i);im.load()
                if '/assets/scenes/' in name and record['image']['size']!=[1920,1200]: raise ValueError('scene size mismatch')
                if '/assets/textures/' in name and record['image']['size']!=[512,512]: raise ValueError('texture size mismatch')
            check('image decode (all animation frames)',image)
        if p.suffix in {'.mp3','.wav'}:
            def audio():
                info=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',str(p)],check=True,capture_output=True,text=True)
                record['audio']=json.loads(info.stdout)
                subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(p),'-f','null','-'],check=True,capture_output=True)
            check('audio metadata + full decode',audio)
        if p.suffix in {'.blend','.blend1'}:
            def blend():
                header=data
                if data[:4]==b'\x28\xb5\x2f\xfd':
                    header=subprocess.run(['zstd','-dc',str(p)],check=True,capture_output=True).stdout
                if not header.startswith(b'BLENDER'): raise ValueError('Blender header missing')
                record['blend']={'uncompressed_bytes':len(header),'header':header[:12].decode('ascii','replace')}
                if re.search(rb'/(?:Users|home)/[A-Za-z0-9_.-]+',header):
                    record['findings'].append('embedded machine-home-path in Blender metadata (value omitted)')
            check('Blender container/header (not rendered)',blend)
        if p.suffix=='.zip':
            def archive():
                with zipfile.ZipFile(p) as z:
                    if z.testzip() is not None: raise ValueError('CRC mismatch')
                    names=z.namelist()
                    if len(names)!=len(set(names)): raise ValueError('duplicate ZIP member')
                    for n in names:
                        if PurePosixPath(n).is_absolute() or '..' in PurePosixPath(n).parts or '\\' in n: raise ValueError('unsafe member path')
                    record['archive']={'entries':len(names),'uncompressed_bytes':sum(i.file_size for i in z.infolist())}
            check('ZIP all-member CRC + paths',archive)
        if p.suffix=='.sha256':
            def sidecar():
                digest,target=text.strip().split(maxsplit=1);target=target.lstrip('*')
                if hashlib.sha256((p.parent/target).read_bytes()).hexdigest()!=digest: raise ValueError('sidecar mismatch')
            check('SHA256 sidecar',sidecar)
        if published and text is not None and name not in HISTORIC:
            links=[]
            if p.suffix=='.md':
                prose=re.sub(r'```.*?```','',text,flags=re.S)
                links=re.findall(r'\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)',prose)
            elif p.suffix=='.html': links=re.findall(r'(?:src|href)="([^"]+)"',text)
            elif p.suffix=='.css':
                links=[next(v for v in groups if v) for groups in re.findall(r'url\(\s*(?:"([^"]*)"|\'([^\']*)\'|([^\)\s]+))\s*\)',text)]
            for url in links:
                parsed=urlsplit(url)
                if parsed.scheme or url.startswith(('#','//')): continue
                target=(p.parent/unquote(parsed.path)).resolve()
                if not target.exists(): record['findings'].append('missing local reference: '+url)
                elif target.is_file() and ROOT in target.parents and not include_path(target.relative_to(ROOT)):
                    # Reports may deliberately link to local-only evidence, clearly labelled.
                    record.setdefault('local_only_links',[]).append(url)
            if links: record['checks'].append('literal local document/style/HTML references')
    try:
        entries,cases=load_library()
        snapshot=ROOT/'src/forum_system/backups/migration-v4-cases.json'
        if snapshot.exists() and cases!=json.loads(snapshot.read_text()): global_errors.append('playable content differs from migration baseline')
        library={'playable':len(cases),'themes':sum(e['kind']=='theme' for e in entries),'status':'validated; gates, references, graph reachability, serial handoffs'}
    except Exception as e: global_errors.append(str(e));library={}
    blockers=[r['path'] for r in records if r['in_payload'] and r['findings']]
    report={'schemaVersion':1,'scope':'All regular files under project, excluding this generated inventory itself. Hash every file; typed validation where supported. Historical ZIP members CRC-checked, not executed or recursively audited. Pattern scan is not a security guarantee.',
        'selfExcluded':output.relative_to(ROOT).as_posix(),'summary':{'files':len(records),'bytes':sum(r.get('bytes',0) for r in records),'categories':dict(Counter(r['category'] for r in records)),
        'payloadFiles':sum(r['in_payload'] for r in records),'payloadFindings':blockers,'globalErrors':global_errors},'library':library,'files':records}
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(report['summary'],ensure_ascii=False,indent=2))
    for r in records:
        if r['findings']: print(r['path'],r['findings'])
    return 1 if blockers or global_errors else 0
if __name__=='__main__': sys.exit(main())
