const assert = require('node:assert/strict');
const E = require('../src/case_engine/engine.js');
const c = require('../cases/playable/lamplife/case.json');
const empty=E.blankCaseState();
assert.equal(E.requirementsMet(null,empty),false);
assert.equal(E.requirementsMet({requires:['address']},empty),false);
assert.equal(E.requirementsMet({},empty),true);
assert.equal(E.requirementsMet({requiresLinks:['mechanism']},{...empty,clues:['address']}),false);
const link=c.links[0],state={...empty,clues:link.pair};
assert.equal(E.inferenceCorrect(link,link.inference.answer,state),true);
assert.equal(E.inferenceCorrect(link,link.inference.answer,empty),false);
assert.equal(E.inferenceCorrect(link,'wrong',state),false);
const corrupt=E.normalizeCase({...empty,clues:['signal','signal','bad'],links:c.links.map(l=>l.id),endings:[c.endings[0].id],notes:'x'.repeat(6000)},c);
assert.deepEqual(corrupt.clues,['signal']);assert.deepEqual(corrupt.links,[]);assert.deepEqual(corrupt.endings,[]);assert.equal(corrupt.notes.length,4000);
assert.deepEqual(E.normalizeCase({version:999},c),empty);
console.log('PASS: shared engine gates, inferences, save normalization');

// Names inherited from Object.prototype are not authored clue/dialogue IDs.
const inherited=['__proto__','constructor','toString','hasOwnProperty'];
const safe=E.normalizeCase({...empty,clues:[...inherited,'signal'],chats:{north:[...inherited,{},null,'hello'],rain:inherited}},c);
assert.deepEqual(safe.clues,['signal']);
assert.deepEqual(safe.chats,{north:['hello'],rain:[]});
console.log('PASS: inherited object keys rejected in imported clue and chat IDs');
