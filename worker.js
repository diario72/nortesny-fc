import initial from './initial.json';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=o=>JSON.stringify(o).replaceAll('<','\\u003c');
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export function migrate(d){if(!d.instagramNewsSeed){d.news=d.news||[];if(!d.news.some(n=>n.id==='instagram-DeKlGG2Syuq'))d.news.push({id:'instagram-DeKlGG2Syuq',title:'Publicación oficial de Nortesny FC',content:'Consulta nuestra publicación en Instagram.',date:'',instagram:'https://www.instagram.com/p/DeKlGG2Syuq/'});d.instagramNewsSeed=1;}if(!d.officialNewsVersion){const n=(d.news||[]).find(n=>n.id==='instagram-DeKlGG2Syuq');if(n&&n.title==='Publicación oficial de Nortesny FC'){n.title='Comunicado oficial';n.content="Nortesny FC expresa su firme rechazo a los hechos ocurridos el domingo 4 de octubre de 2026 durante el encuentro frente a Bayern, correspondiente a Tricolor Soccer League.\n\nEl club dispone de grabaciones de los dos incidentes que denuncia: una agresión iniciada por el portero de Bayern contra nuestro jugador Dario Zonobian, dorsal 19, y un posterior lanzamiento del balón a la cara de nuestro capitán, Raúl, por parte del mismo portero.\n\nNortesny FC pone ambas grabaciones a disposición de la organización de Tricolor Soccer League y solicita que los hechos sean revisados con rigor e imparcialidad, así como la adopción de las medidas disciplinarias que correspondan conforme al reglamento.\n\nEl club manifiesta su apoyo a los jugadores afectados y reafirma su compromiso con el respeto, el juego limpio y la seguridad de todos los participantes. La violencia no tiene cabida en nuestro deporte.\n\nNortesny FC\n6 de octubre de 2026";n.date='2026-10-06';n.presentation='official';delete n.instagram;}d.officialNewsVersion=1;}if(!d.historicalSchema){const counts=Object.fromEntries(d.base.map(p=>[p[0],[0,0]]));counts[19]=[2,0];counts[2]=[2,1];counts[3]=[0,1];counts[7]=[0,1];for(const p of d.base){p[2]-=counts[p[0]][0];p[3]-=counts[p[0]][1]}d.entries[4]={players:counts};d.historicalSchema=1;}return d;}
export function playersFor(d){let p=d.base.map(x=>[...x]);for(let x of Object.values(d.entries))for(let v of p){let a=x.players[v[0]]||[0,0];v[2]+=a[0];v[3]+=a[1]}return p}
export function validate(g,d){if(!Number.isInteger(g.round)||g.round<1||g.round>999)throw Error('Jornada válida desde la 1.');if(typeof g.opponent!=='string'||!g.opponent.trim()||g.opponent.length>80)throw Error('Introduce el rival.');if(!d.base.some(p=>p[1]===g.mvp))throw Error('Selecciona un MVP.');for(let n of [g.gf,g.ga])if(!Number.isInteger(n)||n<0||n>99)throw Error('Marcador inválido.');let goals=0,assists=0;for(let p of d.base){let a=g.players?.[p[0]];if(!Array.isArray(a)||a.length!==2||a.some(n=>!Number.isInteger(n)||n<0||n>99))throw Error('Revisa goles y asistencias.');goals+=a[0];assists+=a[1]}if(goals!==g.gf)throw Error('Los goles individuales no coinciden con el marcador.');if(assists>goals)throw Error('Hay más asistencias que goles.');}
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
   d.matches=d.matches.filter(x=>Number(x.round)!==g.round);d.matches.push({round:g.round,opponent:g.opponent.trim(),gf:g.gf,ga:g.ga,mvp:g.mvp});d.entries[g.round]={players:g.players};if(d.upcoming&&Number(d.upcoming.round)===g.round)d.upcoming=null;d.version=(d.version||0)+1;
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
 if(path==='/admin'||path==='/admin/')return env.ASSETS.fetch(new Request(url.origin+'/admin.html',req));
 if(path==='/'){
  const d=migrate(await env.DATA.get('season','json')||structuredClone(initial)),p=playersFor(d),games=[...d.matches].sort((a,b)=>a.round-b.round),last=games.at(-1)||{round:0,gf:0,ga:0,opponent:"—",mvp:"Sin MVP"},gf=games.reduce((s,g)=>s+g.gf,0),ga=games.reduce((s,g)=>s+g.ga,0),wins=games.filter(g=>g.gf>g.ga).length;
  let s=await (await env.ASSETS.fetch(new Request(url.origin+'/template.html'))).text();
  s=s.replace(/const players=.*?;/,()=> 'const players='+safe(p)+';').replace(/const games=.*?;/,()=> 'const games='+safe(games)+';').replace(/const stats=.*?;/,()=> 'const stats='+safe([[wins+' / '+games.length,'Victorias'],[gf,'Goles a favor'],[ga,'Goles en contra'],[(gf-ga>=0?'+':'')+(gf-ga),'Diferencia de goles'],[p.reduce((s,x)=>s+x[3],0),'Asistencias']])+';');
  s=s.replace("g.round===4?'golden-win':''","g.gf>g.ga?'golden-win':''").replace('Victoria · Finalizado</span>',"${g.gf>g.ga?'Victoria':g.gf===g.ga?'Empate':'Derrota'} · Finalizado</span>");
  const extra=`<script>(()=>{const last=${safe(last)},round=last.round,n=${games.length},gf=${gf},entry=${safe(d.entries[last.round]?.players||{})};const outcome=last.gf>last.ga?'VICTORIA':last.gf===last.ga?'EMPATE':'DERROTA';const hero=document.querySelector('.victory-hero');hero.querySelector('.victory-heading').children[0].textContent=outcome;hero.querySelector('.victory-heading').children[1].textContent='JORNADA '+round+' · FINALIZADO';hero.querySelector('.victory-score b').textContent=last.gf+' – '+last.ga;hero.querySelector('.victory-score strong:last-child').textContent=last.opponent;if(outcome!=='VICTORIA')hero.style.background='#e9edf3';const details=hero.querySelector('.victory-details');if(round>3){details.children[0].textContent='Goles: '+players.filter(p=>entry[p[0]]?.[0]).map(p=>p[1]+' ×'+entry[p[0]][0]).join(' · ');details.children[1].textContent='Asistencias: '+players.filter(p=>entry[p[0]]?.[1]).map(p=>p[1]+' ×'+entry[p[0]][1]).join(' · ')}details.lastElementChild.textContent='MVP: '+last.mvp;const minis=document.querySelectorAll('.leader-mini');for(const [i,metric]of [[0,2],[1,3]]){const max=Math.max(...players.map(p=>p[metric])),leaders=players.filter(p=>p[metric]===max),unique=leaders.length===1&&max>0,names=leaders.map(p=>p[1]).join(' y '),unit=i===0?(max===1?'gol':'goles'):(max===1?'asistencia':'asistencias'),amount=max+' '+unit+(unique?'':' cada uno'),label=unique?(i===0?'MÁXIMO GOLEADOR':'MÁXIMO ASISTENTE'):(i===0?'LÍDERES EN GOLES':'LÍDERES EN ASISTENCIAS');const mini=minis[i],lead=document.querySelectorAll('.lead')[i];mini.querySelector('span').textContent=label;mini.querySelector('strong').textContent=names+' · '+amount;mini.classList.toggle('unique-leader-gold',unique);lead.querySelector('small').textContent=label;lead.querySelector('strong').textContent=names;lead.lastChild.textContent=amount;lead.classList.toggle('unique-leader-gold',unique)}minis[2].querySelector('span').textContent='ÚLTIMO MVP · JORNADA '+round;minis[2].querySelector('strong').textContent=last.mvp+' · vs. '+last.opponent;document.querySelector('.home-heading .tag').textContent='Datos hasta · Jornada '+round;document.querySelector('#top-goals + .note').textContent=gf+' goles en '+n+' jornadas.';document.querySelector('#averages .panel .note').textContent='Base: los '+n+' partidos del equipo; apariciones individuales no registradas.';document.querySelector('.panel-head .tag').textContent=n+' disputados';document.querySelector('main > .note').textContent='Datos hasta la jornada '+round;document.querySelector('.form').replaceChildren(...games.slice(-5).map(g=>{let el=document.createElement('span');el.className='win';el.textContent=g.gf>g.ga?'V':g.gf===g.ga?'E':'D';return el}));if(${Boolean(d.upcoming)||!games.length}){hero.remove()}else{hero.style.display='';if(outcome==='VICTORIA')hero.style.background='linear-gradient(110deg,#f1fff3 0%,#9de7ae 35%,#35b76a 100%)'};})();</script>`;
  s=s.replace('</head>',`<style>.official-news{overflow:hidden;border-radius:18px;margin:28px 0 40px;background:#fff;color:#14213a;border:1px solid #dce3ed;box-shadow:0 14px 45px #10244110}.official-cover{height:220px;background-image:url('/comunicado-cover.png');background-size:auto 100%;background-position:center;background-repeat:no-repeat;background-color:#080d16}.official-body{padding:48px;max-width:900px;margin:auto}.official-kicker{font-size:10px;letter-spacing:.18em;font-weight:800;color:#546887}.official-body h3{font-size:clamp(30px,5vw,48px);letter-spacing:-.045em;line-height:1.12;margin:20px 0;color:#102441}.official-body time{display:block;font-size:13px;color:#6c7b91;padding-bottom:24px;border-bottom:1px solid #e4e9f0}.official-text{white-space:pre-wrap;line-height:1.9;font-size:17px;color:#27364c;margin-top:30px;overflow-wrap:anywhere}.official-signature{margin-top:40px;padding-top:22px;border-top:1px solid #e4e9f0;font-size:12px;font-weight:800;letter-spacing:.1em}.official-signature span{display:block;font-size:9px;color:#708096;margin-top:9px}@media(max-width:600px){.official-cover{height:150px}.official-body{padding:28px 22px}.official-text{font-size:15px;line-height:1.85}}.unique-leader-gold{background:linear-gradient(110deg,#fff0ad 0%,#eec248 35%,#cf941c 100%)!important;border:1px solid #bd8718!important;border-left:4px solid #a87309!important;color:#3b2905!important}.unique-leader-gold span,.unique-leader-gold small,.unique-leader-gold strong{color:#3b2905!important}.victory-hero{display:${d.upcoming||!games.length?'none':'block'}}.upcoming-hero{position:relative;overflow:hidden;margin:0 0 32px;padding:44px;border-radius:24px;background:radial-gradient(ellipse at 90% 0%,#227cf7 0%,transparent 55%),linear-gradient(125deg,#06172e,#1047a0);color:#fff;box-shadow:0 18px 45px #0a2b6330}.upcoming-hero .upcoming-label{font-size:12px;letter-spacing:.2em;font-weight:800;color:#bad7ff}.upcoming-teams{display:flex;align-items:center;justify-content:space-between;gap:24px;margin:32px 0;font-size:clamp(24px,4vw,46px);font-weight:800;line-height:1.15}.upcoming-teams span{font-size:15px;letter-spacing:.15em;color:#a7caff}.upcoming-info{display:grid;grid-template-columns:1fr 1fr 2fr;gap:24px;padding-top:24px;border-top:1px solid #ffffff35}.upcoming-info small{display:block;color:#a7caff;font-size:11px;letter-spacing:.12em;margin-bottom:8px}.upcoming-info strong{font-size:16px;line-height:1.5}@media(max-width:600px){.upcoming-hero{padding:26px 22px}.upcoming-teams{flex-direction:column;align-items:flex-start;gap:14px}.upcoming-info{grid-template-columns:1fr 1fr}.upcoming-info>div:last-child{grid-column:1/-1}}</style></head>`);
  if(d.upcoming){const u=d.upcoming;const card=`<article class="upcoming-hero"><div class="upcoming-label">PRÓXIMA JORNADA · ${u.round}</div><div class="upcoming-teams"><strong>NORTESNY FC</strong><span>VS</span><strong>${esc(u.opponent)}</strong></div><div class="upcoming-info"><div><small>FECHA</small><strong>${esc(u.date.split('-').reverse().join('/'))}</strong></div><div><small>HORA · LOS ÁNGELES</small><strong>${esc(u.time)}</strong></div><div><small>SEDE DEL PARTIDO</small><strong>${esc(u.venue)}</strong></div></div></article>`;s=s.replace('<section id="overview">','<section id="overview">'+card);}
  const news=[...(d.news||[])].sort((a,b)=>b.date.localeCompare(a.date));const newsHTML=news.length?news.map(x=>`<article class="official-news">${x.presentation==='official'?'<div class="official-cover" role="img" aria-label="Escudo de Nortesny FC bordado sobre la camiseta del equipo"></div>':''}<div class="official-body"><div class="official-kicker">NORTESNY FC · COMUNICACIÓN OFICIAL</div><h3>${esc(x.title)}</h3>${x.date?'<time datetime="'+esc(x.date)+'">'+esc(x.date.split('-').reverse().join('/'))+'</time>':''}<div class="official-text">${esc(x.content)}</div>${x.instagram==='https://www.instagram.com/p/DeKlGG2Syuq/'?'<p><a href="https://www.instagram.com/p/DeKlGG2Syuq/" target="_blank" rel="noopener noreferrer">Ver publicación en Instagram</a></p>':''}<div class="official-signature">NORTESNY FC <span>ONE TEAM. ONE GOAL.</span></div></div></article>`).join(''):'<div class="panel"><p>Próximamente publicaremos novedades del equipo.</p></div>';s=s.replace('<div id="news-list"></div>',()=>'<div id="news-list">'+newsHTML+'</div>');
  const headerUpgrade=`<style id="nortesny-header-upgrade">
header{position:relative!important;border-bottom:2px solid #1859d4!important;box-shadow:0 3px 14px rgba(24,89,212,.12)}
header .brand{position:absolute!important;left:32px!important;top:50%!important;transform:translateY(-50%)!important;display:flex!important;align-items:center!important;width:auto!important;height:auto!important}.nortesny-center-crest{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:62px;height:72px;object-fit:contain}
header .brand img{display:none!important}
.nortesny-club-copy{display:none!important}
.nortesny-club-copy strong{font-size:14px;letter-spacing:1.5px;color:#fff;font-weight:900}
.nortesny-club-copy span{font-size:9px;letter-spacing:1.7px;color:#8fa5c9;font-weight:700;text-transform:uppercase}
.nortesny-instagram{position:absolute;right:32px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:10px;min-height:46px;padding:7px 12px 7px 9px;color:#fff;text-decoration:none;border:1px solid rgba(117,158,235,.28);border-radius:14px;background:linear-gradient(135deg,rgba(255,255,255,.07),rgba(24,89,212,.12));box-shadow:inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:transform .2s ease,border-color .2s ease,background .2s ease,box-shadow .2s ease}
.nortesny-instagram:hover{transform:translateY(-50%) translateY(-2px);border-color:rgba(86,139,240,.75);background:linear-gradient(135deg,rgba(255,255,255,.1),rgba(24,89,212,.24));box-shadow:0 8px 24px rgba(13,62,151,.22),inset 0 1px 0 rgba(255,255,255,.1)}
.ig-icon{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:linear-gradient(145deg,#315fd8,#7746c8 55%,#d94b73);box-shadow:0 4px 14px rgba(68,82,210,.28);flex:0 0 auto}
.ig-copy{display:flex;flex-direction:column;line-height:1.05}.ig-copy small{color:#8fa5c9;font-size:8px;letter-spacing:1.4px;font-weight:700;margin-bottom:4px}.ig-copy strong{color:#f8fbff;font-size:12px;letter-spacing:.15px}.ig-arrow{color:#7fa8f6;font-size:14px;margin-left:2px}
@media(max-width:700px){
 header{height:92px!important;padding:10px 12px!important}
 header .brand{left:12px!important}.nortesny-center-crest{width:48px;height:58px}
 .nortesny-club-copy{display:none!important}
 .nortesny-club-copy strong{font-size:10px;letter-spacing:.7px;white-space:nowrap}
 .nortesny-club-copy span{font-size:6.5px;letter-spacing:.65px;white-space:nowrap}
 .nortesny-instagram{right:10px;min-height:38px;padding:5px 7px 5px 5px;gap:6px;border-radius:11px}
 .ig-icon{width:27px;height:27px;border-radius:8px}.ig-icon svg{width:15px;height:15px}
 .ig-copy{display:flex!important}.ig-copy small{display:none}.ig-copy strong{font-size:9px}.ig-arrow{display:none}
}
@media(max-width:390px){
 .nortesny-club-copy{max-width:76px}.nortesny-club-copy strong{font-size:9px}.nortesny-club-copy span{font-size:5.8px;letter-spacing:.4px}
 .nortesny-instagram{right:7px;padding-right:6px}.ig-copy strong{font-size:8px}
 .nortesny-center-crest{width:44px;height:54px}
}
</style><script id="nortesny-header-upgrade-script">document.addEventListener('DOMContentLoaded',()=>{const h=document.querySelector('header'),b=h&&h.querySelector('.brand');if(!h||!b)return;const originalImg=b.querySelector('img');if(originalImg&&!h.querySelector('.nortesny-center-crest')){const crest=originalImg.cloneNode(true);crest.className='nortesny-center-crest';h.appendChild(crest)}if(!h.querySelector('.nortesny-instagram')){const a=document.createElement('a');a.className='nortesny-instagram';a.href='https://www.instagram.com/nortesnyfc/';a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','Nortesny FC en Instagram');a.innerHTML='<span class="ig-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.1" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.7" r="1" fill="currentColor"/></svg></span><span class="ig-copy"><small>SÍGUENOS</small><strong>@nortesnyfc</strong></span><span class="ig-arrow" aria-hidden="true">↗</span>';h.appendChild(a)}})</script>`;
  s=s.replace('</head>',headerUpgrade+'</head>');
  s=s.replace('</body>',extra+'</body>');return new Response(s,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
 }
 if(path==='/template.html')return new Response('Not found',{status:404});
 return env.ASSETS.fetch(req);
}catch(e){return json({error:e.message||'Error interno'},400)}}};
