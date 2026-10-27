import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root='./';const recovery=fs.readFileSync('premium-history.js','utf8').replace("import confirmed from './premium-history.json';",'const confirmed='+fs.readFileSync('premium-history.json','utf8')+';').replace('export function','function');const source=fs.readFileSync(root+'worker.js','utf8').replace("import {recoverPremiumHistory} from './premium-history.js';",recovery).replace("import initial from './initial.json';",'const initial='+fs.readFileSync(root+'initial.json','utf8')+';');const {default:worker,LoginGuard,migrate,playersFor}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const objects=new Map();const namespace={idFromName:name=>name,get(name){if(!objects.has(name)){const map=new Map();let queue=Promise.resolve();const storage={async get(k){return structuredClone(map.get(k))},async put(k,v){map.set(k,structuredClone(v))},async delete(k){map.delete(k)},async setAlarm(t){this.alarmTime=t},async deleteAlarm(){this.alarmTime=null},transaction(fn){const task=queue.then(()=>fn(this));queue=task.catch(()=>{});return task}};objects.set(name,new LoginGuard({storage}));}return objects.get(name)}};
const kv=new Map();const env={ADMIN_USERNAME:'root',ADMIN_PASSWORD:'test-password',LOGIN_GUARD:namespace,DATA:{async get(k){return kv.has(k)?JSON.parse(kv.get(k)):null},async put(k,v){kv.set(k,v)}},ASSETS:{async fetch(req){const file=new URL(req.url).pathname.slice(1);return new Response(fs.readFileSync(root+'public/'+file,'utf8'))}}};
const request=async(path,{body,user='root',password='test-password',origin='https://test.local',ip='203.0.113.22',headers={}}={})=>{const req=new Request('https://test.local'+path,{method:body?'POST':'GET',headers:{Origin:origin,'CF-Connecting-IP':ip,'X-Admin-User':user,Authorization:'Bearer '+password,'Content-Type':'application/json','User-Agent':'Mozilla/5.0 (iPhone) AppleWebKit Safari/604.1',...headers},...(body?{body:JSON.stringify(body)}:{})});Object.defineProperty(req,'cf',{value:{country:'US'}});return worker.fetch(req,env)};
assert.equal((await request('/visit-event',{body:{consent:false,event:'web'}})).status,400);assert.equal((await request('/visit-event',{origin:'https://other.local',body:{consent:true,event:'web'}})).status,403);
assert.equal((await request('/visit-event',{body:{consent:true,event:'web'}})).status,200);await request('/visit-event',{body:{consent:true,event:'web'}});
let response=await request('/api/visits');let data=await response.json();assert.equal(data.records.length,1);assert.equal(data.records[0].ip,'203.0.113.22');assert.equal(data.records[0].country,'US');assert.equal(data.records[0].browser,'Safari');assert.equal(data.records[0].device,'Móvil');assert.equal(data.retentionDays,7);
await request('/visit-event',{body:{consent:true,event:'app'}});await request('/visit-event',{body:{consent:true,event:'installed'}});data=await (await request('/api/visits')).json();assert.equal(data.records.length,3);
assert.equal((await request('/api/visits',{password:'wrong',ip:'203.0.113.44'})).status,401);
await request('/api/users',{body:{username:'editor1',password:'LongPassword123!',role:'editor'}});assert.equal((await request('/api/visits',{user:'editor1',password:'LongPassword123!',ip:'203.0.113.55'})).status,403);
const store=objects.get('private-visits-v1');assert(store.state.storage.alarmTime>Date.now());const originalNow=Date.now;Date.now=()=>originalNow()+7*24*60*60*1000+1000;await store.alarm();assert.equal((await (await request('/api/visits')).json()).records.length,0);assert.equal(store.state.storage.alarmTime,null);Date.now=originalNow;
await request('/visit-event',{body:{consent:true,event:'web'}});await request('/api/visits',{body:{action:'clear'}});assert.equal((await (await request('/api/visits')).json()).records.length,0);
for(const name of ['admin.html','template.html'])for(const m of fs.readFileSync(root+'public/'+name,'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const publicHTML=await (await request('/')).text();assert(!publicHTML.includes('Continuar sin registro'));assert(!publicHTML.includes('203.0.113.22'));assert(!publicHTML.includes('visit-privacy'));assert(publicHTML.includes('/club-store.js'));assert(!publicHTML.includes('preview-store'));assert(publicHTML.includes('Publicaciones de Instagram'));assert(!publicHTML.includes('Panel de prueba'));assert(publicHTML.includes('Noticias'));
console.log('OK: consent required, origin validation, server IP/client parsing, deduplication, app events, authenticated admin only, automatic expiry and manual clear, public UI without consent prompt or exposed IPs, UI syntax.');

await Promise.all(Array.from({length:20},()=>request('/visit-event',{body:{consent:true,event:'web'},ip:'198.51.100.1'})));assert.equal((await (await request('/api/visits')).json()).records.length,1);
for(let i=0;i<1005;i++)await store.fetch(new Request('https://guard/visits',{method:'POST',body:JSON.stringify({action:'record',record:{ip:'2001:db8:'+i,event:'web',country:'US',browser:'Chrome',device:'Ordenador / otro'}})}));let retained=await (await store.fetch(new Request('https://guard/visits',{method:'POST',body:JSON.stringify({action:'list'})}))).json();assert.equal(retained.records.length,1000);for(const key of ['visits-a','visits-b'])assert(Buffer.byteLength(JSON.stringify(await store.state.storage.get(key)))<128*1024);console.log('OK: concurrent duplicate requests and 1,000-record cap within storage value limits.');

// The public design reads the exact season edited by the authenticated administrator.
const fixture=JSON.parse(fs.readFileSync('tests/season-fixture.json','utf8'));
const totalBefore=playersFor(fixture);
const missing=structuredClone(fixture);
for(const round of [1,2,3]){for(const p of missing.base){const a=missing.entries[round].players[p[0]]||[0,0];p[2]+=a[0];p[3]+=a[1];}delete missing.entries[round];}
assert.deepEqual(playersFor(migrate(missing)),totalBefore);
assert.deepEqual(playersFor(migrate(missing)),totalBefore,'migration is idempotent');
assert.equal(missing.entries[1].penaltyGoals[3],1);
assert.equal(missing.entries[3].penaltyGoals[16],1);
kv.set('season',JSON.stringify(missing));
let season=await (await request('/api/season')).json();
assert.deepEqual((await (await request('/club-data.json',{password:'',user:''})).json()).season.base,season.base);
assert(!JSON.stringify(await (await request('/club-data.json')).json()).includes('sessionRole'));
response=await request('/api/upcoming',{body:{round:6,opponent:'BestPro FC',date:'2026-10-18',time:'09:00',venue:'4410 McKinley Ave',version:season.version}});assert.equal(response.status,200);season=await response.json();
assert.equal((await (await request('/club-data.json')).json()).season.upcoming.opponent,'BestPro FC');
const ledger=Object.fromEntries(season.base.map(p=>[p[0],[0,0]]));ledger[19]=[1,0];
response=await request('/api/match',{body:{round:6,opponent:'BestPro FC',gf:2,ga:1,mvp:'Dario Zonobian',ownGoalsFor:1,ownGoalsAgainst:0,players:ledger,version:season.version}});assert.equal(response.status,200);season=await response.json();
const publicSeason=(await (await request('/club-data.json')).json()).season;
assert.equal(publicSeason.upcoming,null);assert.equal(publicSeason.matches.length,6);assert.equal(playersFor(publicSeason).find(p=>p[0]===19)[2],4);
// Explicit no-MVP survives saving, public delivery, reloading and reassignment.
const noAward={round:6,opponent:'BestPro FC',gf:2,ga:1,mvp:null,ownGoalsFor:1,ownGoalsAgainst:0,players:ledger,version:season.version};
response=await request('/api/match',{body:noAward});assert.equal(response.status,200);season=await response.json();
assert.equal(season.matches.find(g=>g.round===6).mvp,null);
assert.equal((await (await request('/club-data.json')).json()).season.matches.find(g=>g.round===6).mvp,null);
assert.deepEqual(playersFor(season),playersFor(publicSeason),'no-MVP does not change goals or assists');
for(const bad of ['',undefined,'none','Invented Player']){const body={...noAward,mvp:bad,version:season.version};assert.equal((await request('/api/match',{body})).status,400,'unselected and invalid MVPs must still fail');}
response=await request('/api/match',{body:{...noAward,mvp:'Dario Zonobian',version:season.version}});assert.equal(response.status,200);season=await response.json();assert.equal(season.matches.find(g=>g.round===6).mvp,'Dario Zonobian');
response=await request('/api/delete-match',{body:{round:6,version:season.version}});assert.equal(response.status,200);
assert.equal((await (await request('/club-data.json')).json()).season.matches.length,5);
for(let i=0;i<4;i++)assert.equal((await request('/api/season',{password:'bad',ip:'203.0.113.99'})).status,401);
assert.equal((await request('/api/season',{password:'bad',ip:'203.0.113.99'})).status,429);
assert.equal((await request('/api/season',{ip:'203.0.113.99'})).status,429);
assert.equal((await request('/api/season')).status,200);
for(const name of ['app.js','club-store.js'])new vm.Script(fs.readFileSync('public/'+name,'utf8'));
assert(!fs.readFileSync('public/club-store.js','utf8').includes('localStorage'));
console.log('OK: historical ledgers preserve all totals, penalties, live public/admin sync, upcoming/result/own goals/deletion, private fields excluded, five-attempt lockout.');

for(const base of ['http://nortesny.com','http://www.nortesny.com','https://www.nortesny.com']){const r=await worker.fetch(new Request(base+'/admin.html?from=domain'),env);assert.equal(r.status,308);assert.equal(r.headers.get('Location'),'https://nortesny.com/admin.html?from=domain');}
const domainHTML=await worker.fetch(new Request('https://nortesny.com/'),env);assert.equal(domainHTML.status,200);assert((await domainHTML.text()).includes('https://nortesny.com/'));
console.log('OK: custom domain shares the existing Worker; HTTPS and www redirects preserve paths and queries.');
