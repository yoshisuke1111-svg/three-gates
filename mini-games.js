/* 三つの区画 - 区画3の操作式ミニゲーム (original implementation) */
(function () {
  "use strict";
  function element(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function arrows() {
    return '<div class="mg-pad" aria-label="移動ボタン">' +
      '<button type="button" data-dir="up" aria-label="上へ">↑</button>' +
      '<div><button type="button" data-dir="left" aria-label="左へ">←</button>' +
      '<button type="button" data-dir="down" aria-label="下へ">↓</button>' +
      '<button type="button" data-dir="right" aria-label="右へ">→</button></div></div>';
  }
  function keyDirection(e) {
    var map = {ArrowUp:"up", ArrowDown:"down", ArrowLeft:"left", ArrowRight:"right", w:"up", a:"left", s:"down", d:"right"};
    if (e.target && /input|textarea/i.test(e.target.tagName || "")) return null;
    return map[e.key] || null;
  }
  var vector = {up:[0,-1], down:[0,1], left:[-1,0], right:[1,0]};
  function slider(root, win) {
    var start = [
      {id:"5",x:1,y:2,w:2,h:2,n:"5"},
      {id:"3a",x:2,y:0,w:1,h:2,n:"3"},
      {id:"3b",x:1,y:0,w:1,h:2,n:"3"},
      {id:"3c",x:0,y:0,w:1,h:2,n:"3"},
      {id:"3d",x:0,y:2,w:1,h:2,n:"3"},
      {id:"2",x:2,y:4,w:2,h:1,n:"2"},
      {id:"1a",x:3,y:2,w:1,h:1,n:"1"},
      {id:"1b",x:0,y:4,w:1,h:1,n:"1"},
      {id:"1c",x:1,y:4,w:1,h:1,n:"1"},
      {id:"1d",x:3,y:0,w:1,h:1,n:"1"}
    ];
    var pieces = start.map(function (p) {return Object.assign({},p);});
    var history = [], moves = 0, selected = "5", won = false, touch = null;
    root.innerHTML = '<p class="mg-instruction">大きな <b>5</b> を、下辺中央の出口まで運べ。駒は上下左右にのみ滑る。</p>' +
      '<div class="mg-layout"><div class="mg-board-area"><div class="mg-board" id="mg-slide-board" aria-label="数字の箱を動かす盤面"></div><div class="mg-exit-mark">▼ EXIT / 5</div></div>' +
      '<div class="mg-side"><p class="mg-caption">NUMBERED BOX / 01</p><p class="mg-counter" id="mg-slide-counter">MOVES 000</p>' +
      '<p class="mg-help">駒をタップして選択し、矢印で移動。駒を直接スワイプしても動かせる。</p>' +
      arrows() + '<div class="mg-small-actions"><button type="button" data-act="undo">一手戻す</button><button type="button" data-act="reset">最初から</button></div>' +
      '<p class="mg-note" id="mg-slide-note" aria-live="polite">5を出口へ。数字ごとに駒の大きさが異なる。</p></div></div>';
    var board = root.querySelector("#mg-slide-board"), note=root.querySelector("#mg-slide-note");
    function draw() {
      board.innerHTML = pieces.map(function (p) {
        return '<button type="button" data-piece="' + p.id + '" class="mg-piece mg-piece-' + p.n +
          (selected===p.id?' is-selected':'')+'" aria-label="駒'+p.n+'を選択" style="left:'+(p.x*25)+'%;top:'+(p.y*20)+'%;width:'+(p.w*25)+'%;height:'+(p.h*20)+'%">' +
          '<span>'+p.n+'</span></button>';
      }).join("");
      root.querySelector("#mg-slide-counter").textContent="MOVES "+String(moves).padStart(3,"0");
    }
    function reset() {
      pieces=start.map(function (p){return Object.assign({},p);});
      history=[]; moves=0; selected="5"; won=false; note.textContent="盤面を戻した。";
      draw();
    }
    function move(dir) {
      if(won || !vector[dir])return;
      var p=pieces.find(function(x){return x.id===selected;});
      if(!p)return;
      var dx=vector[dir][0],dy=vector[dir][1],nx=p.x+dx,ny=p.y+dy;
      if(nx<0||ny<0||nx+p.w>4||ny+p.h>5){note.textContent="その方向は壁じゃ。";return;}
      for(var i=0;i<pieces.length;i++){
        var q=pieces[i];if(q.id===p.id)continue;
        if(nx<q.x+q.w && nx+p.w>q.x && ny<q.y+q.h && ny+p.h>q.y){
          note.textContent="ほかの駒が邪魔をしている。";return;
        }
      }
      history.push(pieces.map(function(x){return Object.assign({},x);}));
      p.x=nx;p.y=ny;moves++;note.textContent="空いた場所を使い、5の通り道を作れ。";
      draw();
      if(p.id==="5" && nx===1 && ny===3) {
        won=true; note.textContent="5が出口に到達した。箱の底が開く。";
        board.classList.add("mg-cleared");
        win();
      }
    }
    function onClick(e) {
      var piece=e.target.closest("[data-piece]");
      if(piece){selected=piece.dataset.piece; draw();return;}
      var dir=e.target.closest("[data-dir]");
      if(dir){move(dir.dataset.dir);return;}
      var act=e.target.closest("[data-act]");
      if(!act)return;
      if(act.dataset.act==="reset"){board.classList.remove("mg-cleared");reset();}
      if(act.dataset.act==="undo" && history.length && !won){pieces=history.pop();moves=Math.max(0,moves-1);note.textContent="一手前に戻した。";draw();}
    }
    function onDown(e){
      var p=e.target.closest("[data-piece]");
      if(p){touch={id:p.dataset.piece,x:e.clientX,y:e.clientY};}
    }
    function onUp(e){
      if(!touch)return;
      var dx=e.clientX-touch.x,dy=e.clientY-touch.y;
      var id=touch.id;touch=null;
      if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;
      selected=id;
      move(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"));
    }
    function onKey(e){var dir=keyDirection(e);if(dir){e.preventDefault();move(dir);}}
    root.addEventListener("click",onClick);
    root.addEventListener("pointerdown",onDown);
    root.addEventListener("pointerup",onUp);
    document.addEventListener("keydown",onKey);
    draw();
    return function(){root.removeEventListener("click",onClick);root.removeEventListener("pointerdown",onDown);root.removeEventListener("pointerup",onUp);document.removeEventListener("keydown",onKey);};
  }
  function maze(root, win) {
    var map=["S..#..","##.#.#","...#..",".#...#",".#.#..","...#.G"];
    var x=0,y=0,steps=0,finished=false,touch=null;
    root.innerHTML='<p class="mg-instruction">白い通路だけを通り、光点を <b>GOAL</b> へ運べ。壁は通れない。</p>'+
      '<div class="mg-layout"><div class="mg-maze" id="mg-maze-grid" aria-label="6×6の移動迷路"></div>'+
      '<div class="mg-side"><p class="mg-caption">LABYRINTH / 01</p><p class="mg-counter" id="mg-maze-counter">MOVES 000</p>'+
      '<p class="mg-help">矢印で操作。または近くのマスをタップして進める。</p>'+
      arrows()+'<div class="mg-small-actions"><button type="button" data-act="reset">最初から</button></div>'+
      '<p class="mg-note" id="mg-maze-note" aria-live="polite">壁のない道を選ぼう。</p></div></div>';
    var board=root.querySelector("#mg-maze-grid"), note=root.querySelector("#mg-maze-note");
    function draw(){
      board.innerHTML=map.map(function(row,ry){return row.split("").map(function(cell,cx){
        var wall=cell==="#", player=x===cx&&y===ry,goal=cell==="G";
        return '<button type="button" class="mg-maze-cell '+(wall?"is-wall":"")+' '+(goal?"is-goal":"")+' '+(player?"is-player":"")+'" data-cell="'+cx+','+ry+'" '+(wall?'disabled':'')+' aria-label="'+(player?"現在地":goal?"ゴール":wall?"壁":"通路")+'">'+(player?"●":goal?"◎":"")+'</button>';
      }).join("");}).join("");
      root.querySelector("#mg-maze-counter").textContent="MOVES "+String(steps).padStart(3,"0");
    }
    function move(dir){
      if(finished||!vector[dir])return;
      var nx=x+vector[dir][0],ny=y+vector[dir][1];
      if(nx<0||ny<0||ny>=6||nx>=6||map[ny][nx]==="#"){note.textContent="そこは壁で進めない。";return;}
      x=nx;y=ny;steps++;note.textContent="通路を進んだ。";draw();
      if(map[y][x]==="G"){finished=true;note.textContent="ゴールへ到達した！";win();}
    }
    function onClick(e) {
      var btn=e.target.closest("[data-dir]");
      if(btn){move(btn.dataset.dir);return;}
      var cell=e.target.closest("[data-cell]");
      if(cell){
        var xy=cell.dataset.cell.split(",").map(Number),dx=xy[0]-x,dy=xy[1]-y;
        if(Math.abs(dx)+Math.abs(dy)===1)move(dx===1?"right":dx===-1?"left":dy===1?"down":"up");
        return;
      }
      var reset=e.target.closest('[data-act="reset"]');
      if(reset){x=0;y=0;steps=0;finished=false;note.textContent="最初の位置に戻した。";draw();}
    }
    function onDown(e){if(e.target.closest("#mg-maze-grid"))touch={x:e.clientX,y:e.clientY};}
    function onUp(e){
      if(!touch)return;var dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch=null;
      if(Math.max(Math.abs(dx),Math.abs(dy))<25)return;
      move(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"));
    }
    function onKey(e){var d=keyDirection(e);if(d){e.preventDefault();move(d);}}
    root.addEventListener("click",onClick);root.addEventListener("pointerdown",onDown);root.addEventListener("pointerup",onUp);document.addEventListener("keydown",onKey);draw();
    return function(){root.removeEventListener("click",onClick);root.removeEventListener("pointerdown",onDown);root.removeEventListener("pointerup",onUp);document.removeEventListener("keydown",onKey);};
  }
  function lights(root,win) {
    var lamps=Array(9).fill(false), solved=false, moves=0;
    var seed=[1,4,6,8];
    function toggleOne(i){lamps[i]=!lamps[i];var row=Math.floor(i/3),col=i%3;if(row>0)lamps[i-3]=!lamps[i-3];if(row<2)lamps[i+3]=!lamps[i+3];if(col>0)lamps[i-1]=!lamps[i-1];if(col<2)lamps[i+1]=!lamps[i+1];}
    function reset(){lamps=Array(9).fill(false);seed.forEach(toggleOne);solved=false;moves=0;draw();}
    root.innerHTML='<p class="mg-instruction">押した光と、上下左右の光が反転する。すべての光を消せ。</p>'+
      '<div class="mg-layout"><div class="mg-light-grid" id="mg-light-grid" aria-label="九つの光"></div>'+
      '<div class="mg-side"><p class="mg-caption">GLASS CIRCUIT / 01</p><p class="mg-counter" id="mg-light-counter">MOVES 000</p>'+
      '<p class="mg-help">光をタップすると周りの光も反転する。順序よりも組み合わせを考えよう。</p>'+
      '<div class="mg-small-actions"><button type="button" data-act="reset">最初から</button></div>'+
      '<p class="mg-note" id="mg-light-note" aria-live="polite">全消灯が条件。</p></div></div>';
    var board=root.querySelector("#mg-light-grid"), note=root.querySelector("#mg-light-note");
    function draw(){
      board.innerHTML=lamps.map(function(on,i){return '<button type="button" data-light="'+i+'" class="mg-light '+(on?"on":"off")+'" aria-label="光'+(i+1)+'、'+(on?"点灯":"消灯")+'" aria-pressed="'+on+'">'+(on?"●":"○")+'</button>';}).join("");
      root.querySelector("#mg-light-counter").textContent="MOVES "+String(moves).padStart(3,"0");
    }
    function onClick(e){
      var light=e.target.closest("[data-light]");
      if(light&&!solved){toggleOne(Number(light.dataset.light));moves++;draw();if(lamps.every(function(v){return !v;})){solved=true;note.textContent="すべての光が消えた。";win();}return;}
      if(e.target.closest('[data-act="reset"]')){reset();note.textContent="初期配置に戻した。";}
    }
    root.addEventListener("click",onClick);reset();return function(){root.removeEventListener("click",onClick);};
  }
  function mirror(root,win) {
    var upper="001101", bits="100011".split(""),finished=false;
    root.innerHTML='<p class="mg-instruction">上下で同じ桁に同じ数字は置けない。下側のスイッチを切り替えよ。</p>'+
      '<div class="mg-mirror-rows"><div class="mg-mirror-name">上の記録</div><div class="mg-mirror-row mg-fixed" id="mg-mirror-top"></div>'+
      '<div class="mg-mirror-name">下の記録</div><div class="mg-mirror-row" id="mg-mirror-bottom"></div></div>'+
      '<p class="mg-help mg-center">6つのスイッチはそれぞれ独立している。タップするたび0と1が入れ替わる。</p>'+
      '<p class="mg-note" id="mg-mirror-note" role="status">上下の6桁を照合せよ。</p>';
    var top=root.querySelector("#mg-mirror-top"), bottom=root.querySelector("#mg-mirror-bottom"),note=root.querySelector("#mg-mirror-note");
    top.innerHTML=upper.split("").map(function(c){return '<span class="mg-bit">'+c+'</span>';}).join("");
    function draw(){bottom.innerHTML=bits.map(function(b,i){return '<button type="button" class="mg-bit mg-bit-switch" data-bit="'+i+'" aria-label="'+(i+1)+'桁目を反転">'+b+'</button>';}).join("");}
    function onClick(e){
      var b=e.target.closest("[data-bit]");
      if(!b||finished)return;
      var i=Number(b.dataset.bit);bits[i]=bits[i]==="0"?"1":"0";draw();
      var ok=bits.every(function(v,i){return v!==upper[i];});
      if(ok){finished=true;note.textContent="6桁すべてが反転した。";win();}
    }
    root.addEventListener("click",onClick);draw();return function(){root.removeEventListener("click",onClick);};
  }
  function memory(root,win) {
    var seq=[2,4,1,3], expected=0,waiting=true,finished=false,timers=[],token=0;
    root.innerHTML='<p class="mg-instruction">4枚の板が点灯する順序を見て、同じ順番で触れよ。</p>'+
      '<div class="mg-memory-grid">'+[1,2,3,4].map(function(n){return '<button type="button" data-memory="'+n+'" class="mg-memory-tile" aria-label="板 '+n+'">'+n+'</button>';}).join("")+'</div>'+
      '<div class="mg-small-actions mg-center"><button type="button" data-act="play">光の順番を見る</button></div>'+
      '<p class="mg-note mg-center" id="mg-memory-note" aria-live="polite">最初に「光の順番を見る」を押そう。</p>';
    var note=root.querySelector("#mg-memory-note");
    function clear(){timers.forEach(clearTimeout);timers=[];root.querySelectorAll("[data-memory]").forEach(function(t){t.classList.remove("flash");});}
    function play(){
      if(finished)return;token++;clear();expected=0;waiting=true;note.textContent="点灯する順番を覚えよう。";
      var t=token;
      seq.forEach(function(num,i){
        timers.push(setTimeout(function(){if(t!==token)return;var cell=root.querySelector('[data-memory="'+num+'"]');if(cell)cell.classList.add("flash");},420+i*820));
        timers.push(setTimeout(function(){if(t!==token)return;var cell=root.querySelector('[data-memory="'+num+'"]');if(cell)cell.classList.remove("flash");},920+i*820));
      });
      timers.push(setTimeout(function(){if(t!==token)return;waiting=false;note.textContent="同じ順番で4つの板を触れ。";},420+seq.length*820));
    }
    function onClick(e){
      if(e.target.closest('[data-act="play"]')){play();return;}
      var cell=e.target.closest("[data-memory]");
      if(!cell||waiting||finished)return;
      var n=Number(cell.dataset.memory);
      if(n!==seq[expected]){expected=0;note.textContent="順番が異なる。もう一度、光を確認しよう。";return;}
      expected++;note.textContent="確認 "+expected+" / 4";
      if(expected===seq.length){finished=true;note.textContent="すべての板が応答した。";win();}
    }
    root.addEventListener("click",onClick);
    return function(){token++;clear();root.removeEventListener("click",onClick);};
  }
  var factories={slider:slider, maze:maze, lights:lights, mirror:mirror, memory:memory};
  window.ThreeGatesMiniGames={
    mount:function(root,kind,onWin){
      var f=factories[kind];if(!f)throw new Error("Unknown minigame: "+kind);
      var completed=false;
      return f(root,function(){if(completed)return;completed=true;onWin();});
    }
  };
})();
