// Only the last tapped tile's HP is visible after thirty hidden taps.
// During the first 30 taps, tiny damage is auto-repaired on taps 10,20,30.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('mini-games.js','utf8');
const begin=source.indexOf('    var MAX_HP_BY_NUMBER=');
const end=source.indexOf('    function freshItems(index) {',begin);
assert(begin>0&&end>begin,'HP functions missing');
const code=[
  'var hiddenTapCount=0,HP_TAPS=30,focusedHpId=null,repeatFiveBreak=false;',
  'var repairs=0,draws=0,reveals=0;',
  'var board={offsetWidth:300,classList:{remove:function(){},add:function(x){if(x==="mg-repair-pulse")repairs++;}}};',
  'var hpPanel={hidden:true,classList:{add:function(x){if(x==="is-visible")reveals++;}}};',
  'var hpStats={textContent:""},hpBar={style:{width:"100%"}},note={textContent:""};',
  'var pieces=[',
  ' {id:"1a",n:"1",hp:100,maxHp:100},',
  ' {id:"2a",n:"0",hp:200,maxHp:200},',
  ' {id:"3a",n:"3",hp:200,maxHp:200},',
  ' {id:"5",n:"5",hp:300,maxHp:300}',
  '];',
  'function draw(){draws++;}',
  source.slice(begin,end),
  'for(let i=0;i<9;i++)registerHiddenTap("1a");',
  'var at9={count:hiddenTapCount,hp:pieces[0].hp,hidden:hpPanel.hidden};',
  'registerHiddenTap("1a");',
  'var at10={count:hiddenTapCount,hp:pieces[0].hp,repairs:repairs};',
  'for(let i=0;i<9;i++)registerHiddenTap("1a");',
  'var at19={count:hiddenTapCount,hp:pieces[0].hp};',
  'registerHiddenTap("1a");',
  'var at20={count:hiddenTapCount,hp:pieces[0].hp,repairs:repairs};',
  'for(let i=0;i<9;i++)registerHiddenTap("1a");',
  'var at29={count:hiddenTapCount,hp:pieces[0].hp,hidden:hpPanel.hidden};',
  'registerHiddenTap("1a");',
  'var at30={count:hiddenTapCount,hp:pieces[0].hp,hidden:hpPanel.hidden,',
  '          stats:hpStats.textContent,repairs:repairs,reveals:reveals,focus:focusedHpId};',
  'for(let i=0;i<10;i++)registerHiddenTap("2a");',
  '({at9,at10,at19,at20,at29,at30,extra:{count:hiddenTapCount,',
  '  reveals:reveals,repairs:repairs},hpMap:["0","1","3","5"].map(hpFor)});'
].join('\n');
const result=vm.runInNewContext(code);
assert.deepEqual(Array.from(result.hpMap),[200,100,200,300]);
assert.equal(result.at9.hp,91,'Hidden taps deduct one HP each');
assert.equal(result.at9.hidden,true);
assert.equal(result.at10.hp,100,'First hidden repair restores full HP');
assert.equal(result.at10.repairs,1);
assert.equal(result.at19.hp,91);
assert.equal(result.at20.hp,100,'Second hidden repair restores full HP');
assert.equal(result.at20.repairs,2);
assert.equal(result.at29.hp,91);
assert.equal(result.at29.hidden,true);
assert.equal(result.at30.hp,100,'Unlock immediately heals any hidden damage');
assert.equal(result.at30.hidden,false);
assert.equal(result.at30.repairs,3);
assert.equal(result.at30.reveals,1);
assert.equal(result.at30.focus,"1a");
assert(result.at30.stats.includes('駒 1  HP 100 / 100'),'Only the clicked tile is visible');
for(const leak of ['0=200','2=300','3=200','300']){
  assert(!result.at30.stats.includes(leak),'Other piece HP leaked: '+leak);
}
assert.equal(result.extra.count,30,'Only first 30 taps count toward unlocking');
assert.equal(result.extra.reveals,1,'The secret cannot retrigger');
assert.equal(result.extra.repairs,3,'No repairs after HP unlock');
assert(source.includes('var exposed=hiddenTapCount>=HP_TAPS && focusedHpId===p.id'),
       'Only the focused piece may display an HP badge');
assert(source.includes('hpLabel.hidden=!exposed'),'Other badges must be hidden');
assert(source.includes('if(travel<9 && (!drag || !drag.active)'),
       'A drag must not be interpreted as a damage tap');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('mini-games.js?v=26')&&html.includes('mini-games.css?v=26'),
       'The release must load fresh v0.24 assets');
console.log('Hidden taps, repairs at 10/20/30 and one-piece HP visibility verified.');
