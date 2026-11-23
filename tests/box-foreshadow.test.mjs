// Deliberate mismatch: the on-screen hint says move the largest "2", but
// the real large tile is visibly "5". Horizontal former 2s still show 0.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('mini-games.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sliderStart=source.indexOf('  function slider(root, win, onDestroyed, options) {');
assert(sliderStart>=0);

const begin=source.indexOf('    function load(index) {',sliderStart);
const end=source.indexOf('    function draw() {',begin);
assert(begin>sliderStart&&end>begin,'Slider must have a stage-specific loading function');
const loaded=vm.runInNewContext([
  'var levels=[',
  ' {title:"最初の箱",label:"1 ×14 + 5"},',
  ' {title:"横長の箱",label:"1 ×8 + 0 ×3 + 5"},',
  ' {title:"四種類の箱",label:"1 ×4 + 0 + 3 ×4 + 5"}',
  '];',
  'var hiddenTap=null,focusedHpId=null,levelIndex=0,pieces=[],history=[],moves=0,lastPiece="5",',
  ' stageComplete=false,drag=null;',
  'var elements={};',
  'var root={querySelector:function(name){',
  '  return elements[name]??(elements[name]={textContent:"",innerHTML:""});',
  '}};',
  'var board={classList:{remove:function(){}},replaceChildren:function(){}};',
  'var next={replaceChildren:function(){}};',
  'var note={textContent:""};',
  'function freshItems(index){return [{id:"5",stage:index}];}',
  'function draw(){}',
  source.slice(begin,end),
  'load(0);var first=elements["#mg-slide-instruction"].innerHTML;',
  'load(1);var middle=elements["#mg-slide-instruction"].innerHTML;',
  'load(2);var last=elements["#mg-slide-instruction"].innerHTML;',
  '({first,middle,last});'
].join('\n'));
for(const instruction of [loaded.first,loaded.middle,loaded.last]){
  assert(instruction.includes('一番大きい「2」の箱を下の出口まで運べば、'),
    'The hint must intentionally mislabel the largest visible five as two');
  assert(!instruction.includes('4を下'),'The previous four hint is obsolete');
  assert(!instruction.includes('5を下'),'The internal five ID must stay invisible');
  assert(!instruction.includes('運べ。'),'No harsh command forms');
}
assert(loaded.first.includes('次のステージへ進めます。'));
assert(loaded.middle.includes('次のステージへ進めます。'));
assert(loaded.last.includes('ゴールです。'));
assert(!loaded.last.includes('次のステージへ進めます。'));
assert(source.includes('if(piece.id==="5" && piece.y+piece.h>=H-INSET-0.05'),
  'Physical winning piece must keep the original ID and collision condition');
assert(source.includes('<div class="mg-exit-mark">▼ EXIT</div>'),
  'Exit marker should not reveal the true winning tile');
assert(index.includes('"title": "数字の箱"'),
  'Main puzzle title should avoid revealing the five in advance');
assert(!index.includes('"title": "数字の箱 ― 五の出口"'));
assert(source.includes('bits.every(function(v,i){return v!==upper[i];})'),
  'Mirror puzzle must still require inverse digits, not equality');

for(const [label,file] of [['main site',index],['minigames',source]]){
  for(const rough of ['運べ。','入力せよ。','求めよ。','送信せよ。','確認せよ。','照合せよ。','触れよ。','切り替えよ。','読め。']){
    assert(!file.includes(rough),label+' still contains forceful wording: '+rough);
  }
}
assert(index.includes('mini-games.js?v=26')&&index.includes('mini-games.css?v=26'));
// Relabeling must preserve the original ID, physical class, and HP.
const freshStart=source.indexOf('    function freshItems(index) {',sliderStart);
const freshEnd=source.indexOf('    function snapshot() {',freshStart);
assert(freshStart>0&&freshEnd>freshStart);
const mapped=vm.runInNewContext([
  'var INSET=.01,repeatFiveBreak=false;',
  'var levels=[{items:[["5",1,0,2,2],["2a",0,2,2,1],["1a",0,0,1,1],["3a",3,0,1,2]]}];',
  'function hpFor(n){return {"0":200,"1":100,"3":200,"5":300}[n]||0;}',
  source.slice(freshStart,freshEnd),
  'freshItems(0).map(p=>({id:p.id,label:p.n,hp:p.hp,w:p.w,h:p.h}));'
].join('\n'));
const tiles=Array.from(mapped, p=>({id:p.id,label:p.label,hp:p.hp,w:p.w,h:p.h}));
assert.deepEqual(tiles.map(p=>[p.id,p.label,p.hp]),[
  ["5","5",300],["2a","0",200],["1a","1",100],["3a","3",200]
]);
assert(tiles[0].w>tiles[1].w-0.01 && tiles[0].h>tiles[1].h,
  'Largest five must retain its 2 by 2 physical size');
assert(source.includes('mg-piece-"+p.id.charAt(0)'),
  'Physical block class remains tied to original geometry, not new numeral');
assert(source.includes('note.textContent="5のHPが0になった。'),
  'The destruction message must refer to the actual visible five');

console.log('False largest-two instruction, actual large-five tile and horizontal zero tiles verified.');
