// The thirty-tap secret exposes each block's HP value, without changing play.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('mini-games.js','utf8');
const start=source.indexOf('    var MAX_HP_BY_NUMBER=');
const end=source.indexOf('    function freshItems(index) {',start);
assert(start!==-1&&end>start,'Hidden HP setup and functions must exist');

const code=[
  'var hiddenTapCount=0,HP_TAPS=30;',
  'var noted=0,draws=0,focusedHpId="5";',
  'var hpPanel={hidden:true,classList:{add:function(name){if(name==="is-visible")noted++;}}};',
  'var hpStats={textContent:""};
  var hpBar={style:{width:"100%"}};',
  'var note={textContent:""};',
  'var pieces=[{id:"1a",n:"1",hp:100,maxHp:100},{id:"5",n:"5",hp:300,maxHp:300},{id:"2a",n:"2",hp:200,maxHp:200},{id:"3a",n:"3",hp:200,maxHp:200}];',
  'function draw(){draws++;}',
  source.slice(start,end),
  'var hpMap=["1","2","3","5"].map(hpFor);',
  'for(let i=0;i<29;i++)registerHiddenTap();',
  'var before={count:hiddenTapCount,hidden:hpPanel.hidden,reveals:noted};',
  'registerHiddenTap();',
  'var atThreshold={count:hiddenTapCount,hidden:hpPanel.hidden,reveals:noted,labels:hpStats.textContent,draws:draws};',
  'for(let i=0;i<20;i++)registerHiddenTap();',
  '({hpMap:hpMap,before:before,atThreshold:atThreshold,after:{count:hiddenTapCount,reveals:noted,draws:draws}});'
].join('\n');
const result=vm.runInNewContext(code);
assert.deepEqual(Array.from(result.hpMap),[100,200,200,300],'Per-number HP mapping');
assert.equal(result.before.count,29);
assert.equal(result.before.hidden,true);
assert.equal(result.before.reveals,0);
assert.equal(result.atThreshold.count,30);
assert.equal(result.atThreshold.hidden,false);
assert.equal(result.atThreshold.reveals,1);
assert.equal(result.atThreshold.draws,1,'Draw piece HP badges on unlock');
assert(result.atThreshold.labels.includes('選択 5 : 300 / 300'),'Selected tile HP should be shown');
for(const label of ['1=100','2=200','3=200','5=300']){
  assert(result.atThreshold.labels.includes(label),'Stats missing '+label);
}
assert.equal(result.after.count,30,'The secret should trigger only once');
assert.equal(result.after.reveals,1,'The secret cannot retrigger');
assert.equal(result.after.draws,1,'The secret cannot redraw repeatedly');

// New pieces in later stages get their type's HP and max HP at full value.
const freshStart=source.indexOf('    function freshItems(index) {',end);
const freshEnd=source.indexOf('    function snapshot() {',freshStart);
assert(freshStart>=0 && freshEnd>freshStart,'Cannot find freshItems');
const generated=vm.runInNewContext([
  'var INSET=.01;',
  'var MAX_HP_BY_NUMBER={"1":100,"2":200,"3":200,"5":300};',
  'function hpFor(number){return MAX_HP_BY_NUMBER[number]||0;}',
  'var levels=[{items:[["1a",0,0,1,1],["2a",1,0,2,1],["3a",0,1,1,2],["5",1,1,2,2]]}];',
  source.slice(freshStart,freshEnd),
  'freshItems(0).map(p=>[p.id,p.hp,p.maxHp]);'
].join('\n'));
assert.deepEqual(Array.from(generated,p=>Array.from(p)),[
  ['1a',100,100],['2a',200,200],['3a',200,200],['5',300,300]
]);
assert(source.includes('hpLabel.textContent="HP "+p.hp'),'Piece label must display its own HP');
assert(source.includes('travel<9 && !stageComplete && !finished'),
       'Tap detector should reject drags and ignore completed stages');
assert(source.includes('if(e.detail===0 && e.target.closest("#mg-slide-board"))'),
       'Keyboard-activated board elements should also count');
assert(!source.includes('if(!cancelled)dragMove(e);'),
       'The original pointer release stability fix must remain');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('mini-games.js?v=17')&&html.includes('mini-games.css?v=17'),
       'HP damage should be served with fresh v0.17 assets');
console.log('HP mapping and visibility checks passed: 1=100, 2=200, 3=200, 5=300.');
