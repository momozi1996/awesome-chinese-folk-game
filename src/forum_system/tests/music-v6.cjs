// V6.2 regression: no continuous white noise, real local CC0 music, independent buses.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),forum=path.join(root,'src/forum_system'),out=path.join(root,'docs/music-v6.2');
const url=process.env.GAME_URL||'http://127.0.0.1:4176',KEY='weiming-lantern-save-v1';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(forum,'art/source/music/manifest.json')));
assert.equal(manifest.license,'CC0-1.0');assert.equal(manifest.artist,'Emma_MA');
assert.equal(sha(fs.readFileSync(path.join(forum,manifest.asset))),manifest.runtimeSHA256);
assert.equal(sha(fs.readFileSync(path.join(forum,'art/source/music/haunting-piano-original.mp3'))),manifest.sourceSHA256);
assert.match(fs.readFileSync(path.join(forum,'art/source/music/source-page.txt'),'utf8'),/released into the public domain/);
const pcm=execFileSync('ffmpeg',['-v','error','-i',path.join(forum,manifest.asset),'-f','f32le','-ac','2','-ar','44100','pipe:1'],{maxBuffer:32*1024*1024});
let peak=0,sum=0;for(let i=0;i<pcm.length;i+=4){const v=pcm.readFloatLE(i);assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));sum+=v*v;}
const rms=Math.sqrt(sum/(pcm.length/4));assert.ok(rms>.005&&peak<.8);const seam=Math.max(...[0,1].map(ch=>Math.abs(pcm.readFloatLE(ch*4)-pcm.readFloatLE(pcm.length-8+ch*4))));assert.ok(seam<.01,'crossfade boundary has no large sample discontinuity');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const errors=[],external=[],checks=[],measurements={asset:{peak,rms,seam}},dimensions=[];
 const make=async()=>{
  const p=await browser.newPage({viewport:{width:1440,height:960}});
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(url).origin)external.push(r.url());});
  await p.addInitScript(()=>{
   const C=AudioContext,A=Audio;window.testContexts=0;window.testSources=[];window.testAudio=[];
   window.AudioContext=class extends C{constructor(...args){super(...args);testContexts++;}createBufferSource(){const s=super.createBufferSource();testSources.push(s);return s;}};
   window.Audio=function(...args){const a=new A(...args);testAudio.push(a);return a;};
  });return p;
 };
 const act=(p,a)=>p.locator(`[data-action="${a}"]`).first().click();
 const snap=p=>p.evaluate(()=>WeimingSound.snapshot());
 const playing=p=>p.waitForFunction(()=>WeimingSound.snapshot().musicVoices===1);
 const nav=(p,v)=>p.locator(`.nav-link[data-view="${v}"]`).click();
 const slider=(p,id,v)=>p.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},v);
 const signal=async p=>{await p.waitForTimeout(400);return p.evaluate(async()=>{let total=0,peak=0,n=0;for(let i=0;i<10;i++){const a=new Float32Array(WeimingSound.analyser.fftSize);WeimingSound.analyser.getFloatTimeDomainData(a);for(const v of a){total+=v*v;n++;peak=Math.max(peak,Math.abs(v));}await new Promise(r=>setTimeout(r,30));}return {peak,rms:Math.sqrt(total/n)};});};
 const visibility=(p,hidden)=>p.evaluate(hidden=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});document.dispatchEvent(new Event('visibilitychange'));},hidden);
 try{
  const p=await make();const requests=[];p.on('request',r=>{if(r.url().includes('/assets/music/'))requests.push(r.url());});await p.goto(url);
  assert.equal(await p.evaluate(()=>testContexts),0);assert.equal((await snap(p)).musicState,'unloaded');assert.equal(requests.length,0);
  await act(p,'sound');await playing(p);await p.waitForTimeout(600);const first=await snap(p);
  assert.equal(first.ambienceVoices,0);assert.equal(first.noiseLoops,0);assert.equal(await p.evaluate(()=>testSources.filter(s=>s.loop).length),1);
  assert.ok(await p.evaluate(()=>testSources.find(s=>s.loop).buffer.duration)>50,'loop is decoded music, not a short noise buffer');
  assert.ok(await p.evaluate(()=>WeimingSound.noiseBuffer.duration)<.31,'only tiny one-shot paper texture remains');
  measurements.default=await signal(p);assert.ok(measurements.default.rms>.00001&&measurements.default.peak<.1);
  await p.evaluate(()=>window.firstMusic=WeimingSound.musicSource);await nav(p,'board');await nav(p,'messages');await nav(p,'forum');assert.equal(await p.evaluate(()=>firstMusic===WeimingSound.musicSource),true,'navigation does not restart the score');
  await act(p,'settings');assert.match(await p.locator('.sound-readout').innerText(),/CC0/);assert.equal(await p.locator('[data-action=retry-music]').isVisible(),false);
  await act(p,'music-settings');assert.equal((await snap(p)).enabled,true);assert.equal((await snap(p)).musicVoices,0);
  measurements.musicOff=await signal(p);assert.ok(measurements.musicOff.rms<.000001,'no rain, wind, hum or other continuous background remains');
  await act(p,'preview-sound');assert.ok((await snap(p)).activeEffects>0,'effects still playable when BGM off');
  await act(p,'close');await p.locator('[data-action=post][data-id=river]').first().click();await p.locator('.reading-strip [data-narrative=listen]').click();await p.waitForFunction(()=>WeimingNarrative.snapshot().state==='playing');assert.equal((await snap(p)).musicVoices,0,'voice does not re-enable BGM');await p.locator('[data-narrative=stop]').click();
  await act(p,'settings');await act(p,'music-settings');await playing(p);assert.ok((await snap(p)).musicOffset>0,'restart resumes position');
  await slider(p,'ambience-range',0);assert.equal((await snap(p)).musicVoices,0);measurements.musicZero=await signal(p);assert.ok(measurements.musicZero.rms<.000001);
  await slider(p,'ambience-range',55);await playing(p);await slider(p,'effects-range',0);measurements.effectsOff=await signal(p);assert.ok(measurements.effectsOff.rms>.00001,'effects bus independent of music');
  await slider(p,'volume-range',0);assert.equal((await snap(p)).musicVoices,0);measurements.masterZero=await signal(p);assert.ok(measurements.masterZero.rms<.000001);
  await slider(p,'volume-range',30);await slider(p,'effects-range',65);await playing(p);await act(p,'close');
  await p.locator('.reading-strip [data-narrative=listen]').click();await p.waitForFunction(()=>WeimingNarrative.snapshot().state==='playing');await p.waitForTimeout(350);assert.ok((await snap(p)).musicGain<.11,'piano ducks under speech');await p.locator('[data-narrative=stop]').click();await p.waitForTimeout(350);assert.ok((await snap(p)).musicGain>.5);
  await visibility(p,true);assert.equal((await snap(p)).musicVoices,0);assert.equal((await snap(p)).state,'suspended');await visibility(p,false);await playing(p);assert.equal(await p.evaluate(()=>testContexts),1);assert.equal(requests.length,1,'one lazy data load');
  // A real decoded score crosses its loop boundary without an ended event/restart.
  await p.evaluate(()=>{const s=WeimingSound;s.stopMusic();s.musicOffset=52.6;s.syncMusic();window.loopMusic=s.musicSource;});await p.waitForTimeout(650);assert.equal(await p.evaluate(()=>loopMusic===WeimingSound.musicSource),true);measurements.loop=await signal(p);assert.ok(measurements.loop.rms>.00001);
  await act(p,'settings');await act(p,'music-settings');await p.reload();assert.equal((await snap(p)).musicEnabled,false);assert.equal((await snap(p)).state,'not-created');await act(p,'settings');await p.waitForTimeout(400);assert.equal((await snap(p)).musicVoices,0);assert.equal(await p.evaluate(()=>!!window.WeimingMusicData),false,'persisted music-off does not download score');
  await act(p,'music-settings');await playing(p);await p.waitForTimeout(700);await p.screenshot({path:path.join(out,'settings-desktop.png')});
  for(const [width,height] of [[320,640],[390,844],[844,390]]){
   await p.setViewportSize({width,height});await p.locator('[data-action=music-settings]').scrollIntoViewIfNeeded();const fit=await p.evaluate(()=>{const b=document.querySelector('[data-action=music-settings]').getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.height>=44&&document.documentElement.scrollWidth<=innerWidth;});assert.ok(fit);dimensions.push({width,height,fit});if(width===390)await p.screenshot({path:path.join(out,'settings-mobile.png')});
  }
  await p.close();checks.push('no sound/data before gesture','one decoded musical loop; zero ambient loops','BGM-off digital silence, effects and narration retained','volume zero and independent buses','no restart on navigation','duck, hidden tab, loop boundary, persistent off','single AudioContext and single load','responsive settings');

  const q=await make();await q.route('**/assets/music/music-data.js',r=>r.abort());await q.goto(url);await act(q,'sound');await q.waitForFunction(()=>WeimingSound.snapshot().musicState==='error');await act(q,'settings');assert.equal(await q.locator('[data-action=retry-music]').isVisible(),true);await act(q,'preview-sound');assert.ok((await snap(q)).activeEffects>0);await q.unroute('**/assets/music/music-data.js');await act(q,'retry-music');await playing(q);await q.close();
  const delayed=await make();let held;await delayed.route('**/assets/music/music-data.js',r=>held=r);await delayed.goto(url);await act(delayed,'sound');await delayed.waitForFunction(()=>WeimingSound.snapshot().musicState==='loading');await act(delayed,'sound');await held.continue();await delayed.waitForFunction(()=>WeimingSound.snapshot().musicState==='paused');assert.equal((await snap(delayed)).musicVoices,0,'loading completion cannot unmute');await delayed.close();
  const file=await make();await file.context().setOffline(true);await file.goto(pathToFileURL(path.join(forum,'index.html')).href);await act(file,'sound');await playing(file);measurements.file=await signal(file);assert.ok(measurements.file.rms>.00001,'file:// audio actually audible in analyser');await file.close();
  checks.push('load failure, visible retry, other sounds intact','late decode respects mute','file:// fully offline decoded signal');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  const hashes=JSON.parse(fs.readFileSync(path.join(root,'docs/visual-v6/content-baseline.json')));for(const [f,h] of Object.entries(hashes))assert.equal(sha(fs.readFileSync(path.join(root,f))),h);
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({date:new Date().toISOString(),checks,measurements,dimensions,errors,external,protectedFiles:Object.keys(hashes).length,scope:'Chrome and emulated viewports; decoded signal tests, not human listening or mobile hardware acceptance'},null,2));
  console.log('V6.2 PASS:',checks.join('; '));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
