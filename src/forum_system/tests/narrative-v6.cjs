// V6.1: real browser interaction and local media, isolated disposable saves only.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),forum=path.join(root,'src/forum_system'),out=path.join(root,'docs/narrative-v6.1');
const url=process.env.GAME_URL||'http://127.0.0.1:4176',KEY='weiming-lantern-save-v1',PREF='weiming-narrative-v1';
const manifest=JSON.parse(fs.readFileSync(path.join(forum,'art/source/narrative/readings-manifest.json')));
const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/visual-v6/content-baseline.json')));
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const checkContent=()=>{for(const [f,h] of Object.entries(baseline))assert.equal(sha(fs.readFileSync(path.join(root,f))),h,f);};
const plain=s=>s.replace(/<br>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
checkContent();assert.equal(manifest.readings.length,13);assert.equal(manifest.readings.filter(c=>c.kind==='post').length,11);
const media=[];
for(const c of manifest.readings){
 const data=JSON.parse(fs.readFileSync(path.join(root,`cases/playable/${c.caseId}/case.json`)));
 const source=c.kind==='post'?data.posts.find(p=>p.id===c.source).body[c.paragraph]:data.clues[c.source].text;
 assert.equal(c.text,plain(source),`${c.id}: exact original text`);
 const f=path.join(forum,c.audio);assert.equal(sha(fs.readFileSync(f)),c.sha256);
 const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',f],{encoding:'utf8'}));
 assert.ok(Math.abs(duration-c.duration)<.02);
 const pcm=execFileSync('ffmpeg',['-v','error','-i',f,'-f','f32le','-ac','1','-ar','16000','pipe:1']);
 let peak=0,sum=0;for(let i=0;i<pcm.length;i+=4){const v=pcm.readFloatLE(i);assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));sum+=v*v;}
 const rms=Math.sqrt(sum/(pcm.length/4));assert.ok(rms>.001&&peak<.95,`${c.id}: audible signal without clipping`);
 media.push({id:c.id,duration,peak,rms});
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const errors=[],external=[],checks=[],dimensions=[];
 const page=async(options={})=>{
  const p=await browser.newPage({viewport:{width:1440,height:960},...options});
  p.on('pageerror',e=>errors.push(e.message));
  p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(url).origin)external.push(r.url());});
  await p.addInitScript(()=>{
   const A=Audio;window.testAudios=[];window.Audio=function(...args){const a=new A(...args);testAudios.push(a);return a;};
   const now=performance.now.bind(performance);window.testOffset=0;performance.now=()=>now()+testOffset;
  });return p;
 };
 const act=(p,a,s='')=>p.locator(`[data-action="${a}"]${s}`).first().click();
 const nav=(p,v)=>p.locator(`.nav-link[data-view="${v}"]`).click();
 const snap=p=>p.evaluate(()=>WeimingNarrative.snapshot());
 const film=p=>p.waitForFunction(()=>!!WeimingNarrative.snapshot().film);
 const play=p=>p.waitForFunction(()=>WeimingNarrative.snapshot().state==='playing');
 const stopped=async p=>{assert.equal((await snap(p)).voice,null);assert.equal(await p.evaluate(()=>testAudios.filter(a=>!a.paused).length),0);};
 const slider=(p,id,value)=>p.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);
 const visibility=(p,hidden)=>p.evaluate(hidden=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});document.dispatchEvent(new Event('visibilitychange'));},hidden);
 try{
  const p=await page();await p.goto(url);
  assert.equal(await p.evaluate(()=>testAudios.length),0);assert.equal(await p.evaluate(()=>WeimingSound.snapshot().enabled),false);
  await act(p,'post','[data-id=river]');const focus=await p.evaluate(()=>document.activeElement.id);
  await film(p);assert.equal(await p.evaluate(()=>document.activeElement.id),focus,'auto never steals focus');
  assert.equal((await snap(p)).automaticCount,1);assert.equal(await p.evaluate(()=>testAudios.length),0,'silent auto does not preload voice');
  await p.keyboard.press('Escape');await p.waitForTimeout(220);
  await p.locator('[data-narrative=replay]').click();await film(p);assert.equal(await p.locator('#narrative-root').evaluate(e=>e.classList.contains('manual')),true);
  await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.dataset.narrative),'disable-auto');
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.dataset.narrative),'close');
  await p.locator('.narrative-film [data-narrative=listen]').click();await play(p);
  assert.equal(await p.locator('.narrative-film #voice-root').count(),1,'voice integrates in film, not popup on popup');
  assert.equal((await snap(p)).volume,.21);assert.equal(await p.evaluate(()=>WeimingSound.snapshot().ducked),true);
  await p.locator('[data-narrative=pause]').click();assert.equal((await snap(p)).state,'paused');assert.equal(await p.evaluate(()=>WeimingSound.snapshot().ducked),false);
  const paused=await p.evaluate(()=>testAudios.at(-1).currentTime);await p.waitForTimeout(200);assert.ok(Math.abs(await p.evaluate(()=>testAudios.at(-1).currentTime)-paused)<.06);
  await p.locator('[data-narrative=pause]').click();await play(p);await p.waitForTimeout(200);assert.ok(await p.evaluate(()=>testAudios.at(-1).currentTime)>paused);
  await p.locator('[data-narrative=restart]').click();await play(p);assert.equal(await p.evaluate(()=>testAudios.filter(a=>!a.paused).length),1);
  await p.locator('[data-narrative=stop]').click();await stopped(p);assert.equal(await p.evaluate(()=>document.activeElement.dataset.narrative),'listen');
  await p.keyboard.press('Escape');await p.waitForTimeout(220);assert.equal(await p.evaluate(()=>document.activeElement.dataset.narrative),'replay');
  await nav(p,'forum');await act(p,'post','[data-id=archive]');await p.waitForTimeout(1250);assert.equal((await snap(p)).film,null,'cooldown suppresses another auto');
  await nav(p,'forum');await p.evaluate(()=>testOffset+=91000);await act(p,'post','[data-id=archive]');await film(p);assert.equal((await snap(p)).automaticCount,2);
  await act(p,'casebook');await act(p,'select-case','[data-case=lamplife]');await p.evaluate(()=>testOffset+=91000);await act(p,'c-post','[data-id=opening]');await film(p);assert.equal((await snap(p)).automaticCount,3);
  await act(p,'casebook');await act(p,'select-case','[data-case=bridal]');await p.evaluate(()=>testOffset+=91000);await act(p,'c-post','[data-id=opening]');await p.waitForTimeout(1250);assert.equal((await snap(p)).film,null,'max three per session');
  await p.reload();await act(p,'c-post','[data-id=opening]');await film(p);await p.keyboard.press('Escape');await p.reload();await act(p,'c-post','[data-id=opening]');await p.waitForTimeout(1250);assert.equal((await snap(p)).film,null,'seen IDs persist');
  checks.push('silent defaults; no voice preload','auto focus, once, 90s cooldown, max3','manual keyboard focus','real media pause/resume/restart/stop; one channel; duck ownership');

  // Readable, switchable presentations and local narration on a longer original excerpt.
  await p.evaluate(()=>{localStorage.setItem('weiming-active-case','wellpost');localStorage.setItem('weiming-narrative-v1',JSON.stringify({mode:'suspense',auto:false}));});await p.reload();await act(p,'c-post','[data-id=opening]');
  await p.locator('[data-narrative=replay]').click();await p.locator('.narrative-film [data-narrative=listen]').click();await play(p);await p.waitForTimeout(350);
  await p.screenshot({path:path.join(out,'voice-desktop.png')});
  await p.locator('[data-narrative=close]').click();await p.waitForTimeout(220);assert.equal(await p.locator('body > #voice-root').count(),1,'film close keeps accessible floating player');
  await act(p,'settings');await stopped(p);assert.equal(await p.locator('.modal .voice-player').count(),0);
  await slider(p,'narrative-volume',55);await slider(p,'narrative-rate',.85);await p.locator('#narrative-mode').selectOption('off');await act(p,'close');assert.equal(await p.locator('[data-narrative=replay]').isDisabled(),true);
  await p.locator('.reading-strip [data-narrative=listen]').click();await play(p);assert.equal((await snap(p)).volume,.165);assert.equal((await snap(p)).rate,.85);
  await nav(p,'forum');await stopped(p);await act(p,'c-post','[data-id=opening]');await p.locator('.reading-strip [data-narrative=listen]').click();await play(p);
  await visibility(p,true);await stopped(p);assert.equal(await p.evaluate(()=>WeimingSound.snapshot().ducked),false);await visibility(p,false);await stopped(p);
  await p.locator('.reading-strip [data-narrative=listen]').click();await play(p);await act(p,'sound');await stopped(p);
  await act(p,'settings');await slider(p,'volume-range',0);await act(p,'close');await p.locator('.reading-strip [data-narrative=listen]').click();await stopped(p);assert.match(await p.locator('.reading-notice').innerText(),/音量为零/);
  await act(p,'settings');await slider(p,'volume-range',30);await slider(p,'narrative-volume',0);await act(p,'close');await p.locator('.reading-strip [data-narrative=listen]').click();await stopped(p);
  await act(p,'settings');await slider(p,'narrative-volume',70);await p.locator('#narrative-mode').selectOption('suspense');await p.locator('[data-narrative=auto]').click();await act(p,'close');
  await p.emulateMedia({reducedMotion:'reduce'});await nav(p,'forum');await act(p,'c-post','[data-id=opening]');await p.waitForTimeout(1250);assert.equal((await snap(p)).film,null);await p.locator('[data-narrative=replay]').click();assert.ok(await p.locator('#narrative-root').evaluate(e=>e.classList.contains('still')));
  assert.equal(await p.locator('.n-letter').evaluate(e=>getComputedStyle(e).animationName),'none');await p.keyboard.press('Escape');await p.emulateMedia({reducedMotion:'no-preference'});
  checks.push('off/static/reduced motion','volume multiplication, zero, rate, mute','navigation, modal and hidden-tab cleanup');
  for(const [width,height] of [[320,640],[390,844],[768,1024],[844,390]]){
   await p.setViewportSize({width,height});await p.locator('[data-narrative=replay]').click();await p.locator('.narrative-film [data-narrative=listen]').click();await play(p);await p.waitForTimeout(600);
   const fit=await p.evaluate(()=>{const f=document.querySelector('.narrative-film').getBoundingClientRect(),copy=document.querySelector('.n-film-copy').getBoundingClientRect(),player=document.querySelector('.voice-player').getBoundingClientRect();return f.left>=0&&f.right<=innerWidth&&f.top>=0&&f.bottom<=innerHeight&&copy.bottom<=player.top+1&&document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.narrative-film button')].filter(e=>e.getClientRects().length).every(e=>{const r=e.getBoundingClientRect();return r.height>=43&&r.left>=f.left&&r.right<=f.right&&r.top>=f.top&&r.bottom<=f.bottom;});});
   assert.ok(fit,`film and integrated player fit ${width}x${height}`);dimensions.push({width,height,fit});
   if(width===390)await p.screenshot({path:path.join(out,'voice-mobile.png')});
   await p.locator('[data-narrative=stop]').click();await p.keyboard.press('Escape');await p.waitForTimeout(220);
  }
  await p.close();

  // Acquired clue only; enabling sound in a modal cannot invalidate its eligibility.
  const c=await page();await c.goto(url);await c.evaluate(k=>localStorage.setItem(k,JSON.stringify({version:1,clues:['lamp','custom','news','address','ledger','tape'],openedSafe:true})),KEY);await c.reload();await nav(c,'scene');await act(c,'inspect-clue','[data-id=ledger]');
  assert.deepEqual((await snap(c)).eligible,['duty-note']);await c.locator('.clue-voice-strip [data-narrative=listen]').click();await play(c);assert.equal(await c.locator('.modal #voice-root').count(),1);
  await c.locator('[data-narrative=stop]').click();assert.equal(await c.evaluate(()=>document.activeElement.dataset.narrative),'listen');await c.keyboard.press('Escape');
  await act(c,'hotspot','[data-id=safe]');await act(c,'play-tape');await c.waitForFunction(()=>WeimingSound.snapshot().ducked);
  await c.evaluate(()=>WeimingNarrative.sync({enabled:true,master:30,motion:true}));assert.equal(await c.evaluate(()=>WeimingSound.snapshot().ducked),true,'idle narrative must not un-duck tape');await c.keyboard.press('Escape');await stopped(c);
  // The unopened clue is never offered a voice button, and fabricated stale controls are rejected.
  await c.evaluate(()=>{localStorage.setItem('weiming-active-case','lamplife');localStorage.setItem('weiming-case-lamplife-v1',JSON.stringify({version:1,clues:['record','address']}));});await c.reload();await nav(c,'scene');await act(c,'c-hotspot','[data-id=trace]');assert.equal(await c.locator('.clue-voice-strip').count(),0);
  await c.evaluate(()=>{const b=document.createElement('button');b.dataset.narrative='listen';b.dataset.reading='lamp-wire';document.body.append(b);b.click();b.remove();});await stopped(c);
  await act(c,'c-field-collect','[data-id=trace]');await act(c,'c-hotspot','[data-id=trace]');assert.equal(await c.locator('.clue-voice-strip').count(),1);await c.locator('.clue-voice-strip [data-narrative=listen]').click();await play(c);await c.keyboard.press('Escape');await stopped(c);await c.close();
  checks.push('clue gating; modal enable and focus','original tape duck unaffected');

  // Request failure is visible but never locks the post or marking action.
  const q=await page();await q.route('**/assets/voice-v6/*.mp3',r=>r.abort());await q.goto(url);await act(q,'post','[data-id=river]');await q.locator('.reading-strip [data-narrative=listen]').click();await q.waitForFunction(()=>WeimingNarrative.snapshot().state==='error');assert.match(await q.locator('.voice-state').innerText(),/原文仍完整/);
  await q.locator('[data-narrative=stop]').click();assert.ok(await q.locator('.article-body').isVisible());await nav(q,'forum');await stopped(q);await q.close();
  // Pending auto canceled by navigation; opted-in auto voice; automatic film expires.
  const a=await page();await a.goto(url);await act(a,'post','[data-id=river]');await nav(a,'forum');await a.waitForTimeout(1250);assert.equal((await snap(a)).automaticCount,0);
  await a.evaluate(()=>{localStorage.setItem('weiming-active-case','wellpost');localStorage.setItem('weiming-narrative-v1',JSON.stringify({voiceAuto:true,auto:true}));});await a.reload();await act(a,'sound');await act(a,'c-post','[data-id=opening]');await film(a);await play(a);await a.waitForFunction(()=>!WeimingNarrative.snapshot().film);assert.equal(await a.locator('body > #voice-root').count(),1);await nav(a,'forum');await stopped(a);await a.close();
  const file=await page();await file.goto(pathToFileURL(path.join(forum,'index.html')).href);await act(file,'post','[data-id=river]');await file.locator('.reading-strip [data-narrative=listen]').click();await play(file);await file.waitForTimeout(200);assert.ok(await file.evaluate(()=>testAudios.at(-1).currentTime)>0);await file.close();
  checks.push('request failure preserves reading','pending cancellation; opt-in auto voice; timed exit','file:// real media playback','portrait/tablet/short-landscape layout');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);checkContent();
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({date:new Date().toISOString(),protectedFiles:Object.keys(baseline).length,checks,dimensions,media,errors,external,scope:'Chrome desktop and emulated viewports; decoded signal and playback tests, not human listening or real mobile device testing'},null,2));
  console.log('V6.1 PASS:',checks.join('; '));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
