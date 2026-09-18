// Capture actual gameplay in an isolated browser profile. No player save is touched.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'../src/forum_system/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const folder=path.resolve(__dirname,'../assets/screenshots');fs.mkdirSync(folder,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173/');
 const act=(a,s='')=>page.locator(`[data-action="${a}"]${s}`).first().click();
 const nav=v=>act('nav',`[data-view="${v}"]`);
 const shot=async name=>{await page.waitForTimeout(300);await page.screenshot({path:path.join(folder,name+'.png')});};
 await shot('forum-home');await act('casebook');await shot('case-shelf');
 await act('select-case','[data-case="lamplife"]');await shot('serial-forum');
 for(const [id,clue] of [['opening','signal'],['customs','custom'],['archive','record'],['watch','schedule']]){
   await nav('forum');await act('c-post',`[data-id="${id}"]`);
   if(id==='opening')await shot('reading-post');
   await act('c-collect',`[data-id="${clue}"]`);
 }
 await nav('messages');await act('c-contact','[data-contact="north"]');await act('c-chat','[data-key="archive"]');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('weiming-case-lamplife-v1')).clues.includes('address'));
 await shot('private-message');await nav('scene');await shot('investigation');
 await act('c-hotspot','[data-id="trace"]');await act('c-field-collect','[data-id="trace"]');
 await nav('board');await shot('evidence-board');
 await act('settings');await shot('sound-settings');await act('close');
 await page.setViewportSize({width:390,height:844});await act('casebook');await act('select-case','[data-case="lantern"]');await shot('mobile-forum');
 if(errors.length)throw new Error(errors.join('\n'));console.log('Captured real forum -> post -> private message -> scene -> board sequence.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
