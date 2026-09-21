// Original presentation/mixer regression, updated in V6.2 for the intentional replacement
// of four continuous ambience layers with one CC0 piano score. Other assertions retained.
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {pathToFileURL} = require('node:url');
const KEY = 'weiming-lantern-save-v1';
const url = process.env.GAME_URL || 'http://127.0.0.1:4173/';
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH || (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined)});
  const errors = [], external = [], measurements = {};
  const watch = p => {
    p.on('pageerror', e => errors.push(e.message));
    p.on('response', r => {if(r.status() >= 400)errors.push(r.url());});
    p.on('request', r => {if(/^https?:/.test(r.url()) && new URL(r.url()).origin !== new URL(url).origin)external.push(r.url());});
  };
  const out = path.join(__dirname, 'screenshots-v5');fs.mkdirSync(out,{recursive:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:960}, reducedMotion:'reduce'});watch(page);
    await page.addInitScript(() => {
      const Context = window.AudioContext || window.webkitAudioContext;
      window.audioContextCount = 0;
      window.AudioContext = class extends Context {constructor(...args){super(...args);window.audioContextCount++;}};
      const Audio = window.Audio;
      window.Audio = function(...args){const a = new Audio(...args);window.lastTape = a;return a;};
    });
    const act = (a,s='') => page.locator(`[data-action="${a}"]${s}`).first().click();
    const nav = v => act('nav',`[data-view="${v}"]`);
    const snap = () => page.evaluate(() => window.WeimingSound.snapshot());
    const state = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)),KEY);
    const slider = (channel,value) => page.locator(`#${channel}-range`).evaluate((e,value) => {e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));},value);
    const signal = async () => {
      await page.waitForTimeout(950);
      return page.evaluate(async () => {
        let sum = 0, peak = 0;
        for(let i=0;i<8;i++){
          const a=new Float32Array(window.WeimingSound.analyser.fftSize);
          window.WeimingSound.analyser.getFloatTimeDomainData(a);
          for(const v of a){sum+=v*v;peak=Math.max(peak,Math.abs(v));}
          await new Promise(r=>setTimeout(r,30));
        }
        return {rms:Math.sqrt(sum/(8*window.WeimingSound.analyser.fftSize)),peak};
      });
    };
    const visibility = hidden => page.evaluate(async hidden => {
      // Exercise our visibility event handler deterministically in headless Chrome.
      Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});
      document.dispatchEvent(new Event('visibilitychange'));
    },hidden);
    await page.goto(url);
    assert.equal((await snap()).enabled,false);
    assert.equal((await snap()).state,'not-created');
    assert.equal(await page.evaluate(() => window.audioContextCount),0,'no autoplay context');
    await act('sound');
    await page.waitForFunction(() => window.WeimingSound.snapshot().state === 'running');
    await page.waitForFunction(() => window.WeimingSound.snapshot().musicVoices === 1);
    assert.equal((await snap()).ambienceVoices,0);assert.equal((await snap()).noiseLoops,0);
    assert.equal(await page.evaluate(() => window.audioContextCount),1);
    measurements.defaultDesk = await signal();
    assert.ok(measurements.defaultDesk.rms > .00001,'enabled piano BGM must have signal');
    assert.ok(measurements.defaultDesk.peak < .25,'default is deliberately restrained');
    await act('settings');
    assert.match(await page.locator('.sound-readout').innerText(),/Haunting piano/);
    await page.locator('#volume-range').focus();await page.keyboard.press('Home');
    assert.equal((await state()).volume,0);
    assert.equal(await page.locator('#volume-level').innerText(),'0%');
    measurements.masterZero = await signal();assert.ok(measurements.masterZero.rms < .000001);
    await slider('volume',100);await slider('ambience',100);await slider('effects',100);
    measurements.maxDesk = await signal();assert.ok(measurements.maxDesk.peak < .7,'no clipping at max mixer');
    await slider('ambience',0);await slider('effects',0);
    await act('preview-sound');
    assert.equal((await snap()).activeEffects,0);
    measurements.bothBusesZero = await signal();assert.ok(measurements.bothBusesZero.rms < .000001);
    await slider('effects',65);await act('preview-sound');
    await page.waitForFunction(() => window.WeimingSound.snapshot().activeEffects === 0);
    await slider('ambience',55);await slider('volume',30);
    await page.screenshot({path:path.join(out,'sound-settings.png')});
    await act('close');
    await nav('messages');assert.equal((await snap()).profile,'message');
    await nav('board');assert.equal((await snap()).profile,'paper');
    await nav('forum');assert.equal((await snap()).profile,'desk');
    await nav('scene');assert.equal((await snap()).profile,'desk','a locked scene must not reveal its sound');
    for(let i=0;i<6;i++){await act('sound');await act('sound');}
    assert.equal(await page.evaluate(() => window.audioContextCount),1);
    await page.waitForFunction(() => window.WeimingSound.snapshot().musicVoices === 1);
    assert.equal((await snap()).ambienceVoices,0);assert.equal((await snap()).noiseLoops,0);
    await page.waitForTimeout(100);
    await page.evaluate(() => window.WeimingSound.cue('resolve'));
    await visibility(true);
    await page.waitForFunction(() => window.WeimingSound.snapshot().state === 'suspended');
    assert.equal((await snap()).activeEffects,0,'hidden tabs discard unfinished cues, not replay them on return');
    assert.equal(await page.locator('body').evaluate(e => e.classList.contains('page-hidden')),true);
    await visibility(false);
    await page.waitForFunction(() => window.WeimingSound.snapshot().state === 'running');
    // A muted tab never resumes itself on return.
    await act('sound');await visibility(true);await visibility(false);
    assert.equal((await snap()).state,'suspended');assert.equal((await snap()).enabled,false);
    await act('sound');await nav('forum');
    await act('settings');await slider('ambience',37);await slider('effects',42);await act('close');
    await page.reload();
    assert.equal((await snap()).state,'not-created','saved preference still requires a gesture');
    assert.equal((await snap()).ambience,.37);assert.equal((await snap()).effects,.42);
    await act('settings');await page.waitForFunction(() => window.WeimingSound.snapshot().state === 'running');
    await act('reset-confirm');await act('reset');
    assert.equal((await state()).ambience,37);assert.equal((await state()).effects,42,'reset keeps mixer preferences');
    // Give a disposable test save access to the original tape. No narrative data is changed.
    await page.evaluate(k => localStorage.setItem(k,JSON.stringify({...JSON.parse(localStorage.getItem(k)),clues:['lamp','custom','news','address','ledger','tape'],openedSafe:true})),KEY);
    await page.reload();await nav('scene');assert.equal((await snap()).profile,'rain');
    await act('hotspot','[data-id="safe"]');await act('play-tape');
    await page.waitForFunction(() => window.WeimingSound.snapshot().ducked);
    assert.equal(await page.evaluate(() => window.lastTape.paused),false);
    await visibility(true);
    assert.equal(await page.evaluate(() => window.lastTape.paused),true);
    assert.equal((await snap()).ducked,false);
    await visibility(false);assert.equal(await page.evaluate(() => window.lastTape.paused),true,'tape does not autoplay on return');
    await act('play-tape');await page.waitForFunction(() => window.WeimingSound.snapshot().ducked);
    await act('close');assert.equal(await page.evaluate(() => window.lastTape.paused),true);assert.equal((await snap()).ducked,false);
    // All scene profiles are driven by the actual current case/location.
    await page.evaluate(() => {
      for(const c of Object.values(window.CASES).filter(c => !c.legacy)){
        localStorage.setItem(`weiming-case-${c.id}-v1`,JSON.stringify({version:1,clues:Object.keys(c.clues),links:c.links.map(l=>l.id),read:[],asked:{},chats:{north:[],rain:[]},scene:[],puzzle:true,notes:'',ending:null,endings:['truth'],reportChecked:true}));
      }
    });
    const locations = [['lamplife','room'],['snow','snow'],['shadowplay','theatre'],['caravan','rain'],['wellpost','well']];
    for(const [id,profile] of locations){
      await act('casebook');await act('select-case',`[data-case="${id}"]`);await nav('scene');assert.equal((await snap()).profile,profile,id);
      await page.waitForFunction(() => window.WeimingSound.snapshot().musicVoices === 1);
    assert.equal((await snap()).ambienceVoices,0);assert.equal((await snap()).noiseLoops,0);
      await page.screenshot({path:path.join(out,`${id}-scene.png`)});
    }
    const secondScene = await page.evaluate(() => window.CASES.wellpost.scenes[1].id);
    await act('c-scene',`[data-id="${secondScene}"]`);assert.equal((await snap()).profile,'room');
    assert.equal(await page.locator('.scene-particles').evaluate(e => getComputedStyle(e).animationName),'none');
    assert.equal(await page.evaluate(() => window.audioContextCount),1);
    // Measure every profile at max gain, including an effect; software-level check, not a listening test.
    measurements.profiles = {};
    for(const profile of ['desk','paper','message','rain','well','room','snow','theatre','dawn']){
      await page.evaluate(profile => {const s=window.WeimingSound;s.configure({enabled:true,master:100,ambience:100,effects:100});s.setProfile(profile);},profile);
      const m = await signal();measurements.profiles[profile] = m;
      assert.ok(Number.isFinite(m.rms) && m.rms > .00001 && m.peak < .7,`${profile} must be audible, finite, bounded`);
    }
    measurements.effects = {};
    await page.evaluate(() => window.WeimingSound.configure({enabled:true,master:100,ambience:0,effects:100}));
    await page.waitForTimeout(500);
    for(const cue of ['page','inspect','stamp','message','resolve']){
      const m = await page.evaluate(async cue => {
        const s=window.WeimingSound;let peak=0,total=0;
        s.cue(cue);
        for(let i=0;i<48;i++){
          const data=new Float32Array(s.analyser.fftSize);s.analyser.getFloatTimeDomainData(data);
          for(const v of data){total+=v*v;peak=Math.max(peak,Math.abs(v));}
          await new Promise(r=>setTimeout(r,20));
        }
        return {peak,energy:total};
      },cue);
      assert.ok(m.energy>0 && m.peak<.7,`${cue} produces a bounded signal`);measurements.effects[cue]=m;
    }
    // Bounded effect lifetime, also when UI actions occur during case switches.
    await page.evaluate(async () => {
      for(let i=0;i<16;i++){window.WeimingSound.cue('resolve');await new Promise(r=>setTimeout(r,80));}
    });
    assert.ok((await snap()).activeEffects <= 6);
    await page.waitForTimeout(1000);assert.equal((await snap()).activeEffects,0);
    await page.close();

    const mobile = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});watch(mobile);
    await mobile.goto(url);await mobile.locator('[data-action="settings"]').click();
    await mobile.locator('[data-action="sound-settings"]').click();
    for(const channel of ['volume','ambience','effects']){
      const range=mobile.locator(`#${channel}-range`);await range.scrollIntoViewIfNeeded();
      const bounds=await range.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
    }
    await mobile.screenshot({path:path.join(out,'mobile-settings.png')});
    await mobile.keyboard.press('Escape');await mobile.screenshot({path:path.join(out,'mobile-forum.png')});
    await mobile.close();

    // Malformed/old saved preferences normalize without erasing case progress.
    const corrupt=await browser.newPage();watch(corrupt);await corrupt.goto(url);
    await corrupt.evaluate(k=>localStorage.setItem(k,JSON.stringify({version:1,clues:['lamp'],volume:200,ambience:-30,effects:'bad'})),KEY);await corrupt.reload();
    const c=await corrupt.evaluate(()=>window.WeimingSound.snapshot());
    assert.equal(c.master,1);assert.equal(c.ambience,0);assert.equal(c.effects,.65);assert.equal(c.state,'not-created');
    await corrupt.locator('[data-action="settings"]').click();assert.match(await corrupt.locator('.modal').innerText(),/1\/8 线索/);await corrupt.close();

    const unavailable=await browser.newPage();watch(unavailable);
    await unavailable.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
    await unavailable.goto(url);await unavailable.locator('[data-action="sound"]').click();
    assert.equal(await unavailable.evaluate(()=>window.WeimingSound.snapshot().enabled),false);
    await unavailable.locator('[data-action="post"][data-id="river"]').click();
    assert.ok(await unavailable.locator('.article-body').isVisible(),'audio failure never blocks reading');await unavailable.close();

    const offline=await browser.newPage();watch(offline);await offline.context().setOffline(true);
    await offline.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    assert.equal(await offline.evaluate(()=>typeof window.WeimingSound.configure),'function');
    assert.ok(await offline.evaluate(()=>[...document.styleSheets].some(s=>s.href?.endsWith('immersion.css'))));
    for(const texture of ['paper-fibers','archive-cloth']){
      assert.equal(await offline.evaluate(async name=>{const i=new Image();i.src=`assets/textures/${name}.webp`;await i.decode();return i.naturalWidth;},texture),512);
    }
    for(const scene of ['lamp','wall','mirror','wardrobe','well','postroom','gate','attic','bridal','caravan','snow','shadowplay']){
      const dimensions=await offline.evaluate(async name=>{const i=new Image();i.src=`assets/scenes/${name}.jpg`;await i.decode();return [i.naturalWidth,i.naturalHeight];},scene);
      assert.deepEqual(dimensions,[1920,1200],scene);
    }
    await offline.locator('[data-action="sound"]').click();await offline.waitForFunction(()=>window.WeimingSound.snapshot().state==='running');await offline.close();
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    fs.writeFileSync(path.join(__dirname,'immersion-v5-results.json'),JSON.stringify({measurements,errors,external,contexts:'one per loaded page',visibility:'synthetic browser event; handler + Web Audio suspend/resume verified',offline:true,mobile:true},null,2));
    console.log('PASS V5/V6.2: local surfaces, opt-in audio, mixer/zero volume, bounded signals/voices/effects, view context without restarting the music, tape duck/lifecycle, saved preferences, reduced motion, mobile and file://.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
