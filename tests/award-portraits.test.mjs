import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const players=[[16,'Raul Bautista-Payan'],[9,'Raul Bautista'],[3,'Leo Urbani'],[2,'Mainor Escobar'],[7,'Alberto Payan']];
function boot(){const context={NFC:{players:()=>players},esc:String};vm.createContext(context);vm.runInContext(source.match(/ const portraits=.+/)[0]+source.slice(source.indexOf(' function portraitPlayer('),source.indexOf(' const honourMark=')),context);return context;}
test('each MVP gets their own transparent PNG without confusing the two Rauls',()=>{
 const app=boot();
 for(const [name,asset] of [['Raul Bautista-Payan','raul-bp'],['Raul Bautista','raul'],['Leo Urbani','leo'],['Mainor Escobar','mainor'],['Alberto Payan','alberto']]){
  const markup=app.awardFace(name);assert.ok(markup.includes('/assets/player-'+asset+'-transparent.png'));assert.ok(!markup.includes('cutout-pending'));assert.ok(!markup.includes('data-portrait-src'));
 }
 assert.equal(app.portraitPlayer('Raúl Bautista‑Payan')[0],16);
 assert.equal(app.awardFace('Unknown player'),'');
});
test('all 18 current portraits are standalone RGBA PNG files',()=>{
 const paths=[...source.match(/ const portraits=.+/)[0].matchAll(/'([^']+\.png)'/g)].map(m=>m[1]);assert.equal(paths.length,18);
 for(const path of paths){const bytes=readFileSync(new URL('../public'+path,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG',path);assert.equal(bytes[25],6,'RGBA required: '+path);const thumb=readFileSync(new URL('../public'+path.replace('.png','-thumb.png'),import.meta.url));assert.equal(thumb[25],6,'Transparent thumbnail required: '+path);}
 assert.ok(!source.includes('function cutoutPortrait('),'browser must use saved PNGs directly');
});
