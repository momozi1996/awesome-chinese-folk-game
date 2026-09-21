/* V6.1 narrative director. Presentation-only; bounded triggers, no puzzle writes. */
(() => {
  'use strict';
  if(typeof document==='undefined') return;
  const entries=window.WeimingReadings?.readings || [], byId=new Map(entries.map(c=>[c.id,c]));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KEY='weiming-narrative-v1',SEEN='weiming-narrative-seen-v1';
  const preferences={mode:'gentle',auto:true,voiceAuto:false,volume:70,rate:1};
  let seen=new Set();
  try {
    const s=JSON.parse(localStorage.getItem(KEY));
    if(['gentle','suspense','off'].includes(s?.mode)) preferences.mode=s.mode;
    for(const k of ['auto','voiceAuto']) if(typeof s?.[k]==='boolean') preferences[k]=s[k];
    if(Number.isFinite(s?.volume)) preferences.volume=Math.max(0,Math.min(100,s.volume));
    if(Number.isFinite(s?.rate)) preferences.rate=Math.max(.85,Math.min(1.15,s.rate));
    const raw=JSON.parse(localStorage.getItem(SEEN));
    if(Array.isArray(raw)) seen=new Set(raw.filter(id=>byId.has(id)));
  } catch {}
  let current=null, eligible=new Set(), scheduled=0, expiry=0, lastAutomatic=-Infinity, automaticCount=0;
  let overlay=null, audio=null, audioId=null, audioToken=0, voiceState='idle', voiceMessage='', hooks={}, enabled=false, master=.3;
  let manualReturn=null, overlayManual=false, allowedMotion=true, modalReading=null, ownsDuck=false;
  const motion=()=>allowedMotion&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(preferences));localStorage.setItem(SEEN,JSON.stringify([...seen]));}catch{}};
  const cueFor=(caseId,kind,source)=>entries.find(c=>c.caseId===caseId&&c.kind===kind&&c.source===source);
  function root(){let e=document.getElementById('narrative-root');if(!e){e=document.createElement('div');e.id='narrative-root';document.body.append(e);}return e;}
  function playerRoot(){let e=document.getElementById('voice-root');if(!e){e=document.createElement('div');e.id='voice-root';document.body.append(e);}return e;}
  const time=n=>`${Math.floor((n||0)/60)}:${String(Math.floor((n||0)%60)).padStart(2,'0')}`;
  function controls(c){return `<div class="reading-controls"><button id="reading-film-${c.id}" class="btn" data-narrative="replay" data-reading="${c.id}" ${preferences.mode==='off'?'disabled':''}>◇ 重看片段</button><button id="reading-play-${c.id}" class="btn" data-narrative="listen" data-reading="${c.id}">▷ ${enabled?'朗读节选':'开启声音并朗读'}</button></div>`;}
  function strip(c){return `<section class="reading-strip" data-reading-strip="${c.id}" aria-label="叙事片段与原文朗读"><div class="reading-mark" aria-hidden="true">声</div><div class="reading-copy"><small>夜读片段 / ${esc(c.label)}</small><p>灯影为阅读意象 · 原文合成旁读</p></div>${controls(c)}<details class="reading-transcript"><summary>节选文字 · ${Math.ceil(c.duration)} 秒</summary><p>${esc(c.text)}</p></details></section>`;}
  function closeFilm(restore=true){
    clearTimeout(scheduled);scheduled=0;clearTimeout(expiry);expiry=0;
    const voiceRoot=document.getElementById('voice-root');
    const focusInside=overlay?.contains(document.activeElement)&&!voiceRoot?.contains(document.activeElement);
    if(overlay?.contains(voiceRoot))document.body.append(voiceRoot);
    const old=overlay;overlay=null;document.body.classList.remove('narrative-dim');
    if(old&&restore&&motion()){old.inert=true;old.setAttribute('aria-hidden','true');old.animate([{opacity:1},{opacity:0,transform:'translateY(-6px)'}],{duration:180,easing:'ease-out',fill:'forwards'}).finished.then(()=>{old.remove();if(!overlay)root().className='';});}
    else {old?.remove();root().className='';}
    if(restore&&focusInside){const target=manualReturn?.isConnected?manualReturn:document.querySelector('#content');target?.focus({preventScroll:true});}
    manualReturn=null;overlayManual=false;
  }
  function show(id,manual=false){
    const c=byId.get(id);if(!c||!eligible.has(id)||preferences.mode==='off'||document.hidden||document.querySelector('.modal'))return;
    closeFilm(false);
    if(manual)manualReturn=document.activeElement;
    overlayManual=manual;
    const animated=motion();
    root().replaceChildren();
    root().className=`narrative-stage ${manual?'manual':''} ${preferences.mode} ${animated?'animated':'still'} theme-${c.visual}`;
    overlay=document.createElement('section');overlay.className='narrative-film';overlay.setAttribute('role','region');overlay.setAttribute('aria-label',`${c.label} · 可跳过的阅读意象`);overlay.dataset.cue=id;
    overlay.innerHTML=`${window.WeimingNarrativeArt.render(c.visual)}<div class="n-film-shade"></div><header class="n-film-top"><span>未明 / 夜读片段 <em>非新增线索</em></span><button data-narrative="close" aria-label="跳过叙事片段">${manual?'收起':'跳过'} · Esc ×</button></header><div class="n-film-copy"><span class="n-film-index">${esc(c.caseId==='lantern'?'南湾异闻':'未明旧案')} / ${String(entries.indexOf(c)+1).padStart(2,'0')}</span><h2>${esc(c.label)}</h2><div class="n-film-line"></div><blockquote>${esc(c.text)}</blockquote><span class="n-film-source">节选自「${esc(c.title)}」</span></div><footer class="n-film-footer"><span>${animated?(preferences.mode==='suspense'?'微恐 · 单次灯暗，无闪烁':'轻柔 · 灯影与纸页'):'静态片段 · 已减少动态'}</span><button data-narrative="listen" data-reading="${c.id}">▷ ${enabled?'朗读节选':'开启声音并朗读'}</button><button data-narrative="disable-auto">不再自动演出</button></footer><div class="n-film-progress" aria-hidden="true"></div>`;
    root().append(overlay);
    if(audioId)overlay.append(playerRoot());
    if(enabled&&master>0)window.WeimingSound?.cue(c.visual==='letter'?'page':'inspect');
    if(preferences.mode==='suspense'&&animated) document.body.classList.add('narrative-dim');
    if(manual)overlay.querySelector('[data-narrative="close"]').focus({preventScroll:true});
    else {seen.add(id);persist();lastAutomatic=performance.now();automaticCount++;}
    // Automatic films never hold the player hostage; manual replay can be read at leisure.
    if(!manual)expiry=setTimeout(()=>closeFilm(),5200);
    if(preferences.voiceAuto&&enabled&&master>0&&!audio)play(id,false);
    updateVoice();
  }
  function schedule(c){
    if(!preferences.auto||preferences.mode==='off'||!motion()||seen.has(c.id)||automaticCount>=3||performance.now()-lastAutomatic<90000)return;
    const key=current.key;
    scheduled=setTimeout(()=>{
      scheduled=0;
      if(current?.key!==key||document.hidden||document.querySelector('.modal')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||audio)return;
      show(c.id);
    },1000);
  }
  function after(ctx){
    const key=[ctx.caseId,ctx.view,ctx.detail||''].join(':');
    const changed=current?.key!==key;
    if(changed){closeFilm(false);stopVoice(false);}
    eligible=new Set();current={...ctx,key};
    if(ctx.view==='post'&&document.querySelector('.article-body')){
      const c=cueFor(ctx.caseId,'post',ctx.detail);
      if(c){eligible.add(c.id);document.querySelector('.thread-header')?.insertAdjacentHTML('afterend',strip(c));if(changed)schedule(c);}
    }
    if(ctx.view==='board'){
      (ctx.selected||[]).forEach((id,i)=>{const c=cueFor(ctx.caseId,'clue',id),card=document.querySelectorAll('.compare-card')[i];if(c&&card){eligible.add(c.id);card.insertAdjacentHTML('beforeend',`<button class="clue-reading" data-narrative="listen" data-reading="${c.id}">▷ ${enabled?'朗读证据':'开启声音并朗读证据'}</button>`);}});
    }
    if(document.querySelector('.modal')) eligible=new Set(modalReading?[modalReading]:[]);
    if(audioId&&!eligible.has(audioId))stopVoice(false);
    updateVoice();
  }
  function modalClue(caseId,id){const c=cueFor(caseId,'clue',id);if(!c||!document.querySelector('.modal'))return;modalReading=c.id;eligible=new Set([c.id]);document.querySelector('.modal-body')?.insertAdjacentHTML('afterbegin',`<div class="clue-voice-strip"><span>原文旁读 · 合成语音，非现场录音</span><button class="btn" data-narrative="listen" data-reading="${c.id}">▷ ${enabled?'朗读证据':'开启声音并朗读证据'}</button></div>`);}
  function modal(){closeFilm(false);stopVoice(false);modalReading=null;eligible=new Set();}
  function dismissModal(){
    modalReading=null;eligible=new Set();
    document.querySelectorAll('#content [data-narrative][data-reading]').forEach(b=>{
      if(byId.has(b.dataset.reading))eligible.add(b.dataset.reading);
      if(b.dataset.narrative==='replay')b.disabled=preferences.mode==='off';
    });
    updateVoice();
  }
  function duck(value){
    if(value){ownsDuck=true;window.WeimingSound?.duck(true);}
    else if(ownsDuck){ownsDuck=false;window.WeimingSound?.duck(false);}
  }
  function volume(){return Math.max(0,Math.min(1,master*preferences.volume/100));}
  function sync(s){enabled=!!s.enabled;master=Number.isFinite(s.master)?Math.max(0,Math.min(100,s.master))/100:master;allowedMotion=!!s.motion;if((!enabled||!master)&&audio)stopVoice();else if(audio)audio.volume=volume();if(!motion())closeFilm();updateVoice();}
  function stopVoice(restore=true){
    const focused=playerRoot().contains(document.activeElement),id=audioId;
    audioToken++;
    if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null;}
    audioId=null;voiceState='idle';voiceMessage='';duck(false);
    playerRoot().replaceChildren();updateVoice();
    if(restore&&focused){
      const host=document.querySelector('.modal')||overlay||document;
      const target=[...host.querySelectorAll('[data-narrative="listen"]')].find(b=>b.dataset.reading===id&&!b.closest('#voice-root'))||document.querySelector('.modal-close,#content');
      target?.focus({preventScroll:true});
    }
  }
  function updateVoice(){
    document.querySelectorAll('[data-narrative="listen"]').forEach(b=>{
      const active=b.dataset.reading===audioId;
      b.textContent=active&&voiceState==='playing'?'Ⅱ 暂停旁读':active&&voiceState==='paused'?'▷ 继续旁读':active&&voiceState==='loading'?'准备旁读…':`▷ ${enabled?'朗读节选':'开启声音并朗读'}`;
      b.setAttribute('aria-pressed',String(active&&voiceState==='playing'));
    });
    const p=playerRoot();if(!p.firstElementChild)return;
    const progress=p.querySelector('progress');if(progress){progress.max=Number.isFinite(audio?.duration)?audio.duration:byId.get(audioId)?.duration||1;progress.value=audio?.currentTime||0;}
    const readout=p.querySelector('.voice-time');if(readout)readout.textContent=`${time(audio?.currentTime)} / ${time(Number.isFinite(audio?.duration)?audio.duration:byId.get(audioId)?.duration)}`;
    const status=p.querySelector('.voice-state');if(status)status.textContent=voiceMessage||({loading:'准备本地旁读',playing:'正在旁读 · 合成语音',paused:'已暂停 · 手动继续',error:'音频未能播放，可重试或阅读字幕'}[voiceState]||'旁读已结束');
    const button=p.querySelector('[data-narrative="pause"]');if(button){button.textContent=voiceState==='paused'?'继续':voiceState==='error'?'重试':'暂停';button.disabled=voiceState==='loading';}
  }
  function mountPlayer(c){
    playerRoot().innerHTML=`<section class="voice-player" role="region" aria-label="原文旁读播放器"><header><span class="voice-state" role="status">准备本地旁读</span><button data-narrative="stop" aria-label="停止并关闭旁读">×</button></header><small>${esc(c.title)} · TTS 合成语音 / 非现场录音</small><p class="voice-subtitle">${esc(c.text)}</p><footer><button data-narrative="pause">暂停</button><button data-narrative="restart">重播</button><progress max="${c.duration}" value="0" aria-label="旁读播放进度"></progress><span class="voice-time">0:00 / ${time(c.duration)}</span></footer></section>`;
    // A clue modal owns its own voice player so the existing focus trap remains valid.
    const target=document.querySelector('.modal-body')||overlay;
    (target||document.body).append(playerRoot());
  }
  async function play(id,gesture=true){
    if(!eligible.has(id)||document.hidden)return;
    if(audioId===id&&(voiceState==='playing'||voiceState==='paused')){await pauseResume();return;}
    const key=current?.key,requestToken=audioToken;
    if(!enabled){
      if(!gesture)return;
      await hooks.enableSound?.();
      if(!enabled||audioToken!==requestToken||current?.key!==key||!eligible.has(id)||document.hidden)return;
    }
    if(!master||!preferences.volume){voiceMessage='旁读音量为零，请在存档 / 设置中调高总音量或旁读音量。';notice(voiceMessage);return;}
    const focusControl=playerRoot().contains(document.activeElement)?document.activeElement.dataset.narrative:null;
    stopVoice(false);hooks.beforeVoice?.();
    const c=byId.get(id),token=++audioToken;
    if(!c)return;
    audioId=id;voiceState='loading';voiceMessage='';
    const a=audio=new Audio();a.preload='none';a.volume=volume();a.defaultPlaybackRate=preferences.rate;a.playbackRate=preferences.rate;a.preservesPitch=true;
    mountPlayer(c);updateVoice();
    if(focusControl){const target=playerRoot().querySelector(`[data-narrative="${focusControl}"]`);(target?.disabled?playerRoot().querySelector('[data-narrative=stop]'):target)?.focus({preventScroll:true});}
    const failed=()=>{if(token!==audioToken)return;a.pause();voiceState='error';voiceMessage='本地音频未能播放。可重试；原文仍完整保留。';duck(false);updateVoice();};
    a.addEventListener('error',failed);
    a.addEventListener('timeupdate',()=>{if(token===audioToken)updateVoice();});
    a.addEventListener('ended',()=>{if(token===audioToken)stopVoice();});
    a.src=c.audio;
    try{await a.play();if(token!==audioToken||document.hidden){a.pause();return;}voiceState='playing';duck(true);updateVoice();}
    catch{failed();}
  }
  function notice(text){const strip=document.querySelector('.reading-strip,.clue-voice-strip');if(strip){let e=strip.querySelector('.reading-notice');if(!e){e=document.createElement('p');e.className='reading-notice';e.setAttribute('role','status');strip.append(e);}e.textContent=text;}}
  async function pauseResume(){
    if(!audio||document.hidden)return;
    if(voiceState==='playing'){audio.pause();voiceState='paused';duck(false);updateVoice();return;}
    if(voiceState==='error'){const id=audioId;await play(id);return;}
    const a=audio,token=audioToken;
    try{await a.play();if(token!==audioToken||document.hidden){a.pause();return;}voiceState='playing';voiceMessage='';duck(true);updateVoice();}catch{if(token===audioToken){voiceState='error';updateVoice();}}
  }
  function settings(){return `<section class="narrative-settings"><h3>夜读演出与旁读</h3><p>图像是阅读意象，不是额外证据；无贴脸、尖叫或频闪。自动演出每段一次，至少间隔 90 秒，每次打开游戏最多 3 段。</p><div class="setting-row"><label for="narrative-mode">演出强度<small>减少动态时不自动演出，手动回看为静态</small></label><select id="narrative-mode"><option value="gentle" ${preferences.mode==='gentle'?'selected':''}>轻柔 · 灯影纸页</option><option value="suspense" ${preferences.mode==='suspense'?'selected':''}>微恐 · 短暂灯暗</option><option value="off" ${preferences.mode==='off'?'selected':''}>关闭演出</option></select></div><div class="setting-row"><span>阅读时自动演出<small>关闭后可用帖子中的「重看片段」</small></span><button class="toggle" data-narrative="auto" aria-pressed="${preferences.auto}">${preferences.auto?'开启':'关闭'}</button></div><div class="setting-row"><span>片段自动旁读<small>默认关闭；仅在声音已开启时随片段播放</small></span><button class="toggle" data-narrative="voice-auto" aria-pressed="${preferences.voiceAuto}">${preferences.voiceAuto?'开启':'关闭'}</button></div><div class="setting-row"><label for="narrative-volume">旁读音量 <output>${preferences.volume}%</output><small>与总音量相乘；静音、切页、后台立即停止</small></label><input id="narrative-volume" type="range" min="0" max="100" value="${preferences.volume}"></div><div class="setting-row"><label for="narrative-rate">旁读语速 <output>${preferences.rate.toFixed(2)}×</output></label><input id="narrative-rate" type="range" min="0.85" max="1.15" step="0.05" value="${preferences.rate}"></div><p class="small muted">本地预生成中文 TTS；无需麦克风、联网或外部语音服务。不是角色演员录音。</p></section>`;}
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-narrative]');if(!b)return;
    const id=b.dataset.reading;
    switch(b.dataset.narrative){
      case 'replay':show(id,true);break;
      case 'close':closeFilm();break;
      case 'disable-auto':preferences.auto=false;persist();closeFilm();break;
      case 'listen':play(id);break;
      case 'pause':pauseResume();break;
      case 'stop':stopVoice();break;
      case 'restart':{const id=audioId;if(id){stopVoice(false);play(id).then(()=>playerRoot().querySelector('[data-narrative=restart]')?.focus({preventScroll:true}));}break;}
      case 'auto':preferences.auto=!preferences.auto;b.textContent=preferences.auto?'开启':'关闭';b.setAttribute('aria-pressed',String(preferences.auto));persist();break;
      case 'voice-auto':preferences.voiceAuto=!preferences.voiceAuto;b.textContent=preferences.voiceAuto?'开启':'关闭';b.setAttribute('aria-pressed',String(preferences.voiceAuto));persist();break;
    }
  });
  document.addEventListener('change',e=>{if(e.target.id==='narrative-mode'){preferences.mode=e.target.value;persist();closeFilm();}});
  document.addEventListener('input',e=>{
    if(e.target.id==='narrative-volume'){preferences.volume=Number(e.target.value);if(!preferences.volume)stopVoice();else if(audio)audio.volume=volume();e.target.previousElementSibling.querySelector('output').textContent=preferences.volume+'%';persist();}
    if(e.target.id==='narrative-rate'){preferences.rate=Number(e.target.value);if(audio){audio.defaultPlaybackRate=preferences.rate;audio.playbackRate=preferences.rate;}e.target.previousElementSibling.querySelector('output').textContent=preferences.rate.toFixed(2)+'×';persist();}
  });
  // Intent to continue investigating cancels the cutaway; auto films never seize focus.
  for(const event of ['pointerdown','wheel','touchstart'])document.addEventListener(event,e=>{if(!e.target.closest('#narrative-root,#voice-root'))closeFilm();},{capture:true,passive:true});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&overlay){e.preventDefault();e.stopImmediatePropagation();closeFilm();return;}
    if(e.key==='Escape'&&audio&&!document.querySelector('.modal')){e.preventDefault();stopVoice();return;}
    if(overlay&&e.key==='Tab'&&overlayManual){const items=[...overlay.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length);if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}}
    if(!e.target.closest('#narrative-root,#voice-root'))closeFilm();
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){closeFilm(false);stopVoice(false);}});
  window.addEventListener('pagehide',()=>{closeFilm(false);stopVoice(false);});
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{if(!motion())closeFilm();});
  window.WeimingNarrative={after,sync,settings,modal,modalClue,dismissModal,stopVoice,connect:callbacks=>hooks=callbacks,
    snapshot:()=>({key:current?.key,eligible:[...eligible],mode:preferences.mode,auto:preferences.auto,voiceAuto:preferences.voiceAuto,automaticCount,seen:[...seen],film:overlay?.dataset.cue||null,voice:audioId,state:voiceState,volume:audio?.volume||0,rate:audio?.playbackRate||preferences.rate})};
})();
