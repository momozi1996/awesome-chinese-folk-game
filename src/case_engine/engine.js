/* Shared V4 investigation rules; browser and Node, no DOM or storage access. */
(function(root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CaseEngine = factory();
})(typeof window !== "undefined" ? window : globalThis, function() {
  "use strict";
  function blankCaseState() {
    return {version:1, clues:[], read:[], asked:{}, chats:{north:[],rain:[]}, links:[], notes:"", ending:null, endings:[], scene:[], puzzle:false, reportChecked:false};
  }
  function normalizeCase(raw, c) {
    const n = blankCaseState();
    if (!raw || raw.version !== 1 || !c || c.legacy) return n;
    const list = (key, valid) => [...new Set((Array.isArray(raw[key]) ? raw[key] : []).filter(x => typeof x === "string" && valid(x)))];
    n.clues = list("clues", x => Object.prototype.hasOwnProperty.call(c.clues, x));
    n.read = list("read", x => c.posts.some(p => p.id === x));
    n.links = list("links", x => c.links.some(l => l.id === x && l.pair.every(id => n.clues.includes(id))));
    n.endings = list("endings", x => c.endings.some(e => e.id === x));
    n.scene = list("scene", x => (c.scenes || [c.scene]).some(sc => sc.hotspots.some(h => h.id === x)) && n.clues.includes(x));
    n.puzzle = raw.puzzle === true;
    if (typeof raw.notes === "string") n.notes = raw.notes.slice(0,4000);
    for (const k of ["north","rain"]) n.chats[k] = [...new Set((Array.isArray(raw.chats?.[k]) ? raw.chats[k] : []).filter(x => typeof x === "string" && Object.prototype.hasOwnProperty.call(c.contacts[k].dialogue, x)))];
    for (const p of c.posts) if (Array.isArray(raw.asked?.[p.id])) n.asked[p.id] = [...new Set(raw.asked[p.id].filter(x => Number.isInteger(x) && x >= 0 && x < p.questions.length))];
    if (n.links.length === c.links.length) {
      n.reportChecked = raw.reportChecked === true || n.endings.length > 0;
      if (c.endings.some(e => e.id === raw.ending)) n.ending = raw.ending;
    } else n.endings = [];
    return n;
  }
  function requirementsMet(item, state) {
    return !!item && (item.requires || []).every(id => state.clues.includes(id))
      && (item.requiresLinks || []).every(id => state.links.includes(id));
  }
  function inferenceCorrect(link, selected, state) {
    return !!link?.inference && link.pair.every(id => state.clues.includes(id)) && selected === link.inference.answer;
  }
  return { blankCaseState, normalizeCase, requirementsMet, inferenceCorrect };
});
