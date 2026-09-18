const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const ctx=vm.createContext({window:{}});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [,file] of html.matchAll(/<script src="([^"]+)"/g)){
 if(file==='app.js')break;assert.ok(fs.existsSync(path.join(root,file)),file);
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
 if(file.endsWith('registry.js'))ctx.addForumCase=ctx.window.addForumCase;
}
const cases=ctx.window.CASES;assert.equal(Object.keys(cases).length,9);
for(const c of Object.values(cases)){
 if(c.legacy)continue;
 const clues=new Set(Object.keys(c.clues)),linkIds=new Set(c.links.map(l=>l.id));assert.equal(linkIds.size,c.links.length);
 const requirements=o=>{for(const id of o.requires||[])assert.ok(clues.has(id),`${c.id} bad clue requirement ${id}`);for(const id of o.requiresLinks||[])assert.ok(linkIds.has(id),`${c.id} bad link requirement ${id}`)};
 const posts=new Set();for(const p of c.posts){assert.ok(!posts.has(p.id));posts.add(p.id);requirements(p);assert.ok(p.body.length>=2 && p.body.every(t=>typeof t==="string" && t.length>10));if(p.clue)assert.ok(clues.has(p.clue));for(const q of p.questions)assert.ok(q.q&&q.a);assert.ok(p.category&&p.label&&!p.time.includes('undefined'));}
 for(const l of c.links){assert.equal(l.pair.length,2);for(const id of l.pair)assert.ok(clues.has(id));if(c.series){assert.ok(l.inference.options.some(o=>o[0]===l.inference.answer));assert.ok(l.inference.error)}}
 for(const ct of Object.values(c.contacts))for(const d of Object.values(ct.dialogue)){requirements(d);if(d.clue)assert.ok(clues.has(d.clue));}
 const scenes=c.scenes||[c.scene];for(const sc of scenes){requirements(sc);assert.ok(fs.existsSync(path.join(root,sc.art||c.art)));for(const h of sc.hotspots){requirements(h);assert.ok(clues.has(h.id));assert.ok(h.x>0&&h.x<100&&h.y>0&&h.y<100)}}
 for(const q of [...c.puzzle.fields,...c.report])assert.ok(q.options.some(o=>o[0]===q.answer),`${c.id}/${q.id} missing answer`);
 requirements(c.puzzle);
 // Fixed-point reachability, starting with zero clues and zero interpretations.
 const known=new Set(),solved=new Set(),ok=o=>(o.requires||[]).every(x=>known.has(x))&&(o.requiresLinks||[]).every(x=>solved.has(x));
 let last=-1;
 for(let step=0;step<100&&known.size+solved.size!==last;step++){
  last=known.size+solved.size;
  for(const p of c.posts)if(p.clue&&ok(p))known.add(p.clue);
  for(const ct of Object.values(c.contacts))for(const d of Object.values(ct.dialogue))if(d.clue&&ok(d))known.add(d.clue);
  const access=c.sceneRequires?c.sceneRequires.every(x=>known.has(x)):known.size>=5;
  if(access)for(const sc of scenes)if(ok(sc))for(const h of sc.hotspots)if(ok(h)&&(!h.puzzle||ok(c.puzzle)))known.add(h.id);
  for(const l of c.links)if(l.pair.every(x=>known.has(x)))solved.add(l.id);
 }
 assert.equal(known.size,clues.size,`${c.id} unreachable clues`);assert.equal(solved.size,c.links.length,`${c.id} unreachable deductions`);
 if(c.series){assert.equal(c.posts.length,8);assert.equal(clues.size,12);assert.equal(scenes.length,2);if(c.previousCase)assert.equal(cases[c.previousCase].nextCase,c.id)}
 console.log(c.id,`PASS: ${known.size} clues reachable; ${solved.size} links, assets, references and answers valid`);
}
console.log('PASS: all nine case definitions and all eight anthology progression graphs.');
