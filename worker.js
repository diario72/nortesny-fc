import initial from './initial.json';
import {recoverPremiumHistory} from './premium-history.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=o=>JSON.stringify(o).replaceAll('<','\\u003c');
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export function migrate(d){if(!d.instagramNewsSeed){d.news=d.news||[];if(!d.news.some(n=>n.id==='instagram-DeKlGG2Syuq'))d.news.push({id:'instagram-DeKlGG2Syuq',title:'Publicación oficial de Nortesny FC',content:'Consulta nuestra publicación en Instagram.',date:'',instagram:'https://www.instagram.com/p/DeKlGG2Syuq/'});d.instagramNewsSeed=1;}if(!d.officialNewsVersion){const n=(d.news||[]).find(n=>n.id==='instagram-DeKlGG2Syuq');if(n&&n.title==='Publicación oficial de Nortesny FC'){n.title='Comunicado oficial';n.content="Nortesny FC expresa su firme rechazo a los hechos ocurridos el domingo 4 de octubre de 2026 durante el encuentro frente a Bayern, correspondiente a Tricolor Soccer League.\n\nEl club dispone de grabaciones de los dos incidentes que denuncia: una agresión iniciada por el portero de Bayern contra nuestro jugador Dario Zonobian, dorsal 19, y un posterior lanzamiento del balón a la cara de nuestro capitán, Raúl, por parte del mismo portero.\n\nNortesny FC pone ambas grabaciones a disposición de la organización de Tricolor Soccer League y solicita que los hechos sean revisados con rigor e imparcialidad, así como la adopción de las medidas disciplinarias que correspondan conforme al reglamento.\n\nEl club manifiesta su apoyo a los jugadores afectados y reafirma su compromiso con el respeto, el juego limpio y la seguridad de todos los participantes. La violencia no tiene cabida en nuestro deporte.\n\nNortesny FC\n6 de octubre de 2026";n.date='2026-10-06';n.presentation='official';delete n.instagram;}d.officialNewsVersion=1;}if(!d.historicalSchema){const counts=Object.fromEntries(d.base.map(p=>[p[0],[0,0]]));counts[19]=[2,0];counts[2]=[2,1];counts[3]=[0,1];counts[7]=[0,1];for(const p of d.base){p[2]-=counts[p[0]][0];p[3]-=counts[p[0]][1]}d.entries[4]={players:counts};d.historicalSchema=1;}return recoverPremiumHistory(d);}
export function playersFor(d){let p=d.base.map(x=>[...x]);for(let x of Object.values(d.entries))for(let v of p){let a=x.players[v[0]]||[0,0];v[2]+=a[0];v[3]+=a[1]}return p}
export function validate(g,d){if(!Number.isInteger(g.round)||g.round<1||g.round>999)throw Error('Jornada válida desde la 1.');if(typeof g.opponent!=='string'||!g.opponent.trim()||g.opponent.length>80)throw Error('Introduce el rival.');if(!d.base.some(p=>p[1]===g.mvp))throw Error('Selecciona un MVP.');for(let n of [g.gf,g.ga])if(!Number.isInteger(n)||n<0||n>99)throw Error('Marcador inválido.');let goals=0,assists=0;for(let p of d.base){let a=g.players?.[p[0]];if(!Array.isArray(a)||a.length!==2||a.some(n=>!Number.isInteger(n)||n<0||n>99))throw Error('Revisa goles y asistencias.');goals+=a[0];assists+=a[1]}const ownFor=g.ownGoalsFor??0,ownAgainst=g.ownGoalsAgainst??0;if([ownFor,ownAgainst].some(n=>!Number.isInteger(n)||n<0||n>99))throw Error('Revisa los goles en propia: deben ser números entre 0 y 99.');if(goals+ownFor!==g.gf)throw Error('Los goles de jugadores más los goles en propia del rival deben coincidir con los goles de Nortesny.');if(ownAgainst>g.ga)throw Error('Los goles en propia nuestros no pueden superar los goles del rival.');if(assists>goals)throw Error('Hay más asistencias que goles.');}
const hex=bytes=>Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new Uint8Array(salt.match(/../g).map(x=>parseInt(x,16))),iterations:100000,hash:'SHA-256'},key,256));}
function same(a,b){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
async function accounts(env,body){return (await env.LOGIN_GUARD.get(env.LOGIN_GUARD.idFromName('account-store-v1')).fetch(new Request('https://guard/accounts',{method:'POST',body:JSON.stringify(body)}))).json();}
async function authorized(req,env){const username=req.headers.get('X-Admin-User')||'',value=req.headers.get('Authorization')||'',password=value.startsWith('Bearer ')?value.slice(7):'';if(username===env.ADMIN_USERNAME){const hash=async s=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));return same(await hash(password),await hash(env.ADMIN_PASSWORD))?'admin':false;}const record=await accounts(env,{action:'get',username});if(!record.salt)return false;return same(await passwordHash(password,record.salt),record.hash)?record.role:false;}

const readVisitRecords=async storage=>(await storage.get('visits-a')||[]).concat(await storage.get('visits-b')||[]);
const writeVisitRecords=async(storage,records)=>{await storage.put('visits-a',records.slice(0,500));await storage.put('visits-b',records.slice(500));};
const clearVisitRecords=async storage=>{await storage.delete('visits-a');await storage.delete('visits-b');};
const VISIT_RETENTION=7*24*60*60*1000;
const visitStore=(env,body)=>env.LOGIN_GUARD.get(env.LOGIN_GUARD.idFromName('private-visits-v1')).fetch(new Request('https://guard/visits',{method:'POST',body:JSON.stringify(body)}));
function clientInfo(ua){return {device:/iPad|Tablet/i.test(ua)?'Tablet':/Mobile|Android|iPhone/i.test(ua)?'Móvil':'Ordenador / otro',browser:/Edg\//.test(ua)?'Edge':/OPR\//.test(ua)?'Opera':/Firefox|FxiOS/.test(ua)?'Firefox':/Chrome|CriOS/.test(ua)?'Chrome':/Safari/.test(ua)?'Safari':'Otro'};}
export class LoginGuard {
 constructor(state){this.state=state;}
 async alarm(){await this.state.storage.transaction(async storage=>{const records=(await readVisitRecords(storage)).filter(r=>r.timestamp>Date.now()-VISIT_RETENTION);if(records.length){await writeVisitRecords(storage,records);await storage.setAlarm(records[0].timestamp+VISIT_RETENTION);}else{await clearVisitRecords(storage);await storage.deleteAlarm();}});}

 async fetch(req){if(new URL(req.url).pathname==='/visits'){const body=await req.json();return json(await this.state.storage.transaction(async storage=>{const now=Date.now();let records=(await readVisitRecords(storage)).filter(r=>r.timestamp>now-VISIT_RETENTION);if(body.action==='clear'){await clearVisitRecords(storage);await storage.deleteAlarm();return {ok:true};}if(body.action==='record'){const r=body.record;if(!records.some(x=>x.ip===r.ip&&x.event===r.event&&now-x.timestamp<60000)){records.push({...r,timestamp:now});records=records.slice(-1000);}}if(records.length){await writeVisitRecords(storage,records);await storage.setAlarm(records[0].timestamp+VISIT_RETENTION);}else{await clearVisitRecords(storage);await storage.deleteAlarm();}return body.action==='list'?{records:records.slice().reverse(),retentionDays:7,maxRecords:1000}:{ok:true};}));}if(new URL(req.url).pathname==='/accounts'){const body=await req.json();const result=await this.state.storage.transaction(async storage=>{const users=await storage.get('users')||[];if(body.action==='get')return users.find(u=>u.username===body.username)||{};if(body.action==='list')return users.map(({username,role})=>({username,role}));if(body.action==='put'){const updated=users.filter(u=>u.username!==body.user.username);updated.push(body.user);await storage.put('users',updated);return {ok:true};}if(body.action==='delete'){await storage.put('users',users.filter(u=>u.username!==body.username));return {ok:true};}return {error:'Acción inválida'};});return json(result);}const {valid}=await req.json();const now=Date.now(),windowMs=15*60*1000;
  const result=await this.state.storage.transaction(async storage=>{
   let record=await storage.get('attempts')||{fails:0,start:now,blockedUntil:0};
   if(record.blockedUntil>now)return {blocked:true,retryAfter:Math.ceil((record.blockedUntil-now)/1000)};
   if(record.blockedUntil||now-record.start>=windowMs)record={fails:0,start:now,blockedUntil:0};
   if(valid){await storage.delete('attempts');return {allowed:true};}
   record.fails++;if(record.fails>=5)record.blockedUntil=now+windowMs;await storage.put('attempts',record);
   return record.blockedUntil?{blocked:true,retryAfter:900}:{allowed:false,remaining:5-record.fails};
  });return json(result);
 }
}
export default {async fetch(req,env){try{
 let url=new URL(req.url),path=url.pathname;
 if(['nortesny.com','www.nortesny.com'].includes(url.hostname)&&(url.protocol!=='https:'||url.hostname==='www.nortesny.com')){url.protocol='https:';url.hostname='nortesny.com';return Response.redirect(url.toString(),308);}
 if(path==='/instalar'||path==='/instalar/')return new Response(null,{status:302,headers:{Location:url.origin+'/?instalar=1','Cache-Control':'no-store'}});
 if(path==='/visit-event'){
  if(req.method!=='POST')return json({error:'Método no permitido'},405);
  if(req.headers.get('Origin')!==url.origin)return json({error:'Origen inválido'},403);
  if(!env.LOGIN_GUARD)return json({error:'Servicio no disponible'},503);
  const raw=await req.text();if(raw.length>512)return json({error:'Datos demasiado grandes'},413);const body=JSON.parse(raw);
  if(body.consent!==true||!['web','app','installed'].includes(body.event))return json({error:'Consentimiento o evento inválido'},400);
  const ip=req.headers.get('CF-Connecting-IP');if(!ip)return json({error:'IP no disponible'},400);
  const ua=(req.headers.get('User-Agent')||'').slice(0,300),country=String(req.cf?.country||'Desconocido').slice(0,30);
  await visitStore(env,{action:'record',record:{ip:ip.slice(0,64),country,...clientInfo(ua),event:body.event}});return json({ok:true});
 }

 if(path.startsWith('/api/')){
  if(req.method!=='GET'&&req.headers.get('Origin')!==url.origin)return json({error:'Origen inválido'},403);
  if(!env.ADMIN_PASSWORD||!env.ADMIN_USERNAME)return json({error:'Configura ADMIN_USERNAME y ADMIN_PASSWORD desde Wrangler.'},503);
  if(!env.LOGIN_GUARD)return json({error:'Falta configurar LOGIN_GUARD. Actualiza wrangler.json con la configuración de seguridad.'},503);
  const role=await authorized(req,env),valid=Boolean(role),ip=req.headers.get('CF-Connecting-IP')||'local';
  const ipHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip)))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const guard=env.LOGIN_GUARD.get(env.LOGIN_GUARD.idFromName(ipHash));
  const decision=await (await guard.fetch(new Request('https://guard/check',{method:'POST',body:JSON.stringify({valid})}))).json();
  if(decision.blocked)return new Response(JSON.stringify({error:'IP bloqueada temporalmente. Vuelve a intentar en '+Math.ceil(decision.retryAfter/60)+' minutos.',retryAfter:decision.retryAfter}),{status:429,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Retry-After':String(decision.retryAfter)}});
  if(!decision.allowed)return json({error:'Usuario o contraseña incorrectos. Quedan '+decision.remaining+' intentos antes del bloqueo temporal.'},401);

  const d=migrate(await env.DATA.get('season','json')||structuredClone(initial));
  if(path==='/api/season'&&req.method==='GET')return json({...d,sessionRole:role});
  if(['/api/users','/api/news','/api/visits','/api/delete-match','/api/delete-upcoming'].includes(path)&&role!=='admin')return json({error:'Esta acción requiere una cuenta administradora.'},403);
  if(path==='/api/visits'){
   if(req.method==='GET')return visitStore(env,{action:'list'});
   if(req.method==='POST'){const body=await req.json();if(body.action!=='clear')throw Error('Acción inválida.');return visitStore(env,{action:'clear'});}
  }
  if(path==='/api/users'){
   if(req.method==='GET')return json({users:[{username:env.ADMIN_USERNAME,role:'admin',primary:true},...await accounts(env,{action:'list'})]});
   if(req.method==='POST'){
    const body=await req.json();if(typeof body.username!=='string'||! /^[a-zA-Z0-9_.-]{3,40}$/.test(body.username))throw Error('Usuario: 3–40 letras, números, puntos, guiones o guiones bajos.');
    if(body.username===env.ADMIN_USERNAME)throw Error('La cuenta principal se cambia desde Wrangler.');
    if(body.action==='delete'){await accounts(env,{action:'delete',username:body.username});return json({ok:true});}
    if(!['admin','editor'].includes(body.role))throw Error('Permiso inválido.');if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)throw Error('Contraseña: entre 12 y 128 caracteres.');
    const salt=hex(crypto.getRandomValues(new Uint8Array(16)));await accounts(env,{action:'put',user:{username:body.username,role:body.role,salt,hash:await passwordHash(body.password,salt)}});return json({ok:true});
   }
  }
  if(path==='/api/news'&&req.method==='POST'){
   const body=await req.json();if(body.version!==(d.version||0))return json({error:'Recarga los datos antes de guardar.'},409);d.news=d.news||[];
   if(body.action==='delete'){if(!d.news.some(x=>x.id===body.id))throw Error('Noticia no encontrada.');d.news=d.news.filter(x=>x.id!==body.id);}else{
    if(typeof body.title!=='string'||!body.title.trim()||body.title.length>120||typeof body.content!=='string'||!body.content.trim()||body.content.length>10000)throw Error('Introduce título (hasta 120 caracteres) y texto (hasta 10.000).');
    if(typeof body.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.date)||!Number.isFinite(Date.parse(body.date)))throw Error('Fecha inválida.');
    if(body.id&&!d.news.some(x=>x.id===body.id))throw Error('Noticia no encontrada.');const original=d.news.find(x=>x.id===body.id);const id=body.id||crypto.randomUUID();d.news=d.news.filter(x=>x.id!==id);d.news.push({id,title:body.title.trim(),content:body.content.trim(),date:body.date,...(original?.instagram?{instagram:original.instagram}:{}),...(original?.presentation?{presentation:original.presentation}:{})});
   }
   d.version=(d.version||0)+1;await env.DATA.put('season',JSON.stringify(d));return json(d);
  }
  if(path==='/api/match'&&req.method==='POST'){
   if(Number(req.headers.get('Content-Length')||0)>20000)return json({error:'Datos demasiado grandes'},413);
   let g=await req.json();validate(g,d);if(g.version!==(d.version||0))return json({error:'Recarga los datos antes de guardar.'},409);
   await env.DATA.put('backup-'+Date.now(),JSON.stringify(d));
   if(g.round<=3&&!d.entries[g.round]){for(const p of d.base){const a=g.players[p[0]];if(a[0]>p[2]||a[1]>p[3])throw Error('El reparto de '+p[1]+' supera su acumulado histórico pendiente. Corrige primero sus Totales de jugadores.');}for(const p of d.base){p[2]-=g.players[p[0]][0];p[3]-=g.players[p[0]][1];}}
   d.matches=d.matches.filter(x=>Number(x.round)!==g.round);d.matches.push({round:g.round,opponent:g.opponent.trim(),gf:g.gf,ga:g.ga,mvp:g.mvp,ownGoalsFor:g.ownGoalsFor??0,ownGoalsAgainst:g.ownGoalsAgainst??0});d.entries[g.round]={players:g.players};if(d.upcoming&&Number(d.upcoming.round)===g.round)d.upcoming=null;d.version=(d.version||0)+1;
   await env.DATA.put('season',JSON.stringify(d));return json(d);
  }
  if((path==='/api/totals'||path==='/api/upcoming')&&req.method==='POST'){
   const g=await req.json();if(g.version!==(d.version||0))return json({error:'Recarga los datos antes de guardar.'},409);
   if(path==='/api/totals'){
    for(const p of d.base){const a=g.players?.[p[0]];if(!Array.isArray(a)||a.length!==2||a.some(n=>!Number.isInteger(n)||n<0||n>999))throw Error('Revisa los totales individuales.');const recorded=Object.values(d.entries).reduce((v,e)=>[v[0]+(e.players[p[0]]?.[0]||0),v[1]+(e.players[p[0]]?.[1]||0)],[0,0]);if(a.some((n,i)=>n<recorded[i]))throw Error('El total no puede ser inferior a los partidos registrados. Corrige primero esos partidos.');p[2]=a[0]-recorded[0];p[3]=a[1]-recorded[1];}
   }else{
    if(!Number.isInteger(g.round)||g.round<1||g.round>999||d.matches.some(m=>Number(m.round)===g.round))throw Error('Introduce una jornada prevista que aún no se haya jugado.');
    for(const k of ['opponent','date','time','venue'])if(typeof g[k]!=='string'||!g[k].trim()||g[k].length>200)throw Error('Completa rival, fecha, hora y sitio.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(g.date)||!/^\d{2}:\d{2}$/.test(g.time))throw Error('Revisa fecha y hora.');
    d.upcoming={round:g.round,opponent:g.opponent.trim(),date:g.date,time:g.time,venue:g.venue.trim()};
   }
   await env.DATA.put('backup-'+Date.now(),JSON.stringify(migrate(await env.DATA.get('season','json')||structuredClone(initial))));d.version=(d.version||0)+1;await env.DATA.put('season',JSON.stringify(d));return json(d);
  }
  if(path==='/api/delete-match'&&req.method==='POST'){
   const g=await req.json();if(g.version!==(d.version||0))return json({error:'Recarga los datos antes de guardar.'},409);
   if(!Number.isInteger(g.round)||!d.matches.some(m=>Number(m.round)===g.round))throw Error('Jornada no encontrada.');
   await env.DATA.put('backup-'+Date.now(),JSON.stringify(d));
   d.matches=d.matches.filter(m=>Number(m.round)!==g.round);delete d.entries[g.round];d.version=(d.version||0)+1;
   await env.DATA.put('season',JSON.stringify(d));return json(d);
  }
  if(path==='/api/delete-upcoming'&&req.method==='POST'){
   const g=await req.json();if(g.version!==(d.version||0))return json({error:'Recarga los datos antes de guardar.'},409);
   await env.DATA.put('backup-'+Date.now(),JSON.stringify(d));d.upcoming=null;d.version=(d.version||0)+1;await env.DATA.put('season',JSON.stringify(d));return json(d);
  }
  return json({error:'Ruta no encontrada'},404);
 }
 if(['/admin','/admin/','/admin.html'].includes(path)){const asset=await env.ASSETS.fetch(new Request(url.origin+'/admin.html',req)),headers=new Headers(asset.headers);headers.set('Cache-Control','no-store');return new Response(asset.body,{status:asset.status,headers});}
 if(path==='/club-data.json'){
  if(req.method!=='GET'&&req.method!=='HEAD')return json({error:'Método no permitido'},405);
  const d=migrate(await env.DATA.get('season','json')||structuredClone(initial));
  // Publish club facts only. Authentication, accounts, visits and backups remain private.
  const season={base:d.base,matches:d.matches,entries:d.entries,upcoming:d.upcoming||null,news:d.news||[],version:d.version||0};
  return json({season});
 }
 if(path==='/'||path==='/index.html'){
  const asset=await env.ASSETS.fetch(new Request(url.origin+'/index.html',req));
  const headers=new Headers(asset.headers);headers.set('Cache-Control','no-store');
  return new Response(asset.body,{status:asset.status,headers});
 }
 if(path==='/template.html')return new Response('Not found',{status:404});
 return env.ASSETS.fetch(req);
}catch(e){return json({error:e.message||'Error interno'},400)}}};
