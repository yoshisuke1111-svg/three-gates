// Check the hidden HP easter egg counts taps without triggering too early.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('mini-games.js','utf8');
const start=source.indexOf('    function revealHiddenHp() {');
const end=source.indexOf('    function freshItems(index) {',start);
assert(start!==-1&&end>start,'Hidden HP functions must exist');

const code=[
  'var hiddenTapCount=0,HP_TAPS=30;',
  'var noted=0;',
  'var hpPanel={hidden:true,classList:{add:function(name){if(name==="is-visible")noted++;}}};',
  'var note={textContent:""};',
  source.slice(start,end),
  'for(let i=0;i<29;i++)registerHiddenTap();',
  'var before={count:hiddenTapCount,hidden:hpPanel.hidden,reveals:noted};',
  'registerHiddenTap();',
  'var atThreshold={count:hiddenTapCount,hidden:hpPanel.hidden,reveals:noted};',
  'for(let i=0;i<20;i++)registerHiddenTap();',
  '({before:before,atThreshold:atThreshold,after:{count:hiddenTapCount,reveals:noted}});'
].join('\n');
const result=vm.runInNewContext(code);
assert.equal(result.before.count,29);
assert.equal(result.before.hidden,true);
assert.equal(result.before.reveals,0);
assert.equal(result.atThreshold.count,30);
assert.equal(result.atThreshold.hidden,false);
assert.equal(result.atThreshold.reveals,1);
assert.equal(result.after.count,30,'The secret should trigger only once');
assert.equal(result.after.reveals,1,'The secret cannot retrigger');
assert(source.includes('travel<9 && !stageComplete && !finished'),
       'Tap detector should reject drags and ignore completed stages');
assert(source.includes('if(e.detail===0 && e.target.closest("#mg-slide-board"))'),
       'Keyboard-activated board elements should also count');
assert(!source.includes('if(!cancelled)dragMove(e);'),
       'The original pointer release stability fix must remain');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('mini-games.js?v=15')&&html.includes('mini-games.css?v=15'),
       'HP easter egg should be served with fresh v0.15 assets');
console.log('HP hidden until tap 30, appears once, drags are not counted.');
