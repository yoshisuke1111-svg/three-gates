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
      {title:"最初の箱", label:"1 ×14 + 5", items:[
        ["5",1,0,2,2],
        ["1a",0,0,1,1],["1b",3,0,1,1],
        ["1c",0,1,1,1],["1d",3,1,1,1],
        ["1e",0,2,1,1],["1f",1,2,1,1],["1g",2,2,1,1],["1h",3,2,1,1],
        ["1i",0,3,1,1],["1j",1,3,1,1],["1k",2,3,1,1],["1l",3,3,1,1],
        ["1m",0,4,1,1],["1n",3,4,1,1]
      ]},
      {title:"横長の箱", label:"1 ×8 + 2 ×3 + 5", items:[
        ["5",1,0,2,2],
        ["2a",0,2,2,1],["2b",2,2,2,1],["2c",1,3,2,1],
        ["1a",0,0,1,1],["1b",3,0,1,1],
        ["1c",0,1,1,1],["1d",3,1,1,1],
        ["1e",0,3,1,1],["1f",3,3,1,1],
        ["1g",0,4,1,1],["1h",3,4,1,1]
      ]},
      {title:"四種類の箱", label:"1 ×4 + 2 + 3 ×4 + 5", items:[
        ["5",1,0,2,2],
        ["3a",0,0,1,2],["3b",3,0,1,2],
        ["3c",0,2,1,2],["3d",3,2,1,2],
        ["2a",1,2,2,1],
        ["1a",1,3,1,1],["1b",2,3,1,1],
        ["1c",0,4,1,1],["1d",3,4,1,1]
      ]}
    ];
    // Coordinates are continuous board units, not discrete grid cells.
    // The original arrangement remains 4 x 5, but pieces can end at any position.
    var W=4,H=5, EPS=0.000001, INSET=0.01, PUSH_LIMIT=0.35, NUDGE=0.006;
    // Every side of every block has a hairline clearance: 0.02 board units
    // between adjacent blocks. Collision bounds match the visual dimensions.
    var levelIndex=0, pieces=[], history=[], moves=0, lastPiece="5";
    var stageComplete=false, finished=false, drag=null;
    var hiddenTapCount=0, hiddenTap=null, HP_TAPS=30;
    root.innerHTML=
      '<div class="mg-slider-head"><span class="mg-slider-stage" id="mg-slide-stage"></span><span class="mg-slider-types" id="mg-slide-types"></span></div>'+
      '<h2 class="mg-slider-level-title" id="mg-slide-title"></h2>'+
      '<p class="mg-instruction">最上段の大きな <b>5</b> を下辺中央の出口まで運べ。<b>空きは小さな1の駒2個分だけ。</b>駒を自由に引っ張り、順序を考えて道を作ろう。</p>'+
      '<div class="mg-layout"><div class="mg-board-area"><div class="mg-board" id="mg-slide-board" aria-label="仕切りのない箱。駒は自由な位置に動かせる"></div>'+
      '<div class="mg-exit-mark">▼ EXIT / 5</div></div>'+
      '<div class="mg-side"><p class="mg-caption">NUMBERED BOX / FREE SLIDE</p><p class="mg-counter" id="mg-slide-counter">MOVES 000</p>'+
      '<p class="mg-help">指で押さえて引っ張ると、そのまま駒がついてくる。<b>斜め移動もでき、離した位置にそのまま残る。</b>マス目への吸着なし。ほんの少しの引っかかりなら周りの駒が押し出される。離す瞬間には位置が飛ばない。行き詰まったら「一手戻す」でやり直せる。</p>'+
      '<div class="mg-secret-hp" id="mg-slide-hp" hidden aria-live="polite"><span class="mg-secret-hp-label">HP</span><div class="mg-secret-hp-content"><div class="mg-secret-hp-stats" id="mg-slide-hp-stats"></div><span class="mg-secret-hp-track" aria-hidden="true"><span class="mg-secret-hp-fill"></span></span></div></div>'+
      '<div class="mg-small-actions"><button type="button" data-act="undo">一手戻す</button><button type="button" data-act="reset">このステージをやり直す</button></div>'+
      '<p class="mg-note" id="mg-slide-note" aria-live="polite"></p></div></div>'+
      '<div id="mg-slide-next" aria-live="polite"></div>';
    var board=root.querySelector("#mg-slide-board");
    var note=root.querySelector("#mg-slide-note");
    var next=root.querySelector("#mg-slide-next");
    var hpPanel=root.querySelector("#mg-slide-hp");
    var hpStats=root.querySelector("#mg-slide-hp-stats");
    var MAX_HP_BY_NUMBER={"1":100,"2":200,"3":200,"5":300};
    function hpFor(number) {
      return MAX_HP_BY_NUMBER[number] || 0;
    }
    function updateHpStats() {
      if(!hpStats || hiddenTapCount<HP_TAPS)return;
      var types=Array.from(new Set(pieces.map(function(p){return p.n;})))
        .sort(function(a,b){return Number(a)-Number(b);});
      hpStats.textContent=types.map(function(n){
        return n+" : "+hpFor(n);
      }).join("   /   ");
    }
    function revealHiddenHp() {
      if(!hpPanel || !hpPanel.hidden)return;
      hpPanel.hidden=false;
      hpPanel.classList.add("is-visible");
      updateHpStats();
      draw(); // Reveal a small HP label on each existing piece, too.
      note.textContent="……箱の内側に、駒ごとのHPが現れた。";
    }
    function registerHiddenTap() {
      if(hiddenTapCount>=HP_TAPS)return;
      hiddenTapCount++;
      if(hiddenTapCount===HP_TAPS)revealHiddenHp();
    }

    function freshItems(index) {
      return levels[index].items.map(function (p) {
        var type=p[0].charAt(0), maxHp=hpFor(type);
        return {id:p[0],n:type,x:p[1]+INSET,y:p[2]+INSET,w:p[3]-2*INSET,h:p[4]-2*INSET,hp:maxHp,maxHp:maxHp};
      });
    }
    function snapshot() {
      return pieces.map(function(p){return Object.assign({},p);});
    }
    function load(index) {
      hiddenTap=null;
      levelIndex=index;
      pieces=freshItems(index);
      history=[];moves=0;lastPiece="5";stageComplete=false;drag=null;
      board.classList.remove("mg-cleared");
      board.replaceChildren();
      next.replaceChildren();
      root.querySelector("#mg-slide-stage").textContent="STAGE "+(index+1)+" / "+levels.length;
      root.querySelector("#mg-slide-types").textContent=levels[index].label;
      root.querySelector("#mg-slide-title").textContent=levels[index].title;
      note.textContent="どの駒も指でつかんで、自由な位置まで動かせる。";
      draw();
    }
    function draw() {
      pieces.forEach(function(p){
        var btn=board.querySelector('[data-piece="'+p.id+'"]');
        if(!btn){
          btn=document.createElement("button");
          btn.type="button";btn.dataset.piece=p.id;
          btn.innerHTML='<span>'+p.n+'</span><small class="mg-piece-hp" hidden></small>';
          board.appendChild(btn);
        }
        var exposed=hiddenTapCount>=HP_TAPS;
        var hpLabel=btn.querySelector(".mg-piece-hp");
        hpLabel.hidden=!exposed;
        hpLabel.textContent="HP "+p.hp;
        btn.setAttribute("aria-label","駒"+p.n+(exposed?"、HP "+p.hp+" / "+p.maxHp:"")+"を自由にドラッグして動かす");
        btn.className="mg-piece mg-piece-"+p.n+" mg-piece-movable"+
          (drag && drag.id===p.id?" is-dragging":"");
        btn.style.left=(p.x/W*100)+"%";
        btn.style.top=(p.y/H*100)+"%";
        btn.style.width=(p.w/W*100)+"%";
        btn.style.height=(p.h/H*100)+"%";
      });
      root.querySelector("#mg-slide-counter").textContent="MOVES "+String(moves).padStart(3,"0");
      updateHpStats();
    }
    function showPiece(p) {
      var btn=board.querySelector('[data-piece="'+p.id+'"]');
      if(btn){
        btn.style.left=(p.x/W*100)+"%";
        btn.style.top=(p.y/H*100)+"%";
      }
    }
    // Move continuously; small accidental contacts can gently push adjacent
    // pieces aside. Each passive piece moves at most PUSH_LIMIT in one gesture.
    function overlapsAt(piece,axis,value,other) {
      var px=axis==="x"?value:piece.x, py=axis==="y"?value:piece.y;
      return px<other.x+other.w-EPS && px+piece.w>other.x+EPS &&
             py<other.y+other.h-EPS && py+piece.h>other.y+EPS;
    }
    function restorePositions(before) {
      before.forEach(function(old){
        var current=pieces.find(function(p){return p.id===old.id;});
        if(current){current.x=old.x;current.y=old.y;}
      });
    }
    function gentlyPush(piece,axis,amount,ctx,stack) {
      if(Math.abs(amount)<EPS)return true;
      if(stack.indexOf(piece.id)!==-1 || stack.length>pieces.length)return false;
      if(piece.id===ctx.activeId)return false;
      var size=axis==="x"?piece.w:piece.h, limit=axis==="x"?W:H;
      var target=piece[axis]+amount;
      var initial=ctx.start.find(function(p){return p.id===piece.id;});
      if(!initial || target<-EPS || target+size>limit+EPS ||
         Math.abs(target-initial[axis])>PUSH_LIMIT+EPS)return false;
      var chain=stack.concat(piece.id);
      for(var i=0;i<pieces.length;i++){
        var other=pieces[i];
        if(other.id===piece.id || !overlapsAt(piece,axis,target,other))continue;
        var otherSize=axis==="x"?other.w:other.h;
        var needed=amount>0
          ? target+size-other[axis]+NUDGE
          : target-other[axis]-otherSize-NUDGE;
        if(!gentlyPush(other,axis,needed,ctx,chain))return false;
      }
      piece[axis]=Math.max(0,Math.min(limit-size,target));
      return true;
    }
    function attemptPush(piece,axis,amount,ctx) {
      var before=snapshot();
      if(gentlyPush(piece,axis,amount,ctx,[]))return true;
      restorePositions(before);
      return false;
    }
    function shiftAxis(piece,axis,delta,ctx) {
      if(Math.abs(delta)<EPS)return;
      var size=axis==="x"?piece.w:piece.h,limit=axis==="x"?W:H;
      var current=piece[axis],target=Math.max(0,Math.min(limit-size,current+delta));
      var forward=target>current+EPS,backward=target<current-EPS;
      if(!forward&&!backward)return;
      var cross=axis==="x"?"y":"x";
      for(var i=0;i<pieces.length;i++){
        var other=pieces[i];
        if(other.id===piece.id || !overlapsAt(piece,axis,target,other))continue;
        var crossSize=cross==="x"?piece.w:piece.h;
        var otherCrossSize=cross==="x"?other.w:other.h;
        var up=other[cross]+otherCrossSize-piece[cross]+NUDGE;
        var down=piece[cross]+crossSize-other[cross]+NUDGE;
        var choices=[-up,down].sort(function(x,y){return Math.abs(x)-Math.abs(y);});
        var cleared=false;
        // Prefer nudging the passive piece sideways out of the narrow gap.
        for(var j=0;j<choices.length;j++){
          var n=choices[j];
          if(Math.abs(n)>PUSH_LIMIT+EPS)continue;
          if(attemptPush(other,cross,n,ctx) && !overlapsAt(piece,axis,target,other)){
            cleared=true;break;
          }
        }
        if(cleared)continue;
        // Or gently push it ahead, but never shove a pile of blocks far away.
        var otherSize=axis==="x"?other.w:other.h;
        var along=forward
          ? target+size-other[axis]+NUDGE
          : target-other[axis]-otherSize-NUDGE;
        if(Math.abs(along)<=PUSH_LIMIT+EPS &&
           attemptPush(other,axis,along,ctx) &&
           !overlapsAt(piece,axis,target,other))continue;
        // Too tight, or nowhere to push: stop at the actual contact surface.
        var contact=forward?other[axis]-size:other[axis]+otherSize;
        target=forward?Math.min(target,contact):Math.max(target,contact);
      }
      piece[axis]=Math.max(0,Math.min(limit-size,target));
    }
    function moveFree(piece,dx,dy,ctx) {
      // Small swept increments preserve collision even on a fast swipe.
      var count=Math.max(1,Math.min(100,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/0.10)));
      var stepX=dx/count,stepY=dy/count;
      for(var i=0;i<count;i++){
        if(Math.abs(stepX)>Math.abs(stepY)){
          shiftAxis(piece,"x",stepX,ctx);
          shiftAxis(piece,"y",stepY,ctx);
        }else{
          shiftAxis(piece,"y",stepY,ctx);
          shiftAxis(piece,"x",stepX,ctx);
        }
      }
    }
    function checkWin(piece) {
      // Approximate alignment is enough: precise pixel-perfect positioning
      // should never be required after switching off grid snapping.
      if(piece.id==="5" && piece.y+piece.h>=H-INSET-0.05 &&
         Math.abs(piece.x-(W-piece.w)/2)<=0.25){
        clearLevel();
      }
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
    function onClick(e) {
      // Keyboard/assistive clicks have detail 0; physical clicks are already
      // counted on pointerup to prevent double-counting.
      if(e.detail===0 && e.target.closest("#mg-slide-board"))registerHiddenTap();
      var act=e.target.closest("[data-act]");
      if(!act)return; // Tapping a piece never makes it jump.
      if(act.dataset.act==="next" && stageComplete && !finished){
        load(levelIndex+1);return;
      }
      if(act.dataset.act==="reset" && !finished){
        load(levelIndex);return;
      }
      if(act.dataset.act==="undo" && !stageComplete && history.length){
        pieces=history.pop();moves=Math.max(0,moves-1);
        note.textContent="一手前の位置へ戻した。";draw();
      }
    }
    function onDown(e) {
      if(drag || stageComplete || finished || (e.pointerType==="mouse" && e.button!==0))return;
      // Track a short click on either a piece or the empty board, but never
      // interpret a drag as repeated taps.
      if(e.target.closest("#mg-slide-board")){
        hiddenTap={pointerId:e.pointerId,x:e.clientX,y:e.clientY};
      }
      var btn=e.target.closest("[data-piece]");
      if(!btn)return;
      var piece=pieces.find(function(p){return p.id===btn.dataset.piece;});
      if(!piece)return;
      var unitX=board.clientWidth/W,unitY=board.clientHeight/H;
      if(unitX<=0||unitY<=0)return;
      drag={
        id:piece.id,piece:piece,element:btn,pointerId:e.pointerId,
        startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,
        unitX:unitX,unitY:unitY,start:snapshot(),active:false
      };
      btn.classList.add("is-dragging");
      if(btn.setPointerCapture){
        try{btn.setPointerCapture(e.pointerId);}catch(ignore){}
      }
      e.preventDefault();
    }
    function dragMove(e) {
      if(!drag || drag.pointerId!==e.pointerId)return;
      var current=drag;
      if(!current.active){
        if(Math.hypot(e.clientX-current.startX,e.clientY-current.startY)<4)return;
        current.active=true;
      }
      var dx=(e.clientX-current.lastX)/current.unitX;
      var dy=(e.clientY-current.lastY)/current.unitY;
      current.lastX=e.clientX;
      current.lastY=e.clientY;
      moveFree(current.piece,dx,dy,{start:current.start,activeId:current.id});
      pieces.forEach(showPiece);
    }
    function onMove(e) {
      if(!drag || drag.pointerId!==e.pointerId)return;
      dragMove(e);
      e.preventDefault();
    }
    function endDrag(e,cancelled) {
      if(!drag || drag.pointerId!==e.pointerId)return;
      // Do not apply the pointerup coordinates: phones and mice can report a
      // slightly different release position. Keep the last visible frame.
      var current=drag;
      drag=null;
      current.element.classList.remove("is-dragging");
      if(current.element.hasPointerCapture &&
         current.element.hasPointerCapture(current.pointerId)){
        try{current.element.releasePointerCapture(current.pointerId);}catch(ignore){}
      }
      if(cancelled){
        restorePositions(current.start);draw();return;
      }
      var changed=pieces.some(function(p){
        var before=current.start.find(function(q){return q.id===p.id;});
        return Math.hypot(p.x-before.x,p.y-before.y)>0.001;
      });
      if(!changed){draw();return;}
      history.push(current.start);
      moves++;
      lastPiece=current.id;
      note.textContent="離した瞬間は動かさず、軽い接触だけ周りを押しのける。";
      draw();
      checkWin(current.piece);
    }
    function onUp(e){
      if(hiddenTap && hiddenTap.pointerId===e.pointerId){
        var travel=Math.hypot(e.clientX-hiddenTap.x,e.clientY-hiddenTap.y);
        if(travel<9 && !stageComplete && !finished)registerHiddenTap();
        hiddenTap=null;
      }
      endDrag(e,false);
    }
    function onCancel(e){
      if(hiddenTap && hiddenTap.pointerId===e.pointerId)hiddenTap=null;
      endDrag(e,true);
    }
    function onLostCapture(e){
      if(hiddenTap && hiddenTap.pointerId===e.pointerId)hiddenTap=null;
      if(drag && drag.pointerId===e.pointerId)endDrag(e,true);
    }
    function onKey(e) {
      if(!root.isConnected || stageComplete || finished || drag)return;
      var dir=keyDirection(e);
      if(!dir)return;
      e.preventDefault();
      var focused=document.activeElement;
      var id=(focused && focused.dataset && focused.dataset.piece)||lastPiece;
      var p=pieces.find(function(item){return item.id===id;});
      if(!p)return;
      var start=snapshot(),vx=vector[dir][0]*0.25,vy=vector[dir][1]*0.25;
      moveFree(p,vx,vy,{start:start,activeId:id});
      if(pieces.some(function(q){
        var before=start.find(function(o){return o.id===q.id;});
        return Math.hypot(q.x-before.x,q.y-before.y)>0.001;
      })){
        history.push(start);moves++;lastPiece=id;
        note.textContent="キー操作で少し動かした。";draw();
        checkWin(p);
      }
    }
    root.addEventListener("click",onClick);
    root.addEventListener("pointerdown",onDown);
    root.addEventListener("pointermove",onMove);
    root.addEventListener("pointerup",onUp);
    root.addEventListener("pointercancel",onCancel);
    root.addEventListener("lostpointercapture",onLostCapture);
    document.addEventListener("keydown",onKey);
    load(0);
    return function() {
      if(drag){
        drag.element.classList.remove("is-dragging");
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
