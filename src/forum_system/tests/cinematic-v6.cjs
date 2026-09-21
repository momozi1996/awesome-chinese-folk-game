const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'docs/visual-v6');
const baseline=JSON.parse(fs.readFileSync(path.join(out,'content-baseline.json')));
for(const [f,hash] of Object.entries(baseline)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),hash,`protected content ${f}`);
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const p=await b.newPage({viewport:{width:1440,height:960}}),errors=[],external=[];
 p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(process.env.GAME_URL||'http://127.0.0.1:4176'))external.push(r.url());});
 const url=process.env.GAME_URL||'http://127.0.0.1:4176';await p.goto(url);
 const nav=async v=>p.locator(`.nav-link[data-view="${v}"]`).click();
 await p.evaluate(()=>{
  localStorage.setItem('weiming-active-case','lamplife');
  const c=CASES.lamplife, s=CaseEngine.blankCaseState();s.clues=['signal','custom','record','schedule','address'];s.chats.north=['archive'];
  localStorage.setItem('weiming-case-lamplife-v1',JSON.stringify(s));
 });await p.reload();
 await p.screenshot({path:path.join(out,'01-forum-desktop.png')});
 await p.evaluate(()=>window.savedRoot=document.getElementById('content'));
 await nav('scene');assert.equal(await p.evaluate(()=>savedRoot===document.getElementById('content')),true,'persistent content root');
 assert.equal(await p.locator('.arrival-caption').count(),1,'first scene has a skippable arrival');
 await p.waitForTimeout(1200);
 assert.match(await p.locator('.scene-photo').getAttribute('src'),/scenes-v6\/hall/);
 await p.screenshot({path:path.join(out,'02-hall-desktop.png')});
 await p.locator('.hotspot[data-id="trace"]').click();
 assert.match(await p.locator('.modal-body').innerText(),/断电后核验/);
 assert.equal(await p.locator('canvas').count(),0,'3D is opt-in');
 await p.locator('[data-presentation="inspect-3d"]').click();await p.locator('.object-mount canvas').waitFor();
 assert.equal(await p.locator('canvas').count(),1);
 await p.locator('canvas').focus();await p.keyboard.press('ArrowLeft');await p.keyboard.press('Home');
 await p.screenshot({path:path.join(out,'03-object-3d.png')});
 await p.locator('[data-action="c-field-collect"][data-id="trace"]').click();
 assert.ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('weiming-case-lamplife-v1')).clues.includes('trace')),'collect commits immediately');
 assert.equal(await p.locator('canvas').count(),0);assert.equal(await p.evaluate(()=>WeimingPresentation.snapshot().inspector),false);
 await p.screenshot({path:path.join(out,'04-collected.png')});
 await nav('board');await p.locator('[data-action="c-select"][data-id="trace"]').click();await p.locator('[data-action="c-select"][data-id="signal"]').click();
 assert.equal(await p.locator('.compare-card').count(),2);
 assert.equal(await p.locator('.compare-card p').first().innerText(),await p.evaluate(()=>CASES.lamplife.clues.trace.text));
 await p.locator('#content').evaluate(e=>e.scrollTop=0);await p.screenshot({path:path.join(out,'05-comparison-desktop.png')});
 await p.locator('#content').evaluate(e=>e.scrollTop=280);const scroll=await p.locator('#content').evaluate(e=>e.scrollTop);
 await nav('forum');await nav('board');assert.ok(Math.abs(await p.locator('#content').evaluate(e=>e.scrollTop)-scroll)<2,'remember view position');
 await nav('scene');assert.equal(await p.locator('.arrival-caption').count(),0,'revisits do not replay intro');
 // Context loss returns to text/static evidence without breaking collection.
 await nav('scene');await p.locator('.hotspot[data-id="trace"]').click();await p.locator('[data-presentation="inspect-3d"]').click();await p.locator('canvas').waitFor();
 await p.locator('canvas').evaluate(c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 assert.equal(await p.locator('canvas').count(),0);assert.match(await p.locator('.object-status').innerText(),/静态/);
 await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>document.activeElement.dataset.id),'trace');
 // Rapid close while an async module is requested must not mount an orphan canvas.
 await p.locator('.hotspot[data-id="trace"]').click();await p.locator('[data-presentation="inspect-3d"]').click();await p.keyboard.press('Escape');await p.waitForTimeout(100);
 assert.equal(await p.locator('canvas').count(),0);
 // OS motion preference wins even if the old save enabled motion.
 await p.emulateMedia({reducedMotion:'reduce'});await nav('forum');await nav('scene');assert.equal(await p.locator('.arrival-caption').count(),0);
 // Failed optional import: original observation and collect action stay usable.
 const q=await b.newPage();await q.route('**/presentation/inspector.js',r=>r.abort());await q.goto(url);
 await q.evaluate(()=>{localStorage.setItem('weiming-active-case','lamplife');const s=CaseEngine.blankCaseState();s.clues=['record','address'];localStorage.setItem('weiming-case-lamplife-v1',JSON.stringify(s));});await q.reload();await q.locator('.nav-link[data-view="scene"]').click();await q.locator('.hotspot[data-id="trace"]').click();await q.locator('[data-presentation="inspect-3d"]').click();await q.waitForFunction(()=>document.querySelector('.object-status')?.textContent.includes('未能启动'));
 await q.locator('[data-action="c-field-collect"]').click();assert.ok(await q.evaluate(()=>JSON.parse(localStorage.getItem('weiming-case-lamplife-v1')).clues.includes('trace')));await q.close();
 // Image fallback must restore its matching original hotspot coordinates.
 const fallback=await b.newPage();await fallback.route('**/assets/scenes-v6/hall.jpg',r=>r.abort());await fallback.goto(url);
 await fallback.evaluate(()=>{localStorage.setItem('weiming-active-case','lamplife');const s=CaseEngine.blankCaseState();s.clues=['record','address'];localStorage.setItem('weiming-case-lamplife-v1',JSON.stringify(s));});await fallback.reload();await fallback.locator('.nav-link[data-view="scene"]').click();
 await fallback.waitForFunction(()=>document.querySelector('.scene-photo')?.getAttribute('src')==='assets/scenes/lamp.jpg');
 assert.equal(await fallback.locator('.hotspot[data-id="trace"]').evaluate(e=>e.style.left),'48%');await fallback.close();
 // Standalone HTML uses static inspection, without even attempting an ES module import.
 const file=await b.newPage(),fileErrors=[];file.on('pageerror',e=>fileErrors.push(e.message));
 await file.goto(pathToFileURL(path.join(root,'src/forum_system/index.html')).href);
 await file.evaluate(()=>{localStorage.setItem('weiming-active-case','lamplife');const s=CaseEngine.blankCaseState();s.clues=['record','address'];localStorage.setItem('weiming-case-lamplife-v1',JSON.stringify(s));});await file.reload();await file.locator('.nav-link[data-view="scene"]').click();await file.locator('.hotspot[data-id="trace"]').click();await file.locator('[data-presentation="inspect-3d"]').click();
 assert.match(await file.locator('.object-status').innerText(),/本地启动器/);assert.equal(await file.locator('canvas').count(),0);await file.locator('[data-action="c-field-collect"]').click();assert.deepEqual(fileErrors,[]);await file.close();
 // Both art/canvas fallback paths work without external services; portrait and short landscape.
 const dimensions=[];
 for(const [width,height] of [[320,640],[390,844],[768,1024],[844,390]]){
  await p.setViewportSize({width,height});await nav('scene');
  const fit=await p.evaluate(()=>{const f=document.querySelector('.scene-frame').getBoundingClientRect();return [...document.querySelectorAll('.hotspot')].every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=f.left&&r.right<=f.right&&r.top>=f.top&&r.bottom<=f.bottom;})&&document.documentElement.scrollWidth<=innerWidth;});
  assert.ok(fit,`scene fit ${width}x${height}`);dimensions.push({width,height,fit});
  if(width===390){await p.screenshot({path:path.join(out,'06-hall-mobile.png')});await nav('board');await p.locator('#content').evaluate(e=>e.scrollTop=0);await p.screenshot({path:path.join(out,'07-comparison-mobile.png')});}
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({date:new Date().toISOString(),protectedFiles:Object.keys(baseline).length,dimensions,checks:['persistent roots','opt-in 3D','one canvas','keyboard rotation','commit before receipt','cleanup','context loss','rapid close','import failure','view memory','full-text comparison','reduced motion','local-only requests','image fallback coordinates','standalone file://','first visit / revisit transitions'],errors,external},null,2));
 await b.close();console.log('V6 PASS: protected content, visual lifecycle, 3D/fallback, evidence comparison, responsive scene, reduced motion.');
})().catch(e=>{console.error(e);process.exit(1)});
