import confirmed from './premium-history.json';

// Recover confirmed missing ledgers without duplicating cumulative player totals.
// Existing edits and deleted matches always take precedence over this seed.
export function recoverPremiumHistory(d){
 d.entries=d.entries||{};
 const normalized=s=>String(s).toUpperCase().replace(/[^A-Z0-9]/g,'');
 for(const round of [1,2,3,4]){
  const expected=confirmed.matches.find(g=>g.round===round),match=d.matches.find(g=>Number(g.round)===round),entry=confirmed.entries[round];
  if(!match||!expected||!entry||match.gf!==expected.gf||match.ga!==expected.ga||normalized(match.opponent)!==normalized(expected.opponent))continue;
  if(d.entries[round]){
   const existing=d.entries[round];
   if(existing.penaltyGoals===undefined&&entry.penaltyGoals&&d.base.every(p=>(existing.players?.[p[0]]?.[0]||0)===(entry.players[p[0]]?.[0]||0)))existing.penaltyGoals=structuredClone(entry.penaltyGoals);
   continue;
  }
  if(d.base.some(p=>{const a=entry.players[p[0]]||[0,0];return p[2]<a[0]||p[3]<a[1];}))continue;
  for(const p of d.base){const a=entry.players[p[0]]||[0,0];p[2]-=a[0];p[3]-=a[1];}
  d.entries[round]=structuredClone(entry);
 }
 return d;
}
