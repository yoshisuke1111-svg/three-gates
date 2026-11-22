// The catastrophic ending must drop frame pieces, controls, and each
// individual tile separately, not animate the whole page as one object.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('collapse.js','utf8');
const css=fs.readFileSync('collapse.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const scheduled=[];
const cloned=[];
const appended=[];
let returned=0;

function fakeElement(name,top=0,left=0,width=200,height=60){
  const classes=new Set(name.split(' '));
  const el={
    id:name,hidden:false,className:name,children:[],removed:false,
    style:{setProperty:function(k,v){this[k]=v;}},
    classList:{
      add:function(...tokens){tokens.forEach(t=>classes.add(t));},
      remove:function(...tokens){tokens.forEach(t=>classes.delete(t));},
      contains:function(t){return classes.has(t);}
    },
    getBoundingClientRect:function(){return {top,left,width,height,bottom:top+height};},
    querySelectorAll:function(){return [];},
    querySelector:function(){return null;},
    closest:function(){return null;},
    removeAttribute:function(k){delete this[k];},
    setAttribute:function(){},
    appendChild:function(child){this.children.push(child);},
    remove:function(){this.removed=true;},
    cloneNode:function(deep){
      cloned.push({name,deep});
      return fakeElement(name,top,left,width,height);
    }
  };
  return el;
}
const site=fakeElement('site');
const scene={inert:false};
const masthead=fakeElement('masthead',10,20,350,30);
const title=fakeElement('scene-title',85,40,250,50);
const frame=fakeElement('mg-host',170,30,400,480);
const board=fakeElement('mg-board',235,80,300,375);
const tile1=fakeElement('mg-piece',260,95,60,60);
const tile2=fakeElement('mg-piece',440,240,110,105);
const note=fakeElement('scene-footnote',680,40,280,40);
site.querySelectorAll=function(){return [masthead,title,frame,board,tile1,tile2,note];};
const context=vm.createContext({
  window:{
    innerHeight:800,
    getComputedStyle:function(){
      return {
        padding:'0px',color:'#ddd',background:'rgb(20,20,30)',
        border:'2px solid #555',borderRadius:'4px',boxShadow:'none',
        font:'16px serif',letterSpacing:'1px',lineHeight:'normal',
        textAlign:'left',textShadow:'none',whiteSpace:'normal'
      };
    }
  },
  document:{
    createElement:function(tag){return fakeElement(tag);},
    body:{appendChild:function(el){appended.push(el);}}
  },
  setTimeout:function(fn,delay){
    const job={fn,delay,id:scheduled.length+1};
    scheduled.push(job);return job.id;
  },
  clearTimeout:function(){},
  console
});
vm.runInContext(source,context);
const collapse=context.window.ThreeGatesCollapse;
assert(collapse && collapse.run && collapse.clear);
collapse.run({site,scene,reduceMotion:false,onReturn:function(){returned++;}});
assert(site.classList.contains('tg-corrupted'),'Corruption begins first');
assert.equal(scene.inert,true,'Players cannot interact while the world breaks');
assert(scheduled.some(s=>s.delay===1900),'Individual fall starts after distortion');
assert(scheduled.some(s=>s.delay===4900),'The game must return afterward');

scheduled.find(s=>s.delay===1900).fn();
assert(site.classList.contains('tg-falling'));
assert.equal(appended.length,1,'One independent-debris overlay should exist');
const fragments=appended[0].children;
assert.equal(fragments.filter(x=>x.className==='tg-debris-background').length,9,
             'Background must break into nine separate strips');
const falling=fragments.filter(x=>x.classList.contains('tg-debris-piece'));
assert.equal(falling.length,7,'Every top-level part and both tiles fall independently');
assert.equal(cloned.filter(c=>c.name==='mg-piece'&&c.deep).length,2,
             'Both numbered tiles must be separately copied');
assert(cloned.some(c=>c.name==='mg-board'&&!c.deep),
       'Board frame must be separate from its tiles');
assert(cloned.some(c=>c.name==='mg-host'&&!c.deep),
       'The outer frame must not take its children down together');
const tileDrops=falling.filter(x=>x.classList.contains('mg-piece'));
assert.equal(tileDrops.length,2);
assert.notEqual(tileDrops[0].style['--fall-delay'],tileDrops[1].style['--fall-delay'],
                'Tiles need different departure times');
const fallDelays=falling.map(x=>Number.parseInt(x.style['--fall-delay'],10));
assert(fallDelays.every((v,i)=>i===0||v>=fallDelays[i-1]-132),
       'Falling should generally proceed from higher screen positions to lower ones');

scheduled.find(s=>s.delay===4900).fn();
assert.equal(returned,1,'The forced return happens once');
collapse.clear();
assert.equal(scene.inert,false,'Input unlocks after returning home');
assert(!site.classList.contains('tg-corrupted'));
assert(!site.classList.contains('tg-falling'));
assert(appended[0].removed,'Temporary debris must be removed');

assert(css.includes('.site.tg-falling{visibility:hidden!important}'),
       'The original page must not fall as a single container');
assert(css.includes('@media(prefers-reduced-motion:reduce)'));
assert(index.includes('collapse.js?v=18')&&index.includes('collapse.css?v=18'));
console.log('Separate frame, tile, button-ready fragment paths, falling delays and cleanup passed.');
