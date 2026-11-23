// Direct regression for HP tap handling on touch and keyboard.
// Browsers may emit a detail=0 synthesized click after pointerup.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync('mini-games.js','utf8');
function extract(begin,end){
  const a=src.indexOf(begin,src.indexOf('  function slider('));
  const b=src.indexOf(end,a+begin.length);
  assert(a>0&&b>a, 'Missing runtime function '+begin);
  return src.slice(a,b);
}
const code=[
  extract('    function damagePiece(id) {','    function load(index) {'),
  extract('    function onClick(e) {','    function onDown(e) {'),
  extract('    function onDown(e) {','    function dragMove(e) {'),
  extract('    function onUp(e){','    function onCancel(e){')
].join('\n');
let clock=10000;
const now={now:()=>clock};
const context=vm.createContext({Date:now,Math,console});
vm.runInContext([
  'var hiddenTapCount=30,HP_TAPS=30,focusedHpId=null,stageComplete=false,finished=false;',
  'var hiddenTap=null,pointerClickGuard=null,drag=null,moves=0,lastPiece="5",history=[];',
  'var W=4,H=5,INSET=.01,pieces=[{id:"5",n:"5",hp:300,maxHp:300,x:1,y:0,w:2,h:2}];',
  'var note={textContent:""},draws=0,unlock=0,breakCount=0;',
  'var board={clientWidth:400,clientHeight:500,querySelector:function(){return null;}};',
  'function snapshot(){return pieces.map(p=>({...p}));}',
  'function draw(){draws++;}',
  'function onDestroyed(){breakCount++;}',
  'function registerHiddenTap(){unlock++;hiddenTapCount++;}',
  'function endDrag(){drag=null;}',
  code
].join('\n'),context);
const boardTarget={closest(s){return s==='#mg-slide-board'?{}:null;}};
const piece={dataset:{piece:'5'},classList:{add(){}},setPointerCapture(){}};
const pieceTarget={closest(s){
  if(s==='#mg-slide-board')return {};
  if(s==='[data-piece]')return piece;
  return null;
}};
function down(pointerId,target=pieceTarget,x=100,y=100){
  vm.runInContext('void 0',context);
  context.onDown({
    pointerId,pointerType:'touch',button:0,clientX:x,clientY:y,
    target,preventDefault(){}
  });
}
function up(pointerId,x=100,y=100){
  context.onUp({pointerId,clientX:x,clientY:y});
}
function click(target=pieceTarget,detail=0){
  context.onClick({target,detail});
}
function hp(){return context.pieces[0].hp;}
down(1);up(1);
assert.equal(hp(),299,'One pointer tap must deduct one HP');
click(pieceTarget,0);
assert.equal(hp(),299,'An accessibility-style synthetic click cannot double the damage');
click(pieceTarget,0);
assert.equal(hp(),298,'A real subsequent keyboard click still deals one damage');

clock+=1000;
down(2);up(2);
assert.equal(hp(),297);
click(pieceTarget,1);
assert.equal(hp(),297,'Normal click after pointerup is ignored');
click(pieceTarget,0);
assert.equal(hp(),296,'Keyboard activation after normal click works');

clock+=1000;
down(3);
context.drag.active=true;
up(3,120,135);
assert.equal(hp(),296,'A drag does not damage');
click(pieceTarget,0);
assert.equal(hp(),296,'A click synthesized after a drag still cannot damage');

clock+=1000;
down(4,boardTarget);
up(4);
click(boardTarget,0);
assert.equal(hp(),296,'Empty-space touch does not damage a piece');

// Before reveal, a single touch on empty board must count only once.
clock+=1000;
context.hiddenTapCount=29;
context.HP_TAPS=30;
down(5,boardTarget);
up(5);
assert.equal(context.unlock,1,'Empty board counts as a secret tap');
assert.equal(context.hiddenTapCount,30);
click(boardTarget,0);
assert.equal(context.hiddenTapCount,30,'Synthesized click cannot double secret taps');

assert(src.includes('var type=original==="2"?"0":original;'),
  'The big box must retain its visible 5; the old horizontal 2s display 0');
assert(src.includes('var MAX_HP_BY_NUMBER={"0":200,"1":100,"3":200,"5":300};'));
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('mini-games.js?v=26'),'v0.26 assets expected');
console.log('One damage per touch or keyboard activation, no drag damage, no double secret tap.');
