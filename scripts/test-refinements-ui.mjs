import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL??'http://127.0.0.1:3000',tag=process.env.TEST_TAG??'next';
const username='ru_'+Date.now().toString(36);await mkdir('.checks',{recursive:true});
const reg=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password:'test-password-123',displayName:'Проверка экрана'})});assert.ok(reg.ok,await reg.text());const token=reg.headers.get('set-cookie').split(';')[0].split('=')[1];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const report={};let adminCookie='';
async function open(viewport,mobile){const ctx=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});await ctx.addCookies([{name:'quiet_farm_session',value:token,domain:new URL(base).hostname,path:'/',httpOnly:true,sameSite:'Lax'}]);await ctx.addInitScript(()=>sessionStorage.setItem('valley:splash','1'));const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('.farm-map-redesign');return{ctx,page,errors};}
async function dock(page,label){await page.locator(`.map-dock-button[aria-label="${label}"]`).click();}
try{
 for(const [name,viewport,mobile] of [['desktop',{width:1440,height:900},false],['mobile',{width:390,height:844},true]]){
  const {ctx,page,errors}=await open(viewport,mobile);const r={};
  await dock(page,'Рейтинг');await page.waitForSelector('.rating-my-place');await page.waitForSelector('.rating-row');r.rank=await page.locator('.rating-my-place strong').innerText();assert.notEqual(r.rank,'—');r.ratingFont=await page.locator('.rating-row strong').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize));assert.ok(r.ratingFont>=16);await page.waitForTimeout(400);await page.screenshot({path:`.checks/${tag}-rating-${name}.png`});
  if(name==='desktop'){await page.route('**/api/rating',route=>route.abort());await dock(page,'Карта');await dock(page,'Рейтинг');await page.waitForSelector('.rating-error');await page.unroute('**/api/rating');await page.getByRole('button',{name:'Попробовать снова'}).click();await page.waitForSelector('.rating-my-place');r.retry=true;}
  await dock(page,'Водоёмы');await page.locator('.water-tab',{hasText:'Рыбалка'}).click();const castButton=page.getByRole('button',{name:/Забросить удочку/});if(await castButton.count())await castButton.click();await page.waitForSelector('.fishing-countdown');r.cooldown=await page.locator('.fishing-countdown strong').innerText();const remainingText=r.cooldown.split(':');const remainingSeconds=Number(remainingText[0])*60+Number(remainingText[1]);assert.ok(remainingSeconds>=120&&remainingSeconds<=150,'cooldown within 2–3 minutes');await page.screenshot({path:`.checks/${tag}-fishing-${name}.png`});
  await page.reload({waitUntil:'networkidle'});await page.waitForSelector('.farm-map-redesign');await dock(page,'Водоёмы');await page.locator('.water-tab',{hasText:'Рыбалка'}).click();await page.waitForSelector('.fishing-countdown');r.persisted=await page.locator('.fishing-countdown strong').innerText();assert.ok(Number(r.persisted.split(':')[1])<=30);
  await dock(page,'Зомби');await page.waitForSelector('.defense-lobby');await page.getByRole('button',{name:/Начать защиту/}).click();await page.waitForSelector('.defense-play .defense-canvas');await page.waitForTimeout(900);
  const play=await page.locator('.defense-play').boundingBox();assert.equal(Math.round(play.width),viewport.width);assert.equal(Math.round(play.height),viewport.height);
  r.packets=await page.locator('.seed-packet').count();assert.equal(r.packets,13);r.svg=await page.locator('.defense-play svg').count();assert.equal(r.svg,0);r.emoji=/[\u{1F300}-\u{1FAFF}]/u.test(await page.locator('.defense-play').innerText());assert.equal(r.emoji,false);
  r.images=await page.locator('.defense-play img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0&&i.src.includes('/images/defense/')));assert.ok(r.images);
  const canvas=page.locator('.defense-canvas'),vpLoc=page.locator('.defense-viewport');
  const size=async()=>(await canvas.boundingBox()).width;const vpBox=await vpLoc.boundingBox();
  r.cellCss=Math.round(112*(await size())/840);
  if(mobile){assert.ok(r.cellCss>=90,'large cells by default on phone');assert.ok(await size()>vpBox.width,'phone shows part of field');assert.ok(await page.locator('.defense-minimap:not(.hidden)').count(),'minimap visible when zoomed');}
  else{assert.ok(Math.abs((await size())-Math.min(vpBox.width,vpBox.height*1.5))<4,'desktop fits whole field');}
  // посадка касанием по видимой клетке
  const box=await canvas.boundingBox(),k=box.width/840;
  await page.locator('.seed-packet[aria-label^="Подсолнух,"]').click();await page.mouse.click(box.x+112*k,box.y+168*k);await page.waitForTimeout(250);assert.equal(await page.locator('.defense-sunbox strong').innerText(),'150');
  await page.locator('.seed-packet[aria-label^="Горохострел,"]').click();await page.mouse.click(box.x+224*k,box.y+168*k);await page.waitForTimeout(250);assert.equal(await page.locator('.defense-sunbox strong').innerText(),'50');
  // масштаб кнопками
  const before=await size();await page.getByRole('button',{name:'Приблизить'}).click();await page.waitForTimeout(150);r.zoomIn=Math.round(await size()/before*100);assert.ok(r.zoomIn>120,'zoom in');
  await page.getByRole('button',{name:'Отдалить'}).click();await page.getByRole('button',{name:'Отдалить'}).click();await page.waitForTimeout(150);
  await page.getByRole('button',{name:'Приблизить'}).click();await page.getByRole('button',{name:'Приблизить'}).click();await page.waitForTimeout(150);
  // перетаскивание поля
  const sl0=await vpLoc.evaluate(e=>e.scrollLeft);await page.mouse.move(vpBox.x+vpBox.width*0.7,vpBox.y+vpBox.height*0.5);await page.mouse.down();await page.mouse.move(vpBox.x+vpBox.width*0.3,vpBox.y+vpBox.height*0.5,{steps:6});await page.mouse.up();r.panned=(await vpLoc.evaluate(e=>e.scrollLeft))-sl0;assert.ok(r.panned>40,'drag pans field');
  assert.equal(await page.locator('.defense-sunbox strong').innerText(),'50','drag does not plant');
  if(!mobile){await page.mouse.move(vpBox.x+vpBox.width/2,vpBox.y+vpBox.height/2);const w0=await size();await page.mouse.wheel(0,-400);await page.waitForTimeout(150);r.wheel=Math.round(await size()/w0*100);assert.ok(r.wheel>100||w0>=box.width*2.4,'wheel zooms');}
  await page.getByRole('button',{name:'Показать всё поле'}).click();await page.waitForTimeout(150);r.fit=Math.round(await size());assert.ok(await page.locator('.defense-minimap.hidden').count()||mobile,'minimap hidden when whole field visible');
  await page.screenshot({path:`.checks/${tag}-defense-${name}.png`});
  if(mobile){await page.getByRole('button',{name:'Приблизить'}).click();await page.getByRole('button',{name:'Приблизить'}).click();await page.waitForTimeout(250);await page.screenshot({path:`.checks/${tag}-defense-${name}-zoom.png`});}
  await page.getByRole('button',{name:'Пауза',exact:true}).click();await page.waitForSelector('.defense-pause-overlay');await page.getByRole('button',{name:'Продолжить',exact:true}).click();await page.waitForSelector('.defense-pause-overlay',{state:'detached'});
  await page.getByRole('button',{name:'Пауза',exact:true}).click();await page.getByRole('button',{name:'Сдаться и выйти'}).click();await page.waitForSelector('.defense-lobby');assert.equal(await page.locator('.defense-play').count(),0);
  r.overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(r.overflow<=1);r.errors=errors;assert.deepEqual(errors,[]);report[name]=r;console.log(tag,name,'passed',JSON.stringify(r));await ctx.close();
 }
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:process.env.TEST_ADMIN_PASSWORD??'ADM_7c6e6b9e!'})});adminCookie=login.headers.get('set-cookie')?.split(';')[0]??'';
 await writeFile(`.checks/${tag}-refinements.json`,JSON.stringify(report,null,2));console.log('Refinements UI passed',base,JSON.stringify(report));
}finally{await browser.close();if(adminCookie){const r=await fetch(base+'/api/admin?section=users&q='+username,{headers:{Cookie:adminCookie}});const d=await r.json();for(const u of d.users??[])if(u.username===username)await fetch(base+'/api/admin',{method:'POST',headers:{Cookie:adminCookie,'Content-Type':'application/json'},body:JSON.stringify({type:'user-delete',id:u.id})});}}
