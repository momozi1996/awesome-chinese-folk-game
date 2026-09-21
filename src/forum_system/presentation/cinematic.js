/* V6 presentation only. No case rules or saved evidence are owned here. */
(() => {
  'use strict';
  if (typeof document === 'undefined') return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  for(const [key,file] of [['--paper-texture','paper-fibers.webp'],['--cloth-texture','archive-cloth.webp']])
    document.documentElement.style.setProperty(key, `url("${new URL('assets/textures/'+file,location.href).href}")`);
  const presets = {
    'lamplife:hall': {art:'assets/scenes-v6/hall.jpg', points:{trace:[49.62,56.57], register:[27.48,62.05]}},
    'lamplife:passage': {art:'assets/scenes-v6/passage.jpg', points:{sealed:[34.77,51.92], transfer:[62.19,63.46]}}
  };
  const memory = new Map(), visits = new Set();
  let current = null, transition = null, introTimer = 0, receiptTimer = 0, inspectToken = 0, inspector = null;
  let settings = {depth:true};
  try { settings.depth = JSON.parse(localStorage.getItem('weiming-presentation-v6'))?.depth !== false; } catch {}
  const motion = () => !document.body.classList.contains('reduce-motion') && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function layer() {
    let el = document.getElementById('presentation-layer');
    if (!el) { el = document.createElement('div'); el.id='presentation-layer'; document.body.append(el); }
    return el;
  }
  function before() {
    if (current) {
      const chat=document.querySelector('.chat-history');
      memory.set(current.key, {y:document.getElementById('content')?.scrollTop || 0,
        chat:chat?.scrollTop || 0, atBottom:!chat || chat.scrollHeight-chat.scrollTop-chat.clientHeight<40});
    }
    transition?.cancel(); transition=null; clearTimeout(introTimer);
    document.querySelector('.arrival-caption')?.remove();
  }
  function after(ctx, preserve) {
    const key=[ctx.caseId,ctx.view,ctx.detail || ''].join(':');
    const changed=current?.key !== key;
    const content=document.getElementById('content');
    if (!preserve && changed) content.scrollTop=memory.get(key)?.y || 0;
    const history=content.querySelector('.chat-history'), position=memory.get(key);
    if(history) history.scrollTop=!position || position.atBottom ? history.scrollHeight : position.chat;
    document.body.dataset.experience=ctx.view==='scene' ? 'field' : ctx.view==='board' ? 'desk' : 'terminal';
    if (changed && motion()) {
      transition=content.animate([{opacity:.45},{opacity:1}],{duration:ctx.view==='scene'?280:180,easing:'ease-out'});
    }
    // No text parallax or perpetual camera motion. The camera and hit map stay aligned.
    if (changed && ctx.view==='scene' && content.querySelector('.scene-frame')) {
      const frame=content.querySelector('.scene-frame'), first=!visits.has(key);
      if (first && motion()) {
        const intro=document.createElement('div'); intro.className='arrival-caption';
        intro.innerHTML=`<span>现场勘验 / FIELD RECORDING</span><strong>${esc(ctx.title)}</strong><button data-presentation="skip">跳过入场</button>`;
        frame.append(intro); introTimer=setTimeout(()=>intro.remove(),1100);
      }
      visits.add(key);
    }
    if (changed && ctx.view==='ending' && motion()) {
      const mark=content.querySelector('.ending-mark');
      mark?.animate([{opacity:0,transform:'scale(1.3) rotate(-9deg)'},{opacity:1,transform:'scale(1) rotate(-5deg)'}],{duration:650,easing:'cubic-bezier(.2,.8,.2,1)'});
    }
    if(ctx.view==='board' && content.querySelector('.compare-card')) {
      const label=content.querySelector('.evidence-controls > span');
      if(label){const jump=document.createElement('button');jump.className='compare-jump';jump.dataset.presentation='compare-top';jump.textContent=label.textContent+' · 查看原文 ↑';label.replaceWith(jump);}
    }
    current={...ctx,key};
  }
  function collected(title) {
    const root=layer(); clearTimeout(receiptTimer);root.querySelector('.collection-receipt')?.remove();
    const el=document.createElement('aside');el.className='collection-receipt';el.setAttribute('aria-label','新收录的证据');
    el.innerHTML=`<span class="receipt-seal" aria-hidden="true">录</span><div><small>证据记录 · 已收入调查手记</small><strong>${esc(title)}</strong><button data-action="nav" data-view="board">打开手记 →</button></div><button class="receipt-dismiss" data-presentation="dismiss" aria-label="收起收录提示">×</button>`;
    root.append(el);
    if (motion()) el.animate([{opacity:0,transform:'translateY(18px) rotate(2deg)'},{opacity:1,transform:'none'}],{duration:400,easing:'cubic-bezier(.16,1,.3,1)'});
    receiptTimer=setTimeout(()=>{if(!el.contains(document.activeElement) && !el.matches(':hover'))el.remove();},4600);
  }
  function comparison(ids, clues) {
    return `<section class="comparison" aria-label="证据对照台"><header><span>证据对照台</span><small>先看原文，再作判断 · ${ids.length} / 2</small></header><div class="compare-pair">${[0,1].map(i=>{
      const c=clues[ids[i]];
      return c ? `<article class="compare-card"><small>证据 ${esc(c.n)} · ${esc(c.type)}</small><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p><footer>${esc(c.source)}</footer></article>` : `<div class="compare-empty"><span>0${i+1}</span><p>从下方选取${i ? '另一份' : '一份'}证据</p></div>`;
    }).join('')}</div></section>`;
  }
  function detail(caseId, id) {
    if(caseId !== 'lamplife' || id !== 'trace') return '';
    return `<section class="object-exhibit" aria-label="灯台结构示意"><div class="object-viewport"><img src="assets/scenes-v6/lamp-detail.jpg" alt="断电后的铜盏、电珠与绝缘接线示意"><div class="object-mount"></div><span class="object-label">物件复原 / 非额外线索</span></div><div class="object-tools"><button class="btn" data-presentation="inspect-3d">开启 3D 查看</button><span>可选 · 不旋转也能完整取证</span></div><p class="object-status" role="status">静态视图 · 以以下原始观察文字为准。</p></section>`;
  }
  function disposeInspector() { inspectToken++;inspector?.dispose();inspector=null; }
  async function startInspector(button) {
    if (!settings.depth || location.protocol==='file:') {
      button.closest('.object-exhibit').querySelector('.object-status').textContent=!settings.depth ? '你已在设置中选择仅静态。可在「存档 / 设置 → 物件 3D」重新允许；取证不受影响。' : '当前使用静态视图。3D 需通过本地启动器打开；取证不受影响。';return;
    }
    const token=++inspectToken, exhibit=button.closest('.object-exhibit'), mount=exhibit.querySelector('.object-mount');
    button.disabled=true;button.textContent='准备物件…';
    try {
      const {createInspector}=await import('./inspector.js');
      if (token!==inspectToken || !mount.isConnected) return;
      inspector=createInspector(mount,()=>{
        inspector=null;exhibit.classList.remove('has-3d');
        exhibit.querySelectorAll('[data-presentation="rotate-left"],[data-presentation="rotate-right"],[data-presentation="reset-object"]').forEach(x=>x.remove());
        button.disabled=false;button.textContent='重试 3D 查看';button.dataset.presentation='inspect-3d';
        exhibit.querySelector('.object-status').textContent='3D 不可用，已回到静态视图。原始文字和取证仍可使用。';
      });
      exhibit.classList.add('has-3d');
      exhibit.querySelector('.object-tools').insertAdjacentHTML('beforeend','<button class="btn" data-presentation="rotate-left" aria-label="向左旋转物件">←</button><button class="btn" data-presentation="rotate-right" aria-label="向右旋转物件">→</button><button class="btn" data-presentation="reset-object">复位</button>');
      button.textContent='返回静态图';button.dataset.presentation='static';button.disabled=false;
      exhibit.querySelector('.object-status').textContent='拖动物件或使用方向按钮旋转 · 滚轮不被占用 · 结构示意不替代原始观察。';
    } catch {
      disposeInspector();button.disabled=false;button.textContent='重试 3D 查看';
      exhibit.querySelector('.object-status').textContent='3D 未能启动，保留静态视图；无需 3D 即可收录。';
    }
  }
  function close() {disposeInspector();}
  document.addEventListener('click',e=>{
    if(e.target.closest('.collection-receipt [data-action]'))e.target.closest('.collection-receipt').remove();
    const b=e.target.closest('[data-presentation]');if(!b)return;
    switch(b.dataset.presentation){
      case 'compare-top': {const content=document.getElementById('content'),target=content.querySelector('.comparison');if(target)content.scrollTo({top:target.offsetTop-14,behavior:motion()?'smooth':'instant'});break;}
      case 'skip': b.closest('.arrival-caption').remove();break;
      case 'dismiss':b.closest('.collection-receipt').remove();break;
      case 'inspect-3d':startInspector(b);break;
      case 'rotate-left':inspector?.rotate(-.24);break;
      case 'rotate-right':inspector?.rotate(.24);break;
      case 'reset-object':inspector?.reset();break;
      case 'static': { const el=b.closest('.object-exhibit');disposeInspector();el.classList.remove('has-3d');el.querySelectorAll('[data-presentation="rotate-left"],[data-presentation="rotate-right"],[data-presentation="reset-object"]').forEach(x=>x.remove());b.dataset.presentation='inspect-3d';b.textContent='开启 3D 查看';el.querySelector('.object-status').textContent='静态视图 · 以以下原始观察文字为准。';break; }
      case 'depth': settings.depth=!settings.depth;try{localStorage.setItem('weiming-presentation-v6',JSON.stringify(settings));}catch{}b.textContent=settings.depth?'允许':'仅静态';b.setAttribute('aria-pressed',String(settings.depth));break;
    }
  });
  document.addEventListener('error',e=>{
    const img=e.target;
    if(img.matches?.('img[data-fallback]') && img.dataset.fallback){const fallback=img.dataset.fallback;delete img.dataset.fallback;img.src=fallback;img.closest('.scene-frame')?.querySelectorAll('.hotspot[data-fallback-x]').forEach(h=>{h.style.left=h.dataset.fallbackX+'%';h.style.top=h.dataset.fallbackY+'%';});}
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){transition?.finish();document.querySelector('.arrival-caption')?.remove();}});
  window.WeimingPresentation={before,after,collected,comparison,detail,close,
    scene:(caseId,scene)=>presets[`${caseId}:${scene.id}`] || {},
    settings:()=>`<div class="setting-row"><span>物件 3D<small>按需加载、本地渲染；静态图与文字始终可用</small></span><button class="toggle" data-presentation="depth" aria-pressed="${settings.depth}">${settings.depth?'允许':'仅静态'}</button></div>`,
    snapshot:()=>({view:current?.key,inspector:!!inspector,depth:settings.depth,rememberedViews:memory.size})};
})();
