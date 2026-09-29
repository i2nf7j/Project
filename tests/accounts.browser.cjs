const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://api.open-meteo.com/**',route=>route.fulfill({json:{current:{time:Math.floor(Date.now()/1000),temperature_2m:22,weather_code:0}}}));
    const integrated=pathToFileURL(path.resolve('docs/design/mockup.html')).href;
    const technician=pathToFileURL(path.resolve('docs/design/mockup/index.html')).href;
    await page.goto(integrated);
    assert.equal(await page.locator('#demo-role option').count(),8);
    assert.equal(await page.locator('.summary > *').count(),4);
    await page.locator('[data-weather-value]').filter({hasText:'22°C'}).waitFor();
    await page.screenshot({path:'/tmp/account-current-dashboard.png',fullPage:true});
    for(const role of ['bnoc','admin','user','network','radio','transmission','cyber','viewer']){
      await page.locator('#demo-role').selectOption(role);
      if(role==='viewer'){assert.equal(await page.locator('#viewer-filter').count(),1);assert.equal(await page.locator('nav [data-page=cpcon]').isVisible(),false);continue;}
      await page.locator('nav [data-page=cpcon]').click();
      assert.equal(await page.locator('.level-row').count(),5);
      assert.equal(await page.locator('#cpcon-form').count(),['admin','cyber'].includes(role)?1:0);
      assert.equal(await page.locator('nav [data-page=reception]').isVisible(),['bnoc','admin'].includes(role));
    }
    await page.locator('#demo-role').selectOption('admin');
    await page.locator('nav [data-page=cpcon]').click();
    for(const level of ['5','4','3','2','1']){
      await page.locator('#cpcon-form [name=level]').selectOption(level);
      await page.locator('#cpcon-form button').click();
      await page.locator('nav [data-page=dashboard]').click();
      assert.equal(await page.locator(`.cpcon-card.cpcon-${level}`).count(),1);
      await page.locator('nav [data-page=cpcon]').click();
    }
    await page.locator('#demo-role').selectOption('bnoc');
    assert.equal(await page.locator('.level-row.current.cpcon-1').count(),1);
    assert.equal(await page.locator('#cpcon-form').count(),0);
    await page.locator('#demo-role').selectOption('cyber');
    await page.locator('#cpcon-form [name=level]').selectOption('2');
    await page.locator('#cpcon-form button').click();
    await page.screenshot({path:'/tmp/account-current-cpcon.png',fullPage:true});
    await page.goto(technician);
    await page.locator('#account-switch').selectOption('admin');
    await page.waitForURL('**/mockup.html?role=admin');
    assert.equal(await page.locator('#demo-role').inputValue(),'admin');
    await page.goto(technician);
    await page.locator('.situations [data-info=CPCON]').click();
    await page.waitForURL('**/mockup.html?role=network&page=cpcon');
    assert.equal(await page.locator('#demo-role').inputValue(),'network');
    assert.equal(await page.locator('#title').textContent(),'CPCON');
    assert.equal(await page.locator('.level-row').count(),5);
    for(const url of [integrated,technician]){
      await page.setViewportSize({width:390,height:844});await page.goto(url);
      await page.screenshot({path:url===integrated?'/tmp/account-mobile-integrated.png':'/tmp/account-mobile-technician.png',fullPage:true});
      const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('body *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>({tag:n.tagName,cls:String(n.className),right:n.getBoundingClientRect().right})).slice(0,16)}));
      assert.ok(overflow.scroll<=overflow.width+1,`모바일 가로 넘침 ${url}: ${JSON.stringify(overflow)}`);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: 8개 시연 계정, CPCON 5단계·권한·전환 유지, 정비사 목업 진입 링크, 모바일 배치');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
