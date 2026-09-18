const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)});
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const url=process.env.GAME_URL||'http://127.0.0.1:4173';await p.goto(url);
 const fixture=await p.evaluate(()=>({cases:Object.fromEntries(Object.values(window.CASES).filter(c=>!c.legacy).map(c=>[c.id,{version:1,clues:Object.keys(c.clues),links:c.links.map(l=>l.id),read:[],asked:{},chats:{north:[],rain:[]},scene:[],puzzle:true,notes:'',ending:'silence',endings:['truth','silence'],reportChecked:true}]))}));
 await p.evaluate(f=>{for(const [id,s] of Object.entries(f.cases))localStorage.setItem(`weiming-case-${id}-v1`,JSON.stringify(s));localStorage.setItem('weiming-active-case','mirrorname');},fixture);
 for(const choice of ['truth','silence']){
  await p.evaluate(choice=>{const k='weiming-case-lamplife-v1';const s=JSON.parse(localStorage.getItem(k));s.ending=choice;localStorage.setItem(k,JSON.stringify(s));},choice);await p.reload();assert.match(await p.locator('.handoff-note summary').innerText(),choice==='truth'?/公开核验/:/暂缓公开/);
 }
 // Corrupted but versioned data must not break the active case or use arbitrary counts to grant an ending.
 await p.evaluate(()=>{localStorage.setItem('weiming-active-case','lamplife');localStorage.setItem('weiming-case-lamplife-v1',JSON.stringify({version:1,clues:['not-a-clue'],links:['mechanism'],scene:22,read:null,chats:{north:[{},'missing']},asked:{opening:[999,-1,{},'x']},ending:'truth',endings:['truth'],notes:{}}));});await p.reload();
 assert.equal(await p.locator('[data-action="c-post"][data-id="dispute"]').count(),0);
 const inject=async(action,id)=>p.evaluate(({action,id})=>{const b=document.createElement('button');b.dataset.action=action;b.dataset.id=id;document.body.appendChild(b);b.click();b.remove();},{action,id});
 await inject('c-post','followup');assert.equal(await p.locator('.thread-header').count(),0);
 await inject('c-field-collect','sealed');await inject('c-collect','echo');
 // Stored raw corruption is read-only until next save; inspect rendered state, not untouched disk bytes.
 assert.match(await p.locator('.terminal-status').innerText(),/0 份线索/);
 await p.locator('[data-action="settings"]').first().click();await p.locator('[data-action="reset-confirm"]').click();await p.locator('[data-action="reset"]').click();
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('weiming-case-lamplife-v1')).clues.length),0);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('weiming-case-mirrorname-v1')).clues.length),12);
 // Storage-disabled browsers still render and allow the first new case to be read.
 const blocked=await browser.newPage();blocked.on('pageerror',e=>errors.push(e.message));await blocked.addInitScript(()=>{Storage.prototype.getItem=function(){throw new DOMException('Denied','SecurityError')};Storage.prototype.setItem=function(){throw new DOMException('Denied','SecurityError')};});await blocked.goto(url);await blocked.locator('[data-action="casebook"]').first().click();await blocked.locator('[data-action="select-case"][data-case="lamplife"]').click();assert.match(await blocked.locator('#content').innerText(),/照溪/);assert.match(await blocked.locator('.save-label').innerText(),/存储不可用/);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: both handoff branches, corrupted save normalization, event-level reveal/acquisition guards, reset isolation, storage denied rendering.');
})().catch(e=>{console.error(e);process.exit(1)});
