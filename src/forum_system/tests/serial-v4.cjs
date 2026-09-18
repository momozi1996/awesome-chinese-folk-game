const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)});
 const page=await browser.newPage({viewport:{width:1440,height:960}}), errors=[], responses=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)responses.push(r.url())});
 const root=process.env.GAME_URL||'http://127.0.0.1:4173';await page.goto(root);
 await page.evaluate(()=>localStorage.clear());await page.reload();
 const act=async(a,s='')=>page.locator(`[data-action="${a}"]${s}`).first().click();
 const nav=async v=>act('nav',`[data-view="${v}"]`);
 const state=id=>page.evaluate(id=>JSON.parse(localStorage.getItem(`weiming-case-${id}-v1`)),id);
 const close=async()=>{if(await page.locator('.modal').count())await act('close')};
 const folder=path.join(__dirname,'screenshots-v4');fs.mkdirSync(folder,{recursive:true});
 await act('casebook');assert.equal(await page.locator('.case-card').count(),9);
 assert.equal(await page.locator('.serial-case:disabled').count(),3);
 await page.screenshot({path:path.join(folder,'01-shelf.png')});
 const ids=['lamplife','mirrorname','wellpost','homecoming'];
 const manifests=await page.evaluate(ids=>ids.map(id=>({id,...window.CASES[id]})),ids);
 for(const c of manifests){
  await act('select-case',`[data-case="${c.id}"]`);
  assert.equal(await page.locator('[data-action="c-post"][data-id="dispute"]').count(),0,'must not leak dispute');
  assert.equal(await page.locator('[data-action="c-post"][data-id="followup"]').count(),0,'must not leak ending');
  if(c.previousCase)assert.match(await page.locator('.handoff-note').innerText(),/暂缓公开/);
  await nav('scene');assert.match(await page.locator('#content').innerText(),/许可尚未确认/);
  // Take the four initial materials through the actual forum buttons.
  for(const [p,clue] of [['opening','signal'],['customs','custom'],['archive','record'],['watch','schedule']]){
   await nav('forum');await act('c-post',`[data-id="${p}"]`);if(await page.locator('[data-action="c-ask"]:not(:disabled)').count()){await act('c-ask');assert.ok((await state(c.id)).asked[p].length);}await act('c-collect',`[data-id="${clue}"]`);
  }
  await nav('scene');assert.match(await page.locator('#content').innerText(),/许可尚未确认/,'four clues do not grant address');
  const chat=async(who,key,clue)=>{
   await nav('messages');await act('c-contact',`[data-contact="${who}"]`);await act('c-chat',`[data-key="${key}"]`);
   await page.waitForFunction(({id,clue})=>JSON.parse(localStorage.getItem(`weiming-case-${id}-v1`)).clues.includes(clue),{id:c.id,clue});
  };
  await chat('north','archive','address');await nav('scene');
  assert.equal(await page.locator('.scene-tabs button:disabled').count(),1);
  await page.screenshot({path:path.join(folder,`${c.id}-scene-a.png`)});
  for(const h of ['trace','register']){await act('c-hotspot',`[data-id="${h}"]`);await act('c-field-collect',`[data-id="${h}"]`)}
  const solveLink=async(l,wrongFirst=false)=>{
   await nav('board');await act('c-select',`[data-id="${l.pair[0]}"]`);await act('c-select',`[data-id="${l.pair[1]}"]`);await act('c-connect');
   if(wrongFirst){const wrong=l.inference.options.find(o=>o[0]!==l.inference.answer)[0];await page.locator(`[name="inference"][value="${wrong}"]`).check();await page.locator('[data-form="case-inference"] button').click();assert.ok(await page.locator('#inference-error').innerText());assert.ok(!(await state(c.id)).links.includes(l.id));}
   await page.locator(`[name="inference"][value="${l.inference.answer}"]`).check();await page.locator('[data-form="case-inference"] button').click();await close();
  };
  await solveLink(c.links[0],true);await nav('scene');assert.equal(await page.locator('.scene-tabs button:disabled').count(),1,'one link not enough');
  await solveLink(c.links[1]);await nav('forum');assert.ok(await page.locator('[data-action="c-post"][data-id="dispute"]').count());
  await act('c-post','[data-id="dispute"]');await act('c-collect','[data-id="contradiction"]');
  await nav('scene');await act('c-scene',`[data-id="${c.scenes[1].id}"]`);
  assert.equal(await page.locator('.hotspot[data-id="transfer"]').count(),0,'locked physical clue hidden');
  await page.screenshot({path:path.join(folder,`${c.id}-scene-b.png`)});
  await act('c-hotspot','[data-id="sealed"]');await act('c-puzzle');
  if(c.puzzle.experiment==='mirror'){await page.locator('#mirror-position').focus();await page.keyboard.press('ArrowLeft');assert.match(await page.locator('#optic-result').innerText(),/左侧/);await page.screenshot({path:path.join(folder,'mirror-experiment.png')});}
  // Wrong puzzle is recoverable, all evidence preserved.
  for(const f of c.puzzle.fields)await page.locator(`[data-form="case-puzzle"] [name="${f.id}"]`).selectOption(f.options.find(o=>o[0]!==f.answer)[0]);
  await page.locator('[data-form="case-puzzle"] button').click();assert.ok(await page.locator('#case-puzzle-error').innerText());
  assert.equal((await state(c.id)).puzzle,false);
  for(const f of c.puzzle.fields)await page.locator(`[data-form="case-puzzle"] [name="${f.id}"]`).selectOption(f.answer);
  await page.locator('[data-form="case-puzzle"] button').click();await act('c-field-collect','[data-id="sealed"]');
  await act('c-hotspot','[data-id="transfer"]');await act('c-field-collect','[data-id="transfer"]');
  await chat('rain','identity','witness');await nav('forum');await act('c-post','[data-id="followup"]');await act('c-collect','[data-id="echo"]');
  for(const l of c.links.slice(2))await solveLink(l,true);
  assert.equal((await state(c.id)).clues.length,12);assert.equal((await state(c.id)).links.length,6);
  await nav('board');await act('c-report');
  for(const q of c.report)await page.locator(`[data-form="case-report"] [name="${q.id}"]`).selectOption(q.options.find(o=>o[0]!==q.answer)[0]);
  await page.locator('[data-form="case-report"] button').click();assert.ok(await page.locator('#case-report-error').innerText());
  for(const q of c.report)await page.locator(`[data-form="case-report"] [name="${q.id}"]`).selectOption(q.answer);
  await page.locator('[data-form="case-report"] button').click();await act('c-ending','[data-ending="truth"]');
  assert.equal((await state(c.id)).ending,'truth');await page.screenshot({path:path.join(folder,`${c.id}-ending.png`)});
  await act('c-report');for(const q of c.report)await page.locator(`[data-form="case-report"] [name="${q.id}"]`).selectOption(q.answer);
  await page.locator('[data-form="case-report"] button').click();await act('c-ending','[data-ending="silence"]');
  assert.equal((await state(c.id)).endings.length,2);
  await page.reload();assert.equal((await state(c.id)).ending,'silence');
  await act('casebook');console.log(c.id,'PASS: gates, 12 clues, two scenes, six interpreted links, wrong answers, both endings, reload');
 }
 // All-case export/import and current-case reset do not alter another save.
 await act('select-case','[data-case="homecoming"]');await act('settings');
 const downloadPromise=page.waitForEvent('download');await act('export-library');const download=await downloadPromise;
 const backup=path.join(__dirname,'v4-save-fixture.json');await download.saveAs(backup);const raw=JSON.parse(fs.readFileSync(backup));assert.equal(Object.keys(raw.cases).length,8);
 await act('reset-confirm');await act('reset');assert.equal((await state('homecoming')).clues.length,0);assert.equal((await state('lamplife')).clues.length,12);
 await act('settings');await page.locator('#import-file').setInputFiles(backup);await page.locator('#confirm-import').click();assert.equal((await state('homecoming')).clues.length,12);
 // New-case single export round trip.
 await act('settings');const dp=page.waitForEvent('download');await act('export-save');const dl=await dp;const single=path.join(__dirname,'v4-single-fixture.json');await dl.saveAs(single);await close();
 await act('settings');await page.locator('#import-file').setInputFiles(single);await page.locator('#confirm-import').click();assert.equal((await state('homecoming')).ending,'silence');
 // Bad scalar arrays normalize safely, unknown envelopes do not replace progress.
 const before=await state('homecoming');await act('settings');await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'weiming-case',version:1,caseId:'no-case',state:before}))});assert.deepEqual(await state('homecoming'),before);await close();
 for(const width of [375,390,768,1440]){
  await page.setViewportSize({width,height:900});
  for(const c of manifests){await act('casebook');await act('select-case',`[data-case="${c.id}"]`);for(const view of ['forum','messages','board','scene']){
   await nav(view);const metrics=await page.evaluate(()=>({w:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(metrics.scroll<=metrics.w+1,`${width} ${c.id}/${view} overflow`);
   if(view==='scene'){await act('c-scene',`[data-id="${c.scenes[1].id}"]`);await act('c-hotspot','[data-id="sealed"]');await close();}
  }
  if(width===390)await page.screenshot({path:path.join(folder,`${c.id}-mobile.png`)});
  }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(responses,[]);
 const offline=await browser.newPage();await offline.goto('file://'+path.resolve(__dirname,'../index.html'));assert.equal(await offline.evaluate(()=>Object.keys(window.CASES).length),9);await offline.locator('[data-action="casebook"]').first().click();await offline.locator('[data-action="select-case"][data-case="lamplife"]').click();assert.match(await offline.locator('#content').innerText(),/照溪/);
 const imageOK=await offline.evaluate(async()=>{const i=new Image();i.src='assets/scenes/lamp.jpg';await i.decode();return i.naturalWidth});assert.equal(imageOK,1920);
 fs.writeFileSync(path.join(__dirname,'v4-results.json'),JSON.stringify({cases:ids,scenes:8,clues:48,interpretedLinks:24,endings:8,viewChecks:64,errors,assetErrors:responses,offline:true,saveRoundtrip:true},null,2));
 await browser.close();console.log('PASS V4: four connected cases, full UI path, gates/no spoilers, mistakes, archive imports, 64 responsive views, offline assets, no errors');
})().catch(e=>{console.error(e);process.exit(1)});
