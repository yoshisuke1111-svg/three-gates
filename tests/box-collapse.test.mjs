// A five failure must fling actual words and tiles across the viewport,
// freeze ALL of them, then independently drop them from top to bottom.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('collapse.js','utf8');
const css=fs.readFileSync('collapse.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const jobs=[],cloned=[],appended=[];
let returned=0;

function element(name,top=0,left=0,width=200,height=60){
  const el={
    name,hidden:false,removed:false,textContent:'',
    className:name,children:[],
    style:{setProperty:function(k,v){this[k]=v;}},
    getBoundingClientRect:function(){return {top,left,width,height,bottom:top+height};},
    querySelectorAll:function(){return [];},
    querySelector:function(){return null;},
    closest:function(){return null;},
    removeAttribute:function(k){delete this[k];},
    setAttribute:function(){},
    appendChild:function(child){this.children.push(child);return child;},
    remove:function(){this.removed=true;},
    cloneNode:function(deep){cloned.push({name,deep});return element(name,top,left,width,height);}
  };
  el.classList={
    add:function(...v){
      for(const token of v){
        const arr=new Set(el.className.split(/\s+/).filter(Boolean));
        arr.add(token);el.className=[...arr].join(' ');
      }
    },
    remove:function(...v){
      const arr=new Set(el.className.split(/\s+/).filter(Boolean));
      for(const token of v)arr.delete(token);
      el.className=[...arr].join(' ');
    },
    contains:function(v){return el.className.split(/\s+/).includes(v);}
  };
  return el;
}
const site=element('site');
const scene={inert:false};
const header=element('masthead',10,20,350,30);
const title=element('scene-title',85,40,250,50);
title.textContent='数字の箱';
const frame=element('mg-host',170,30,400,480);
const board=element('mg-board',235,80,300,375);
const tile1=element('mg-piece',260,95,60,60);
const tile2=element('mg-piece',440,240,110,105);
const note=element('scene-footnote',680,40,280,40);
note.textContent='出口へ進もう';
site.querySelectorAll=function(selector){
  if(selector.includes('.masthead .mark'))return [title,note];
  return [header,title,frame,board,tile1,tile2,note];
};
function textWalker(parent){
  let done=false;
  const node={
    textContent:parent.textContent,
    parentElement:parent
  };
  return {nextNode:function(){
    if(done)return null;
    done=true;
    return node.textContent?node:null;
  }};
}
const context=vm.createContext({
  window:{
    innerWidth:900,innerHeight:800,
    getComputedStyle:function(){return {
      padding:'0px',color:'#ddd',background:'rgb(20,20,30)',
      border:'2px solid #555',borderRadius:'4px',boxShadow:'none',
      font:'16px serif',letterSpacing:'0px',lineHeight:'normal',
      textAlign:'left',textShadow:'none',whiteSpace:'normal'
    };}
  },
  document:{
    createElement:function(tag){return element(tag);},
    createTreeWalker:function(parent){return textWalker(parent);},
    createRange:function(){
      let textNode,start,end;
      return {
        setStart:function(n,i){textNode=n;start=i;},
        setEnd:function(n,i){end=i;},
        getBoundingClientRect:function(){
          const parent=textNode.parentElement,r=parent.getBoundingClientRect();
          return {top:r.top,left:r.left+start*12,width:(end-start)*12,
                  height:23,bottom:r.top+23};
        }
      };
    },
    body:{appendChild:function(el){appended.push(el);}}
  },
  NodeFilter:{SHOW_TEXT:4},
  setTimeout:function(fn,delay){const job={fn,delay};jobs.push(job);return job;},
  clearTimeout:function(){},
  console
});
vm.runInContext(source,context);
const collapse=context.window.ThreeGatesCollapse;
assert(collapse&&collapse.run&&collapse.clear&&collapse.buildFragments);
assert.equal(collapse.segmentWords('HELLO 世界').length>=2,true,'Text must be tokenized into words');

collapse.run({site,scene,reduceMotion:false,onReturn:function(){returned++;}});
assert.equal(scene.inert,true,'Controls must be locked as soon as the five dies');
assert(site.classList.contains('tg-corrupted'));
assert(site.classList.contains('tg-detached'),'The original site should be replaced by moving fragments');
assert.equal(appended.length,1,'Fragments are captured immediately, before layout changes');
assert(jobs.some(job=>job.delay===2500),'Motion freezes after flight');
assert(jobs.some(job=>job.delay===3100),'Falling follows a silent pause');
assert(jobs.some(job=>job.delay===6500),'The game returns after all pieces fall');

const fragments=appended[0].children;
assert.equal(fragments.filter(el=>el.classList.contains('tg-debris-background')).length,9,
  'Background must be divided into nine independent strips');
const tiles=fragments.filter(el=>el.classList.contains('tg-tile-piece'));
assert.equal(tiles.length,2,'Every numbered tile should fly separately');
assert.equal(cloned.filter(o=>o.name==='mg-piece'&&o.deep).length,2,
  'Both tiles need their own visible digits');
assert(cloned.some(o=>o.name==='mg-host'&&!o.deep),
  'Outer frame must not take all its children down at once');
assert(cloned.some(o=>o.name==='mg-board'&&!o.deep),
  'Board frame must move separately from its tiles');
const words=fragments.filter(el=>el.classList.contains('tg-word-piece'));
assert(words.length>=4,'Visible text must split into separate flying word fragments');
const motions=new Set(words.map(el=>[
  el.style['--fly-stop-x'],el.style['--fly-stop-y']
].join('/')));
assert(motions.size>=4,'Words must head in different directions');
const delays=tiles.map(el=>el.style['--fall-delay']);
assert.notEqual(delays[0],delays[1],'The two tiles must fall independently');

jobs.find(job=>job.delay===2500).fn();
assert(appended[0].classList.contains('tg-frozen'),
  'Flying words must suddenly freeze');
jobs.find(job=>job.delay===3100).fn();
assert(appended[0].classList.contains('tg-dropping'));
assert(site.classList.contains('tg-falling'));
jobs.find(job=>job.delay===6500).fn();
assert.equal(returned,1,'Force return exactly once');
collapse.clear();
assert.equal(scene.inert,false);
assert(!site.classList.contains('tg-detached'));
assert(!site.classList.contains('tg-falling'));
assert(appended[0].removed);

// A second invocation must create a NEW set of flying fragments; no stale
// active state may swallow the second collapse after returning to INDEX.
const firstNumberOfLayers=appended.length;
const beforeSecondJobs=jobs.length;
collapse.run({site,scene,reduceMotion:false,onReturn:function(){returned++;}});
assert.equal(appended.length,firstNumberOfLayers+1,'Re-entry needs fresh fragments');
assert(site.classList.contains('tg-detached'),'Second run needs a fresh detached scene');
const secondJobs=jobs.slice(beforeSecondJobs);
assert.equal(secondJobs.length,3);
secondJobs.find(job=>job.delay===2500).fn();
assert(appended.at(-1).classList.contains('tg-frozen'));
secondJobs.find(job=>job.delay===3100).fn();
assert(appended.at(-1).classList.contains('tg-dropping'));
secondJobs.find(job=>job.delay===6500).fn();
assert.equal(returned,2,'The second collapse must also return home');
collapse.clear();
assert(appended.at(-1).removed);
assert(!site.classList.contains('tg-detached'));

// Even if precise word extraction is unsupported in a particular browser,
// the emergency path must still fragment the scene and return normally.
const originalQuery=site.querySelectorAll;
site.querySelectorAll=function(selector){
  if(selector.includes('#miniGameHost'))throw new Error('Simulated DOM range failure');
  return originalQuery(selector);
};
const fallbackStart=appended.length;
collapse.run({site,scene,reduceMotion:false,onReturn:function(){returned++;}});
assert.equal(appended.length,fallbackStart+1,'Fallback must still create fragments');
assert(appended.at(-1).children.some(el=>el.classList.contains('tg-flight-piece')));
assert(site.classList.contains('tg-detached'));
collapse.clear();
site.querySelectorAll=originalQuery;

assert(css.includes('.tg-debris-layer.tg-frozen .tg-flight-piece'));
assert(css.includes('.tg-debris-layer.tg-dropping .tg-flight-piece'));
assert(css.includes('@keyframes tg-flight-crash'));
assert(css.includes('@media(prefers-reduced-motion:reduce)'));
assert(index.includes('collapse.js?v=20')&&index.includes('collapse.css?v=20'));

console.log('Independent flying words, sudden freeze, separate top-down collapse, and cleanup passed.');
