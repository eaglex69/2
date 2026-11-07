import { build } from 'esbuild';
import assert from 'node:assert/strict';
const result=await build({entryPoints:['src/lib/defense-engine.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const e=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const fresh=()=>{const g=e.createDefenseGame();g.nextWave=9999;g.skySun=9999;return g;};
for(const type of e.DEFENSE_ORDER){const g=fresh();g.sun=1000;assert.equal(e.placeDefensePlant(g,type,1,2),null);ok(g.plants[0].type===type,`${type} planted`);ok(g.sun===1000-e.DEFENSE_PLANTS[type].cost,`${type} cost`);ok(e.placeDefensePlant(g,type,1,2)!==null,`${type} occupied`);ok(e.placeDefensePlant(g,type,2,2)!==null,`${type} cooldown`);}
{const g=fresh();g.sun=0;ok(e.placeDefensePlant(g,'peashooter',1,1)!==null,'insufficient sun');g.suns=[{id:1,x:100,y:100,targetY:100,life:10,landed:true}];ok(e.collectDefenseSun(g,110,110,40),'touch sun collection');ok(g.sun===25,'sun reward');}
{const g=fresh();g.sun=1000;e.placeDefensePlant(g,'sunflower',0,1);g.plants[0].timer=0;e.stepDefenseGame(g,.02);ok(g.suns.length===1,'sunflower produces raster collectible');}
for(const [type,expected] of [['peashooter',1],['snowpea',1],['repeater',1],['threepeater',3],['cabbagepult',1]]){const g=fresh();g.sun=1000;e.placeDefensePlant(g,type,1,2);g.plants[0].timer=0;g.zombies=[{id:99,kind:'basic',row:2,x:600,hp:100,maxHp:100,speed:0,slow:0,bite:0,hit:0}];e.stepDefenseGame(g,.02);ok(g.projectiles.length===expected,`${type} shoots ${expected}`);if(type==='repeater'){for(let i=0;i<10;i++)e.stepDefenseGame(g,.02);ok(g.projectiles.length===2,'repeater second pea');}if(type==='snowpea'){g.projectiles[0].x=599;e.stepDefenseGame(g,.02);ok(g.zombies[0].slow>0,'ice slows');}}
{const g=fresh();g.sun=1000;e.placeDefensePlant(g,'spikeweed',1,2);g.plants[0].timer=0;g.zombies=[{id:99,kind:'bucket',row:2,x:e.cellX(1),hp:370,maxHp:370,speed:0,slow:0,bite:0,hit:0}];e.stepDefenseGame(g,.02);ok(g.zombies[0].hp<370,'spikes damage');ok(g.plants[0].hp===9999,'spikes not eaten');}
for(const type of ['cherry','potatomine','squash']){const g=fresh();g.sun=1000;e.placeDefensePlant(g,type,1,2);g.plants[0].age=type==='potatomine'?9:1;g.zombies=[{id:99,kind:'bucket',row:2,x:e.cellX(1)+20,hp:370,maxHp:370,speed:0,slow:0,bite:0,hit:0}];e.stepDefenseGame(g,.02);ok(g.zombies.length===0,`${type} defeats armored enemy`);ok(g.effects.length>0,`${type} raster explosion`);}
{const g=fresh();g.sun=1000;e.placeDefensePlant(g,'tallnut',1,2);g.zombies=[{id:99,kind:'basic',row:2,x:e.cellX(1)+35,hp:100,maxHp:100,speed:13,slow:0,bite:0,hit:0}];const x=g.zombies[0].x;for(let i=0;i<50;i++)e.stepDefenseGame(g,.02);ok(g.zombies[0].x===x,'wall blocks movement');ok(g.plants[0].hp<1500&&g.plants[0].hp>1400,'wall absorbs bites');}
{const g=fresh();g.mowers[2].ready=false;g.zombies=[{id:99,kind:'basic',row:2,x:-20,hp:100,maxHp:100,speed:13,slow:0,bite:0,hit:0}];e.stepDefenseGame(g,.02);ok(g.phase==='lost','breach after mower used loses once');}
console.log(`Defense engine: ${checks} checks passed`);
{const g=fresh();g.time=10;g.queue=[{at:12,kind:'basic',row:3},{at:30,kind:'cone',row:1}];const full={left:0,right:840,top:0,bottom:560};let t=e.laneThreats(g,full,5);assert.equal(t.length,1);assert.equal(t[0].row,3);assert.ok(Math.abs(t[0].eta-2)<1e-9);
g.queue=[];g.zombies=[{id:1,kind:'basic',row:4,x:700,hp:100,maxHp:100,speed:13,slow:0,bite:0,hit:0},{id:2,kind:'basic',row:0,x:300,hp:100,maxHp:100,speed:13,slow:0,bite:0,hit:0}];
t=e.laneThreats(g,full,5);assert.equal(t.length,0,'visible zombies are not warnings');
t=e.laneThreats(g,{left:0,right:420,top:0,bottom:560},5);assert.deepEqual(t.map(x=>x.row),[4],'zombie beyond right edge warned');
t=e.laneThreats(g,{left:0,right:840,top:0,bottom:300},5);assert.deepEqual(t.map(x=>x.row),[4],'vertically hidden lane warned');
console.log('Lane threat checks passed');}
