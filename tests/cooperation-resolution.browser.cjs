const {launchBrowser}=require('./browser.cjs');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
  const browser=await launchBrowser();
  try{
    for(const entry of ['mockup.html','mockup-responsive-motion.html']){
      const p=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
      await p.route('https://api.open-meteo.com/**',r=>r.abort());await p.goto(pathToFileURL(path.resolve('docs/design',entry)).href);await p.evaluate(()=>equipmentReady);
      await p.locator('#demo-role').selectOption('network');await p.locator('nav [data-page=progress]').click();
      assert.equal(await p.locator('[data-resolve-cooperation="거절"]').count(),0);
      await p.locator('[data-resolve-cooperation="철회"]').click();
      await p.locator('#cooperation-resolution-form [name=reason]').fill('   ');await p.locator('#cooperation-resolution-form .primary').click();
      assert.match(await p.locator('#cooperation-resolution-form .error').textContent(),/사유/);
      await p.locator('#cooperation-resolution-form [name=reason]').fill('추가 지원이 불필요해 철회');await p.locator('#cooperation-resolution-form .primary').click();
      assert.equal(await p.locator('#dialog').evaluate(el=>el.open),false);
      await p.reload();await p.evaluate(()=>equipmentReady);await p.locator('nav [data-page=progress]').click();
      await p.locator('.cooperation-history summary').click();assert.match(await p.locator('.cooperation-history').textContent(),/추가 지원이 불필요해 철회/);
      assert.equal(await p.locator('[data-resolve-cooperation]').count(),0);
      await p.evaluate(()=>{M.requestCooperation(state,'W-DEMO-003','security','새 공조 요청');render();});
      await p.locator('#demo-role').selectOption('cyber');await p.locator('nav [data-page=progress]').click();
      assert.equal(await p.locator('[data-resolve-cooperation="철회"]').count(),0);assert.equal(await p.locator('.accept-form').count(),1);
      await p.locator('[data-resolve-cooperation="거절"]').click();await p.locator('#cooperation-resolution-form [name=reason]').fill('지원 대상이 아니므로 거절');await p.locator('#cooperation-resolution-form .primary').click();
      await p.locator('#demo-role').selectOption('radio');await p.locator('nav [data-page=progress]').click();assert.equal(await p.locator('.cooperation-history').count(),0);
      await p.locator('#demo-role').selectOption('bnoc');await p.locator('nav [data-page=progress]').click();assert.equal(await p.locator('[data-resolve-cooperation]').count(),0);
      assert.match(await p.locator('.cooperation-history').textContent(),/지원 대상이 아니므로 거절/);
      await p.evaluate(()=>{
        M.requestCooperation(state,'W-DEMO-003','security','종결 차단 확인');
        for(const t of state.tasks.filter(t=>t.requestId==='R-DEMO-003'))M.updateTask(state,t.id,{tag:t.tag,status:'조치 완료',note:'검증 완료'});
        openRequest('R-DEMO-003');
      });
      assert.match(await p.locator('#dialog').textContent(),/공조 처리 대기/);assert.equal(await p.locator('[data-close-request]').isDisabled(),true);
      await p.locator('#close').click();await p.locator('#demo-role').selectOption('network');await p.locator('nav [data-page=progress]').click();
      await p.locator('[data-resolve-cooperation="철회"]').click();await p.locator('#cooperation-resolution-form [name=reason]').fill('모든 조치가 끝나 지원 불필요');await p.locator('#cooperation-resolution-form .primary').click();
      await p.locator('#demo-role').selectOption('bnoc');await p.evaluate(()=>openRequest('R-DEMO-003'));
      assert.match(await p.locator('#dialog').textContent(),/종결 대기/);assert.equal(await p.locator('[data-close-request]').isEnabled(),true);await p.locator('[data-close-request]').click();
      assert.equal(await p.evaluate(()=>M.requestStatus(state,'R-DEMO-003')),'종결');assert.deepEqual(errors,[]);await p.close();
    }
    console.log('PASS cooperation resolution: both entries, roles, reason, history/reload, retry, close gate');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
