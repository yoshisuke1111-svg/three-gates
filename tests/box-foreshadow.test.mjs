// Presentation-only foreshadowing: the screen says "4" but the actual
// target must remain the large 5. Puzzle instructions are not commands.
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
  ' {title:"横長の箱",label:"1 ×8 + 2 ×3 + 5"},',
  ' {title:"四種類の箱",label:"1 ×4 + 2 + 3 ×4 + 5"}',
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
  assert(instruction.includes('4を下の出口まで運べば、'),
    'The visible goal should intentionally mention a nonexistent four');
  assert(!instruction.includes('5を下'),'The real five must not appear in the on-screen goal text');
  assert(!instruction.includes('運べ。'),'No harsh command forms');
}
assert(loaded.first.includes('次のステージへ進めます。'));
assert(loaded.middle.includes('次のステージへ進めます。'));
assert(loaded.last.includes('ゴールです。'));
assert(!loaded.last.includes('次のステージへ進めます。'));
assert(source.includes('if(piece.id==="5" && piece.y+piece.h>=H-INSET-0.05'),
  'Foreshadowing must NOT change the actual goal from five to four');
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
assert(index.includes('mini-games.js?v=23')&&index.includes('mini-games.css?v=23'));
console.log('All stages show four, real win stays five, and harsh imperative copy is gone.');
