// V5 freeze regression: corrupt/imported IDs are never Object.prototype members.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)});
 try {
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url=process.env.GAME_URL||'http://127.0.0.1:4173';
  await page.goto(url);
  const empty={version:1,clues:[],links:[],chats:{north:[],rain:[]}};
  for(const id of ['__proto__','constructor','toString','hasOwnProperty']){
   await page.evaluate(({id,empty})=>{
    localStorage.clear(); // Isolated test context only, never the user's browser profile.
    localStorage.setItem('weiming-active-case',id);
    localStorage.setItem(window.ForumConfig.legacySaveKey,JSON.stringify({...empty,clues:[id],ending:id,endings:[id]}));
   },{id,empty});
   await page.reload();
   await page.locator('[data-action="settings"]').first().click();
   const download=page.waitForEvent('download');await page.locator('[data-action="export-save"]').click();
   const saved=JSON.parse(fs.readFileSync(await (await download).path(),'utf8'));
   assert.deepEqual(saved.clues,[]);assert.deepEqual(saved.endings,[]);assert.equal(saved.ending,null);
   await page.locator('#import-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'weiming-case',version:1,caseId:id,state:empty}))});
   await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('无法读取存档'));
   assert.equal(await page.locator('#confirm-import').count(),0);
   await page.reload();
   await page.locator('[data-action="settings"]').first().click();
   await page.locator('#import-file').setInputFiles({name:'library.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'weiming-library',version:4,activeCase:id,lantern:empty,cases:{}}))});
   await page.locator('#confirm-import').click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('weiming-active-case')),'lantern');
  }
  await page.evaluate(empty=>{
   localStorage.setItem('weiming-active-case','lamplife');
   localStorage.setItem('weiming-case-lamplife-v1',JSON.stringify({...empty,clues:['constructor','toString'],chats:{north:['constructor',{},null],rain:['__proto__']}}));
  },empty);
  await page.reload();await page.locator('[data-action="settings"]').first().click();
  const downloaded=page.waitForEvent('download');await page.locator('[data-action="export-save"]').click();
  const state=JSON.parse(fs.readFileSync(await (await downloaded).path(),'utf8')).state;
  assert.deepEqual(state.clues,[]);assert.deepEqual(state.chats,{north:[],rain:[]});
  assert.deepEqual(errors,[]);
  console.log('PASS: special active IDs, legacy ending/clue IDs, rejected single-case imports, library fallback, dialogue normalization; no page errors.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
