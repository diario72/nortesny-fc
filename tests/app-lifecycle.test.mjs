import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const app=fs.readFileSync('public/app.js','utf8');
const opening=app.slice(app.indexOf(' let introTimer'),app.indexOf(" addEventListener('beforeinstallprompt'"));
function boot(reduced=false){
 const classes=()=>{const set=new Set();return {add(...v){v.forEach(x=>set.add(x));},remove(...v){v.forEach(x=>set.delete(x));},contains:x=>set.has(x)};};
 const node=()=>({classList:classes(),setAttribute(){},focus(){},inert:false,offsetWidth:1});
 const nodes=Object.fromEntries(['intro','skip-intro','replay-intro'].map(id=>[id,node()]));
 const content=[node(),node(),node()],events={},timers=new Map();let next=0;
 const document={hidden:false,body:node(),querySelectorAll:()=>content};
 const context={$:id=>nodes[id],document,reduced,scrollTo(){},addEventListener(name,fn){(events[name]??=[]).push(fn);},setTimeout(fn,ms){const id=++next;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(opening,context);
 return {nodes,document,content,timers,event(name,value={}){for(const fn of events[name]||[])fn(value);},run(ms){const [id,t]=[...timers].find(([,t])=>t.ms===ms)||[];assert(t,'Expected timer '+ms);timers.delete(id);t.fn();}};
}
function unlocked(app){assert(app.nodes.intro.classList.contains('dismissed'));assert(app.content.every(el=>!el.inert));assert(!app.document.body.classList.contains('intro-active'));assert(!app.document.body.classList.contains('page-arriving'));}
test('intro hands off and never traps an app restored from the background',()=>{
 const app=boot();assert(app.content.every(el=>el.inert));app.run(4000);assert(app.nodes.intro.classList.contains('is-leaving'));app.run(700);unlocked(app);
 for(const event of ['pagehide','visibilitychange','pageshow']){app.nodes['replay-intro'].onclick();if(event==='visibilitychange')app.document.hidden=true;app.event(event,{persisted:true});unlocked(app);assert.equal(app.timers.size,0);}
});
test('skip, stale replay timers and reduced motion remain safe',()=>{
 const app=boot();app.run(4000);const stale=[...app.timers.values()][0].fn;app.nodes['replay-intro'].onclick();stale();assert(!app.nodes.intro.classList.contains('dismissed'));app.nodes['skip-intro'].onclick();unlocked(app);
 const reduced=boot(true);reduced.run(1600);unlocked(reduced);
});
