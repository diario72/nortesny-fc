import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const extract=(name,next)=>source.slice(source.indexOf(' function '+name+'('),source.indexOf(next,source.indexOf(' function '+name+'(')+1));
test('every statistics redraw loads transparent portraits before making them visible',async()=>{
 let current=[],decodeFinish;
 const people=[[3,'Leo Urbani'],[16,'Raul Bautista-Payan']];
 const context={NFC:{players:()=>people},portraits:{3:'/leo.webp',16:'/raul.webp'},portraitCutouts:new Map(),cutoutPortrait:async()=> 'data:image/png;base64,transparent',document:{querySelectorAll:()=>current.filter(img=>img.attributes['data-portrait-src'])},renderStatsContent(){current=people.map(p=>{const markup=context.awardFace(p[1]);assert.ok(!/\ssrc=/.test(markup),'original white-background source must never be rendered');const attributes={'data-portrait-src':markup.match(/data-portrait-src="([^"]+)"/)[1]};const classes=new Set(['cutout-pending']);return{attributes,classes,isConnected:true,getAttribute:k=>attributes[k],removeAttribute:k=>delete attributes[k],classList:{remove:k=>classes.delete(k)},decode:()=>new Promise(resolve=>{decodeFinish.push(resolve);})};});}};
 vm.createContext(context);
 vm.runInContext(extract('refreshAwardPortraits',' function awardFace'),context);
 vm.runInContext(extract('awardFace',' function '),context);
 vm.runInContext(extract('renderStats'," document.querySelectorAll('[data-metric]')"),context);
 for(let tab=0;tab<4;tab++){
  decodeFinish=[];context.renderStats();const images=current;
  await new Promise(resolve=>setImmediate(resolve));
  for(const img of images){assert.match(img.src,/^data:image\/png/);assert.ok(img.classes.has('cutout-pending'),'stay hidden until decoded');}
  decodeFinish.forEach(resolve=>resolve());await new Promise(resolve=>setImmediate(resolve));
  for(const img of images)assert.ok(!img.classes.has('cutout-pending'),'show only decoded transparent portrait');
 }
});

test('portrait matte removes pale hair fringes while keeping white kit details',()=>{
 const context={Uint8Array};vm.createContext(context);vm.runInContext(extract('portraitMatte',' function cutoutPortrait'),context);
 const w=13,h=13,d=new Uint8ClampedArray(w*h*4).fill(255);
 const pixel=(x,y,r,g,b)=>d.set([r,g,b,255],(y*w+x)*4);
 for(let y=2;y<=10;y++)for(let x=2;x<=10;x++)pixel(x,y,225,225,225);
 for(let y=3;y<=9;y++)for(let x=3;x<=9;x++)pixel(x,y,20,35,75);
 pixel(6,7,255,255,255);context.portraitMatte(d,w,h);
 assert.equal(d[(2*w+6)*4+3],0,'pale top fringe is transparent');
 assert.equal(d[(3*w+6)*4+3],0,'mixed outer hair edge is contracted');
 assert.equal(d[(6*w+6)*4+3],255,'subject remains opaque');
 assert.equal(d[(7*w+6)*4+3],255,'internal white jersey line remains visible');
 assert.equal(d[3],0,'outside white background is transparent');
});
