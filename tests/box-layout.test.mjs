// Verify the THREE numbered-box layouts and replay each shortest
// discrete solution against the browser's actual continuous collision code.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('mini-games.js','utf8');
const levelStart=source.indexOf('    var levels = [',source.indexOf('  function slider(root, win) {'));
const levelEnd=source.indexOf('    // Coordinates are continuous board units',levelStart);
assert(levelStart>=0 && levelEnd>levelStart,'Cannot find numbered-box stages');
const literal=source.slice(levelStart,levelEnd).trim()
  .replace(/^var levels\s*=\s*/,'').replace(/;\s*$/,'');
const levels=vm.runInNewContext(literal);
assert.equal(levels.length,3);

function checkGeometry(level){
  const occupied=new Int8Array(20);
  let area=0,numberFive=0;
  for(const p of level.items){
    const [id,x,y,w,h]=p;
    assert.equal(Number.isInteger(x)&&Number.isInteger(y)&&
                 Number.isInteger(w)&&Number.isInteger(h),true);
    assert(x>=0&&y>=0&&x+w<=4&&y+h<=5,'Out-of-bounds stage piece '+id);
    if(id==='5'){numberFive++;assert.equal(x,1);assert.equal(y,0);assert.equal(w,2);assert.equal(h,2);}
    for(let v=y;v<y+h;v++)for(let u=x;u<x+w;u++){
      assert.equal(occupied[v*4+u],0,'Overlapping pieces in '+level.title);
      occupied[v*4+u]=1;area++;
    }
  }
  assert.equal(numberFive,1,'One five piece required');
  assert.equal(area,18,'Exactly two empty unit squares required');
  assert.equal(occupied.reduce((n,x)=>n+(x===0),0),2,'Two holes remain');
}
function shortestSolution(level){
  const items=level.items,n=items.length,groups={};
  for(let i=0;i<n;i++)(groups[items[i][0][0]]??=[]).push(i);
  const kinds=Object.keys(groups).sort();
  const canonical=positions=>kinds.map(t=>groups[t].map(i=>positions[i])
    .sort((a,b)=>a-b).join(',')).join('|');
  const start=items.map(p=>p[2]*4+p[1]);
  const queue=[{positions:start,previous:-1,move:null}];
  const seen=new Set([canonical(start)]);
  let head=0,goal=-1;
  while(head<queue.length&&head<140000){
    const positions=queue[head].positions;
    if(positions[0]===13){goal=head;break;}
    const map=new Int8Array(20).fill(-1);
    for(let i=0;i<n;i++){
      const x=positions[i]%4,y=Math.floor(positions[i]/4),w=items[i][3],h=items[i][4];
      for(let a=0;a<h;a++)for(let b=0;b<w;b++)map[(y+a)*4+x+b]=i;
    }
    for(let i=0;i<n;i++){
      const x=positions[i]%4,y=Math.floor(positions[i]/4),w=items[i][3],h=items[i][4];
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy;
        if(nx<0||ny<0||nx+w>4||ny+h>5)continue;
        let free=true;
        for(let a=0;a<h&&free;a++)for(let b=0;b<w;b++){
          const j=map[(ny+a)*4+nx+b];
          if(j!==-1&&j!==i){free=false;break;}
        }
        if(!free)continue;
        const next=positions.slice();next[i]=ny*4+nx;
        const k=canonical(next);
        if(!seen.has(k)){
          seen.add(k);
          queue.push({positions:next,previous:head,move:[i,dx,dy]});
        }
      }
    }
    head++;
  }
  assert(goal!==-1,level.title+' must have a solution');
  const moves=[];
  while(queue[goal].previous!==-1){
    moves.push(queue[goal].move);goal=queue[goal].previous;
  }
  moves.reverse();
  return {moves,states:head};
}
const collisionStart=source.indexOf('    function overlapsAt(piece,axis,value,other) {');
const collisionEnd=source.indexOf('    function checkWin(piece) {',collisionStart);
assert(collisionStart>=0&&collisionEnd>collisionStart);
const collisionCode=source.slice(collisionStart,collisionEnd);

function checkPhysicalReplay(level,moves){
  const inset=.01;
  const pieces=level.items.map(p=>({
    id:p[0],n:p[0][0],x:p[1]+inset,y:p[2]+inset,
    w:p[3]-2*inset,h:p[4]-2*inset
  }));
  const ctx=vm.createContext({});
  vm.runInContext([
    'var W=4,H=5, EPS=0.000001,INSET=0.01,PUSH_LIMIT=0.35,NUDGE=0.006;',
    'var pieces='+JSON.stringify(pieces)+';',
    'function snapshot(){return pieces.map(p=>Object.assign({},p));}',
    collisionCode
  ].join('\n'),ctx);
  const logical=level.items.map(p=>({x:p[1],y:p[2]}));
  for(let t=0;t<moves.length;t++){
    const [i,dx,dy]=moves[t],p=ctx.pieces[i];
    ctx.moveFree(p,dx,dy,{start:ctx.snapshot(),activeId:p.id});
    logical[i].x+=dx;logical[i].y+=dy;
    for(let j=0;j<ctx.pieces.length;j++){
      const q=ctx.pieces[j];
      const err=Math.hypot(q.x-logical[j].x-inset,q.y-logical[j].y-inset);
      assert(err<0.025,
        level.title+' deviates from a valid solution on step '+(t+1)+
        ' (piece '+q.id+', drift '+err+')');
    }
  }
  assert.equal(logical[0].x,1,'The final five piece must be centered');
  assert.equal(logical[0].y,3,'The final five piece must reach the bottom');
}
const expected=[27,45,116];
levels.forEach((level,index)=>{
  checkGeometry(level);
  const result=shortestSolution(level);
  assert.equal(result.moves.length,expected[index],
    'Unexpected difficulty regression in stage '+(index+1));
  checkPhysicalReplay(level,result.moves);
  console.log('Stage '+(index+1)+': 5 starts at top, 2 empty cells, '+
    result.moves.length+' shortest moves; physically replayed');
});
