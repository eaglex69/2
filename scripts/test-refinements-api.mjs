import assert from 'node:assert/strict';
const base=process.env.TEST_URL??'http://127.0.0.1:3000';
const adminName=process.env.TEST_ADMIN_USER??'admin',adminPassword=process.env.TEST_ADMIN_PASSWORD??'ADM_7c6e6b9e!';
const username='rx_'+Date.now().toString(36);let cookie='',adminCookie='',userId=0,checks=0;
async function api(route,body,session=cookie){const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(session?{Cookie:session}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();return{status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const ok=(v,m)=>{assert.ok(v,m);checks++;};
try{
 const reg=await api('auth/register',{username,password:'test-password-123',displayName:'Проверка рейтинга'},'');assert.equal(reg.status,200,JSON.stringify(reg.data));cookie=reg.cookie;
 let r=await api('game');userId=r.data.user.id;
 r=await api('rating');assert.equal(r.status,200,JSON.stringify(r.data));ok(r.data.me?.id===userId,'own row returned');ok(r.data.myRank>=1,'own place visible');ok(r.data.farmersWeek.some(v=>v.id===userId&&v.points===0),'zero-score player visible');ok(r.data.farmersAll.some(v=>v.id===userId),'all-time own row visible');ok(r.data.farmersWeek.every((v,i,a)=>!i||a[i-1].points>=v.points),'weekly sorted by points');
 const login=await api('auth/login',{username:adminName,password:adminPassword},'');assert.equal(login.status,200,JSON.stringify(login.data));adminCookie=login.cookie;
 r=await api('rating',null,adminCookie);ok(r.data.farmersWeek.some(v=>v.id===r.data.me?.id),'admin own place visible');ok(r.data.me?.role==='admin','admin marked in ranking');
 r=await api('game',{type:'fish-start'});assert.equal(r.status,200,JSON.stringify(r.data));const cast=r.data.state.lastCastAt;ok(cast>0,'cast timestamp saved');
 r=await api('game',{type:'fish-catch',at:cast});assert.equal(r.status,200);ok(r.data.state.lastCastAt===cast,'catch preserves cooldown');
 r=await api('game',{type:'fish-start'});ok(r.status===400,'early second cast rejected');ok(r.data.error.includes('Озеро отдыхает'),'clear cooldown error');
 r=await api('game');const remaining=r.data.state.lastCastAt+150000-Date.now();ok(remaining>145000&&remaining<=150000,'cooldown is 2 minutes 30 seconds');
 ok((await api('rating',null,'')).status===401,'rating requires login');
 console.log(`Refinements API: ${checks} checks passed (${base})`);
}finally{if(adminCookie&&userId)await api('admin',{type:'user-delete',id:userId},adminCookie);}
