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
