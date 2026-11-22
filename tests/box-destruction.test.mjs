// Damage is one HP per short tap. First attempt reveals at 30 taps; repeat at 10.
// Removed tiles stay gone; destroying the five invokes the catastrophe exactly once.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const src=fs.readFileSync('mini-games.js','utf8');
const a=src.indexOf('    function restoreUndoPositions(before) {');
const b=src.indexOf('    function load(index) {',a);
assert(a>0&&b>a,'Damage and movement undo functions must exist');
const code=src.slice(a,b);

const sandbox=vm.createContext({});
const outcomes=vm.runInContext([
  'var hiddenTapCount=29, HP_TAPS=30, focusedHpId="5", instantFiveBreak=false;',
  'var stageComplete=false, finished=false, destroyedCount=0,draws=0,unlocked=0;',
  'var pieces=[',
  '  {id:"1a",n:"1",hp:100,maxHp:100,x:0,y:0},',
  '  {id:"2a",n:"2",hp:200,maxHp:200,x:1,y:0},',
  '  {id:"3a",n:"3",hp:200,maxHp:200,x:0,y:1},',
  '  {id:"5",n:"5",hp:300,maxHp:300,x:1,y:1}',
  '];',
  'var note={textContent:""};',
  'var shattered={shattered:false,classList:{add:function(name){if(name==="mg-piece-shattered")shattered.shattered=true;}}};',
  'var board={querySelector:function(){return shattered;}};',
  'function onDestroyed(){destroyedCount++;}',
  'function draw(){draws++;}',
  'function registerHiddenTap(){hiddenTapCount++;unlocked++;}',
  code,
  'function piece(id){return pieces.find(p=>p.id===id);}',
  'handleBoardTap("1a");',
  'var before={tapCount:hiddenTapCount,hp:piece("1a").hp};',
  'handleBoardTap(null);',
  'handleBoardTap("1a");',
  'var firstDamage=piece("1a").hp;',
  'var beforeMove=pieces.map(p=>Object.assign({},p));',
  'pieces.find(p=>p.id==="2a").x=2;',
  'for(let i=0;i<99;i++)handleBoardTap("1a");',
  'var removed1=piece("1a")===undefined;',
  'restoreUndoPositions(beforeMove);',
  'var undone={oneReturns:!!piece("1a"),otherX:piece("2a").x};',
  'for(let i=0;i<200;i++)handleBoardTap("2a");',
  'for(let i=0;i<200;i++)handleBoardTap("3a");',
  'var removedOther=piece("2a")===undefined && piece("3a")===undefined;',
  'for(let i=0;i<299;i++)handleBoardTap("5");',
  'var beforeBreak={hp:piece("5").hp,destroyed:destroyedCount,finished:finished};',
  'handleBoardTap("5");',
  'var afterBreak={hp:piece("5").hp,destroyed:destroyedCount,finished:finished,stageComplete:stageComplete,shattered:shattered.shattered};',
  'for(let i=0;i<20;i++)handleBoardTap("5");',
  '({before,beforeBreak,afterBreak,removed1,removedOther,undone,firstDamage,',
  '   destroyedAfterExtraTaps:destroyedCount,finalHp:piece("5").hp,unlocked});'
].join('\n'),sandbox);

assert.equal(outcomes.before.tapCount,30,'Tap 30 should unlock the HP display');
assert.equal(outcomes.before.hp,100,'Tap 30 should not damage the tile');
assert.equal(outcomes.firstDamage,99,'Each subsequent tap must deal exactly 1 damage');
assert.equal(outcomes.removed1,true,'A zero-HP small tile must leave the board');
assert.equal(outcomes.removedOther,true,'Tiles 2 and 3 must also be destructible');
assert.equal(outcomes.undone.oneReturns,false,'Undo must not resurrect destroyed pieces');
assert.equal(outcomes.undone.otherX,1,'Undo must still restore surviving tile positions');
assert.equal(outcomes.beforeBreak.hp,1,'The five should survive 299 hits');
assert.equal(outcomes.beforeBreak.destroyed,0);
assert.equal(outcomes.afterBreak.hp,0);
assert.equal(outcomes.afterBreak.finished,true);
assert.equal(outcomes.afterBreak.stageComplete,true);
assert.equal(outcomes.afterBreak.destroyed,1,'The catastrophe must fire exactly once');
assert.equal(outcomes.afterBreak.shattered,true,'Five should visibly shatter');
assert.equal(outcomes.destroyedAfterExtraTaps,1,'Further taps must not start a second catastrophe');
assert.equal(outcomes.finalHp,0);
assert.equal(outcomes.unlocked,1);

// A prior five destruction lowers the new five to HP 1, but it must survive
// the ten preparatory taps and be breakable only after the HP display unlocks.
const hiddenBegin=src.indexOf('    function registerHiddenTap(pieceId) {');
const hiddenEnd=src.indexOf('    function freshItems(index) {',hiddenBegin);
assert(hiddenBegin>0&&hiddenEnd>hiddenBegin,'Hidden tap code missing');
const hiddenCode=src.slice(hiddenBegin,hiddenEnd);
const repeat=vm.runInNewContext([
  'var hiddenTapCount=0,HP_TAPS=10,repeatFiveBreak=true,focusedHpId=null;',
  'var stageComplete=false,finished=false,triggered=0,draws=0,reveals=0;',
  'var pieces=[{id:"5",n:"5",hp:1,maxHp:300,x:1,y:0},',
  '            {id:"1a",n:"1",hp:100,maxHp:100,x:0,y:0}];',
  'var note={textContent:""};',
  'var board={offsetWidth:320,classList:{remove:function(){},add:function(){}},',
  '   querySelector:function(){return {classList:{add:function(){}}};}};',
  'function onDestroyed(){triggered++;}',
  'function draw(){draws++;}',
  'function revealHiddenHp(){reveals++;}',
  hiddenCode,
  code,
  'for(let i=0;i<9;i++)handleBoardTap("5");',
  'var atNine={count:hiddenTapCount,hp:pieces[0].hp,triggered:triggered};',
  'handleBoardTap("5");',
  'var atTen={count:hiddenTapCount,hp:pieces[0].hp,triggered:triggered,reveals:reveals};',
  'handleBoardTap("5");',
  'var onEleven={hp:pieces[0].hp,finished:finished,triggered:triggered};',
  'handleBoardTap("5");',
  '({atNine:atNine,atTen:atTen,onEleven:onEleven,triggeredAfter:triggered});'
].join('\n'));
assert.deepEqual({...repeat.atNine},{count:9,hp:1,triggered:0});
assert.deepEqual({...repeat.atTen},{count:10,hp:1,triggered:0,reveals:1},
  'Tenth tap must display HP 1, not destroy the five');
assert.deepEqual({...repeat.onEleven},{hp:0,finished:true,triggered:1},
  'Eleventh direct tap must trigger the second collapse');
assert.equal(repeat.triggeredAfter,1,'More taps must not retrigger collapse');

const freshBegin=src.indexOf('    function freshItems(index) {',hiddenEnd);
const freshEnd=src.indexOf('    function snapshot() {',freshBegin);
assert(freshBegin>0&&freshEnd>freshBegin);
const fresh=vm.runInNewContext([
  'var repeatFiveBreak=true,INSET=.01;',
  'function hpFor(type){return {"1":100,"2":200,"3":200,"5":300}[type]||0;}',
  'var levels=[{items:[["5",1,0,2,2],["1a",0,0,1,1]]}];',
  src.slice(freshBegin,freshEnd),
  'freshItems(0).map(p=>[p.id,p.hp,p.maxHp]);'
].join('\n'));
assert.deepEqual(Array.from(fresh,p=>Array.from(p)),[
  ['5',1,300],['1a',100,100]
], 'A fresh repeat stage must start with five at 1 of 300 HP');

const index=fs.readFileSync('index.html','utf8');
assert(index.includes('function triggerBoxCollapse()'),'Global collapse must be wired');
// The old failure skipped the collapse callback while the entrance
// transition had navigating=true, even though the board was already playable.
const cbStart=index.indexOf('  function triggerBoxCollapse() {');
const cbEnd=index.indexOf('  async function transition(render) {',cbStart);
assert(cbStart>0&&cbEnd>cbStart,'Collapse callback extraction');
const early=vm.runInNewContext([
  'var navigating=true,sceneView={hidden:false},fiveWasDestroyed=false,reduceMotion=false;',
  'var persisted=[],runs=[];',
  'function persist(key,value){persisted.push([key,value]);}',
  'function goHome(){}',
  'var document={querySelector:function(){return {};}};',
  'var window={ThreeGatesCollapse:{run:function(opts){runs.push(opts);}}};',
  index.slice(cbStart,cbEnd),
  'triggerBoxCollapse();',
  '({runs:runs.length,remembered:fiveWasDestroyed,persisted:persisted});'
].join('\n'));
assert.equal(early.runs,1,
  'Even during the entrance animation the second collapse must run');
assert.equal(early.remembered,true);
assert.deepEqual(Array.from(early.persisted,p=>Array.from(p)),
  [['three_gates_five_destroyed','yes']]);


assert(index.includes("fiveWasDestroyed = localStorage.getItem('three_gates_five_destroyed')"),'Past destruction must be restored');
assert(index.includes("persist('three_gates_five_destroyed','yes')"),'First destruction must be persisted');
assert(index.includes("{instantFiveBreak:fiveWasDestroyed}"),'Replay condition must reach puzzle engine');
assert(index.includes("stage.game === 'slider' ? triggerBoxCollapse : undefined"),
       'The slider must supply a failure callback');
const collapse=fs.readFileSync('collapse.js','utf8');
assert(index.includes('window.ThreeGatesCollapse?.run('),'The index must call the collapse engine');
assert(collapse.includes('function buildFragments(site)'),'Individual fragments must be created');
assert(collapse.includes('var shard=source.cloneNode(deep)'),'Frames and tiles must be separately copied');
assert(collapse.includes('"#mg-slide-board .mg-piece"'),'Individual blocks must fall');
assert(collapse.includes('site.classList.add("tg-falling")'),'Fragments must replace original layout');
assert(collapse.includes('scene.inert=true'),'Inputs must be frozen during collapse');
assert(collapse.includes('reduce?780:6500'),'Reduced-motion option must be honored');
assert(index.includes("!(zone === '3' && stage.game === 'slider')"),
       'The OPEN code should be kept for quick retry after returning home');
const css=fs.readFileSync('mini-games.css','utf8');
assert(css.includes('mg-piece-shattered'),'Destroyed five should look damaged');
console.log('Damage, removal, undo, destruction and return-home wiring tests passed.');
