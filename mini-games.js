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
  // The 5 tile is a 2x2 piece. Other tiles use the digit as a shape label.
  // Each level is an independently solvable 4x5 board; only the third gives a code.
  function slider(root, win) {
    var levels = [
      {title:"最初の箱", label:"1 + 5", items:[
        ["5",1,0,2,2],
        ["1a",0,2,1,1],["1b",1,2,1,1],["1c",2,2,1,1],["1d",3,2,1,1],
        ["1e",0,3,1,1],["1f",1,3,1,1],["1g",2,3,1,1],["1h",3,3,1,1]
      ]},
      {title:"横長の箱", label:"1 + 2 + 5", items:[
        ["5",1,0,2,2],
        ["2a",1,2,2,1],["2b",0,3,2,1],["2c",2,3,2,1],
        ["1a",0,0,1,1],["1b",3,0,1,1],["1c",0,1,1,1],
        ["1d",3,1,1,1],["1e",0,2,1,1],["1f",3,2,1,1]
      ]},
      {title:"四種類の箱", label:"1 + 2 + 3 + 5", items:[
        ["5",1,2,2,2],
        ["3a",2,0,1,2],["3b",1,0,1,2],["3c",0,0,1,2],["3d",0,2,1,2],
        ["2a",2,4,2,1],
        ["1a",3,2,1,1],["1b",0,4,1,1],["1c",1,4,1,1],["1d",3,0,1,1]
      ]}
    ];
    var levelIndex=0, pieces=[], history=[], moves=0, lastPiece="5";
    var stageComplete=false, finished=false, drag=null;
    root.innerHTML=
      '<div class="mg-slider-head"><span class="mg-slider-stage" id="mg-slide-stage"></span><span class="mg-slider-types" id="mg-slide-types"></span></div>'+
      '<h2 class="mg-slider-level-title" id="mg-slide-title"></h2>'+
      '<p class="mg-instruction">大きな <b>5</b> を、下辺中央の出口へ。<b>駒を指で引っ張って</b>通り道を作ろう。</p>'+
      '<div class="mg-layout"><div class="mg-board-area"><div class="mg-board" id="mg-slide-board" aria-label="5を出口まで移動する数字の箱"></div>'+
      '<div class="mg-exit-mark">▼ EXIT / 5</div></div>'+
      '<div class="mg-side"><p class="mg-caption">NUMBERED BOX</p><p class="mg-counter" id="mg-slide-counter">MOVES 000</p>'+
      '<p class="mg-help">駒を押さえたまま指を動かし、<b>離した場所で止める</b>。途中で壁や別の駒に当たると、それ以上は進まない。タップだけでは動かない。</p>'+
      '<div class="mg-small-actions"><button type="button" data-act="undo">一手戻す</button><button type="button" data-act="reset">このステージをやり直す</button></div>'+
      '<p class="mg-note" id="mg-slide-note" aria-live="polite"></p></div></div>'+
      '<div id="mg-slide-next" aria-live="polite"></div>';
    var board=root.querySelector("#mg-slide-board");
    var note=root.querySelector("#mg-slide-note");
    var next=root.querySelector("#mg-slide-next");
    function freshItems(index) {
      return levels[index].items.map(function (p) {
        return {id:p[0],n:p[0].charAt(0),x:p[1],y:p[2],w:p[3],h:p[4]};
      });
    }
    function load(index) {
      levelIndex=index;
      pieces=freshItems(levelIndex);
      history=[];moves=0;lastPiece="5";stageComplete=false;
      drag=null;
      board.classList.remove("mg-cleared");
      board.replaceChildren();
      next.replaceChildren();
      root.querySelector("#mg-slide-stage").textContent="STAGE "+(levelIndex+1)+" / "+levels.length;
      root.querySelector("#mg-slide-types").textContent=levels[levelIndex].label;
      root.querySelector("#mg-slide-title").textContent=levels[levelIndex].title;
      note.textContent="駒を押さえて、指で引っ張ろう。";
      draw();
    }
    function isLegal(piece,dir) {
      if(!vector[dir])return false;
      var nx=piece.x+vector[dir][0],ny=piece.y+vector[dir][1];
      if(nx<0||ny<0||nx+piece.w>4||ny+piece.h>5)return false;
      return pieces.every(function(q){
        return q.id===piece.id || !(nx<q.x+q.w && nx+piece.w>q.x && ny<q.y+q.h && ny+piece.h>q.y);
      });
    }
    function legalDirs(piece) {
      return ["left","right","up","down"].filter(function(d){return isLegal(piece,d);});
    }
    function draw() {
      pieces.forEach(function(p) {
        var btn=board.querySelector('[data-piece="'+p.id+'"]');
        if(!btn) {
          btn=document.createElement("button");
          btn.type="button";btn.dataset.piece=p.id;
          btn.innerHTML="<span>"+p.n+"</span>";
          board.appendChild(btn);
        }
        var movable=legalDirs(p).length>0;
        btn.className="mg-piece mg-piece-"+p.n+(movable?" mg-piece-movable":" mg-piece-blocked")+
          (drag && drag.id===p.id?" is-dragging":"");
        btn.setAttribute("aria-label","駒"+p.n+(movable?"、ドラッグして移動":"、現在動かせない"));
        btn.style.left=(p.x*25)+"%";btn.style.top=(p.y*20)+"%";
        if(!drag || drag.id!==p.id)btn.style.transform="";

        btn.style.width=(p.w*25)+"%";btn.style.height=(p.h*20)+"%";
      });
      root.querySelector("#mg-slide-counter").textContent="MOVES "+String(moves).padStart(3,"0");
    }
    function maxSteps(piece, dir) {
      // Look ahead one cell at a time: the preview may never pass through a piece.
      var test={id:piece.id,x:piece.x,y:piece.y,w:piece.w,h:piece.h};
      var count=0;
      while(count<5 && isLegal(test,dir)) {
        test.x+=vector[dir][0];
        test.y+=vector[dir][1];
        count++;
      }
      return count;
    }
    function dragPosition(event) {
      if(!drag || event.pointerId!==drag.pointerId)return;
      var dx=event.clientX-drag.startX;
      var dy=event.clientY-drag.startY;
      if(!drag.axis) {
        if(Math.max(Math.abs(dx),Math.abs(dy))<5)return;
        drag.axis=Math.abs(dx/drag.cellX)>=Math.abs(dy/drag.cellY)?"x":"y";
      }
      var horizontal=drag.axis==="x";
      var raw=horizontal?dx:dy;
      var dir=horizontal?(raw<0?"left":"right"):(raw<0?"up":"down");
      var cell=horizontal?drag.cellX:drag.cellY;
      var capacity=maxSteps(drag.piece,dir)*cell;
      // The tile stays under the finger until a wall or another tile blocks it.
      var preview=Math.sign(raw)*Math.min(Math.abs(raw),capacity);
      drag.preview=preview;
      drag.direction=dir;
      drag.pieceElement.style.transform=horizontal?
        "translate3d("+preview+"px,0,0)":"translate3d(0,"+preview+"px,0)";
    }
    function endDrag(event,cancelled) {
      if(!drag || event.pointerId!==drag.pointerId)return;
      if(!cancelled)dragPosition(event);
      var current=drag;
      drag=null;
      var el=current.pieceElement;
      el.classList.remove("is-dragging");
      if(el.hasPointerCapture && el.hasPointerCapture(current.pointerId)){
        try{el.releasePointerCapture(current.pointerId);}catch(ignore){}
      }
      if(cancelled || !current.axis || stageComplete || finished){
        el.style.transform="";
        draw();
        return;
      }
      var distance=Math.abs(current.preview);
      var cell=current.axis==="x"?current.cellX:current.cellY;
      var amount=Math.round(distance/cell);
      var piece=current.piece, dir=current.direction;
      amount=Math.min(amount,maxSteps(piece,dir));
      if(amount===0){
        el.style.transform=""; // return gently to origin, but never move on a tap
        draw();
        return;
      }
      history.push(pieces.map(function(o){return Object.assign({},o);}));
      piece.x+=vector[dir][0]*amount;
      piece.y+=vector[dir][1]*amount;
      moves++;
      lastPiece=piece.id;
      note.textContent="指を離した位置で駒が止まった。";
      // Change the grid position without flashing back to the start.
      // Preserve the finger position as a residual transform, then ease into the cell.
      var remainder=current.preview-Math.sign(current.preview)*amount*cell;
      el.style.transition="none";
      draw();
      el.style.transform=current.axis==="x"?
        "translate3d("+remainder+"px,0,0)":"translate3d(0,"+remainder+"px,0)";
      el.getBoundingClientRect(); // flush the release position before enabling easing
      el.style.transition="";
      requestAnimationFrame(function(){
        if(el.isConnected && !el.classList.contains("is-dragging"))el.style.transform="";
      });
      if(piece.id==="5" && piece.x===1 && piece.y===3)clearLevel();
    }
    function step(id,dir) {
      if(stageComplete||finished)return;
      var p=pieces.find(function(o){return o.id===id;});
      if(!p)return;
      if(!isLegal(p,dir)){
        note.textContent="そこには動かせない。空いた方向を試してみよう。";
        return;
      }
      history.push(pieces.map(function(o){return Object.assign({},o);}));
      p.x+=vector[dir][0];p.y+=vector[dir][1];
      moves++;lastPiece=id;
      note.textContent="駒が滑った。";
      draw();
      if(p.id==="5" && p.x===1 && p.y===3)clearLevel();
    }
    function clearLevel() {
      stageComplete=true;
      board.classList.add("mg-cleared");
      note.textContent="5が出口へ届いた！";
      var last=levelIndex===levels.length-1;
      next.innerHTML=
        '<div class="mg-win appear"><p class="mg-win-label">STAGE '+(levelIndex+1)+' CLEAR / '+levels.length+'</p>'+
        '<h3>'+(last?'すべての箱が開いた。':'次の箱が現れた。')+'</h3>'+
        '<p>'+(last?'箱の底に記録が残されている。':'次のステージでは、別の数字の駒が加わる。')+'</p>'+
        (last?'':'<button type="button" class="button button--gold" data-act="next">STAGE '+(levelIndex+2)+' へ進む ↗</button>')+
        '</div>';
      if(last){finished=true;win();}
    }
    function onClick(e){
      var act=e.target.closest("[data-act]");
      if(!act)return; // Tapping a piece NEVER moves it.
      if(act.dataset.act==="next" && stageComplete && !finished){load(levelIndex+1);return;}
      if(act.dataset.act==="reset" && !finished){load(levelIndex);return;}
      if(act.dataset.act==="undo" && history.length && !stageComplete && !finished){
        pieces=history.pop();moves=Math.max(0,moves-1);
        note.textContent="一手前に戻した。";draw();
      }
    }
    function onDown(e){
      if(drag || stageComplete || finished || (e.pointerType==="mouse" && e.button!==0))return;
      var btn=e.target.closest("[data-piece]");
      if(!btn)return;
      var p=pieces.find(function(o){return o.id===btn.dataset.piece;});
      if(!p || legalDirs(p).length===0)return;
      var cellX=board.clientWidth/4,cellY=board.clientHeight/5;
      if(cellX<=0||cellY<=0)return;
      drag={
        id:p.id,piece:p,pieceElement:btn,pointerId:e.pointerId,
        startX:e.clientX,startY:e.clientY,cellX:cellX,cellY:cellY,
        axis:null,direction:null,preview:0
      };
      btn.classList.add("is-dragging");
      if(btn.setPointerCapture) {
        try{btn.setPointerCapture(e.pointerId);}catch(ignore){}
      }
      e.preventDefault();
    }
    function onMove(e){
      if(drag && e.pointerId===drag.pointerId) {
        dragPosition(e);
        e.preventDefault();
      }
    }
    function onUp(e){endDrag(e,false);}
    function onCancel(e){endDrag(e,true);}
    function onLostCapture(e){
      if(drag && e.pointerId===drag.pointerId)endDrag(e,true);
    }
    function onKey(e) {
      if(!root.isConnected||stageComplete||finished)return;
      var d=keyDirection(e);
      if(!d)return;
      e.preventDefault();
      var focused=document.activeElement;
      var id=(focused && focused.dataset && focused.dataset.piece)||lastPiece;
      step(id,d);
    }
    root.addEventListener("click",onClick);
    root.addEventListener("pointerdown",onDown);
    root.addEventListener("pointermove",onMove);
    root.addEventListener("pointerup",onUp);
    root.addEventListener("pointercancel",onCancel);
    root.addEventListener("lostpointercapture",onLostCapture);
    document.addEventListener("keydown",onKey);
    load(0);
    return function () {
      if(drag){
        drag.pieceElement.style.transform="";
        drag.pieceElement.classList.remove("is-dragging");
        drag=null;
      }
      root.removeEventListener("click",onClick);
      root.removeEventListener("pointerdown",onDown);
      root.removeEventListener("pointermove",onMove);
      root.removeEventListener("pointerup",onUp);
      root.removeEventListener("pointercancel",onCancel);
      root.removeEventListener("lostpointercapture",onLostCapture);
      document.removeEventListener("keydown",onKey);
    };
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
