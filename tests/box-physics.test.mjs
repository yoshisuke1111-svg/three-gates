// Dependency-free tests for the exact physics functions used by the browser game.
// Run with: node tests/box-physics.test.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('mini-games.js', 'utf8');
const begin = source.indexOf('    function overlapsAt(piece,axis,value,other) {');
const end = source.indexOf('    function checkWin(piece) {', begin);
assert(begin !== -1 && end > begin, 'Could not find the actual collision functions');
const physics = source.slice(begin, end);

function scenario(name, objects, dx, dy) {
  const setup = [
    'var W=4,H=5,EPS=0.000001,INSET=0.06,PUSH_LIMIT=0.35,NUDGE=0.006;',
    'var pieces='+JSON.stringify(objects)+';',
    'function snapshot(){return pieces.map(p=>Object.assign({},p));}',
    physics,
    'const before=snapshot();',
    'moveFree(pieces[0],'+dx+','+dy+', {start:before,activeId:pieces[0].id});',
    'pieces;'
  ].join('\n');
  const result=JSON.parse(JSON.stringify(vm.runInNewContext(setup)));
  for (const p of result) {
    assert(p.x >= -1e-4 && p.y >= -1e-4 && p.x+p.w <= 4.0001 &&
           p.y+p.h <= 5.0001, name+': a block escaped the board');
    for (const q of result) {
      if(q.id===p.id)continue;
      const intersects=p.x < q.x+q.w-1e-5 && p.x+p.w > q.x+1e-5 &&
                       p.y < q.y+q.h-1e-5 && p.y+p.h > q.y+1e-5;
      assert(!intersects, name+': blocks '+p.id+' and '+q.id+' overlap');
    }
  }
  return result;
}
const box=(id,x,y,w=.7,h=.7)=>({id,x,y,w,h});

{
  const [active,passive]=scenario('gentle forward push',
    [box('A',.8,1),box('B',1.52,1)],.12,0);
  assert(active.x>.90, 'Active block should advance into a tiny gap');
  assert(passive.x>1.55 && passive.x<1.70,
         'Passive block should move only slightly');
}
{
  const [active,passive]=scenario('sideways corridor nudge',
    [box('A',.1,1),box('B',.85,1.66)],.12,0);
  assert(active.x>.20, 'Active block should traverse a barely narrow gap');
  assert(passive.y>1.66 && passive.y<1.80,
         'Passive piece should be pushed sideways rather than blocked');
}
{
  const [active,passive]=scenario('wall prevents illegal pushing',
    [box('A',2.36,1),box('B',3.10,1,.85,.7)],.20,0);
  assert(active.x<=2.401, 'Moving piece should be stopped at blocker');
  assert(Math.abs(passive.x-3.10)<.001, 'Blocker may not be pushed into wall');
}
{
  const [active,first,second]=scenario('short push chain',
    [box('A',.8,1),box('B',1.57,1),box('C',2.33,1)],.14,0);
  assert(active.x>.90 && first.x>1.57 && second.x>2.33,
         'A small force should propagate to adjacent pieces');
}
{
  const [active,passive]=scenario('bounded push over long drag',
    [box('A',.8,1),box('B',1.52,1)],1.0,0);
  assert(passive.x<=1.871,
         'A passive piece must not be pushed beyond the gesture budget');
  assert(active.x<1.25, 'Active piece should stop when push limit is reached');
}
{
  const [active,passive]=scenario('near-full-size tile nudge',
    [box('A',.8,1,.88,.88),box('B',1.70,1,.88,.88)],.20,0);
  assert(active.x>0.97,
         'A large tile should not stick when a minor push solves contact');
  assert(passive.x>1.85 && passive.x<2.06,
         'Large neighboring tile should only shift as needed');
}
assert(source.includes('INSET=0.06') && source.includes('PUSH_LIMIT=0.35'),
       'Game tile sizing and nudge tolerance should match the tuned values');
assert(!source.includes('if(!cancelled)dragMove(e);'),
       'Releasing the pointer must not apply a final extra displacement');
assert(source.includes('restorePositions(current.start);draw();return;'),
       'Cancelled drags must restore the entire set of pieces');
console.log('Six collision scenarios and release stability checks passed');
