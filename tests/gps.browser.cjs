const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER_PATH?{executablePath:process.env.TEST_BROWSER_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1512,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://api.open-meteo.com/**',r=>r.abort());
  await page.goto(pathToFileURL(path.resolve('docs/design/mockup.html')).href);
  assert.match(await page.locator('.gps-tile').textContent(),/양호.*제17전투비행단.*청주/s);
  await page.locator('.gps-tile').click();
  assert.equal(await page.locator('#gps-filter [name=region]').inputValue(),'cheongju');
  assert.equal(await page.locator('.gps-table tbody tr').count(),1);
  await page.locator('[data-gps-reset]').click();
  assert.deepEqual(await page.locator('.gps-summary strong').allTextContents(),['3','1','1','1']);
  assert.equal(await page.locator('.gps-marker').count(),6);
  await page.locator('.gps-marker[data-gps-site=seonggeo]').click();
  assert.match(await page.locator('#gps-detail').textContent(),/성거산.*불량/s);
  assert.equal(await page.locator('.gps-table .selected button').textContent(),'성거산');
  await page.screenshot({path:'docs/design/mockup/preview-gps.png',fullPage:true});
  await page.locator('.gps-table [data-gps-site=sacheon]').click();
  assert.equal(await page.locator('.gps-marker.selected').getAttribute('data-gps-site'),'sacheon');
  await page.locator('#gps-filter [name=status]').selectOption('missing');
  await page.locator('#gps-filter button.primary').click();
  assert.equal(await page.locator('.gps-marker').count(),1);
  assert.match(await page.locator('#gps-detail').textContent(),/가상 지점.*미수신/s);
  await page.locator('#gps-filter [name=region]').selectOption('cheongju');
  await page.locator('#gps-filter button.primary').click();
  assert.equal(await page.locator('.gps-marker').count(),0);
  assert.equal(await page.locator('#gps-detail').count(),0);
  await page.locator('[data-gps-reset]').click();
  await page.locator('.gps-basemap').evaluate(image=>image.decode());
  for(const width of [1512,1280,1920]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const overlaps=await page.locator('.gps-marker').evaluateAll(markers=>{
    const boxes=markers.map(marker=>({id:marker.dataset.gpsSite,rect:marker.getBoundingClientRect()}));
    return boxes.flatMap((a,i)=>boxes.slice(i+1).filter(b=>a.rect.left<b.rect.right&&a.rect.right>b.rect.left&&a.rect.top<b.rect.bottom&&a.rect.bottom>b.rect.top).map(b=>`${a.id}/${b.id}`));
   });
   assert.deepEqual(overlaps,[],`GPS marker labels overlap at ${width}px`);
  }
  await page.setViewportSize({width:1512,height:1100});
  await page.locator('#demo-role').selectOption('viewer');
  await page.locator('.viewer-comparison [data-gps-open=seonggeo]').click();
  assert.match(await page.locator('#gps-detail').textContent(),/성거산.*불량/s);
  await page.locator('#demo-role').selectOption('network');
  await page.locator('nav [data-page=dashboard]').click();
  await page.locator('nav [data-page=gps]').click();await page.locator('[data-gps-reset]').click();await page.locator('[data-gps-site=cheongju]').first().click();assert.match(await page.locator('#gps-detail').textContent(),/청주/);
  assert.deepEqual(errors,[]);
  console.log('PASS GPS: dashboard mapping, map/list selection, filters, empty state, viewer, role switch, desktop');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
