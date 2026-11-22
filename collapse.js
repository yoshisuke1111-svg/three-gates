/* v0.18: independently falling fragments for five-piece destruction. */
(function(){
  "use strict";
  var active=null;
  function clear(){
    if(!active)return;
    active.timers.forEach(clearTimeout);
    active.layer?.remove();
    active.site?.classList.remove("tg-corrupted","tg-falling");
    if(active.scene)active.scene.inert=false;
    active=null;
  }
  function buildFragments(site){
    var layer=document.createElement("div");
    layer.className="tg-debris-layer";
    layer.setAttribute("aria-hidden","true");
    var viewH=window.innerHeight||800;
    var stripH=viewH/9;
    // Nine independently falling slabs provide a shattered background.
    for(var n=0;n<9;n++){
      var strip=document.createElement("div");
      strip.className="tg-debris-background";
      strip.style.top=(n*stripH)+"px";
      strip.style.height=(stripH+1)+"px";
      strip.style.setProperty("--fall-delay",(n*120)+"ms");
      strip.style.setProperty("--fall-time",(1080+(n%3)*95)+"ms");
      strip.style.setProperty("--fall-x",((n%2?1:-1)*(32+n*7))+"px");
      strip.style.setProperty("--fall-turn",((n%2?1:-1)*(10+n*2))+"deg");
      strip.style.setProperty("--fall-jolt",((n%2?1:-1)*14)+"px");
      layer.appendChild(strip);
    }
    // Frame elements are cloned without their children. Every child
    // (including EACH button and EACH tile) gets its own fall trajectory.
    var selectors=[
      ".masthead",".masthead > *",
      ".scene-nav",".scene-nav > *",
      ".scene-content > .scene-topline",".scene-content > .scene-title",
      "#miniGameHost",".mg-slider-head > *",".mg-slider-level-title",
      ".mg-instruction","#mg-slide-board","#mg-slide-board .mg-piece",
      ".mg-exit-mark",".mg-side > .mg-caption",".mg-side > .mg-counter",
      ".mg-side > .mg-help",".mg-side > .mg-secret-hp",
      ".mg-small-actions > button",".mg-side > .mg-note",
      ".scene-footnote",".footer",".footer > *"
    ];
    var frames=["masthead","scene-nav","mg-host","mg-board","footer"];
    var nodes=Array.from(site.querySelectorAll(selectors.join(",")))
      .filter(function(el){return !el.hidden && !el.closest("[hidden]");})
      .map(function(el){return {element:el,rect:el.getBoundingClientRect()};})
      .filter(function(item){
        var r=item.rect;
        return r.width>2 && r.height>2 && r.bottom>0 && r.top<viewH;
      });
    nodes.sort(function(a,b){
      return a.rect.top-b.rect.top || a.rect.left-b.rect.left;
    });
    nodes.forEach(function(item,i){
      var el=item.element,r=item.rect,style=window.getComputedStyle(el);
      var isFrame=frames.some(function(name){return el.classList.contains(name);});
      var shard=el.cloneNode(!isFrame);
      shard.removeAttribute("id");
      shard.querySelectorAll("[id]").forEach(function(node){node.removeAttribute("id");});
      shard.classList.add("tg-debris-piece");
      shard.setAttribute("aria-hidden","true");
      shard.tabIndex=-1;
      shard.style.position="fixed";
      shard.style.left=r.left+"px";
      shard.style.top=r.top+"px";
      shard.style.width=r.width+"px";
      shard.style.height=r.height+"px";
      shard.style.minWidth="0";shard.style.minHeight="0";
      shard.style.margin="0";
      shard.style.padding=style.padding;
      shard.style.color=style.color;
      shard.style.background=style.background;
      shard.style.border=style.border;
      shard.style.borderRadius=style.borderRadius;
      shard.style.boxShadow=style.boxShadow;
      shard.style.font=style.font;
      shard.style.letterSpacing=style.letterSpacing;
      shard.style.lineHeight=style.lineHeight;
      shard.style.textAlign=style.textAlign;
      shard.style.textShadow=style.textShadow;
      shard.style.whiteSpace=style.whiteSpace;
      shard.style.overflow="hidden";
      var hp=shard.querySelector(".mg-piece-hp");
      if(hp && !hp.hidden){
        hp.style.position="absolute";
        hp.style.left="3px";hp.style.right="3px";hp.style.bottom="3px";
        hp.style.color="#ffe9df";hp.style.background="#180f13d9";
        hp.style.textAlign="center";hp.style.font="600 10px monospace";
      }
      // Vertical position controls drop order, with slight individual jitter.
      var frac=Math.max(0,Math.min(1,r.top/viewH));
      var delay=Math.round(frac*1130+(i%4)*44);
      var sign=(i%3===0?-1:1);
      shard.style.setProperty("--fall-delay",delay+"ms");
      shard.style.setProperty("--fall-time",(1050+(i%5)*100)+"ms");
      shard.style.setProperty("--fall-x",(sign*(45+(i*19)%155))+"px");
      shard.style.setProperty("--fall-side",(-sign*16)+"px");
      shard.style.setProperty("--fall-jolt",(sign*11)+"px");
      shard.style.setProperty("--fall-turn",(sign*(13+(i*7)%53))+"deg");
      layer.appendChild(shard);
    });
    document.body.appendChild(layer);
    return layer;
  }
  function run(options){
    if(active || !options?.site || !options.scene)return;
    var site=options.site,scene=options.scene,reduce=!!options.reduceMotion;
    var state={timers:[],layer:null,site:site,scene:scene};
    active=state;
    site.classList.add("tg-corrupted");
    scene.inert=true;
    state.timers.push(setTimeout(function(){
      if(!reduce)state.layer=buildFragments(site);
      site.classList.add("tg-falling");
    },reduce?160:1900));
    state.timers.push(setTimeout(function(){
      if(active===state && typeof options.onReturn==="function")options.onReturn();
    },reduce?760:4900));
  }
  window.ThreeGatesCollapse={run:run,clear:clear,buildFragments:buildFragments};
})();
