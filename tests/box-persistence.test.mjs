// v0.21: a previously shattered five must NOT become a first attempt
// because another save is corrupted or because browser storage is disabled.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('  function hasFiveBreakRecord() {');
const end=html.indexOf('  function recordReverseStep(mark) {',start);
assert(start>0&&end>start,'Sticky five persistence helpers are required');
const helpers=html.slice(start,end);

function createWorld({local=false,session=false,cookie=false,history=false,url=false,
                      denyLocal=false,denySession=false,denyCookie=false}={}){
  let address='https://yoshisuke1111-svg.github.io/three-gates/?v=021'+(url?'&tg5=1':'');
  const localMap=new Map(local?[['three_gates_five_destroyed','yes']]:[]);
  const sessionMap=new Map(session?[['three_gates_five_destroyed','yes']]:[]);
  let cookieValue=cookie?'tg_three_gates_five=1':'';
  const document={
    get cookie(){if(denyCookie)throw new Error('cookies blocked');return cookieValue;},
    set cookie(value){
      if(denyCookie)throw new Error('cookies blocked');
      const entry=value.split(';')[0];
      cookieValue=cookieValue?cookieValue+'; '+entry:entry;
    }
  };
  const localStorage={
    getItem(key){if(denyLocal)throw new Error('localStorage blocked');return localMap.get(key)||null;},
    setItem(key,value){if(denyLocal)throw new Error('localStorage blocked');localMap.set(key,value);}
  };
  const sessionStorage={
    getItem(key){if(denySession)throw new Error('sessionStorage blocked');return sessionMap.get(key)||null;},
    setItem(key,value){if(denySession)throw new Error('sessionStorage blocked');sessionMap.set(key,value);}
  };
  const location={get href(){return address;}};
  const navigation={
    state:history?{threeGatesFiveDestroyed:true}:null,
    replaceState(state,title,newAddress){
      this.state=state;
      address=new URL(newAddress,address).href;
    }
  };
  const context=vm.createContext({
    localStorage,sessionStorage,document,window:{location,history:navigation},
    URL,Set,console
  });
  vm.runInContext('var fiveWasDestroyed=false;\n'+helpers,context);
  return {context,localMap,sessionMap,document,history:navigation,
    get url(){return address;},
    read:()=>vm.runInContext('hasFiveBreakRecord()',context),
    resetMemory:()=>vm.runInContext('fiveWasDestroyed=false;',context),
    remember:()=>vm.runInContext('rememberFiveBreak()',context)
  };
}

assert.equal(createWorld().read(),false,'New visitors must still get the normal 30-tap first run');
for(const [name,settings] of Object.entries({
  localStorage:{local:true},
  sessionStorage:{denyLocal:true,session:true},
  cookie:{denyLocal:true,denySession:true,cookie:true},
  historyState:{denyLocal:true,denySession:true,denyCookie:true,history:true},
  urlOnly:{denyLocal:true,denySession:true,denyCookie:true,url:true}
})){
  const world=createWorld(settings);
  assert.equal(world.read(),true,'Remember prior destruction using '+name);
  world.resetMemory();
  assert.equal(world.read(),true,'No regression to first attempt using '+name);
}

// Even if all persistent storage APIs fail, the URL is an independent,
// reload-stable fallback once the five is destroyed.
const blocked=createWorld({denyLocal:true,denySession:true,denyCookie:true});
assert.equal(blocked.read(),false);
blocked.remember();
assert.equal(blocked.read(),true);
assert(blocked.url.includes('v=021'),'Existing build/cache version must be preserved');
assert(blocked.url.includes('tg5=1'),'The URL must retain the already-broken flag');
assert.equal(blocked.history.state.threeGatesFiveDestroyed,true);
blocked.resetMemory();
assert.equal(blocked.read(),true,'The URL marker must be recognized after reload');

// A normal browser writes multiple independent records. Clearing any one
// must not roll back the game.
const regular=createWorld();
regular.remember();
assert.equal(regular.localMap.get('three_gates_five_destroyed'),'yes');
assert.equal(regular.sessionMap.get('three_gates_five_destroyed'),'yes');
assert(regular.document.cookie.includes('tg_three_gates_five=1'));
regular.localMap.clear();
regular.resetMemory();
assert.equal(regular.read(),true,'Session or cookie rescues cleared localStorage');

// One unrelated getItem error must not prevent the destruction flag from
// loading. All game saves used to share a single vulnerable try block.
assert(!html.includes("fiveWasDestroyed = localStorage.getItem('three_gates_five_destroyed')"),
       'Five state must not be loaded in the unrelated-save try block');
assert(html.includes('fiveWasDestroyed = hasFiveBreakRecord();'));

// It is essential to save even when a scene-visibility guard prevents
// the visual callback from running, for example during a fast transition.
const cbStart=html.indexOf('  function triggerBoxCollapse() {');
const cbEnd=html.indexOf('  async function transition(render) {',cbStart);
assert(cbStart>0&&cbEnd>cbStart);
const beforeGuard=html.slice(cbStart,cbEnd);
assert(beforeGuard.indexOf('rememberFiveBreak();') <
       beforeGuard.indexOf('if(sceneView.hidden)return;'),
       'Recording destruction must always happen BEFORE visual early return');

const hiddenScene=vm.runInNewContext([
  'var sceneView={hidden:true},remembered=0,started=0;',
  'function rememberFiveBreak(){remembered++;}',
  'var window={ThreeGatesCollapse:{run:function(){started++;}}};',
  'var document={querySelector:function(){return {};}};',
  'var reduceMotion=false;',
  'function goHome(){}',
  beforeGuard,
  'triggerBoxCollapse();',
  '({remembered,started});'
].join('\n'));
assert.equal(hiddenScene.remembered,1,
  'Even a temporarily hidden scene must remember a destroyed five');
assert.equal(hiddenScene.started,0,
  'A hidden scene must not restart the visual animation');
assert(html.includes('{instantFiveBreak:hasFiveBreakRecord()}'),
  'Each new entry must reload the most durable destruction record');

console.log('Five history stays sticky across local/session/cookie/history/URL, blocked storage and scene transitions.');
