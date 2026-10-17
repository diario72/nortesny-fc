/* Public club data comes from the same persisted season as the administrator. */
(()=>{
 let season,source,inflight;
 function players(){return season.base.map(p=>{const row=p.slice();for(const e of Object.values(season.entries||{})){const a=e.players?.[p[0]]||[0,0];row[2]+=a[0];row[3]+=a[1];}return row;});}
 async function refresh(notify=true){
  if(inflight)return inflight;
  inflight=(async()=>{const r=await fetch('/club-data.json',{cache:'no-store'});if(!r.ok)throw Error('No se han podido cargar los datos del club.');const data=await r.json();if(!Array.isArray(data.season?.base)||!Array.isArray(data.season?.matches))throw Error('Datos del club no disponibles.');const changed=JSON.stringify(data.season)!==JSON.stringify(season);source=data;season=data.season;if(notify&&changed)window.dispatchEvent(new Event('nfc:change'));return season;})().finally(()=>{inflight=null;});
  return inflight;
 }
 const ready=refresh(false);
 window.NFC={ready,players,refresh,get season(){return season;},get source(){return source;}};
 addEventListener('focus',()=>{if(season)refresh().catch(()=>{});});
 addEventListener('visibilitychange',()=>{if(!document.hidden&&season)refresh().catch(()=>{});});
 setInterval(()=>{if(!document.hidden&&season)refresh().catch(()=>{});},30000);
})();
