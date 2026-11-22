// v0.22: a fresh page MUST be a first attempt, regardless of previously
// saved flags. Repeat mode exists only after five is destroyed on this page.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('  function clearLegacyFiveBreakRecord() {');
const end=html.indexOf('  function recordReverseStep(mark) {',start);
assert(start>0&&end>start,'Session-scoped five-break helpers must exist');
const helpers=html.slice(start,end);

function createWorld({local=false,session=false,cookie=false,history=false,url=false,
                      denyLocal=false,denySession=false,denyCookie=false}={}){
  let address='https://yoshisuke1111-svg.github.io/three-gates/?v=022'+(url?'&tg5=1':'');
  const localMap=new Map(local?[['three_gates_five_destroyed','yes']]:[]);
  const sessionMap=new Map(session?[['three_gates_five_destroyed','yes']]:[]);
  let cookieValue=cookie?'tg_three_gates_five=1':'';
  const operations={localWrites:0,sessionWrites:0};
  const document={
    get cookie(){if(denyCookie)throw new Error('cookies blocked');return cookieValue;},
    set cookie(value){
      if(denyCookie)throw new Error('cookies blocked');
      if(value.includes('Max-Age=0'))cookieValue='';
      else cookieValue=value;
    }
  };
  const localStorage={
    removeItem(key){if(denyLocal)throw new Error('localStorage blocked');localMap.delete(key);},
    getItem(key){if(denyLocal)throw new Error('localStorage blocked');return localMap.get(key)||null;},
    setItem(key,value){operations.localWrites++;localMap.set(key,value);}
  };
  const sessionStorage={
    removeItem(key){if(denySession)throw new Error('sessionStorage blocked');sessionMap.delete(key);},
    getItem(key){if(denySession)throw new Error('sessionStorage blocked');return sessionMap.get(key)||null;},
    setItem(key,value){operations.sessionWrites++;sessionMap.set(key,value);}
  };
  const location={get href(){return address;}};
  const navigation={
    state:history?{threeGatesFiveDestroyed:true,unrelated:'keep'}:null,
    replaceState(state,title,newAddress){
      this.state=state;
      address=new URL(newAddress,address).href;
    }
  };
  const context=vm.createContext({
    localStorage,sessionStorage,document,window:{location,history:navigation},
    URL,Set,console
  });
  vm.runInContext('let fiveWasDestroyed=false;\n'+helpers,context);
  return {
    context,localMap,sessionMap,document,navigation,operations,
    get url(){return address;},
    read:()=>vm.runInContext('hasFiveBreakRecord()',context),
    remember:()=>vm.runInContext('rememberFiveBreak()',context),
    reload:()=>vm.runInContext('fiveWasDestroyed=false;clearLegacyFiveBreakRecord();',context)
  };
}

assert.equal(createWorld().read(),false,
  'New visitors always start from full HP and the 30-tap secret');
for(const [name,settings] of Object.entries({
  localStorage:{local:true},
  sessionStorage:{session:true},
  cookie:{cookie:true},
  historyState:{history:true},
  urlOnly:{url:true},
  allSources:{local:true,session:true,cookie:true,history:true,url:true},
  allBlocked:{local:true,session:true,cookie:true,history:true,url:true,
              denyLocal:true,denySession:true,denyCookie:true}
})){
  const world=createWorld(settings);
  assert.equal(world.read(),false,'An old '+name+' must NOT trigger repeat mode');
  if(!settings.denyLocal)assert(!world.localMap.has('three_gates_five_destroyed'),
    'Old localStorage record must be cleared');
  if(!settings.denySession)assert(!world.sessionMap.has('three_gates_five_destroyed'),
    'Old sessionStorage record must be cleared');
  assert(!world.url.includes('tg5='),
    'The old URL repeat flag must be removed even with blocked storage');
  if(settings.history)assert.equal(world.navigation.state.threeGatesFiveDestroyed,undefined);
  if(settings.history)assert.equal(world.navigation.state.unrelated,'keep');
  assert(world.url.includes('v=022'),'Cache-busting query should remain intact');
  world.remember();
  assert.equal(world.read(),true,'Once five breaks, repeat mode is active on this page');
  assert.equal(world.operations.localWrites,0,'A five break must not write localStorage');
  assert.equal(world.operations.sessionWrites,0,'A five break must not write sessionStorage');
  world.reload();
  assert.equal(world.read(),false,'Reload must restart the original first attempt');
}

assert(!html.includes('fiveWasDestroyed = hasFiveBreakRecord();'),
       'Historical attempts must not be restored');
assert(html.includes('clearLegacyFiveBreakRecord();'));
assert(html.includes('{instantFiveBreak:hasFiveBreakRecord()}'),
       'Opening a stage checks current page history only');
const guardStart=html.indexOf('  function triggerBoxCollapse() {');
const guardEnd=html.indexOf('  async function transition(render) {',guardStart);
assert(guardStart>0&&guardEnd>guardStart);
const callback=html.slice(guardStart,guardEnd);
assert(callback.indexOf('rememberFiveBreak();')<callback.indexOf('if(sceneView.hidden)return;'),
       'The five must be recorded before a scene-visibility guard');
const hidden=vm.runInNewContext([
  'let sceneView={hidden:true},remembered=0,started=0;',
  'function rememberFiveBreak(){remembered++;}',
  'let window={ThreeGatesCollapse:{run:function(){started++;}}};',
  'let document={querySelector:function(){return {};}};',
  'let reduceMotion=false;',
  'function goHome(){}',
  callback,
  'triggerBoxCollapse();',
  '({remembered,started});'
].join('\n'));
assert.equal(hidden.remembered,1);
assert.equal(hidden.started,0);

console.log('Fresh page always starts at 30 taps/HP300; only same-page repeat is 10 taps/HP1.');
