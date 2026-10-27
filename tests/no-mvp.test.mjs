import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const source=readFileSync('public/app.js','utf8');
test('collective card is distinct from a pending or awarded MVP',()=>{
 const ctx={awardFace:name=>name?'<img data-player="'+name+'">':''};vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf(' function noMvp('),source.indexOf(' function renderLatest(')),ctx);
 const collective={mvp:null},winner={mvp:'Raul Bautista-Payan'};
 assert.equal(ctx.mvpName(collective),'Esfuerzo colectivo');assert.match(ctx.mvpFace(collective),/crest.webp/);assert.match(ctx.mvpNote(collective),/Sin MVP en este partido/);
 assert.equal(ctx.mvpName(winner),'Raul Bautista-Payan');assert.match(ctx.mvpFace(winner),/data-player="Raul Bautista-Payan"/);assert.equal(ctx.mvpNote(winner),'');
 assert.equal(ctx.noMvp({}),false);assert.equal(ctx.mvpName({}),'Por confirmar');
});
