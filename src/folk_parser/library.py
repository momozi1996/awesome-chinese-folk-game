"""Dependency-free Markdown catalog + normalized playable-case compiler.

Frontmatter deliberately supports only scalar `key: value` lines, not full YAML.
Markdown/JSON are trusted local authoring inputs; do not compile untrusted HTML.
"""
import json
import re
from pathlib import Path
from src.utils.paths import ROOT, CASES, FORUM

SECTIONS = ('民俗主题设定', '案发现场疑点', '关键破案线索', '侦探拼图过程', '最终反转', '开发校验')

def read_markdown(path):
    text = Path(path).read_text(encoding='utf-8')
    if not text.startswith('---\n') or '\n---\n' not in text[4:]:
        raise ValueError(f'{path}: missing frontmatter')
    head, body = text[4:].split('\n---\n', 1)
    meta = {}
    for line in head.splitlines():
        key, sep, value = line.partition(':')
        if not sep or not re.fullmatch(r'[a-z_]+', key) or key in meta:
            raise ValueError(f'{path}: invalid/duplicate metadata {line!r}')
        meta[key] = value.strip()
    for key in ('id', 'title', 'kind', 'status'):
        if not meta.get(key): raise ValueError(f'{path}: missing {key}')
    if not re.fullmatch(r'[a-z][a-z0-9-]*', meta['id']):
        raise ValueError(f'{path}: invalid stable id')
    return meta, body

def normalize_authored(c):
    """V4 authoring arrays -> browser schema. Already-normalized JSON is unchanged."""
    if isinstance(c['clues'], dict): return c
    c['version'] = 1
    c['clues'] = {x['id']: dict(x, n=f'{i+1:02}') for i, x in enumerate(c['clues'])}
    for i, p in enumerate(c['posts']):
        defaults = dict(category=['正在发生','民俗旧闻','地方志','地方志','闲谈','正在发生'][i%6],
            label=['求助','考据','旧闻','记录','怪谈','续帖'][i%6], avatar=p['author'][0],
            time='核查后更新' if i>=5 else '当夜 '+['21:06','20:40','19:18','18:32','17:09'][i%5],
            views=317-i*29, replies=len(p['comments']), featured=i==0,
            excerpt=re.sub(r'<[^>]*>', '', p['body'][0]))
        c['posts'][i] = dict(defaults, **p)
    c['endings'] = [dict(e, code=f'ENDING {i+1:02} / {e["name"]}') for i,e in enumerate(c['endings'])]
    return c

def validate_case(c, path):
    def require(ok, why):
        if not ok: raise ValueError(f'{path}: {why}')
    clues=set(c['clues']); links={l['id'] for l in c['links']}
    require(len(links)==len(c['links']), 'duplicate link id')
    require(len({p['id'] for p in c['posts']})==len(c['posts']), 'duplicate post id')
    for l in c['links']:
        require(len(l['pair'])==2 and len(set(l['pair']))==2 and set(l['pair'])<=clues, 'invalid clue pair')
    def visit(o):
        if isinstance(o,dict):
            require(set(o.get('requires',[]))<=clues, 'unknown required clue')
            require(set(o.get('requiresLinks',[]))<=links, 'unknown required deduction')
            if o.get('clue'): require(o['clue'] in clues, 'unknown awarded clue')
            if 'answer' in o and 'options' in o:
                require(o['answer'] in [v[0] for v in o['options']], 'answer not in options')
            for v in o.values(): visit(v)
        elif isinstance(o,list):
            for v in o: visit(v)
    visit(c)
    for art in [c.get('art')]+[s.get('art') for s in c.get('scenes',[])]:
        if art:
            target=(FORUM/art).resolve()
            require(FORUM.resolve() in target.parents and target.is_file(), f'missing/unsafe asset {art}')
    if c.get('legacy'): return
    scenes=c.get('scenes') or [c['scene']]
    for s in scenes:
        for h in s['hotspots']: require(h['id'] in clues,'unknown hotspot clue')
    known=set(); solved=set()
    ok=lambda o: set(o.get('requires',[]))<=known and set(o.get('requiresLinks',[]))<=solved
    for _ in range(len(clues)+len(links)+1):
        before=(len(known),len(solved))
        sources=c['posts']+[d for ct in c['contacts'].values() for d in ct['dialogue'].values()]
        for o in sources:
            if o.get('clue') and ok(o): known.add(o['clue'])
        access=set(c['sceneRequires'])<=known if 'sceneRequires' in c else len(known)>=5
        if access:
            for s in scenes:
                if ok(s):
                    for h in s['hotspots']:
                        if ok(h) and (not h.get('puzzle') or ok(c['puzzle'])): known.add(h['id'])
        for l in c['links']:
            if set(l['pair'])<=known: solved.add(l['id'])
        if before==(len(known),len(solved)): break
    require(known==clues and solved==links, f'unreachable clues/links: {clues-known}/{links-solved}')

def load_library(root=CASES):
    root=Path(root).resolve(); entries=[]; cases={}; ids=set()
    files=sorted(root.glob('classic-folk-cases/*.md'))+sorted(root.glob('exclusive-folk-cases/*.md'))+sorted(root.glob('playable/*/case.md'))
    for path in files:
        meta,body=read_markdown(path)
        if meta['id'] in ids: raise ValueError(f'duplicate id: {meta["id"]}')
        ids.add(meta['id'])
        if meta['kind']=='theme':
            if meta['status']!='planned': raise ValueError(f'{path}: theme is not a playable case')
            for heading in SECTIONS:
                if f'## {heading}' not in body: raise ValueError(f'{path}: missing section {heading}')
        elif meta['kind']=='playable':
            if meta['status']!='playable': raise ValueError(f'{path}: incorrect playable status')
            target=(path.parent/meta.get('source','')).resolve()
            if path.parent.resolve() not in target.parents or target.suffix!='.json':
                raise ValueError(f'{path}: unsafe JSON source')
            c=json.loads(target.read_text(encoding='utf-8'))
            if c['id']!=meta['id'] or c['title']!=meta['title']: raise ValueError(f'{path}: metadata mismatch')
            validate_case(c,path)
            cases[c['id']]=c
        else: raise ValueError(f'{path}: unknown kind')
        entries.append(dict(meta,path=path.relative_to(root).as_posix()))
    for c in cases.values():
        for key,reverse in [('previousCase','nextCase'),('nextCase','previousCase')]:
            if c.get(key) and (c[key] not in cases or cases[c[key]].get(reverse)!=c['id']):
                raise ValueError(f'{c["id"]}: broken serial handoff')
        seen=set(); current=c
        while current.get('previousCase'):
            if current['id'] in seen: raise ValueError('cyclic serial progression')
            seen.add(current['id']); current=cases[current['previousCase']]
    if 'lantern' not in cases: raise ValueError('legacy bootstrap case lantern is required')
    return entries, dict(sorted(cases.items(),key=lambda kv:kv[1]['no']))

def compile_library():
    entries,cases=load_library()
    payload=json.dumps(cases,ensure_ascii=False,indent=2).replace('\u2028','\\u2028').replace('\u2029','\\u2029')
    (FORUM/'data.js').write_text('// GENERATED by python3 -m src.folk_parser build. Edit cases/, not this file.\n"use strict";\nwindow.CASES = '+payload+';\nwindow.GAME = window.CASES.lantern;\n',encoding='utf-8')
    (CASES/'catalog.json').write_text(json.dumps({'schemaVersion':1,'entries':entries},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    lines=['# 民俗剧本与主题目录','',f'当前：**{len(cases)} 个可玩案卷**；**{sum(e["kind"]=="theme" for e in entries)} 个待开发参考主题**。两者不相加冒充可玩游戏数。', '',
      '本页由 `python3 -m src.folk_parser build` 生成。参考标题按用户材料归档，未核实其出版信息、民俗真实性或独占权。主题正文包含反转剧透。','', '## 可玩案卷','', '| 案号 | 案卷 | 主题 | 连续故事 |','|---|---|---|---|']
    for c in cases.values(): lines.append(f'| {c["no"]} | [{c["title"]}](../cases/playable/{c["id"]}/case.md) | {c["theme"]} | {c.get("series","独立案")} |')
    for folder,title in [('classic-folk-cases','传统民俗参考主题'),('exclusive-folk-cases','新收集参考主题')]:
        group=[e for e in entries if e['path'].startswith(folder+'/')]
        lines+=['',f'## {title} · {len(group)} 个','', '| 主题 | 状态 |','|---|---|']
        lines += [f'| [{e["title"]}](../cases/{e["path"]}) | 待开发 / planned |' for e in group]
    (ROOT/'docs'/'case_list.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    return entries,cases
