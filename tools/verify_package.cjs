// Verify a freshly extracted release, not the working tree. Only creates a disposable profile.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'../src/forum_system/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync,spawn}=require('node:child_process');
const {pathToFileURL}=require('node:url');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const current=JSON.parse(fs.readFileSync(path.join(root,'CURRENT_VERSION.json'),'utf8'));
 const archive=path.resolve(root,process.argv[2]||current.latestArchive);
 const temp=fs.mkdtempSync(path.join(root,'releases/.verify-'));
 let server,browser;
 try {
 let r=spawnSync('python3',['-c',`
import hashlib,json,pathlib,sys,zipfile
archive=pathlib.Path(sys.argv[1]);temp=pathlib.Path(sys.argv[2])
expected=archive.with_suffix('.zip.sha256').read_text().split()[0]
assert hashlib.sha256(archive.read_bytes()).hexdigest()==expected, 'archive SHA256 mismatch'
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    names=z.namelist();assert len(names)==len(set(names)), 'duplicate archive paths'
    for name in names:
        p=pathlib.PurePosixPath(name)
        assert not p.is_absolute() and '..' not in p.parts and chr(92) not in name, 'unsafe path'
        assert p.parts[0]=='awesome-chinese-folk-game', 'unexpected root'
    prefix='awesome-chinese-folk-game/'
    if prefix+'FREEZE-MANIFEST.json' in names:
        manifest=json.loads(z.read(prefix+'FREEZE-MANIFEST.json'))
        assert set(names)=={prefix+f['path'] for f in manifest['files']}|{prefix+'FREEZE-MANIFEST.json'}
        for f in manifest['files']:
            data=z.read(prefix+f['path'])
            assert len(data)==f['bytes'] and hashlib.sha256(data).hexdigest()==f['sha256'], f['path']
            assert z.getinfo(prefix+f['path']).external_attr>>16==int(f['mode'],8), f['path']
    z.extractall(temp)
`,archive,temp],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const packed=path.join(temp,'awesome-chinese-folk-game');
 const packageVersion=JSON.parse(fs.readFileSync(path.join(packed,'src/forum_system/package.json'),'utf8')).version;
 if(!process.argv[2])assert.equal(packageVersion,current.version,'latest package version must match source pointer');
 r=spawnSync('python3',[path.join(packed,'demo/run_demo.py'),'--check'],{cwd:temp,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 r=spawnSync('node',[path.join(packed,'src/forum_system/tests/content-integrity.cjs')],{cwd:temp,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 server=spawn('python3',[path.join(packed,'main.py'),'--no-browser','--port','4187'],{cwd:temp,stdio:'pipe'});
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)});
 for(let i=0;i<60;i++){
  if(server.exitCode!==null)throw new Error('Packaged launcher exited');
  try{if((await fetch('http://127.0.0.1:4187/')).ok)break;}catch{}
  if(i===59)throw new Error('Packaged launcher did not become ready');
  await new Promise(r=>setTimeout(r,100));
 }
 for(const url of ['http://127.0.0.1:4187/',pathToFileURL(path.join(packed,'src/forum_system/index.html')).href]){
  const context=await browser.newContext();const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url())});
  page.on('request',r=>{const u=r.url();if(/^https?:/.test(u) && new URL(u).origin!=='http://127.0.0.1:4187')errors.push('Unexpected external request: '+u)});
  await page.goto(url);assert.equal(await page.evaluate(()=>Object.keys(window.CASES).length),9);
  assert.equal(await page.evaluate(()=>typeof window.CaseEngine.requirementsMet),'function');
  assert.equal(await page.evaluate(()=>window.WeimingSound.snapshot().state),'not-created');
  assert.ok(await page.evaluate(()=>[...document.styleSheets].some(s=>s.href?.endsWith('immersion.css'))));
  for(const file of ['textures/paper-fibers.webp','textures/archive-cloth.webp','scenes/lamp.jpg']){
    const width=await page.evaluate(async file=>{const i=new Image();i.src='assets/'+file;await i.decode();return i.naturalWidth;},file);
    assert.equal(width,file.endsWith('.jpg')?1920:512);
  }
  await page.locator('[data-action="sound"]').click();
  await page.waitForFunction(()=>window.WeimingSound.snapshot().state==='running');
  if(parseFloat(packageVersion)>=6.2){
    await page.waitForFunction(()=>window.WeimingSound.snapshot().musicVoices===1);
    assert.equal(await page.evaluate(()=>window.WeimingSound.snapshot().noiseLoops),0);
    assert.ok(await page.evaluate(()=>window.WeimingSound.musicBuffer.duration)>50);
    await page.locator('[data-action="settings"]').click();
    await page.locator('[data-action="music-settings"]').click();
    assert.equal(await page.evaluate(()=>window.WeimingSound.snapshot().musicVoices),0);
    await page.keyboard.press('Escape');
  }
  await page.locator('[data-action="sound"]').click();

  await page.locator('[data-action="casebook"]').first().click();
  await page.locator('[data-action="select-case"][data-case="lamplife"]').click();
  await page.locator('[data-action="c-post"][data-id="opening"]').first().click();
  if(parseFloat(packageVersion)>=6.1){
    await page.locator('[data-narrative="replay"]').click();
    assert.ok(await page.locator('.narrative-film').isVisible());
    await page.keyboard.press('Escape');
    await page.locator('.reading-strip [data-narrative="listen"]').click();
    await page.waitForFunction(()=>window.WeimingNarrative.snapshot().state==='playing');
    await page.locator('[data-narrative="stop"]').click();
  }
  await page.locator('[data-action="c-collect"][data-id="signal"]').click();
  await page.reload();
  assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('weiming-case-lamplife-v1')).clues.includes('signal')));
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: extracted package, foreign CWD, content checks, HTTP + file://, version pointer, local visual/audio resources, V6.2 music/no-noise and narration when available, shared engine, clue acquisition and reload.');
 } finally {
  try {if(browser)await browser.close();} finally {
   if(server && server.exitCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}
   fs.rmSync(temp,{recursive:true,force:true});
  }
 }
})().catch(e=>{console.error(e);process.exit(1)});
