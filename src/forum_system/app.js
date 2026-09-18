"use strict";
(() => {
  const G = window.GAME,
    KEY = window.ForumConfig.legacySaveKey;
  const defaults = () => ({
    version: 1,
    clues: [],
    read: [],
    asked: {},
    replies: {},
    chats: { north: [], rain: [] },
    links: [],
    notes: "",
    ending: null,
    endings: [],
    sound: false,
    volume: 30,
    ambience: 55,
    effects: 65,
    motion: !matchMedia("(prefers-reduced-motion: reduce)").matches,
    openedSafe: false,
  });
  const owns = (object, key) => typeof key === "string" && Object.prototype.hasOwnProperty.call(object, key);
  let storageFailed = false;
  function normalize(raw) {
    const n = defaults();
    if (!raw || raw.version !== 1) return n;
    for (const k of ["clues", "read", "links", "endings"])
      if (Array.isArray(raw[k]))
        n[k] = [...new Set(raw[k].filter((x) => typeof x === "string"))];
    n.clues = n.clues.filter((x) => owns(G.clues, x));
    n.read = n.read.filter((x) => G.posts.some((p) => p.id === x));
    n.links = n.links.filter((x) => G.links.some((l) => l.id === x));
    n.endings = n.endings.filter((x) => owns(G.endings, x));
    for (const k of ["asked", "replies"])
      if (raw[k] && typeof raw[k] === "object" && !Array.isArray(raw[k])) {
        for (const p of G.posts) {
          if (Array.isArray(raw[k][p.id]))
            n[k][p.id] = raw[k][p.id]
              .filter((x) =>
                k === "asked"
                  ? Number.isInteger(x) && x >= 0 && x < p.questions.length
                  : typeof x === "string",
              )
              .slice(0, 30);
        }
      }
    if (raw.chats && typeof raw.chats === "object")
      for (const k of ["north", "rain"])
        if (Array.isArray(raw.chats[k]))
          n.chats[k] = raw.chats[k].filter((x) =>
            ["hello", "archive", "safety", "identity", "lantern"].includes(x),
          );
    for (const k of ["sound", "motion", "openedSafe"])
      if (typeof raw[k] === "boolean") n[k] = raw[k];
    if (typeof raw.notes === "string") n.notes = raw.notes.slice(0, 4000);
    if (Number.isFinite(raw.volume))
      n.volume = Math.max(0, Math.min(100, raw.volume));
    for (const k of ["ambience", "effects"]) if (Number.isFinite(raw[k])) n[k] = Math.max(0, Math.min(100, raw[k]));
    if (owns(G.endings, raw.ending)) n.ending = raw.ending;
    return n;
  }
  let S;
  try {
    S = normalize(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    S = defaults();
    storageFailed = true;
  }
  let pendingChat = null;
  const CASES = window.CASES || {};
  let activeCaseId = "lantern";
  try { activeCaseId = localStorage.getItem("weiming-active-case") || "lantern"; } catch { storageFailed = true; }
  if (!owns(CASES, activeCaseId)) activeCaseId = "lantern";
  let CS = null,
    CSKEY = "",
    CSSTATE = null,
    casePending = null,
    caseSelected = [],
    caseSceneId = null; 
  const { blankCaseState, normalizeCase } = window.CaseEngine;
  function storedCase(id) {
    try { return normalizeCase(JSON.parse(localStorage.getItem(`weiming-case-${id}-v1`)), CASES[id]); } catch { return blankCaseState(); }
  }
  function loadCaseState(id = activeCaseId) {
    CS = CASES[id]; CSKEY = `weiming-case-${id}-v1`; CSSTATE = storedCase(id);
  }
  function caseAvailable(c) { return !c.previousCase || storedCase(c.previousCase).endings.length > 0 || storedCase(c.id).clues.length > 0; }
  loadCaseState();
  const inCase = () => activeCaseId !== "lantern";
  const cHas = (id) => !!CSSTATE?.clues?.includes(id);
  const cSave = () => { try { localStorage.setItem(CSKEY, JSON.stringify(CSSTATE)); } catch { storageFailed = true; } };
  const cClue = (id) => CS?.clues?.[id];
  const cAdd = (id) => {
    if (!cClue(id) || cHas(id)) return;
    CSSTATE.clues.push(id);
    cSave();
    chime();
    toast(`案卷线索已收录：${cClue(id).title}`);
  };
  function chooseCase(id) {
    if (!owns(CASES, id)) return;
    if (!caseAvailable(CASES[id])) return toast("先归档上一案，再循交接材料进入这里。");
    activeCaseId = id;
    try { localStorage.setItem("weiming-active-case", id); } catch { storageFailed = true; }
    loadCaseState(id);
    caseSelected = [];
    casePending = null;
    caseSceneId = null;
    view = "forum";
    closeModal(false);
    render(false);
  }
  let view = "forum",
    postId = null,
    category = "全部帖子",
    filter = "最新发布",
    query = "",
    contact = "north",
    selected = [],
    modalReturn = null,
    activeModal = null,
    toastTimer = null;
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const icons = {
    forum: "M3 4h18v13H8l-5 4V4M7 8h10M7 12h6",
    mail: "M3 5h18v14H3zM3 5l9 7 9-7",
    board: "M4 3h16v18H4zM8 7h8M8 11h8M8 15h4",
    map: "M3 5l6-2 6 3 6-2v15l-6 2-6-3-6 2V5M9 3v15M15 6v15",
    search: "M16 16l5 5M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16",
    sound: "M4 9h4l5-4v14l-5-4H4V9M17 8q5 4 0 8M19 5q8 7 0 14",
    mute: "M4 9h4l5-4v14l-5-4H4V9M17 9l5 6M22 9l-5 6",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
    help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M9 8c0-4 8-4 7 0-.5 2-4 2-4 6M12 17v1",
    arrow: "M4 12h16M15 7l5 5-5 5",
    back: "M20 12H4M9 7l-5 5 5 5",
    down: "M6 9l6 6 6-6",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    lock: "M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4M12 14v3",
    pin: "M8 3h8l-1 6 4 4H5l4-4-1-6M12 13v9",
    check: "M5 12l4 4L20 5",
    close: "M5 5l14 14M19 5L5 19",
    file: "M5 2h9l5 5v15H5V2M14 2v6h5M9 12h6M9 16h6",
    moon: "M20 14A9 9 0 0 1 10 3 9 9 0 1 0 20 14",
    cloud:
      "M6 15a5 5 0 1 1 4-9 6 6 0 1 1 7 9H6M7 18l-1 3M13 18l-1 3M19 18l-1 3",
    link: "M10 7l3-3c5-4 11 2 7 7l-4 4M14 17l-3 3C6 24 0 18 4 13l4-4M8 16l8-8",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2",
    play: "M7 3l14 9-14 9V3",
    download: "M12 2v13M7 10l5 5 5-5M4 16v5h16v-5",
    book: "M3 3h7l2 2 2-2h7v16h-7l-2 2-2-2H3V3M12 5v16",
    leaf: "M20 3C6 1 2 10 6 16s14 2 14-13M4 21L16 8",
    dots: "M5 12h1M11 12h1M17 12h1",
    expand: "M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5",
    mouse: "M7 10V7a5 5 0 0 1 10 0v10a5 5 0 0 1-10 0v-7M12 3v6M7 10h10",
  };
  const icon = (name, cls = "") =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.file}"/></svg>`;
  const btn = (text, action, cls = "", extra = "") =>
    `<button class="btn ${cls}" data-action="${action}" ${extra}>${text}</button>`;
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
      storageFailed = false;
    } catch {
      storageFailed = true;
    }
    document
      .querySelectorAll(".save-label")
      .forEach(
        (e) =>
          (e.textContent = storageFailed
            ? "本地存储不可用 · 请导出存档"
            : "磁盘记录已保存"),
      );
  }
  function toast(text) {
    clearTimeout(toastTimer);
    const t = document.getElementById("toast");
    t.textContent = text;
    t.classList.add("visible");
    toastTimer = setTimeout(() => t.classList.remove("visible"), 3600);
  }
  function has(k) {
    return S.clues.includes(k);
  }
  function unlocked() {
    return has("address");
  }
  function ready() {
    return S.links.length === 3 && S.clues.length === 8;
  }
  function task() {
    if (!has("lamp")) return "阅读求助帖，标记河灯的异常";
    if (!has("custom")) return "翻阅「借灯」旧俗，了解规矩";
    if (!has("news")) return "在地方志里寻找 1998 年的旧闻";
    if (!has("address")) return "私信北窗，询问旧泵房的位置";
    if (!has("ledger") || !has("tape") || !has("paper"))
      return "前往旧泵房，寻找三件遗留物";
    if (!has("survivor")) return "私信雨打芭蕉，核实沈小禾的身份";
    if (S.links.length < 3) return "在调查手记中，建立三条线索关联";
    if (!S.ending) return "证据已齐，整理并提交调查报告";
    return "本案已结，可重读档案或探索另一结局";
  }
  function addClue(id) {
    if (!G.clues[id] || has(id)) return;
    S.clues.push(id);
    save();
    chime();
    toast(`线索已收录：${G.clues[id].title}`);
  }
  function navigate(next, id) {
    clearTimeout(toastTimer);
    document.getElementById("toast").classList.remove("visible");
    stopTape();
    closeModal(false);
    view = next;
    if (next === "post") {
      postId = id;
      if (!S.read.includes(id)) S.read.push(id);
    }
    if (next === "messages") contact = id || "north";
    if (inCase()) cSave();
    else save();
    render(false);
    document.getElementById("content")?.focus({ preventScroll: true });
  }
  function storyTime() {
    return S.ending
      ? "06:02"
      : has("survivor")
        ? "00:16"
        : unlocked()
          ? "23:58"
          : "23:47";
  }
  function stageLabel() {
    return S.ending
      ? "天将明"
      : has("survivor")
        ? "第三更 · 留名"
        : unlocked()
          ? "第二更 · 渡口"
          : "第一更 · 借灯";
  }
  function render(preserve = true) {
    const old = document.getElementById("content"),
      y = preserve && old ? old.scrollTop : 0;
    // Same-view updates must not erase a draft or steal keyboard focus when a reply arrives.
    const focused =
      preserve &&
      document.getElementById("app").contains(document.activeElement)
        ? document.activeElement
        : null;
    const focusKey = focused?.id,
      focusData = focused?.dataset.action ? { ...focused.dataset } : null;
    const selection =
      focused && "selectionStart" in focused
        ? [focused.selectionStart, focused.selectionEnd]
        : null;
    const drafts = preserve
      ? [...document.querySelectorAll("#reply-input,.search-form input")].map(
          (e) => ({
            selector: e.id ? "#" + e.id : ".search-form input",
            value: e.value,
          }),
        )
      : [];
    document.body.classList.toggle("reduce-motion", !S.motion);
    const viewChanged = document.body.dataset.view !== view;
    document.body.dataset.view = view;
    document.body.dataset.haunted = inCase()
      ? "false"
      : has("lamp")
        ? "true"
        : "false";
    document.getElementById("app").innerHTML =
      `<div class="night-world" aria-hidden="true"><div class="world-rain"></div><div class="waterline"></div></div><div class="game-shell">${header()}<div class="game-workspace">${inCase() ? (view === "casebook" ? storyRail() : genericStoryRail()) : storyRail()}<section class="terminal" aria-label="未明夜班终端"><div class="terminal-chrome"><span><i class="connection-light"></i> 未明 ${inCase() ? "旧案柜" : "旧站"} / ${view === "scene" ? "现场记录" : view === "board" ? "本地档案" : view === "messages" ? "私人信道" : view === "casebook" ? "案卷目录" : "南湾镜像"}</span><span class="sound-stage" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="terminal-filename">${view === "post" ? postId + ".htm" : view + ".htm"}</span><button data-action="letter" aria-label="阅读值夜交接信">${icon("mail")} 交接信</button></div><main id="content" tabindex="-1" class="page-${view}">${main()}</main><div class="terminal-status"><span class="status-story">${inCase() ? `${CS.no}　/　${CS.title}　/　${CSSTATE.clues.length} 份线索` : has("lamp") && !S.ending ? "连接数：7　 /　有效用户名：6" : "用户：夜班记录员　/　只读镜像已连接"}</span><span class="save-label">${storageFailed ? "存储不可用 · 请导出" : "磁盘记录已保存"}</span></div></section></div>${inCase() ? genericFooter() : footer()}</div>`;
    syncAtmosphere();
    if(viewChanged && S.motion)document.getElementById("content").classList.add("view-enter");
    for (const d of drafts) {
      const input = document.querySelector(d.selector);
      if (input) input.value = d.value;
    }
    document.getElementById("content").scrollTop = y;
    if (focused && !activeModal) {
      const target = focusKey
        ? document.getElementById(focusKey)
        : focusData
          ? [...document.querySelectorAll("#app [data-action]")].find((e) =>
              Object.entries(focusData).every(([k, v]) => e.dataset[k] === v),
            )
          : focused.matches(".search-form input")
            ? document.querySelector(".search-form input")
            : null;
      if (target && !target.disabled) {
        target.focus({ preventScroll: true });
        if (selection && typeof target.setSelectionRange === "function")
          target.setSelectionRange(...selection);
      } else document.getElementById("content").focus({ preventScroll: true });
    }
    if (activeModal) {
      document.getElementById("app").inert = true;
      // Rebind the return target after replacing the underlying game DOM.
      if (modalReturn && !modalReturn.isConnected) {
        const data = { ...modalReturn.dataset };
        modalReturn =
          (modalReturn.id
            ? document.getElementById(modalReturn.id)
            : data.action
              ? [...document.querySelectorAll("#app [data-action]")].find((e) =>
                  Object.entries(data).every(([k, v]) => e.dataset[k] === v),
                )
              : null) || document.getElementById("content");
      }
    }
  }
  function header() {
    return `<header class="game-top"><button class="game-wordmark" data-action="${inCase() ? "casebook" : "nav"}" data-view="forum"><span class="small-seal">未</span> 未明 · ${inCase() ? "旧案柜" : "夜班终端"} <small>二〇〇四年</small></button><div class="game-utilities"><button data-action="casebook" aria-label="打开旧案柜">${icon("book")}<span>案卷</span></button><button data-action="sound" class="${S.sound ? "sound-on" : ""}" aria-label="${S.sound ? "关闭" : "开启"}环境音">${icon(S.sound ? "sound" : "mute")}<span>声音${S.sound ? "开" : "关"}</span></button><button data-action="help" aria-label="调查玩法与提示">${icon("help")}<span>玩法</span></button><button data-action="settings" aria-label="设置与存档">${icon("settings")}<span>存档 / 设置</span></button><button data-action="fullscreen" aria-label="切换全屏">${icon("expand")}</button></div></header>`;
  }
  function storyRail() {
    return `<aside class="story-rail" aria-label="当前故事"><div class="story-edition">南 湾 异 闻 档 案 <span>卷 · 壹</span></div><button class="story-logo" data-action="nav" data-view="forum" aria-label="回到未明论坛"><span>未</span><span>明</span></button><p class="vertical-whisper">天亮之前，别把名字留在水里。</p><div class="chapter-mark">借<span>灯</span>人</div><div class="rail-water" aria-hidden="true"><svg viewBox="0 0 200 150"><path class="river-rings" d="M14 108q86-25 173 0M0 125q100-29 200 0M25 139q78-19 146 0"/><path class="paper-boat" d="M47 92l49-22 53 20-19 21-68-1zM47 92l58 8 44-10M96 70l9 30 25 11M96 70l-11 26"/><path class="flame" d="M103 81q-16-16-3-39-1 18 8 22 4 9-5 17"/></svg></div><div class="story-clock"><span>${stageLabel()}</span><time>${storyTime()}</time><small>${has("survivor") || S.ending ? "七月二十二日" : "七月二十一日"} · ${S.ending ? "雨将停" : "雨未停"}</small></div><button class="desk-note" data-action="hint"><span class="note-pin"></span><small>守夜人留字</small><p>${task()}</p><span class="note-tip">翻看提示 ↗</span></button></aside>`;
  }
  function footer() {
    const active =
      view === "post" ? "forum" : view === "ending" ? "board" : view;
    return `<footer class="game-bottom"><div class="chapter-foot"><span>故事档案 001</span><button data-action="credits">关于这个夜晚</button></div><nav class="nav-links" aria-label="主要导航">${[
      ["forum", "forum", "论坛"],
      ["messages", "mail", "私信"],
      ["board", "board", "手记"],
      ["scene", "map", "出门"],
    ]
      .map(
        ([v, i, t], n) =>
          `<button class="nav-link ${active === v ? "active" : ""}" data-action="nav" data-view="${v}" ${active === v ? 'aria-current="page"' : ""}><span class="nav-number">0${n + 1}</span>${icon(i)}<span>${t}</span>${v === "messages" && !S.chats.north.includes("hello") ? '<i class="unread-light" aria-label="有未读消息"></i>' : ""}${v === "scene" && !unlocked() ? icon("lock", "nav-lock") : ""}${v === "board" && S.clues.length ? `<small>${S.clues.length}</small>` : ""}</button>`,
      )
      .join(
        "",
      )}</nav><span class="bottom-hint">${icon("mouse")}点击调查 · Esc 收起</span></footer>`;
  }
  function main() {
    if (view === "casebook") return casebook();
    if (inCase()) return genericMain();
    if (view === "post") return thread();
    if (view === "messages") return messages();
    if (view === "board") return board();
    if (view === "scene") return scene();
    if (view === "ending") return ending();
    return forum();
  }
  function sectionHead(title, sub, right = "") {
    return `<div class="section-head"><div><h2>${title}</h2><p>${sub}</p></div>${right}</div>`;
  }
  function cUnlocked(item) {
    return window.CaseEngine.requirementsMet(item, CSSTATE);
  }
  function cScenes() { return CS.scenes || [CS.scene]; }
  function cHotspot(id) { return cScenes().flatMap(sc => sc.hotspots).find(h => h.id === id); }
  function cSceneOpen() { return CS.sceneRequires ? CS.sceneRequires.every(cHas) : CSSTATE.clues.length >= 5; }
  function cHotspotOpen(id) { return cSceneOpen() && cScenes().some(sc => cUnlocked(sc) && sc.hotspots.some(h => h.id === id && cUnlocked(h))); }
  function cCurrentScene() { return cScenes().find(sc => sc.id === caseSceneId && cUnlocked(sc)) || cScenes()[0]; }
  function cPhase() {
    return CS.steps ? CS.steps.filter(cUnlocked).length - 1 : Math.min(2, Math.floor(CSSTATE.clues.length / 4));
  }
  function cNext() {
    if (CSSTATE.ending) return {text: CS.nextCase ? "本夜已归档，交接材料指向下一案。" : "本夜已归档，可回看另一种记录方式。", action:"casebook"};
    const p = CS.posts.find(p => p.clue && !cHas(p.clue) && cUnlocked(p));
    if (p) return {text:`查看来帖「${p.title}」，收录可以核验的部分。`, action:"c-post", attr:`data-id="${p.id}"`};
    for (const [who,c] of Object.entries(CS.contacts)) for (const [key,d] of Object.entries(c.dialogue))
      if (d.clue && !cHas(d.clue) && cUnlocked(d)) return {text:`私信${c.name}：${d.q}`,action:"c-contact",attr:`data-contact="${who}"`};
    for (const sc of cScenes()) if (cSceneOpen() && cUnlocked(sc)) {
      const h = sc.hotspots.find(h => !cHas(h.id) && cUnlocked(h));
      if (h) return {text:`在${sc.title}检查「${h.title}」。`,action:"c-scene",attr:`data-id="${sc.id || "first"}"`};
    }
    const l = CS.links.find(l => !CSSTATE.links.includes(l.id) && l.pair.every(cHas));
    if (l) return {text:`手记待证：${l.question} ${l.hint}`,action:"nav",attr:'data-view="board"'};
    return {text: CSSTATE.links.length === CS.links.length ? "证据链已齐，整理结案报告。" : "回到手记查看缺失材料的来源。",action:"nav",attr:'data-view="board"'};
  }
  function cGuide() {
    const next = cNext();
    return `<div class="investigation-guide"><span class="guide-index">${CS.series ? `寄名簿 / 第 ${CS.episode} 夜` : `案卷 ${CS.no}`}</span><p>${next.text}</p>${btn(CSSTATE.ending ? "返回案卷柜 →" : "接着调查 →",next.action,"",next.attr || "")}</div>`;
  }
  function seriesRecap() {
    if (!CS.previousCase) return "";
    const previous = storedCase(CS.previousCase), c = CASES[CS.previousCase];
    const publicVersion = previous.ending === "truth";
    return `<details class="handoff-note"><summary>上一夜的交接 · ${c.title} / ${publicVersion ? "公开核验" : "暂缓公开"}</summary><p>${publicVersion ? "前案可核验的更正已公开，来信人知道记录曾被篡改；当事人的私人信息仍未公开。" : "前案原件已交外部核验，论坛尚未公开完整材料。本夜联系人通过保管人取得副本，不能假定公众已知真相。"}两条路径都保留证据，但承担不同的公开与回访责任。</p></details>`;
  }
  function casebook() {
    const card = c => {
      const state = c.legacy ? S : storedCase(c.id), available = caseAvailable(c);
      return `<button class="case-card ${c.series ? "serial-case" : ""}" data-action="select-case" data-case="${c.id}" ${!available ? "disabled" : ""}>
      <span class="case-card-index">${c.no}</span><span class="case-card-art" style="background-image:url('${c.art}')"></span>
      <span class="case-card-copy"><small>${c.series ? `寄名簿 · 第${c.episode}夜 / ` : ""}${c.theme}</small><strong>${c.title}</strong><em>${c.place} · ${c.length}</em><span>${c.summary}</span></span>
      <span class="case-card-state">${!available ? `待「${CASES[c.previousCase].title}」归档` : state.ending ? "已归档 · 可回看" : activeCaseId === c.id ? "正在调查" : state.clues.length ? "继续调查 ↗" : "拆封 ↗"}</span></button>`;
    };
    return `${sectionHead("旧案柜", "未明档案室 / 独立旧案与连续来信", `<span class="mono small muted">${Object.keys(CASES).length} CASE FILES · V4</span>`)}
      <div class="casebook-intro"><p>有些名字，在一宗案子里找不到。沿着交接材料往下查，不要替下一页提前写结局。</p><p class="small muted">原创虚构民俗悬疑。含死亡、失踪与身份剥夺议题；无贴脸惊吓。请勿模仿夜探、涉水或危险勘验。</p></div>
      <section class="serial-shelf"><div class="serial-heading"><span>新收 · 连续四夜</span><h3>寄名簿</h3><p>灯的时间 → 镜中的名字 → 信的去向 → 谁能替人回答</p></div><div class="case-grid">${Object.values(CASES).filter(c => c.series).map(card).join("")}</div></section>
      <h3 class="archive-heading">此前的夜晚 <span>五宗独立旧案 · 可随时重返</span></h3><div class="case-grid">${Object.values(CASES).filter(c => !c.series).map(card).join("")}</div>`;
  }
  function cTask() { return cNext().text; }
  function genericStoryRail() {
    const phase = cPhase();
    const n = CSSTATE.ending ? "已归档 · 天明" : CS.steps?.[phase]?.label || CS.stages[phase];
    const t = CSSTATE.ending ? CS.times[3] : CS.times[phase];
    return `<aside class="story-rail" aria-label="当前案卷"><div class="story-edition">未 明 旧 案 柜 <span>${CS.no} · ${CS.place}</span></div><button class="story-logo" data-action="casebook" aria-label="返回旧案柜"><span>案</span><span>卷</span></button><p class="vertical-whisper">${CS.whisper}</p><div class="chapter-mark">${CS.title.slice(0, 2)}<span>·</span>${CS.place.slice(0, 2)}</div><div class="rail-water rail-case-art" aria-hidden="true"><img src="${CS.art}" alt=""></div><div class="story-clock"><span>${n}</span><time>${t}</time><small>${CS.date} · ${CSSTATE.ending ? "记录已归档" : "记录未完"}</small></div><button class="desk-note" data-action="case-hint"><span class="note-pin"></span><small>案卷批注</small><p>${cTask()}</p><span class="note-tip">翻看提示 ↗</span></button></aside>`;
  }
  function genericFooter() {
    const active =
      view === "post" ? "forum" : view === "ending" ? "board" : view;
    return `<footer class="game-bottom"><div class="chapter-foot"><span>案卷 ${CS.no}</span><button data-action="casebook">返回旧案柜</button></div><nav class="nav-links" aria-label="案卷导航">${[
      ["forum", "forum", "论坛"],
      ["messages", "mail", "私信"],
      ["board", "board", "手记"],
      ["scene", "map", "现场"],
    ]
      .map(
        ([v, i, t], n) =>
          `<button class="nav-link ${active === v ? "active" : ""}" data-action="nav" data-view="${v}"><span class="nav-number">0${n + 1}</span>${icon(i)}<span>${t}</span>${v === "board" && CSSTATE.clues.length ? `<small>${CSSTATE.clues.length}</small>` : ""}</button>`,
      )
      .join(
        "",
      )}</nav><span class="bottom-hint">${icon("mouse")}点击调查 · Esc 收起</span></footer>`;
  }
  function cBody(body) {
    return body
      .map((t) => (/^<(blockquote|div)/.test(t) ? t : `<p>${t}</p>`))
      .join("");
  }
  function cForum() {
    return `<button class="back-link" data-action="casebook">${icon("back")}旧案柜 <span class="muted">/ ${CS.no} ${CS.title}</span></button>
      <div class="bbs-masthead"><div class="bbs-title"><span class="bbs-eyebrow">${CS.no}　/　${CS.theme}</span><h1>${CS.place}的事，<em>入夜再查。</em></h1></div><div class="bbs-warnings"><span class="bbs-stamp">${CSSTATE.ending ? "已归档" : "未归档"}</span><p>不替传闻作证。<br>只保存能核对的东西。</p></div></div>
      ${seriesRecap()}${cGuide()}<button class="pinned-row" data-action="case-rules"><span class="pin-mark">案卷</span><span>${CS.intro[0]}</span><span class="pin-arrow">↗</span></button>
      <div class="bbs-list-heading"><div class="feed-tabs"><button class="active">案卷来帖</button><span class="muted small">${CS.posts.filter(cUnlocked).length} 条已到达 / ${CS.posts.length} 条总记录</span></div><span class="sort">只读镜像</span></div>
      <div class="post-list">${CS.posts.filter(cUnlocked).map((p) => `<button class="post-row ${p.featured ? "featured" : ""} ${CSSTATE.read.includes(p.id) ? "is-read" : ""}" data-action="c-post" data-id="${p.id}"><span class="post-avatar"><span>${p.avatar}</span><i>${p.id.slice(0, 2).toUpperCase()}</i></span><div class="post-content"><h3 class="post-title"><span class="tag">${p.label}</span><span>${p.title}</span>${!CSSTATE.read.includes(p.id) ? '<i class="new-dot"></i>' : ""}</h3><p class="post-excerpt">${p.excerpt}</p><div class="post-meta"><span>${p.author}</span><span>·</span><span>${p.time}</span>${cHas(p.clue) ? '<span class="read-flag">/ 已记入手记</span>' : ""}</div></div><span class="post-replies"><b>${p.replies}</b><small>回应</small></span><span class="post-open">↗</span></button>`).join("")}</div>
      <button class="night-message" data-action="c-contact" data-contact="north"><span class="unread-light"></span><span><strong>${CS.contacts.north.name}</strong> 留言：<em>${CS.contacts.north.opening}</em></span><span>读信 ↗</span></button>`;
  }
  function cThread() {
    const p = CS.posts.find((x) => x.id === postId);
    if (!p || !cUnlocked(p)) return cForum();
    return `<button class="back-link" data-action="nav" data-view="forum">${icon("back")}返回案卷论坛 <span class="muted">/ ${p.category}</span></button><div class="thread-file-label">${CS.no} / ${p.id}.txt<span>收件人：夜班记录员</span></div><div class="thread-header"><span class="tag">${p.label}</span><h2>${p.title}</h2><div class="thread-author"><span class="avatar">${p.avatar}</span><div class="author-lines">${p.author}<small>${p.time} · ${p.views.toLocaleString()} 次阅读</small></div>${Object.values(CS.contacts).some(c => c.name === p.author) ? btn(`${icon("mail")}私信楼主`, "c-contact", "", `data-contact="${Object.keys(CS.contacts).find(k => CS.contacts[k].name === p.author)}"`) : ""}</div></div><article class="article-body">${cBody(p.body)}</article>${p.clue ? cluePanelCase(p.clue) : ""}<section class="comments"><h3>帖内回复 <span class="small muted">/ 仍在核查</span></h3>${p.comments.map((c, i) => commentHTML(c[0], c[1], i + 1)).join("")}${(CSSTATE.asked[p.id] || []).map((n, i) => commentHTML("夜班记录员", p.questions[n].q, p.comments.length + i * 2 + 1) + commentHTML(p.author, p.questions[n].a, p.comments.length + i * 2 + 2)).join("")}</section><div class="reply-box"><label>继续追问 <span class="small">/ 预设问题会留下新的记录</span></label><div class="question-options">${p.questions.map((q, i) => `<button data-action="c-ask" data-index="${i}" ${CSSTATE.asked[p.id]?.includes(i) ? "disabled" : ""}>${CSSTATE.asked[p.id]?.includes(i) ? "✓ " : ""}${q.q}</button>`).join("")}</div></div>`;
  }
  function cluePanelCase(id) {
    const c = cClue(id);
    return `<div class="clue-extract ${cHas(id) ? "collected" : ""}">${icon(cHas(id) ? "check" : "pin")}<div class="info"><small>${cHas(id) ? "已收入调查手记" : "发现可记录的信息"}</small><strong>${c.title}</strong></div>${btn(cHas(id) ? "查看手记" : "标记线索", cHas(id) ? "nav" : "c-collect", cHas(id) ? "" : "primary", cHas(id) ? 'data-view="board"' : `data-id="${id}"`)}</div>`;
  }
  function cMessages() {
    const who = contact === "north" ? CS.contacts.north : CS.contacts.rain;
    const history = CSSTATE.chats[contact] || [];
    const dialogue = who.dialogue || {};
    return `${sectionHead("案卷私信", `${who.name} · 不是所有见证人都愿意被公开。`)}<div class="message-layout"><div class="contact-list">${[
      ["north", CS.contacts.north.name[0], CS.contacts.north.name],
      ["rain", CS.contacts.rain.name[0], CS.contacts.rain.name],
    ]
      .map(
        ([id, a, n]) =>
          `<button class="contact-item ${contact === id ? "active" : ""}" data-action="c-contact" data-contact="${id}"><span class="avatar">${a}</span>${n}</button>`,
      )
      .join(
        "",
      )}</div><section class="chat-pane"><div class="chat-top"><span>${who.name}</span><small><span class="dot"></span>${casePending?.contact === contact ? "对方正在输入…" : "连接中"}</small></div><div class="chat-history" id="chat-history"><div class="chat-time">${CS.date} · 记录时刻</div><div class="bubble">${who.opening}</div>${history.map((key) => `<div class="bubble mine">${dialogue[key]?.q || key}</div><div class="bubble">${dialogue[key]?.a || ""}</div>`).join("")}${casePending?.contact === contact ? '<div class="typing-line">对方正在输入<span> · · ·</span></div>' : ""}</div><div class="chat-options"><p>回复 / 选择一句话</p>${Object.entries(
      dialogue,
    )
      .map(([key, d]) => {
        const locked = !cUnlocked(d);
        return `<button data-action="c-chat" data-key="${key}" ${locked || history.includes(key) || casePending ? "disabled" : ""}>${d.q}${
          locked
            ? `<small>${icon("lock")}先收录：${d.requires
                .filter((x) => !cHas(x))
                .map((x) => cClue(x)?.title)
                .join("、")}</small>`
            : ""
        }</button>`;
      })
      .join("")}</div></section></div>`;
  }
  function cScene() {
    if (!cSceneOpen()) return `${sectionHead("现场调查", "地址与勘验许可尚未确认。")}${cGuide()}<div class="empty-state"><div class="big-symbol">未至</div><p>从论坛与联系人取得确切地点后再出发，不能只靠攒够线索进入。</p></div>`;
    const scene = cCurrentScene();
    return `${sectionHead(scene.title, `${CS.place} / 现场记录`)}${cGuide()}
    ${CS.scenes ? `<nav class="scene-tabs" aria-label="调查地点">${cScenes().map((sc,i) => `<button data-action="c-scene" data-id="${sc.id}" ${!cUnlocked(sc) ? "disabled" : ""} aria-current="${sc === scene ? "page" : "false"}">${String(i+1).padStart(2,"0")} ${cUnlocked(sc) ? sc.title : "复勘地点 · 先还原前两条脉络"}</button>`).join("")}</nav>` : ""}
    <div class="scene-frame case-scene-frame"><img class="scene-photo" src="${scene.art || CS.art}" alt="${scene.title}：${scene.caption}"><div class="scene-vignette"></div><div class="scene-particles" aria-hidden="true"></div><div class="scene-caption"><span class="kicker">${CS.no} / FIELD NOTE</span><h3>${scene.caption}</h3></div><div class="scene-counter">已取证 ${scene.hotspots.filter(h => cHas(h.id)).length} / ${scene.hotspots.length}</div>
    ${scene.hotspots.filter(cUnlocked).map(h => `<button class="hotspot ${cHas(h.id) ? "done" : ""}" style="left:${h.x}%;top:${h.y}%" data-action="c-hotspot" data-id="${h.id}" aria-label="调查${h.title}"><span class="spot"></span><span>${cHas(h.id) ? "✓ " : ""}${h.title}</span></button>`).join("")}
    <div class="scene-bottom"><p>${scene.description}</p><span>${icon("eye")}点击标记查看物件</span></div></div>
    <div class="field-object-list">${scene.hotspots.filter(cUnlocked).map(h => btn(`${cHas(h.id) ? "✓ " : "◎ "}${h.title}`,"c-hotspot","",`data-id="${h.id}"`)).join("")}</div>
    <div class="field-inventory"><span>本次取证</span>${CSSTATE.scene.map(id => `<button class="inventory-item" data-action="c-inspect" data-id="${id}">${icon("file")}${cHotspot(id)?.title || id}</button>`).join("") || '<span class="muted">尚未收集物件</span>'}</div>`;
  }
  function cBoard() {
    return `${sectionHead("调查手记", `${CS.no} / ${CS.title} · 把口述、物件和时间放在一起。`, `<span class="mono small muted">${CSSTATE.clues.length} / ${Object.keys(CS.clues).length} 线索</span>`)}${cGuide()}<p class="board-intro">点选两份证据，再说明它们共同支持的结论。选错可复核，不扣线索，也不会替你跳过剧情。</p><div class="evidence-board"><div class="evidence-grid">${Object.entries(
      CS.clues,
    )
      .map(([id, c]) =>
        cHas(id)
          ? `<button class="evidence ${caseSelected.includes(id) ? "selected" : ""}" data-action="c-select" data-id="${id}" aria-pressed="${caseSelected.includes(id)}"><small>EVIDENCE ${c.n} / ${c.type}</small><h3>${c.title}</h3><p>${c.text}</p><span class="source">${c.source}</span></button>`
          : `<button class="evidence locked" data-action="c-clue-hint" data-id="${id}">${icon("lock")}<small>线索 ${c.n} · 尚未发现</small></button>`,
      )
      .join(
        "",
      )}</div><div class="evidence-controls"><span>${caseSelected.length ? caseSelected.map((id) => cClue(id).title).join(" ＋ ") : "点选两份证据，寻找它们之间的联系。"}</span>${btn(`${icon("link")}建立关联`, "c-connect", "primary", caseSelected.length !== 2 ? "disabled" : "")}</div></div><section class="deductions"><h3>案情脉络 <span class="small muted">/ ${CSSTATE.links.length} 条已还原</span></h3>${CS.links.map((l) => `<div class="deduction ${CSSTATE.links.includes(l.id) ? "" : "unsolved"}">${icon(CSSTATE.links.includes(l.id) ? "check" : "lock")}<div><h4>${CSSTATE.links.includes(l.id) ? l.title : l.question}</h4><p>${CSSTATE.links.includes(l.id) ? l.text : l.hint}</p></div></div>`).join("")}</section><div class="board-actions">${btn(`${icon("file")}整理结案报告`, "c-report", "primary", CSSTATE.links.length !== CS.links.length ? "disabled" : "")}${btn(`${icon("help")}我需要一点提示`, "case-hint")}</div><div class="notes-panel"><label for="case-notes">页边批注 <span class="small muted">/ 只有你能看见</span></label><textarea id="case-notes" maxlength="4000" placeholder="把还不能确定的事先记在这里。">${esc(CSSTATE.notes)}</textarea><small>随输入自动保存 · ${CSSTATE.notes.length} / 4000</small></div>`;
  }
  function cResolveLink(link) {
    sound.cue("resolve");
    if (!CSSTATE.links.includes(link.id)) CSSTATE.links.push(link.id);
    caseSelected = []; cSave(); render();
    openModal("案情脉络 · 已还原", `<p class="kicker">证据与推断已分开记录</p><h3>${link.title}</h3><p>${link.text}</p><div class="letter">${cNext().text}</div><div class="modal-actions">${btn("记下这条联系", "close", "primary")}</div>`);
  }
  function cReport() {
    if (CSSTATE.links.length !== CS.links.length)
      return toast("先还原全部案情脉络。");
    openModal(
      `${CS.no} · 结案核对`,
      `<p>${CS.resolution}</p><form data-form="case-report">${CS.report.map((q) => `<div class="verdict-question"><label for="report-${q.id}">${q.label}</label><select id="report-${q.id}" name="${q.id}" required><option value="">请选择</option>${q.options.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></div>`).join("")}<p class="inline-error" id="case-report-error"></p><button class="btn primary full" type="submit">核对案卷 ${icon("arrow")}</button></form>`,
    );
  }
  function cEndingChoice() {
    openModal(
      "事实已能互相印证。怎样归档？",
      `<p>${CS.resolution}</p>${CS.endings.map((e) => `<button class="btn ${e.id === "truth" ? "primary" : ""} full case-ending-choice" data-action="c-ending" data-ending="${e.id}">${e.choice} ${icon("arrow")}</button>`).join("")}`,
    );
  }
  function cEnding() {
    const e = CS.endings.find((x) => x.id === CSSTATE.ending);
    if (!e) return cBoard();
    return `<section class="ending"><div class="ending-code">${e.code}</div><div class="ending-mark">${e.mark}</div><h2>${e.title}</h2>${e.paragraphs.map((p) => `<p>${p}</p>`).join("")}<p class="ending-last">${e.last}</p><div class="ending-buttons">${btn("返回案卷", "nav", "", 'data-view="board"')}${btn("选择另一种归档", "c-report", "primary")}${CS.nextCase ? btn(`交接下一夜 · ${CASES[CS.nextCase].title}`,"select-case","primary",`data-case="${CS.nextCase}"`) : btn("返回旧案柜","casebook")}</div><div class="ending-count">本案结局已收录 ${CSSTATE.endings.length} / ${CS.endings.length}</div></section>`;
  }
  function genericMain() {
    if (view === "casebook") return casebook();
    if (view === "post") return cThread();
    if (view === "messages") return cMessages();
    if (view === "board") return cBoard();
    if (view === "scene") return cScene();
    if (view === "ending") return cEnding();
    return cForum();
  }
  function forum() {
    let posts = G.posts.filter(
      (p) =>
        (category === "全部帖子" || p.category === category) &&
        (!query ||
          [p.title, p.author, p.excerpt, p.body.join("")]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase())),
    );
    if (filter === "只看未读")
      posts = posts.filter((p) => !S.read.includes(p.id));
    if (filter === "最近阅读")
      posts = posts.filter((p) => S.read.includes(p.id));
    if (filter === "最多回复") posts.sort((a, b) => b.replies - a.replies);
    return `<div class="bbs-masthead"><div class="bbs-title"><span class="bbs-eyebrow">未 明 论 坛　/　民 间 异 闻 交 流</span><h1>${query ? "站内检索" : "人间有些事，"}${query ? `<em>${esc(query)}</em>` : "<em>入夜再说。</em>"}</h1></div><div class="bbs-warnings"><span class="bbs-stamp">夜间开放</span><p>此处不留真名。<br>此处不问归路。</p></div></div><div class="bbs-toolbar"><div class="board-categories" aria-label="论坛分区">${["全部帖子", "正在发生", "民俗旧闻", "地方志", "闲谈"].map((c) => `<button class="category ${category === c ? "active" : ""}" data-action="category" data-category="${c}">${c === "全部帖子" ? "全部" : c}</button>`).join("")}</div><form class="search-form" data-form="search" role="search"><input name="q" aria-label="搜索论坛帖子" placeholder="找一段旧事…" value="${esc(query)}"><button aria-label="搜索">${icon("search")}</button></form></div>
 <button class="pinned-row" data-action="rules"><span class="pin-mark">告示</span><span>未明论坛访客须知：请在天亮前读完。</span><span class="pin-arrow">↗</span></button>
 <div class="bbs-list-heading"><div class="feed-tabs">${["最新发布", "只看未读"].map((f) => `<button class="${filter === f ? "active" : ""}" data-action="filter" data-filter="${f}">${f}</button>`).join("")}<button data-action="read-posts" class="${filter === "最近阅读" ? "active" : ""}">最近阅读</button></div><button class="sort" data-action="sort">${filter === "最多回复" ? "回复最多" : "最后动静"} ${icon("down")}</button></div><div class="post-list">${posts.length ? posts.map((p, n) => `<button class="post-row ${p.featured ? "featured" : ""} ${S.read.includes(p.id) ? "is-read" : ""}" data-action="post" data-id="${p.id}"><span class="post-avatar"><span>${p.avatar}</span><i>${String(G.posts.indexOf(p) + 1).padStart(2, "0")}</i></span><div class="post-content"><h3 class="post-title"><span class="tag">${p.label}</span><span>${p.title}</span>${!S.read.includes(p.id) ? '<i class="new-dot"></i>' : ""}</h3><p class="post-excerpt">${p.excerpt}</p><div class="post-meta"><span>${p.author}</span><span>·</span><span>${p.time}</span>${has(p.clue) ? '<span class="read-flag">/ 已记入手记</span>' : S.read.includes(p.id) ? '<span class="read-flag">/ 已阅</span>' : ""}</div></div><span class="post-replies"><b>${p.replies + (S.replies[p.id]?.length || 0) + (S.asked[p.id]?.length || 0)}</b><small>回应</small></span><span class="post-open">↗</span></button>`).join("") : `<div class="empty-state"><div class="big-symbol">寂</div><h3>没有找到这段旧事。</h3><p>${filter === "只看未读" ? "这一版的帖子，你已经都读过了。" : "换一个词试试。也许，它还没有被删掉。"}</p>${btn("返回全部帖子", "reset-filter")}</div>`}</div>
 ${has("lamp") ? `<button class="unusual-receipt" data-action="ghost-message"><span class="receipt-symbol">回</span><span><small>一条迟到的回执 · 来源时间 1998.07.16</small><strong>${S.ending ? "这一次，名字留下了吗？" : "你的阅读回执，送达了一个已注销的账号。"}</strong></span><span>查收 ↗</span></button>` : `<button class="night-message" data-action="contact" data-contact="north"><span class="unread-light"></span><span><strong>北窗</strong> 给你留了一句话：<em>“你在查南湾的那件事？”</em></span><span>读信 ↗</span></button>`}<div class="feed-end"><span>本版 ${posts.length} 帖 · 仅保留旧站镜像</span><span class="page-index">第 一 页</span><span>没有下一页了。</span></div>`;
  }
  function cluePanel(id) {
    const c = G.clues[id];
    return `<div class="clue-extract ${has(id) ? "collected" : ""}">${icon(has(id) ? "check" : "pin")}<div class="info"><small>${has(id) ? "已收入调查手记" : "发现可记录的信息"}</small><strong>${c.title}</strong></div>${btn(has(id) ? "查看手记" : "标记线索", has(id) ? "nav" : "collect", has(id) ? "" : "primary", has(id) ? 'data-view="board"' : `data-id="${id}"`)}</div>`;
  }
  function thread() {
    const p = G.posts.find((p) => p.id === postId);
    if (!p) {
      view = "forum";
      return forum();
    }
    return `<button class="back-link" data-action="nav" data-view="forum">${icon("back")}返回论坛 <span class="muted">/ ${p.category}</span></button><div class="thread-file-label">南湾异闻 / ${p.id === "river" ? "第 001 号来帖" : "旧站存档"}<span>收件人：夜班记录员</span></div><div class="thread-header"><span class="tag ${p.featured ? "tag-red" : ""}">${p.label}</span><h2>${p.title}</h2><div class="thread-author"><span class="avatar">${p.avatar}</span><div class="author-lines">${p.author}<small>${p.time} · ${p.views.toLocaleString()} 次阅读</small></div>${["雨打芭蕉", "北窗"].includes(p.author) ? btn(`${icon("mail")}私信楼主`, "contact", "", `data-contact="${p.author === "北窗" ? "north" : "rain"}"`) : '<span class="small muted">楼主</span>'}</div></div><article class="article-body">${p.body.map((t) => (/^<(blockquote|div)/.test(t) ? t : `<p>${t}</p>`)).join("")}</article>${p.clue ? cluePanel(p.clue) : ""}<section class="comments"><h3>帖内回复 <span class="small muted">/ 旧帖里还有人</span></h3>${p.comments.map((c, i) => commentHTML(c[0], c[1], i + 1)).join("")}${(S.asked[p.id] || []).map((n, i) => commentHTML("夜班记录员", p.questions[n].q, p.comments.length + i * 2 + 1) + commentHTML(p.author, p.questions[n].a, p.comments.length + i * 2 + 2)).join("")}${(S.replies[p.id] || []).map((t, i) => commentHTML("夜班记录员", t, "留") + commentHTML(p.author, replyFor(t), "回")).join("")}</section><div class="reply-box"><label>继续追问 <span class="small">/ 选择一句话，等待对方回应</span></label><div class="question-options">${p.questions.map((q, i) => `<button data-action="ask" data-index="${i}" ${(S.asked[p.id] || []).includes(i) ? "disabled" : ""}>${(S.asked[p.id] || []).includes(i) ? "✓ " : ""}${q.q}</button>`).join("")}</div><form data-form="reply"><label for="reply-input">或者写下你的回复</label><textarea id="reply-input" name="reply" maxlength="500" placeholder="说点什么吧。别留下你的真名。" required></textarea><div class="reply-actions"><span class="small muted">剧情为预设互动，留言仅保存在本机。</span><button class="btn primary" type="submit">发表回复 ${icon("arrow")}</button></div></form></div>`;
  }
  function commentHTML(name, text, index) {
    return `<div class="comment"><span class="avatar">${esc(name[0])}</span><div class="comment-body"><div class="name">${esc(name)}<small>#${index}</small></div><p>${esc(text)}</p></div></div>`;
  }
  function replyFor(text) {
    if (/陈渡|小禾|闸|泵房/.test(text))
      return "你也留意到那段旧事了。去找北窗吧，他保存了当年的底片。";
    if (/灯|七|六/.test(text))
      return "灯的数目不是偶然。纸上灰发过一篇借灯的考据，也许你可以看看。";
    if (/害怕|恐怖|救|小心/.test(text))
      return "谢谢你。我会留在岸上，不会一个人下水。";
    return "我看到了。这里知道内情的人不多，先把能找到的材料留下来吧。";
  }
  const dialogue = {
    north: {
      hello: {
        q: "我接手了今夜的档案。你知道些什么？",
        a: "我叫北窗，给旧城拍照的人。\n那盏灯停的地方，我六年前去过。别急着相信报纸，先看看档案员发的那张剪报。",
      },
      archive: {
        q: "我看到了 1998 年的剪报，能给我旧底片吗？",
        a: "底片背面有我写的地址：槐平码头 17 号，南湾旧泵房。\n防汛柜还在那里。柜门上有四位密码，我叔说用的是“出事那天的月日”。别把建成年份当密码。\n我先过去，在岸上等你。",
        clue: "address",
      },
      safety: {
        q: "现场调查有什么要注意的？",
        a: "只看岸上的东西，不下水。窗边有值班簿，柜子里有旧磁带，石阶上还有一盏灯。\n你看到的东西，先记录，再判断。我说的话也一样。",
      },
    },
    rain: {
      hello: {
        q: "我是论坛的夜班记录员。你还好吗？",
        a: "还好。我现在站在桥上，能看见那盏灯。\n我一直以为，只要照奶奶说的做，这件事就能过去。",
      },
      lantern: {
        q: "你为什么每年都来放灯？",
        a: "因为有人在这里救过我。\n六盏灯，是用来照路的。第七盏才是留给那个人的。可我不知道，该不该把他的名字写上去。",
      },
      identity: {
        q: "值班簿写到了小禾。你就是沈小禾，对吗？",
        a: "……是我。\n那年陈渡把我背上石桥，又回去关闸。后来报纸写我失踪，写他逃走。亲戚怕惹事，把我接去了外地。\n这六年，我一直没敢纠正那个故事。\n我放了六盏灯，却一直没敢写他的名字。",
        clue: "survivor",
      },
    },
  };
  function messages() {
    const who = contact === "north" ? "北窗" : "雨打芭蕉";
    const options = Object.entries(dialogue[contact]);
    return `${sectionHead("站内私信", "收件箱里有两个人。一位在岸上，一位在桥上。")}<div class="message-layout"><div class="contact-list">${[
      ["north", "窗", "北窗"],
      ["rain", "雨", "雨打芭蕉"],
    ]
      .map(
        ([c, a, n]) =>
          `<button class="contact-item ${contact === c ? "active" : ""}" data-action="contact" data-contact="${c}"><span class="avatar">${a}</span>${n}</button>`,
      )
      .join(
        "",
      )}</div><section class="chat-pane"><div class="chat-top"><span>${who}</span><small><span class="dot"></span>${pendingChat?.contact === contact ? "对方正在输入…" : "连接中"}</small></div><div class="chat-history" id="chat-history"><div class="chat-time">2004 / 07 / 21 · 23:47</div><div class="bubble">${contact === "north" ? "你在查南湾的那件事？\n有些东西在网上看不到。如果需要，来找我。" : "你是看了我那个帖子的，对吗？\n灯还没灭。"}</div>${S.chats[
      contact
    ]
      .filter((k) => dialogue[contact][k])
      .map((k) => {
        const d = dialogue[contact][k];
        return `<div class="bubble mine">${d.q}</div><div class="bubble">${d.a}${d.clue ? `<div class="inline-clue">${icon("pin")}线索已收录：${G.clues[d.clue].title}</div>` : ""}</div>`;
      })
      .join(
        "",
      )}${pendingChat?.contact === contact ? `<div class="bubble mine">${dialogue[contact][pendingChat.key].q}</div><div class="typing-line" role="status">${who} 正在输入<span> · · ·</span></div>` : ""}</div><div class="chat-options"><p>回复 / 选择一句你想说的话</p>${options
      .filter(([k]) => !S.chats[contact].includes(k))
      .map(([k, d]) => {
        const locked =
          (k === "archive" && !has("news")) ||
          (k === "identity" && !has("ledger"));
        return `<button data-action="chat" data-key="${k}" ${locked || pendingChat?.contact === contact ? "disabled" : ""}>${d.q}${locked ? `<small>${icon("lock")}${k === "archive" ? "先阅读并标记 1998 年的剪报" : "先在旧泵房找到值班簿"}</small>` : ""}</button>`;
      })
      .join(
        "",
      )}${contact === "north" && unlocked() ? btn(`${icon("map")}前往南湾旧泵房`, "nav", "full", 'data-view="scene"') : ""}${contact === "rain" && has("survivor") ? btn("回到调查手记，拼合线索", "nav", "full", 'data-view="board"') : ""}${options.every(([k]) => S.chats[contact].includes(k)) ? '<small class="muted">对方暂时没有更多消息。</small>' : ""}</div></section></div>`;
  }
  function board() {
    return `${sectionHead("调查手记", "档案 001 / 借灯人 · 把散落的纸页，拼回同一个夜晚。", `<span class="mono small muted">${S.clues.length} / 8 线索</span>`)}<p class="board-intro">点选两张有关联的线索，再「建立关联」。<br>不是所有相似的细节，都通向同一个答案。${!S.clues.length ? "先回论坛，阅读并标记可疑的信息。" : ""}</p><div class="evidence-board"><div class="evidence-grid">${Object.entries(
      G.clues,
    )
      .map(([id, c]) =>
        has(id)
          ? `<button class="evidence ${selected.includes(id) ? "selected" : ""}" data-action="select-clue" data-id="${id}" aria-pressed="${selected.includes(id)}"><small>EVIDENCE ${c.n} / ${c.type}</small><h3>${c.title}</h3><p>${c.text}</p><span class="source">${c.source}</span></button>`
          : `<button class="evidence locked" data-action="clue-hint" data-id="${id}" aria-label="查看线索 ${c.n} 的寻找提示">${icon("lock")}<small style="margin-top:10px;color:inherit">线索 ${c.n} · 尚未发现</small></button>`,
      )
      .join(
        "",
      )}</div><div class="evidence-controls"><span>${selected.length ? selected.map((id) => G.clues[id].title).join(" ＋ ") : "点选两份证据，寻找它们之间的联系。"}</span>${btn(`${icon("link")}建立关联`, "connect", "primary", selected.length !== 2 ? "disabled" : "")}</div>${selected.length === 1 ? `<button class="back-link" style="margin:12px 0 0" data-action="inspect-clue" data-id="${selected[0]}">${icon("eye")}阅读完整证据</button>` : ""}</div><section class="deductions"><h3>事件脉络 <span class="small muted">/ ${S.links.length} 条已还原</span></h3>${G.links.map((l, i) => `<div class="deduction ${S.links.includes(l.id) ? "" : "unsolved"}">${icon(S.links.includes(l.id) ? "check" : "lock")}<div><h4>${S.links.includes(l.id) ? l.title : `待还原 ${["壹", "贰", "叁"][i]} · ${["河灯为什么逆流？", "那晚真的只是天灾吗？", "谁活了下来，谁没有？"][i]}`}</h4><p>${S.links.includes(l.id) ? l.text : l.hint}</p></div></div>`).join("")}</section><div class="board-actions">${btn(`${icon("file")}${S.ending ? "重新整理结案报告" : "整理结案报告"}`, "verdict", "primary", !ready() ? "disabled" : "")}${btn(`${icon("help")}我需要一点提示`, "hint")}${S.ending ? btn("重看结局", "nav", "", 'data-view="ending"') : ""}</div>${!ready() ? `<p class="small muted" style="margin-top:10px">收集全部 8 份证据、还原 3 条脉络后，可以提交报告。</p>` : ""}<div class="notes-panel"><label for="personal-notes">页边批注 <span class="small muted">/ 只有你能看见</span></label><textarea id="personal-notes" maxlength="4000" placeholder="把那些还不能确定的事，先记在这里。">${esc(S.notes)}</textarea><small>随输入自动保存 · ${S.notes.length} / 4000</small></div>`;
  }
  function scene() {
    if (!unlocked())
      return `${sectionHead("实地探查", "有些回答，藏在屏幕之外。")}<div class="empty-state"><div class="big-symbol">未至</div><h3>你还不知道该去哪里。</h3><p>论坛上的「北窗」保存着当年的底片。<br>先找到 1998 年的旧闻，再向他打听泵房的地址。</p>${btn("给北窗发私信", "contact", "primary", 'data-contact="north"')}</div>`;
    return `${sectionHead("南湾 · 旧泵房", "槐平码头 17 号 / 现场调查", `<button class="back-link" style="margin:0" data-action="nav" data-view="forum">${icon("back")}返回论坛</button>`)}<div class="scene-frame"><img class="scene-photo" src="assets/town-night.jpg" alt="雨夜中临水的旧建筑与石阶"><div class="scene-rain"></div><div class="scene-particles" aria-hidden="true"></div><div class="scene-caption"><span class="kicker">SOUTH BANK / 23:58</span><h3>水声从门里传来。</h3></div><div class="scene-counter">已取证 ${["ledger", "tape", "paper"].filter(has).length} / 3</div>${[
      ["door", 34, 43, "门牌", false],
      ["ledger", 58, 53, "窗边值班簿", has("ledger")],
      ["safe", 77, 62, "防汛柜", has("tape")],
      ["paper", 53, 83, "石阶河灯", has("paper")],
    ]
      .map(
        ([id, x, y, t, done]) =>
          `<button class="hotspot ${done ? "done" : ""}" style="left:${x}%;top:${y}%" data-action="hotspot" data-id="${id}" aria-label="调查${t}"><span class="spot"></span><span>${done ? "✓ " : ""}${t}</span></button>`,
      )
      .join(
        "",
      )}<div class="scene-bottom"><p>雨落在河面上。那盏灯，像在等谁低头看它。</p><span>${icon("eye")}点击标记，查看现场物件</span></div></div><div class="field-dialogue"><span class="avatar">窗</span><div class="dialogue-copy"><h4>北窗 <span class="muted small">/ 同行者</span></h4><p>${has("ledger") && has("tape") ? "“报纸说他走了，录音却说他要回来关闸。现在，该去问那个放灯的人了。”" : "“我只带你到岸边。窗边那本值班簿，还放在六年前的位置。像是有人每天都在翻。”"}</p></div>${btn("和他聊聊", "field-talk")}</div><div class="field-inventory"><span>本次取证</span>${
      ["ledger", "tape", "paper"]
        .filter(has)
        .map(
          (id) =>
            `<button class="inventory-item" data-action="inspect-clue" data-id="${id}">${icon("file")}${G.clues[id].title}</button>`,
        )
        .join("") || '<span class="muted">尚未收集物件</span>'
    }</div><p class="field-note">请勿模仿危险探险行为。场景中的人物、地点与标记均为虚构剧情。</p>`;
  }
  function ending() {
    if (!S.ending) {
      view = "board";
      return board();
    }
    const e = G.endings[S.ending];
    return `<section class="ending"><div class="ending-code">${e.code}</div><div class="ending-mark">${S.ending === "truth" ? "归" : "隐"}</div><h2>${e.title}</h2>${e.paragraphs.map((p) => `<p>${p}</p>`).join("")}<p class="ending-last">${e.last}</p><div class="ending-buttons">${btn("返回档案", "nav", "", 'data-view="board"')}${btn("选择另一种记录方式", "verdict", "primary")}${btn(`${icon("download")}导出本案记录`, "export-report")}</div><div class="ending-count">结局已收录 ${S.endings.length} / 2 · 原创短篇「借灯人」完</div></section>`;
  }
  // Dialogs keep focus contained and return it to the originating control.
  function openModal(title, body, wide = false) {
    if (!activeModal) modalReturn = document.activeElement;
    activeModal = title;
    document.getElementById("modal-root").innerHTML =
      `<div class="modal-backdrop"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><h2 id="modal-title">${title}</h2><button class="modal-close" data-action="close" aria-label="关闭弹窗">${icon("close")}</button></div><div class="modal-body">${body}</div></section></div>`;
    document.body.style.overflow = "hidden";
    document.getElementById("app").inert = true;
    document.querySelector(".modal-close").focus();
  }
  function closeModal(restore = true) {
    if (!activeModal) return;
    stopTape();
    document.getElementById("modal-root").innerHTML = "";
    document.body.style.overflow = "";
    document.getElementById("app").inert = false;
    activeModal = null;
    if (restore && modalReturn?.isConnected)
      modalReturn.focus({ preventScroll: true });
  }
  function letter() {
    if (inCase()) {
      openModal(`${CS.title} · 值夜交接`, `<div class="letter"><p>记录员：</p>${CS.intro.map(p => `<p>${p}</p>`).join("")}<p>${cTask()}</p><p class="sign">未明值夜室 · ${CS.date}</p></div><div class="modal-actions">${btn("收下交接信","close","primary")}</div>`); return;
    }
    openModal(
      "给下一位值夜人",
      `<div class="letter"><p>记录员：</p><p>欢迎来到未明。</p><p>今晚从那篇河灯的求助帖开始。先读，再问，把不对劲的地方<em>标记进调查手记</em>。</p><p>「纸上灰」收集旧俗，「南湾档案员」留着旧报纸，而「北窗」手里，有些从没上过网的底片。</p><p>如果线索指向同一个地方，就去看看。把两份能互相印证的材料摆在一起，你会明白事情原来的样子。</p><p>我们不替传闻作证。<br>我们替那些没能留下名字的人，保管证据。</p><p class="sign">守夜人<br>七月二十一日 · 雨</p></div><div class="modal-actions">${btn("从河灯的帖子开始", "post", "primary", 'data-id="river"')}</div>`,
    );
  }
  function rules() {
    openModal(
      "访客须知 · 版务 0001",
      `<p>欢迎来到未明。这里收留一些在别处说不出口的故事。</p><ol class="hint-steps"><li>不留真实姓名、地址与联系方式。论坛中的人物都是故事人物。</li><li>不把传闻当事实。能留证的，先留证。</li><li>不要模仿涉水、夜探废弃建筑等危险行为。</li><li>如果看见注销账号回复，不必反复刷新。管理员已经知道了。</li><li>天亮以后，再决定你愿意相信什么。</li></ol><p class="small muted">本作含悬疑叙事、环境声与轻微光线变化，无血腥图片、无突发贴脸惊吓。设置中可关闭动态效果和声音。</p>${btn("我读完了", "close", "full")}`,
    );
  }
  function help() {
    if (inCase()) {
      openModal("今夜怎么查", `<div class="help-grid"><div><h3>01 · 找到矛盾</h3><p>读帖、追问并标记证据。新记录要等核查条件成立才出现，不必在未开放的线索上反复点击。</p></div><div><h3>02 · 带着材料私信</h3><p>对话标注了所需证据。取得具体地址后现场才开放；不是攒够数量就能进入所有房间。</p></div><div><h3>03 · 实地复核</h3><p>点热点或照片下的同名按钮。先取证，再在手记还原关键脉络，复勘地点才会开放。</p></div><div><h3>04 · 说明推断</h3><p>配对两份材料，选择它们支持的结论。错误会指出证据边界，可随时改，不扣进度。</p></div></div><p>本案 ${Object.keys(CS.clues).length} 份证据、${CS.links.length} 条脉络、${cScenes().length} 处现场、两种归档方向。${CS.series ? "连续案按前案归档开放，前案选择保留在下一夜交接中。" : "旧案可独立游玩。"}</p><p class="small muted">所有人物为预设剧情；没有网络聊天或真实提交。Tab 操作、Esc 关闭，音频不是解谜条件。设置可导出当前案卷或整柜备份。</p><div class="modal-actions">${btn("下一步提示","case-hint")}${btn("继续调查","close","primary")}</div>`); return;
    }
    openModal(
      "在未明，如何调查",
      `<div class="help-grid"><div><h3>01 · 读帖与追问</h3><p>打开帖子，阅读正文。点击「标记线索」收录证据；帖末的预设问题会带来进一步回复。</p></div><div><h3>02 · 给相关人私信</h3><p>有些对话需要先找到证据。先看旧报纸，再向北窗询问底片，便能开启现场。</p></div><div><h3>03 · 现场取证</h3><p>点击现场标记检查物件。防汛柜需要四位密码；正确日期藏在剪报里。</p></div><div><h3>04 · 串起线索</h3><p>在手记中选择两张相关证据，建立三条事件脉络。证据齐全后整理报告，并选择记录的方式。</p></div></div><p style="margin-top:20px">这是一个约 20–35 分钟的原创短篇，有 <strong>8 份证据、3 条推论和 2 个结局</strong>。所有对话为本地预设剧情，没有真实聊天对象。</p><p class="small muted">进度自动存储在当前浏览器。清理浏览器数据可能丢失进度，建议在设置中导出存档。Esc 可关闭弹窗，Tab 可键盘导航。</p><div class="modal-actions">${btn("遇到卡点？查看提示", "hint")}${btn("开始调查", "close", "primary")}</div>`,
    );
  }
  function hint() {
    let title = "夜班提示",
      text = task(),
      extra = "";
    if (!has("lamp"))
      extra = "在「昨夜河边的灯，多了一盏。」正文下方点击「标记线索」。";
    else if (!has("custom"))
      extra = "打开纸上灰的借灯考据，标记「借灯，不是招魂」。";
    else if (!has("news")) extra = "在地方志中打开 1998 年剪报，并标记线索。";
    else if (!has("address"))
      extra = "打开站内私信 → 北窗 → 询问 1998 年的剪报与底片。";
    else if (!has("ledger"))
      extra = "进入实地探查，点击「窗边值班簿」，检查完后记得收录。";
    else if (!has("tape"))
      extra = "防汛柜使用事故当天的月日。7 月 16 日，写成四位是 0716。";
    else if (!has("paper"))
      extra = "检查现场下方的「石阶河灯」，阅读灯内的字并收录。";
    else if (!has("survivor"))
      extra = "找到值班簿后，再私信雨打芭蕉，询问她是否就是沈小禾。";
    else if (S.links.length < 3) {
      const l = G.links.find((l) => !S.links.includes(l.id));
      extra = l.hint;
      title = "推论提示";
    } else
      extra =
        "报告的依据分别来自「借灯旧俗」「值班簿」与「雨打芭蕉的证言」。无论如何记录，证据都指向同一个人。";
    openModal(
      title,
      `<p>${text}</p><div class="letter" style="margin:20px 0">${extra}</div>${S.clues.length === 8 && S.links.length < 3 ? btn("展开这条关联的具体答案", "exact-hint", "full") : ""}<div class="modal-actions">${btn("继续调查", "close", "primary")}</div>`,
    );
  }
  function settings() {
    openModal(
      "设置与存档",
      `<div class="setting-row"><span>环境音<small>分场景声场与操作音效，默认关闭</small></span><button class="toggle" data-action="sound-settings">${S.sound ? "已开启" : "已关闭"}</button></div><div class="setting-row"><label for="volume-range">总音量 <output id="volume-level" for="volume-range">${S.volume}%</output><small>环境、操作音与磁带的总音量</small></label><input id="volume-range" type="range" min="0" max="100" value="${S.volume}"></div><div class="sound-settings-note"><span class="sound-readout">${S.sound ? sound.snapshot().label : "声音已关闭 · 可随时开启"}</span>${btn("试听纸页", "preview-sound", "", S.sound ? "" : "disabled")}</div><div class="setting-row"><label for="ambience-range">环境声 <output id="ambience-level" for="ambience-range">${S.ambience}%</output><small>雨、风、水声 · 切换场景平滑过渡</small></label><input id="ambience-range" type="range" min="0" max="100" value="${S.ambience}"></div><div class="setting-row"><label for="effects-range">操作音 <output id="effects-level" for="effects-range">${S.effects}%</output><small>翻页、收录、私信与推理反馈</small></label><input id="effects-range" type="range" min="0" max="100" value="${S.effects}"></div><div class="setting-row"><span>动态效果<small>雨幕、浮尘、切页过渡；无闪屏惊吓</small></span><button class="toggle" data-action="motion">${S.motion ? "已开启" : "已关闭"}</button></div><div class="setting-row"><span>本地存档<small>${inCase() ? `${CS.title} · ${CSSTATE.clues.length}/${Object.keys(CS.clues).length} 线索 · ${CSSTATE.links.length}/${CS.links.length} 关联` : `${S.clues.length}/8 线索 · ${S.links.length}/3 关联 · ${S.endings.length}/2 结局`}</small></span>${btn("导出存档", "export-save")}</div><div class="setting-row"><span>读取存档<small>使用本作导出的 JSON 文件</small></span>${btn("导入存档", "import-save")}<input class="file-input" id="import-file" type="file" accept="application/json,.json"></div><div class="setting-row"><span>整柜备份<small>包含九案进度、已选归档方向与当前案卷</small></span>${btn("导出整柜", "export-library")}</div><p class="small muted" style="margin-top:20px">${storageFailed ? "当前浏览器不允许本地存储，请导出存档。" : "所有进度仅保存在你的设备中，没有上传服务器。"}关闭声音不影响解谜；所有录音都有文字转写。</p><div class="modal-actions">${btn("重新开始", "reset-confirm", "ghost")}${btn("完成", "close", "primary")}</div>`,
    );
  }
  function inspectClue(id) {
    const c = G.clues[id];
    if (!c) return;
    openModal(
      `证据 ${c.n} · ${c.title}`,
      `<p class="kicker">${c.source} / ${c.type}</p><div class="letter" style="margin-top:20px">${c.text}</div><div class="modal-actions">${btn("收好证据", "close", "primary")}</div>`,
    );
  }
  function hotspot(id) {
    if (id === "door")
      openModal(
        "槐平码头 · 十七号",
        `<div class="record-sheet" style="text-align:center"><p class="small">南 湾 水 务</p><p style="font:bold 56px var(--serif);letter-spacing:8px">17</p><p>旧 泵 房</p></div><p>门牌下面有一行早已褪色的字：<br>“一九七二年建。”</p><p>北窗提醒你：<strong>柜子的密码是出事的月日，不是建筑年份。</strong></p>${btn("看看别处", "close", "full")}`,
      );
    if (id === "ledger")
      openModal(
        "窗边的值班簿",
        `<p>簿子泡过水。后半本粘在一起，只有这一页被反复翻过。</p><div class="record-sheet"><h3>防 汛 值 班 记 录</h3><div class="record-line">日期：一九九八年七月十六日</div><div class="record-line">23:10　上游粮站要求提前开闸。</div><div class="record-line">下游尚有人未撤。已报告，未获回复。</div><div class="record-line">值班员：<span class="crossed">陈渡</span></div><p class="pencil">小禾交给石桥上的人。<br>陈师傅没上来。—— 次日补记</p></div><p>报纸说“擅离职守”，这里却记着他留下来做的事。</p><div class="modal-actions">${btn(has("ledger") ? "已收入手记" : "收录值班记录", "field-collect", "primary", `data-id="ledger" ${has("ledger") ? "disabled" : ""}`)}</div>`,
      );
    if (id === "safe") {
      if (S.openedSafe) {
        tapeDialog();
        return;
      }
      openModal(
        "旧防汛柜",
        `<p>锈迹下还留着四个密码滚轮。柜门内侧有人刻了小字：</p><p style="text-align:center;letter-spacing:3px;color:#c9b78e">“记住出事的那一天。”</p><form data-form="safe"><div class="lock-box"><div class="lock-title">FLOOD CONTROL / ARCHIVE</div><input name="code" id="safe-code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" aria-label="四位防汛柜密码" placeholder="····" required><p class="lock-hint">四位数字 · 月 / 日<br>线索来源：1998 年的剪报、北窗的私信</p><div id="safe-error" class="inline-error" role="status"></div></div><button type="submit" class="btn primary full">试着打开</button></form>`,
      );
      document.getElementById("safe-code").focus();
    }
    if (id === "paper")
      openModal(
        "石阶上的第七盏灯",
        `<p>灯没有动。你没有下水，只伸手拾起卡在石阶上的纸边。</p><div class="letter" style="transform:rotate(-1deg);margin:20px 0"><p style="font-size:18px;line-height:2.2">给把我背上岸的人。<br>大家都说你走了，<br>可我知道你还在水里。</p><p class="sign">禾</p></div><p>灯芯上系着<strong>一小段白棉线</strong>。落款的“禾”，和剪报上的名字重合了。</p><div class="modal-actions">${btn(has("paper") ? "已收入手记" : "记录灯内的字", "field-collect", "primary", `data-id="paper" ${has("paper") ? "disabled" : ""}`)}</div>`,
      );
  }
  function tapeDialog() {
    openModal(
      "防汛柜里的一盘磁带",
      `<p>里面没有钱，也没有名册。只有一盘贴着“七月十六”的旧磁带。</p><div class="tape-art"><div class="tape-label">南湾 / 1998.07.16<div class="tape-reels"><i></i><i></i></div></div></div><button class="btn play-tape" data-action="play-tape" id="tape-button">${icon("play")}播放残留录音</button><div class="waveform" id="waveform">${Array.from({ length: 39 }, () => "<i></i>").join("")}</div><div class="letter"><p class="small">录音转写 · 陈渡</p>“不是雨把闸冲开的。告诉小禾，沿着灯走，别回头。我来关闸。”</div><p class="small muted" style="margin-top:15px">录音末尾传来七下敲击声。播放非解谜必需，文字转写包含全部信息。</p><div class="modal-actions">${btn(has("tape") ? "已收入手记" : "收录录音与转写", "field-collect", "primary", `data-id="tape" ${has("tape") ? "disabled" : ""}`)}</div>`,
    );
  }
  function verdict() {
    if (!ready()) {
      toast("还需要收集全部证据并完成三条关联。");
      return;
    }
    openModal(
      "结案报告 · 借灯人",
      `<p>把证据放回它应在的位置。报告提交前，请核实以下三件事。</p><form data-form="verdict"><div class="verdict-question"><label for="answer-name">一、第七盏灯在等谁的名字？</label><select id="answer-name" name="name" required><option value="">选择被漏记的人</option><option value="shen">沈小禾</option><option value="chen">陈渡</option><option value="north">北窗</option></select></div><div class="verdict-question"><label for="answer-cause">二、1998 年的水患，真正的起因是什么？</label><select id="answer-cause" name="cause" required><option value="">选择事故的起因</option><option value="rain">暴雨冲毁了旧闸</option><option value="ghost">借灯招来了水中的亡魂</option><option value="gate">上游粮站要求提前开闸</option></select></div><div class="verdict-question"><label for="answer-rite">三、按照抄本，怎样让第七盏灯离开？</label><select id="answer-rite" name="rite" required><option value="">选择正确的旧俗</option><option value="red">系红线，写下放灯人的真名</option><option value="white">系白棉线，补上陈渡的名字</option><option value="burn">烧掉报纸，不再提起这件事</option></select></div><p class="inline-error" id="verdict-error" role="status"></p><button class="btn primary full" type="submit">核对证据，完成还原 ${icon("arrow")}</button></form>`,
    );
  }
  function chooseEnding() {
    openModal(
      "事实已经清楚。你怎样记录？",
      `<p>陈渡救下了沈小禾，又回到泵房关闸。被称作逃离的人，没有离开；被写成失踪的女孩，活到了今天。</p><p>名字补上了。可这份证据，是只给一个人看，还是给所有人看？</p><div class="letter" style="margin:20px 0">雨打芭蕉：<br>“我想让他回家。也想让人知道，他没有逃。”</div><button class="btn primary full" data-action="ending" data-ending="truth" style="margin-bottom:12px">公开原始材料，为陈渡正名 ${icon("arrow")}</button><button class="btn full" data-action="ending" data-ending="silence">只告诉沈小禾，将其余档案封存</button><p class="small muted" style="margin-top:15px">两种记录方式通向不同结局。结束后可保留调查进度，重选一次。</p>`,
    );
  }
  function credits() {
    openModal(
      "关于未明旧案柜 · 视听增强版",
      `<p>五宗独立旧案与四夜连续故事《寄名簿》。原创民俗悬疑互动小说。</p><p>玩法受到「用论坛拼合怪谈、通过私信与实地调查还原事件」这一形式的启发。<strong>本作与《頭七》及其开发者无关联</strong>，未使用其角色、故事、对白、标志、截图或音乐作为游戏内容。</p><p>人物、城市、事故、借灯规矩均为本作虚构，不代表真实民俗，也不是对真实事件的记述。</p><h3>美术与声音</h3><p>首案保留原创程序夜景；其余现场采用本项目建模、程序材质与灯光的十二幅 Blender 预渲染，全部本地加载，附可重建源代码，非参考游戏素材。界面图标为本项目绘制。分场景雨、风、水滴、低声电流及翻页、收录、消息反馈由 Web Audio 实时合成，可分别调节环境与操作音；磁带对白为原创文本，通过系统中文语音生成并进行旧磁带处理。</p><h3>技术说明</h3><p>纯 HTML / CSS / JavaScript，无账号、无后端、无追踪。所有互动与存档均在本机完成。离线也可游玩。</p><p class="small muted">提示：内容含死亡、灾难与失踪主题；无血腥图片和贴脸惊吓。建议 16 岁以上玩家体验。</p>${btn("回到今夜", "close", "full")}`,
    );
  }
  function download(name, content, type = "application/json") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportReport() {
    const e = G.endings[S.ending];
    const text = `未明论坛 · 档案 001：借灯人\n\n${Object.values(G.clues)
      .map((c) => `${c.n}. ${c.title}\n${c.source}\n${c.text}`)
      .join(
        "\n\n",
      )}\n\n事件脉络\n${G.links.map((l) => `${l.title}\n${l.text}`).join("\n\n")}\n\n结局：${e.code}\n${e.paragraphs.join("\n\n")}\n\n页边批注\n${S.notes || "无"}\n\n原创虚构故事，不代表真实事件或民俗。`;
    download("未明论坛-借灯人-调查报告.txt", text, "text/plain;charset=utf-8");
    toast("调查报告已导出。");
  }
  // A single sound stage is reused across case changes and rerenders.
  const sound = window.WeimingSound;
  let tapeAudio = null;
  function ambienceProfile() {
    if (view === "ending") return "dawn";
    if (view === "board" || view === "post" || view === "casebook") return "paper";
    if (view === "messages") return "message";
    if (view !== "scene" || (inCase() ? !cSceneOpen() : !unlocked())) return "desk";
    if (!inCase()) return "rain";
    if (CS.id === "snow") return "snow";
    if (CS.id === "shadowplay") return "theatre";
    if (CS.id === "caravan") return "rain";
    if (CS.id === "wellpost") return cCurrentScene().art?.includes("well.") ? "well" : "room";
    return "room";
  }
  function syncAtmosphere() {
    sound.setProfile(ambienceProfile());
    sound.configure({enabled:S.sound,master:S.volume,ambience:S.ambience,effects:S.effects});
    document.body.dataset.sound = S.sound ? "on" : "off";
    document.body.dataset.atmosphere = sound.snapshot().profile;
    document.body.dataset.case = activeCaseId;
    const source = inCase() ? (view === "scene" && cSceneOpen() ? cCurrentScene().art || CS.art : CS.art) : "assets/town-night.jpg";
    document.body.style.setProperty("--case-photo", `url("${source}")`);
    const readout = document.querySelector(".sound-readout");
    if(readout)readout.textContent = S.sound ? sound.snapshot().label : "声音已关闭 · 可随时开启";
  }
  async function ensureAudio() {
    try { await sound.unlock(); syncAtmosphere(); return true; }
    catch { toast("当前浏览器无法启用声音。文字与解谜不受影响。"); return false; }
  }
  function setVolume() {
    sound.configure({enabled:S.sound,master:S.volume,ambience:S.ambience,effects:S.effects});
    if(tapeAudio)tapeAudio.volume = S.volume / 100;
  }
  async function toggleSound() {
    S.sound = !S.sound;
    const ok = !S.sound || await ensureAudio();
    if(!ok)S.sound=false;
    if(!S.sound)stopTape();
    setVolume();save();render();
    return ok;
  }
  function chime() { sound.cue("stamp"); }
  function stopTape() {
    sound.duck(false);
    if (tapeAudio) {
      tapeAudio.pause();
      tapeAudio.currentTime = 0;
      tapeAudio = null;
    }
    document.getElementById("waveform")?.classList.remove("playing");
  }
  function playTape() {
    if (tapeAudio && !tapeAudio.paused) {
      stopTape();
      const b = document.getElementById("tape-button");
      if (b) b.innerHTML = icon("play") + "播放残留录音";
      return;
    }
    stopTape();
    const recording = tapeAudio = new Audio("assets/last-recording.mp3");
    recording.volume = S.volume / 100;
    recording.addEventListener("ended", () => {
      if(tapeAudio !== recording)return;
      sound.duck(false);
      document.getElementById("waveform")?.classList.remove("playing");
      const b = document.getElementById("tape-button");
      if (b) b.innerHTML = icon("play") + "再次播放录音";
    });
    recording.play().then(() => {
      // The dialog may have closed, or the tab become hidden, during decoding.
      if(tapeAudio !== recording || document.hidden){recording.pause();return;}
      sound.duck(true);
      document.getElementById("waveform")?.classList.add("playing");
      const b = document.getElementById("tape-button");
      if (b) b.innerHTML = icon("sound") + "停止播放";
    }).catch(() => {
      if(tapeAudio !== recording)return;
      stopTape();
      toast("录音未能播放，请阅读下方完整转写。");
    });
  }

  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const a = el.dataset.action,
      id = el.dataset.id;
    if(S.sound && !["sound", "sound-settings"].includes(a) && sound.snapshot().state !== "running") ensureAudio();
    if(["post","c-post","nav","casebook","select-case","c-scene"].includes(a)) sound.cue("page");
    else if(["hotspot","c-hotspot","c-inspect","inspect-clue"].includes(a)) sound.cue("inspect");
    else if(["select-clue","c-select"].includes(a)) sound.cue("select");
    else if(a === "close") sound.cue("close");
    switch (a) {
      case "preview-sound":
        if(S.sound && await ensureAudio())sound.cue("page");
        break;
      case "casebook":
        view = "casebook";
        render(false);
        break;
      case "select-case":
        chooseCase(el.dataset.case);
        break;
      case "case-rules":
        openModal(
          "案卷说明",
          `<p>${CS.intro[1]}</p><p>${CS.intro[2]}</p><div class="modal-actions">${btn("开始核查", "close", "primary")}</div>`,
        );
        break;
      case "case-hint":
        openModal(
          "案卷批注",
          `<p>${cTask()}</p><div class="letter">${CS.links.find((l) => !CSSTATE.links.includes(l.id))?.hint || "把已经确认的材料放回案卷，不要急着补写没有证据的部分。"}</div><div class="modal-actions">${btn("继续调查", "close", "primary")}</div>`,
        );
        break;
      case "c-post":
        if (!cUnlocked(CS.posts.find(p => p.id === id))) return toast("这份记录尚未到达。先沿当前线索调查。");
        postId = id;
        if (!CSSTATE.read.includes(id)) CSSTATE.read.push(id);
        cSave();
        view = "post";
        render(false);
        break;
      case "c-collect":
        if (!CS.posts.some(p => p.clue === id && cUnlocked(p))) break;
        cAdd(id);
        render();
        break;
      case "c-contact":
        contact = el.dataset.contact;
        view = "messages";
        render(false);
        break;
      case "c-ask": {
        const p = CS.posts.find((x) => x.id === postId);
        const n = Number(el.dataset.index);
        if (!p?.questions[n]) break;
        CSSTATE.asked[p.id] ??= [];
        if (!CSSTATE.asked[p.id].includes(n)) CSSTATE.asked[p.id].push(n);
        cSave();
        render();
        break;
      }
      case "c-chat": {
        const who = contact === "north" ? CS.contacts.north : CS.contacts.rain;
        const d = who.dialogue[el.dataset.key];
        if (
          !d ||
          casePending ||
          (CSSTATE.chats[contact] || []).includes(el.dataset.key)
        )
          break;
        if (!cUnlocked(d)) break;
        const key = el.dataset.key;
        const request = (casePending = { contact, key });
        render();
        setTimeout(() => {
          if (casePending !== request) return;
          CSSTATE.chats[contact].push(key);
          casePending = null;
          sound.cue("message");
          if (d.clue) cAdd(d.clue);
          cSave();
          render();
        }, 650);
        break;
      }
      case "c-scene":
        if (!cSceneOpen()) break;
        if (!cScenes().some(sc => (sc.id === id || id === "first") && cUnlocked(sc))) break;
        caseSceneId = id; view = "scene"; render(false); break;
      case "c-hotspot": {
        const h = cHotspot(id);
        if (!h || !cHotspotOpen(id)) break;
        openModal(
          h.title,
          `<div class="evidence-detail-label">${CS.no} / ${h.title} · 原始观察</div><p>${h.body.join("</p><p>")}</p>${h.puzzle ? btn("查看机关", "c-puzzle", "primary", `data-id="${id}"`) : ""}<div class="modal-actions">${!CSSTATE.scene.includes(id) && (!h.puzzle || CSSTATE.puzzle) ? btn("收录现场记录", "c-field-collect", "primary", `data-id="${id}"`) : btn("继续调查", "close", "primary")}</div>`,
        );
        break;
      }
      case "c-field-collect":
        if (!cHotspotOpen(id) || (cHotspot(id)?.puzzle && !CSSTATE.puzzle)) break;
        if (!CSSTATE.scene.includes(id)) CSSTATE.scene.push(id);
        cAdd(id);
        cSave();
        closeModal();
        render();
        break;
      case "c-inspect": {
        const h = cHotspot(id);
        if (h)
          openModal(
            h.title,
            `<p>${h.body.join("</p><p>")}</p><div class="modal-actions">${btn("收好记录", "close", "primary")}</div>`,
          );
        break;
      }
      case "c-puzzle":
        if (!cHotspotOpen("sealed") || !cUnlocked(CS.puzzle)) return toast("先核对机关所需的档案与时间记录。");
        openModal(
          CS.puzzle.title,
          `<p>${CS.puzzle.intro}</p>${CS.puzzle.exhibit ? `<div class="puzzle-exhibit"><div class="exhibit-title">现场对照 / 不必记忆，随时比对</div>${CS.puzzle.exhibit.map(p => `<p>${p}</p>`).join("")}</div>` : ""}${CS.puzzle.experiment === "mirror" ? `<div class="optic-test"><div class="optic-glass" aria-hidden="true"><i class="optic-face"></i><i class="optic-face reflection" id="optic-reflection"></i></div><label for="mirror-position">移动观察位置 · 左 ← 正中 → 右</label><input id="mirror-position" type="range" min="-1" max="1" value="0" step="1"><output id="optic-result" for="mirror-position" aria-live="polite">正中：两处影像叠合。试着偏离地上的站位线。</output></div>` : ""}<form data-form="case-puzzle">${CS.puzzle.fields.map((f) => `<div class="verdict-question"><label for="puzzle-${f.id}">${f.label}</label><select id="puzzle-${f.id}" name="${f.id}" required><option value="">请选择</option>${f.options.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></div>`).join("")}<p class="inline-error" id="case-puzzle-error"></p><button class="btn primary full" type="submit">打开机关 ${icon("arrow")}</button></form>`,
        );
        break;
      case "c-select":
        if (!cHas(id)) break;
        caseSelected = caseSelected.includes(id)
          ? caseSelected.filter((x) => x !== id)
          : caseSelected.length < 2
            ? [...caseSelected, id]
            : [caseSelected[1], id];
        render();
        break;
      case "c-connect": {
        if (caseSelected.length !== 2) break;
        const link = CS.links.find((l) =>
          l.pair.every((x) => caseSelected.includes(x)),
        );
        if (!link) {
          toast("这两份证据还不能互相印证。");
          break;
        }
        if (CSSTATE.links.includes(link.id)) { toast("这条脉络已还原。"); break; }
        if (link.inference) {
          openModal("证据相连，还需要你的判断", `<p class="kicker">${link.pair.map(x => cClue(x).title).join(" ＋ ")}</p><h3>${link.question}</h3><div class="inference-evidence">${link.pair.map(x => `<p><strong>${cClue(x).title}</strong><br>${cClue(x).text}</p>`).join("")}</div><form data-form="case-inference" data-link="${link.id}"><fieldset><legend>这两份证据共同支持哪一项？</legend>${link.inference.options.map(([value,label]) => `<label class="inference-option"><input type="radio" name="inference" value="${value}" required><span>${label}</span></label>`).join("")}</fieldset><p id="inference-error" class="inline-error" role="status"></p><button type="submit" class="btn primary full">提交推断</button></form>`);
        } else cResolveLink(link);
        break;
      }
      case "c-clue-hint": {
        const c = cClue(id);
        openModal(
          `线索 ${c.n} · 尚未发现`,
          `<p>寻找方向：${c.source}</p><div class="letter">${c.hint}</div><div class="modal-actions">${btn("知道了", "close", "primary")}</div>`,
        );
        break;
      }
      case "c-report":
        cReport();
        break;
      case "c-ending":
        if (!CSSTATE.reportChecked || CSSTATE.links.length !== CS.links.length || !CS.endings.find((x) => x.id === el.dataset.ending)) break;
        CSSTATE.ending = el.dataset.ending;
        if (!CSSTATE.endings.includes(el.dataset.ending))
          CSSTATE.endings.push(el.dataset.ending);
        cSave();
        closeModal(false);
        view = "ending";
        render(false);
        break;
      case "fullscreen":
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await document.documentElement.requestFullscreen();
        } catch {
          toast("浏览器暂不支持全屏，可使用浏览器的全屏菜单。");
        }
        break;
      case "ghost-message":
        openModal(
          "无法投递的回执",
          `<p class="kicker">发件账号：摆渡的陈 / 1998 年已注销</p><div class="letter" style="margin:22px 0"><p>你已经看见那盏灯了。</p><p>别只数水面上的。<br>去看看，岸上还少了谁。</p></div><p class="small muted">系统记录：这条消息的发送时间，比本站建站时间早三天。你没有发送过阅读回执。</p><div class="modal-actions">${btn("关上这封信", "close", "primary")}</div>`,
        );
        break;
      case "nav":
        navigate(el.dataset.view);
        break;
      case "post":
        navigate("post", id);
        break;
      case "category":
        category = el.dataset.category;
        query = "";
        filter = "最新发布";
        navigate("forum");
        break;
      case "filter":
        filter = el.dataset.filter;
        render();
        break;
      case "reset-filter":
        category = "全部帖子";
        query = "";
        filter = "最新发布";
        navigate("forum");
        break;
      case "sort":
        filter = filter === "最多回复" ? "最新发布" : "最多回复";
        render();
        break;
      case "categories":
        openModal(
          "论坛分区",
          `<div class="question-options" style="display:flex;flex-direction:column">${["全部帖子", "正在发生", "民俗旧闻", "地方志", "闲谈"].map((c) => `<button data-action="category" data-category="${c}">${c} ${icon("arrow")}</button>`).join("")}</div>`,
        );
        break;
      case "read-posts":
        filter = "最近阅读";
        category = "全部帖子";
        query = "";
        navigate("forum");
        break;
      case "contact":
        navigate("messages", el.dataset.contact);
        break;
      case "collect":
        addClue(id);
        render();
        break;
      case "ask": {
        const n = Number(el.dataset.index),
          p = G.posts.find((p) => p.id === postId);
        if (!p?.questions[n]) break;
        S.asked[postId] ??= [];
        if (!S.asked[postId].includes(n)) S.asked[postId].push(n);
        save();
        render();
        toast("楼主回复了你的追问。");
        break;
      }
      case "chat": {
        const k = el.dataset.key,
          c = contact,
          d = dialogue[c][k];
        if (!d || S.chats[c].includes(k) || pendingChat) break;
        if (
          (k === "archive" && !has("news")) ||
          (k === "identity" && !has("ledger"))
        )
          break;
        const request = (pendingChat = { contact: c, key: k });
        render();
        let h = document.getElementById("chat-history");
        if (h) h.scrollTop = h.scrollHeight;
        setTimeout(
          () => {
            if (pendingChat !== request) return;
            S.chats[c].push(k);
            pendingChat = null;
            sound.cue("message");
            if (d.clue) addClue(d.clue);
            save();
            render();
            const history = document.getElementById("chat-history");
            if (history) history.scrollTop = history.scrollHeight;
          },
          S.motion ? 850 : 100,
        );
        break;
      }
      case "select-clue":
        if (!has(id)) break;
        if (selected.includes(id)) selected = selected.filter((x) => x !== id);
        else if (selected.length < 2) selected.push(id);
        else selected = [selected[1], id];
        render();
        break;
      case "connect": {
        if (selected.length !== 2) break;
        const link = G.links.find((l) =>
          l.pair.every((id) => selected.includes(id)),
        );
        if (!link) {
          toast("这两份证据尚不能互相印证。看看下方的脉络提示。");
          break;
        }
        if (S.links.includes(link.id)) {
          toast("这条关联已经记录过了。");
          selected = [];
          render();
          break;
        }
        S.links.push(link.id);
        selected = [];
        save();
        render();
        sound.cue("resolve");
        openModal(
          "事件脉络 · 已还原",
          `<p class="kicker">CONNECTION ESTABLISHED</p><h3>${link.title}</h3><p>${link.text}</p><div class="letter">${link.pair.map((id) => G.clues[id].title).join(" ＋ ")}</div><div class="modal-actions">${btn("记下这条联系", "close", "primary")}</div>`,
        );
        break;
      }
      case "inspect-clue":
        if (has(id)) inspectClue(id);
        break;
      case "clue-hint": {
        const c = G.clues[id];
        openModal(
          `线索 ${c.n} · 尚未发现`,
          `<p>寻找方向：${c.source}</p><p class="muted">回到信息的来源，检查有没有可以「标记」或「收录」的内容。</p><div class="modal-actions">${btn("查看当前行动提示", "hint")}${btn("知道了", "close", "primary")}</div>`,
        );
        break;
      }
      case "hotspot":
        if (unlocked()) hotspot(id);
        break;
      case "field-collect":
        if (
          !unlocked() ||
          !["ledger", "tape", "paper"].includes(id) ||
          (id === "tape" && !S.openedSafe)
        )
          break;
        addClue(id);
        closeModal();
        render();
        break;
      case "field-talk":
        openModal(
          "北窗 · 岸上的对话",
          `<p>“你问我为什么留着底片？”</p><p>“六年前我拍下一个人，却没去问他是谁。后来所有人都说他逃了，我就跟着信了。”</p><p>“现在底片还在，名字却快没了。我不想第二次只做一个路过的人。”</p><div class="modal-actions">${btn("问问雨打芭蕉", "contact", "primary", 'data-contact="rain"')}${btn("继续调查", "close")}</div>`,
        );
        break;
      case "play-tape":
        playTape();
        break;
      case "close":
        closeModal();
        break;
      case "letter":
        letter();
        break;
      case "help":
        help();
        break;
      case "rules":
        rules();
        break;
      case "settings":
        settings();
        break;
      case "sound":
        if(await toggleSound())toast(
          S.sound ? "环境音已开启。可以在设置中调节音量。" : "环境音已关闭。",
        );
        break;
      case "sound-settings":
        await toggleSound();
        settings();
        break;
      case "motion":
        S.motion = !S.motion;
        save();
        render();
        settings();
        break;
      case "hint":
        hint();
        break;
      case "exact-hint": {
        const l = G.links.find((l) => !S.links.includes(l.id));
        if (l)
          openModal(
            "关联答案",
            `<p>选择这两张证据，再点击「建立关联」：</p><div class="letter">${l.pair.map((id) => G.clues[id].title).join("<br>＋<br>")}</div><div class="modal-actions">${btn("回到手记", "nav", "primary", 'data-view="board"')}</div>`,
          );
        break;
      }
      case "verdict":
        verdict();
        break;
      case "ending":
        if (ready() && G.endings[el.dataset.ending]) {
          S.ending = el.dataset.ending;
          if (!S.endings.includes(S.ending)) S.endings.push(S.ending);
          save();
          navigate("ending");
          document.getElementById("content").scrollTop = 0;
        }
        break;
      case "export-report":
        if (S.ending) exportReport();
        break;
      case "export-library": {
        const cases = Object.fromEntries(Object.keys(CASES).filter(id => id !== "lantern").map(id => [id, id === activeCaseId ? CSSTATE : storedCase(id)]));
        download("未明旧案柜-V4-整柜存档.json",JSON.stringify({format:"weiming-library",version:4,activeCase:activeCaseId,lantern:S,cases},null,2));
        toast("整柜存档已导出。"); break;
      }
      case "export-save":
        download(inCase() ? `未明-${CS.title}-存档.json` : "未明论坛-借灯人-存档.json", JSON.stringify(inCase() ? {format:"weiming-case",version:1,caseId:activeCaseId,state:CSSTATE} : S, null, 2));
        toast("存档已导出，请保管好。");
        break;
      case "import-save":
        document.getElementById("import-file").click();
        break;
      case "reset-confirm":
        openModal(
          "重新开始这一个夜晚？",
          `<p>仅重置当前案卷「${inCase() ? CS.title : "借灯人"}」的线索、对话、批注与结局；其他案卷不变。建议先导出存档。</p><div class="modal-actions">${btn("导出当前存档", "export-save")}${btn("保留进度", "close")}${btn("确认重新开始", "reset", "primary")}</div>`,
        );
        break;
      case "reset": {
        if (inCase()) { casePending = null; CSSTATE = blankCaseState(); caseSelected = []; caseSceneId = null; cSave(); closeModal(false); view = "forum"; render(false); toast("只重新开始了当前案卷。"); break; }
        pendingChat = null;
        const prefs = { sound: S.sound, volume: S.volume, ambience: S.ambience, effects: S.effects, motion: S.motion };
        S = { ...defaults(), ...prefs };
        selected = [];
        query = "";
        filter = "最新发布";
        category = "全部帖子";
        save();
        navigate("forum");
        window.scrollTo(0, 0);
        toast("新的一夜。你又来到了未明。");
        break;
      }
      case "credits":
        credits();
        break;
    }
  });
  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (!form.matches("[data-form]")) return;
    e.preventDefault();
    const d = new FormData(form);
    if (form.dataset.form === "case-puzzle") {
      if (!cUnlocked(CS.puzzle) || !cHotspotOpen("sealed")) return;
      const wrong = CS.puzzle.fields.filter((f) => d.get(f.id) !== f.answer);
      if (wrong.length) {
        document.getElementById("case-puzzle-error").textContent =
          CS.puzzle.hint;
      } else {
        CSSTATE.puzzle = true;
        cSave();
        openModal(
          "机关已打开",
          `<p>${CS.puzzle.success}</p><div class="modal-actions">${btn("收录记录", "c-field-collect", "primary", 'data-id="sealed"')}</div>`,
        );
      }
      return;
    }
    if (form.dataset.form === "case-inference") {
      const link = CS.links.find(l => l.id === form.dataset.link);
      if (!link?.inference || !link.pair.every(cHas)) return;
      if (!window.CaseEngine.inferenceCorrect(link, d.get("inference"), CSSTATE)) document.getElementById("inference-error").textContent = link.inference.error;
      else cResolveLink(link);
      return;
    }
    if (form.dataset.form === "case-report") {
      if (CSSTATE.links.length !== CS.links.length) return;
      const wrong = CS.report.filter((q) => d.get(q.id) !== q.answer);
      if (wrong.length) {
        document.getElementById("case-report-error").textContent = wrong
          .map((q) => q.error)
          .join(" ");
      } else {
        CSSTATE.reportChecked = true; cSave();
        cEndingChoice();
      }
      return;
    }
    if (form.dataset.form === "search") {
      query = String(d.get("q") || "")
        .trim()
        .slice(0, 100);
      category = "全部帖子";
      filter = "最新发布";
      navigate("forum");
    }
    if (form.dataset.form === "reply") {
      const text = String(d.get("reply") || "")
        .trim()
        .slice(0, 500);
      if (!text) return;
      S.replies[postId] ??= [];
      if (S.replies[postId].length >= 30) {
        toast("这条帖子的本地回复已达上限。");
        return;
      }
      S.replies[postId].push(text);
      save();
      form.reset();
      render();
      toast("回复已留在帖子里，楼主给出了回应。");
    }
    if (form.dataset.form === "safe") {
      const code = String(d.get("code"));
      if (code === "0716") {
        S.openedSafe = true;
        save();
        tapeDialog();
        chime();
        toast("咔哒。柜门开了。");
      } else {
        document.getElementById("safe-error").textContent =
          code === "1972"
            ? "这是泵房建成的年份。要找的是事故发生的月日。"
            : "锁芯没有动。回想一下：事故发生在七月的哪一天？";
        form.elements.code.select();
      }
    }
    if (form.dataset.form === "verdict") {
      const wrong = [];
      if (d.get("name") !== "chen")
        wrong.push("名字：对照录音与幸存者证言，谁没有回到岸上？");
      if (d.get("cause") !== "gate")
        wrong.push("起因：再看看值班簿 23:10 的记录。");
      if (d.get("rite") !== "white")
        wrong.push("旧俗：纸上灰的抄本里，灯芯系的是什么颜色的线？");
      if (wrong.length)
        document.getElementById("verdict-error").textContent = wrong.join(" ");
      else chooseEnding();
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "mirror-position") {
      const v = Number(e.target.value), reflection = document.getElementById("optic-reflection");
      reflection.style.opacity = v < 0 ? "0" : ".7";
      reflection.style.left = v > 0 ? "85%" : "54%";
      document.getElementById("optic-result").textContent = v < 0 ? "左侧：只剩本人影像，第二张脸退出镜面。" : v > 0 ? "右侧：第二影像偏向边缘，侧室光缝露出。" : "正中：两处影像叠合。指定站位让错觉成立。";
      return;
    }

    if (e.target.id === "personal-notes") {
      S.notes = e.target.value.slice(0, 4000);
      save();
      const sm = e.target.nextElementSibling;
      if (sm) sm.textContent = `随输入自动保存 · ${S.notes.length} / 4000`;
    }
    if (["ambience-range", "effects-range"].includes(e.target.id)) {
      const channel = e.target.id.split("-")[0];
      S[channel] = Number(e.target.value);
      document.getElementById(`${channel}-level`).textContent = `${S[channel]}%`;
      setVolume();save();
    }
    if (e.target.id === "volume-range") {
      S.volume = Number(e.target.value);
      document.getElementById("volume-level").textContent = `${S.volume}%`;
      setVolume();
      save();
    }
    if (inCase() && e.target.id === "case-notes") {
      CSSTATE.notes = e.target.value.slice(0, 4000);
      cSave();
      const sm = e.target.nextElementSibling;
      if (sm)
        sm.textContent = `随输入自动保存 · ${CSSTATE.notes.length} / 4000`;
    }
  });
  document.addEventListener("change", async (e) => {
    if (e.target.id !== "import-file") return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) {
      toast("这个存档太大了，请选择本作导出的 JSON 文件。");
      return;
    }
    try {
      const raw = JSON.parse(await file.text());
      const validState = x => x && x.version === 1 && Array.isArray(x.clues) && Array.isArray(x.links) && x.chats && typeof x.chats === "object";
      let summary, apply;
      if (raw.format === "weiming-library" && raw.version === 4) {
        if (!validState(raw.lantern) || !raw.cases || typeof raw.cases !== "object" || Array.isArray(raw.cases)) throw Error();
        const cases = {};
        for (const [id,state] of Object.entries(raw.cases)) {
          if (!owns(CASES, id) || CASES[id].legacy || !validState(state)) throw Error();
          cases[id] = normalizeCase(state,CASES[id]);
        }
        const lantern = normalize(raw.lantern);
        summary = `整柜备份：包含借灯人与 ${Object.keys(cases).length} 个案卷。将替换备份中列出的案卷，未列出的不变。`;
        apply = () => {
          S = lantern; try { localStorage.setItem(KEY,JSON.stringify(S)); } catch { storageFailed = true; }
          for (const [id,state] of Object.entries(cases)) { try { localStorage.setItem(`weiming-case-${id}-v1`,JSON.stringify(state)); } catch { storageFailed = true; } }
          activeCaseId = owns(CASES, raw.activeCase) ? raw.activeCase : "lantern";
          loadCaseState(activeCaseId);
        };
      } else if (raw.format === "weiming-case" && raw.version === 1) {
        if (!owns(CASES, raw.caseId) || CASES[raw.caseId].legacy || !validState(raw.state)) throw Error();
        const imported = normalizeCase(raw.state,CASES[raw.caseId]);
        summary = `「${CASES[raw.caseId].title}」：${imported.clues.length} 份线索、${imported.links.length} 条关联。只替换这个案卷，不改其他进度。`;
        apply = () => { activeCaseId = raw.caseId; loadCaseState(); CSSTATE = imported; cSave(); };
      } else {
        if (!validState(raw) || raw.format) throw Error();
        const imported = normalize(raw);
        summary = `借灯人旧存档：${imported.clues.length} 份线索、${imported.links.length} 条关联与 ${imported.endings.length} 个结局。只替换借灯人进度。`;
        apply = () => { S = imported; save(); activeCaseId = "lantern"; loadCaseState(); };
      }
      openModal("载入这份存档？", `<p>${summary}</p><div class="modal-actions">${btn("取消", "close")}<button class="btn primary" id="confirm-import">确认载入</button></div>`);
      document.getElementById("confirm-import").onclick = () => {
        pendingChat = null; casePending = null;
        apply();
        try { localStorage.setItem("weiming-active-case",activeCaseId); } catch { storageFailed = true; }
        selected = []; caseSelected = []; caseSceneId = null; setVolume(); closeModal(false); view = "board"; render(false); toast("已载入存档。");
      };
    } catch {
      toast("无法读取存档：文件格式或版本不正确。当前进度没有改变。");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (!activeModal) return;
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if (e.key === "Tab") {
      const list = [
        ...document.querySelectorAll(
          ".modal button:not(:disabled),.modal input:not([type=file]),.modal select,.modal a[href],.modal textarea",
        ),
      ].filter((x) => x.offsetParent !== null);
      if (!list.length) return;
      const first = list[0],
        last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  document.addEventListener("visibilitychange", () => {
    document.body.classList.toggle("page-hidden", document.hidden);
    if (document.hidden) {
      sound.visibility(true).catch(() => {});
      sound.duck(false);
      tapeAudio?.pause();
      document.getElementById("waveform")?.classList.remove("playing");
      const b = document.getElementById("tape-button");
      if(b)b.innerHTML = icon("play") + "重新播放录音";
    } else sound.visibility(false).catch(() => {});
  });
  // Restore saved audio preference only after a user gesture, respecting autoplay policy.
  document.addEventListener(
    "pointerdown",
    () => {
      if (S.sound) ensureAudio();
    },
    { once: true },
  );
  document.addEventListener("keydown", () => { if(S.sound)ensureAudio(); }, {once:true});
  render();
})();
