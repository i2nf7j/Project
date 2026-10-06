const {launchBrowser}=require('./browser.cjs');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
  const browser=await launchBrowser();
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://api.open-meteo.com/**',route=>route.abort());
    await page.goto(pathToFileURL(path.resolve('docs/design/mockup.html')).href+'?page=instructions&role=bnoc');
    const labels=['참모총장','작전사','전투사','단장'];
    assert.deepEqual(await page.locator('[role=tab]').evaluateAll(tabs=>tabs.map(tab=>tab.dataset.instructionPosition)),labels);
    assert.match(await page.locator('#instruction-panel').innerText(),/주간 부대관리 강조사항/);
    await page.locator('[role=tab]').first().focus();await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[aria-selected=true]').getAttribute('data-instruction-position'),'작전사');
    await page.locator('[data-add-instruction]').click();
    await page.locator('[name=position]').selectOption('단장');
    await page.locator('[name=title]').fill('직책별 등록 검증');
    await page.locator('[name=source]').fill('<script>테스트</script>\n안전점검 실시');
    await page.locator('#instruction-input .primary').click();await page.locator('#instruction-review input[type=checkbox]').check();await page.locator('#instruction-review .primary').click();
    assert.match(await page.locator('#instruction-panel').innerText(),/직책별 등록 검증/);
    assert.equal(await page.locator('#instruction-panel script').count(),0);
    await page.reload();await page.locator('[data-instruction-position="단장"]').click();
    assert.match(await page.locator('#instruction-panel').innerText(),/직책별 등록 검증/);
    await page.locator('[data-instruction-position="작전사"]').click();
    assert.doesNotMatch(await page.locator('#instruction-panel').innerText(),/직책별 등록 검증/);
    await page.locator('[data-instruction-position="국방부장관"]').click();
    assert.match(await page.locator('#instruction-panel').innerText(),/주간 부대관리 강조사항/);
    await page.locator('#demo-role').selectOption('user');
    assert.equal(await page.locator('[data-add-instruction]').count(),0);
    await page.setViewportSize({width:1280,height:900});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);console.log('직책 탭·키보드·등록·저장·권한·PC 검증 통과');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
