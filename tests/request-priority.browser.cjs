const {launchBrowser}=require('./browser.cjs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await launchBrowser();try{
 for(const entry of ['mockup.html','mockup-responsive-motion.html']){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.route('https://api.open-meteo.com/**',r=>r.abort());
  await p.goto(pathToFileURL(path.resolve('docs/design/'+entry)).href);await p.evaluate(()=>equipmentReady);
  await p.locator('#demo-role').selectOption('user');await p.locator('nav [data-page=requests]').click();
  const f=p.locator('#request-form');await f.locator('[name=target]').fill('긴급 시험 장비');await f.locator('[name=description]').fill('업무 중단 시험');await f.locator('[name=wish]').selectOption('network');
  await f.locator('[name=contexts][value="지휘관 요청"]').check();await f.locator('[name=contexts][value="작전 관련"]').check();await f.locator('[name=urgency]').selectOption('긴급');
  assert.equal(await f.locator('[name=urgentReason]').getAttribute('required'),'');await f.locator('[name=urgentReason]').fill('작전 업무가 중단되어 복구 필요');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:'tmp/test-results/urgent-intake-'+entry+'.png',fullPage:true});await f.locator('.primary').click();
  const id=await p.evaluate(()=>state.requests.at(-1).id);assert.deepEqual(await p.evaluate(()=>state.requests.at(-1).contexts),['지휘관 요청','작전 관련']);
  await p.locator('[data-request="'+id+'"]').first().click();assert.equal(await p.locator('#urgency-confirm-form').count(),0);assert.equal(await p.locator('#request-cancel-form').count(),1);await p.locator('#close').click();
  await p.locator('#demo-role').selectOption('bnoc');await p.locator('nav [data-page=reception]').click();await p.locator('[data-request="'+id+'"]').first().click();
  await p.locator('#urgency-confirm-form .primary').click();await p.locator('[data-request="'+id+'"]').first().click();assert.match(await p.locator('#dialog-body').textContent(),/통제 확인/);assert.equal(await p.locator('#urgency-confirm-form').count(),0);
  await p.locator('#assignment-form [name=department]').selectOption('network');await p.locator('#assignment-form .primary').click();await p.locator('[data-request="'+id+'"]').first().click();assert.equal(await p.locator('#request-cancel-form').count(),0);await p.locator('#close').click();
  await p.reload();await p.locator('#demo-role').selectOption('network');await p.locator('nav [data-page=progress]').click();const taskId=await p.evaluate(id=>state.tasks.find(t=>t.requestId===id).id,id);await p.locator('[data-task="'+taskId+'"]').first().click();assert.match(await p.locator('#dialog-body').textContent(),/긴급 사유.*작전 업무가 중단되어 복구 필요/s);await p.locator('#close').click();
  await p.locator('#demo-role').selectOption('bnoc');await p.locator('nav [data-page=requests]').click();assert.equal(await p.locator('#request-form [name=urgency]').count(),1);
  await p.locator('#demo-role').selectOption('user');await p.locator('nav [data-page=requests]').click();await p.locator('[data-request=R-DEMO-009]').first().click();await p.locator('.request-cancel summary').click();await p.locator('#request-cancel-form [name=reason]').fill('중복 접수 취소');await p.locator('#request-cancel-form button').click();
  await p.reload();await p.locator('nav [data-page=requests]').click();await p.locator('[data-request=R-DEMO-009]').first().click();assert.match(await p.locator('#dialog-body').textContent(),/중복 접수 취소/);assert.equal(await p.locator('#request-cancel-form').count(),0);await p.locator('#close').click();await p.locator('#demo-role').selectOption('bnoc');await p.locator('nav [data-page=reception]').click();
  assert.equal(await p.locator('#pending-count').textContent(),'1');await p.locator('[data-request=R-DEMO-009]').first().click();assert.equal(await p.locator('#assignment-form').count(),0);assert.match(await p.locator('#dialog-body').textContent(),/요청 취소/);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS urgent intake/context/review/assignment/persistence and pre-assignment cancellation on both mockups');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
