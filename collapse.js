/* v0.19 - Flying words, an abrupt silent freeze, then independent falling fragments. */
(function(){
  "use strict";
  var active=null;
  var WORD_LIMIT=210;
  function clear(){
    if(!active)return;
    active.timers.forEach(clearTimeout);
    if(active.layer)active.layer.remove();
    if(active.site)active.site.classList.remove("tg-corrupted","tg-detached","tg-falling");
    if(active.scene)active.scene.inert=false;
    active=null;
  }
  function pseudo(n){
    var x=Math.sin(n*127.1+78.233)*43758.5453;
    return x-Math.floor(x);
  }
  function setFlightVars(shard,rect,index){
    var vw=window.innerWidth||900,vh=window.innerHeight||800;
    var stops=[.10+pseudo(index+99)*.80,.10+pseudo(index+212)*.75];
    var px=stops[0]*vw-rect.left,py=stops[1]*vh-rect.top;
    var xy=[
      (pseudo(index*7+12)*1.9-.95)*vw,
      (pseudo(index*7+31)*1.6-.8)*vh,
      (pseudo(index*7+47)*1.8-.9)*vw,
      (pseudo(index*7+59)*1.5-.75)*vh,
      (pseudo(index*7+74)*1.7-.85)*vw,
      (pseudo(index*7+86)*1.5-.75)*vh
    ];
    var names=["--fly-x1","--fly-y1","--fly-x2","--fly-y2","--fly-x3","--fly-y3"];
    names.forEach(function(name,j){shard.style.setProperty(name,Math.round(xy[j])+"px");});
    shard.style.setProperty("--fly-stop-x",Math.round(px)+"px");
    shard.style.setProperty("--fly-stop-y",Math.round(py)+"px");
    shard.style.setProperty("--fly-r1",Math.round((pseudo(index*3+7)*2-1)*95)+"deg");
    shard.style.setProperty("--fly-r2",Math.round((pseudo(index*3+19)*2-1)*165)+"deg");
    shard.style.setProperty("--fly-r3",Math.round((pseudo(index*3+27)*2-1)*220)+"deg");
    shard.style.setProperty("--fly-stop-rot",Math.round((pseudo(index*3+37)*2-1)*70)+"deg");
    shard.style.setProperty("--fly-color",["#ff66af","#3eece5","#e4a0ff","#ffb368","#cde9ff"][index%5]);
    shard.style.setProperty("--fall-delay",Math.max(0,Math.round(rect.top/(window.innerHeight||800)*1050)+(index%4)*43)+"ms");
    shard.style.setProperty("--fall-time",(1000+(index%5)*120)+"ms");
    shard.style.setProperty("--fall-x",((index%3?-1:1)*(32+(index*23)%185))+"px");
    shard.style.setProperty("--fall-turn",((index%2?-1:1)*(25+(index*11)%90))+"deg");
    shard.style.setProperty("--fall-jolt",((index%2?-1:1)*(10+(index%4)*4))+"px");
  }
  function makeShard(layer,source,rect,index,deep,extraClass){
    var s=window.getComputedStyle(source);
    var shard=source.cloneNode(deep);
    shard.removeAttribute("id");
    if(shard.querySelectorAll)shard.querySelectorAll("[id]").forEach(function(el){el.removeAttribute("id");});
    shard.classList.add("tg-flight-piece","tg-debris-piece");
    if(extraClass)shard.classList.add(extraClass);
    shard.setAttribute("aria-hidden","true");
    shard.tabIndex=-1;
    shard.style.position="fixed";
    shard.style.left=rect.left+"px";
    shard.style.top=rect.top+"px";
    shard.style.width=rect.width+"px";
    shard.style.height=rect.height+"px";
    shard.style.minWidth="0";
    shard.style.minHeight="0";
    shard.style.margin="0";
    shard.style.padding=s.padding;
    shard.style.background=s.background;
    shard.style.border=s.border;
    shard.style.borderRadius=s.borderRadius;
    shard.style.boxShadow=s.boxShadow;
    shard.style.font=s.font;
    shard.style.color=s.color;
    shard.style.textShadow=s.textShadow;
    shard.style.letterSpacing=s.letterSpacing;
    shard.style.lineHeight=s.lineHeight;
    shard.style.textAlign=s.textAlign;
    shard.style.whiteSpace=s.whiteSpace;
    shard.style.overflow="hidden";
    var hp=shard.querySelector && shard.querySelector(".mg-piece-hp");
    if(hp && !hp.hidden){
      hp.style.position="absolute";
      hp.style.bottom="3px";hp.style.left="3px";hp.style.right="3px";
      hp.style.font="600 10px monospace";
      hp.style.background="#140c14da";
      hp.style.color="#ffe9df";
      hp.style.textAlign="center";
    }
    setFlightVars(shard,rect,index);
    layer.appendChild(shard);
    return shard;
  }
  function segmentWords(text){
    if(typeof Intl!=="undefined" && typeof Intl.Segmenter==="function"){
      return Array.from(new Intl.Segmenter("ja",{granularity:"word"}).segment(text),
        function(e){return {text:e.segment,start:e.index};})
        .filter(function(e){return /\S/.test(e.text);});
    }
    var list=[],matches=text.matchAll(/[A-Za-z0-9]+|[^\s]/gu);
    for(var m of matches)list.push({text:m[0],start:m.index});
    return list;
  }
  function appendWordShards(layer,site,index){
    if(!document.createTreeWalker || !document.createRange)return index;
    var textTargets=[
      ".masthead .mark",".masthead .version",
      ".scene-nav .back",".scene-nav .scene-route",
      ".scene-content > .scene-topline",".scene-content > .scene-title",
      ".mg-slider-stage",".mg-slider-types",".mg-slider-level-title",
      ".mg-instruction",".mg-exit-mark",
      ".mg-caption",".mg-counter",".mg-help",
      ".mg-secret-hp-label",".mg-secret-hp-stats",
      ".mg-small-actions button",".mg-note",
      ".scene-footnote",".footer span"
    ];
    var containers=Array.from(site.querySelectorAll(textTargets.join(",")));
    var limit=0;
    for(var c=0;c<containers.length && limit<WORD_LIMIT;c++){
      var container=containers[c];
      if(container.hidden || container.closest("[hidden]"))continue;
      var walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
      var node;
      while((node=walker.nextNode()) && limit<WORD_LIMIT){
        if(!node.textContent || !node.textContent.trim())continue;
        if(node.parentElement && node.parentElement.closest("[hidden]"))continue;
        var style=window.getComputedStyle(node.parentElement || container);
        var words=segmentWords(node.textContent);
        for(var j=0;j<words.length && limit<WORD_LIMIT;j++){
          var w=words[j];
          var range=document.createRange();
          range.setStart(node,w.start);
          range.setEnd(node,w.start+w.text.length);
          var rect=range.getBoundingClientRect();
          if(!rect || rect.width<1 || rect.height<1 ||
             rect.bottom<0 || rect.top>(window.innerHeight||800))continue;
          var shard=document.createElement("span");
          shard.className="tg-flight-piece tg-debris-piece tg-word-piece";
          shard.textContent=w.text;
          shard.setAttribute("aria-hidden","true");
          shard.style.position="fixed";
          shard.style.left=rect.left+"px";
          shard.style.top=rect.top+"px";
          shard.style.width=rect.width+"px";
          shard.style.height=rect.height+"px";
          shard.style.font=style.font;
          shard.style.letterSpacing=style.letterSpacing;
          shard.style.lineHeight=style.lineHeight;
          shard.style.whiteSpace="nowrap";
          shard.style.color=style.color;
          shard.style.textShadow=style.textShadow;
          setFlightVars(shard,rect,index++);
          layer.appendChild(shard);
          limit++;
        }
      }
    }
    return index;
  }
  function buildFragments(site){
    var layer=document.createElement("div");
    layer.className="tg-debris-layer tg-swarming";
    layer.setAttribute("aria-hidden","true");
    var vh=window.innerHeight||800;
    // Structural pieces move separately, never as one giant scene container.
    var selectors=[
      ".masthead",".masthead > *",".scene-nav",".scene-nav > *",
      ".scene-content > .scene-topline",".scene-content > .scene-title",
      "#miniGameHost",".mg-slider-head > *",".mg-slider-level-title",
      ".mg-instruction","#mg-slide-board","#mg-slide-board .mg-piece",
      ".mg-exit-mark",".mg-side > .mg-caption",".mg-side > .mg-counter",
      ".mg-side > .mg-help",".mg-side > .mg-secret-hp",
      ".mg-small-actions > button",".mg-side > .mg-note",
      ".scene-footnote",".footer",".footer > *"
    ];
    var structural=["masthead","scene-nav","mg-host","mg-board","footer"];
    var nodes=Array.from(site.querySelectorAll(selectors.join(",")))
      .filter(function(el){return !el.hidden && !el.closest("[hidden]");})
      .map(function(el){return {el:el,rect:el.getBoundingClientRect()};})
      .filter(function(item){
        var r=item.rect;
        return r.width>2 && r.height>2 && r.bottom>0 && r.top<vh;
      });
    nodes.sort(function(a,b){return a.rect.top-b.rect.top || a.rect.left-b.rect.left;});
    var index=0;
    nodes.forEach(function(item){
      var el=item.el,r=item.rect;
      var isFrame=structural.some(function(name){return el.classList.contains(name);});
      var isTile=el.classList.contains("mg-piece");
      // Every button and text container is an empty, individually moving
      // frame; visible words are extracted separately with precise DOM ranges.
      makeShard(layer,el,r,index++,isTile,isTile?"tg-tile-piece":"tg-frame-piece");
    });
    // Exact text positions via Range, including Japanese words and nested bold.
    appendWordShards(layer,site,index);
    // Background strips enter only at the falling phase; never hide the words.
    var stripH=vh/9;
    for(var i=0;i<9;i++){
      var strip=document.createElement("div");
      strip.className="tg-debris-background";
      strip.style.top=(i*stripH)+"px";
      strip.style.height=(stripH+1)+"px";
      strip.style.setProperty("--fall-delay",(i*145)+"ms");
      strip.style.setProperty("--fall-time",(1100+(i%3)*105)+"ms");
      strip.style.setProperty("--fall-x",((i%2?-1:1)*(28+i*9))+"px");
      strip.style.setProperty("--fall-turn",((i%2?-1:1)*(10+i*2))+"deg");
      strip.style.setProperty("--fall-jolt",((i%2?-1:1)*14)+"px");
      layer.appendChild(strip);
    }
    document.body.appendChild(layer);
    return layer;
  }
  function run(options){
    if(active || !options || !options.site || !options.scene)return;
    var site=options.site,scene=options.scene,reduce=!!options.reduceMotion;
    var state={site:site,scene:scene,timers:[],layer:null};
    active=state;
    scene.inert=true;
    site.classList.add("tg-corrupted");
    if(!reduce){
      // Snapshot first: before anything moves, while DOM ranges are stable.
      state.layer=buildFragments(site);
      site.classList.add("tg-detached");
    }
    state.timers.push(setTimeout(function(){
      if(active!==state)return;
      if(state.layer)state.layer.classList.add("tg-frozen");
    },reduce?120:2500));
    state.timers.push(setTimeout(function(){
      if(active!==state)return;
      if(state.layer){
        state.layer.classList.remove("tg-swarming");
        state.layer.classList.add("tg-dropping");
      }
      site.classList.add("tg-falling");
    },reduce?200:3100));
    state.timers.push(setTimeout(function(){
      if(active===state && typeof options.onReturn==="function")options.onReturn();
    },reduce?780:6500));
  }
  window.ThreeGatesCollapse={
    run:run,clear:clear,buildFragments:buildFragments,segmentWords:segmentWords
  };
})();
