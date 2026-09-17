// npm으로 설치한 Playwright가 필요합니다. 실행 방법은 목업 README를 참고하세요.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1100}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://api.open-meteo.com/**',route=>route.fulfill({json:{current:{time:Math.floor(Date.now()/1000),temperature_2m:22,weather_code:2}}}));
    await page.goto(pathToFileURL(path.resolve('docs/design/mockup.html')).href);
    await page.locator('[data-weather-value]').filter({hasText:'22°C'}).waitFor();
    const navigate=async name=>page.locator(`nav [data-page="${name}"]`).click();
    const role=async name=>page.locator('#demo-role').selectOption(name);
    await page.screenshot({path:'docs/design/mockup/preview-integrated.png',fullPage:true});

    await navigate('cpcon');assert.equal(await page.locator('#cpcon-form').count(),0);
    await role('admin');await page.locator('#cpcon-form [name=level]').selectOption('2');
    await page.locator('#cpcon-form [name=note]').fill('브라우저 시연 단계');await page.locator('#cpcon-form button').click();
    await navigate('dashboard');assert.equal(await page.locator('.cpcon-card.cpcon-2').count(),1);
    await role('cyber');await navigate('cpcon');assert.equal(await page.locator('#cpcon-form').count(),1);
    await page.screenshot({path:'docs/design/mockup/preview-cpcon.png',fullPage:true});

    await role('user');await navigate('requests');
    await page.locator('#request-form [name=target]').fill('모니터');
    await page.locator('#request-form [name=type]').selectOption('증설');
    await page.locator('#quantity').fill('2');
    await page.locator('#request-form [name=description]').fill('모니터 2대 증설해주세요~~');
    assert.equal(await page.locator('#request-title').textContent(),'[가상 A부서] 모니터 2대 증설 요청');
    await page.locator('#quantity').fill('');assert.equal(await page.locator('#request-title').textContent(),'[가상 A부서] 모니터 증설 요청');
    await page.locator('#quantity').fill('2');
    await page.locator('summary').filter({hasText:'담당 부서 안내'}).click();
    await page.locator('[data-guide-select=network]').click();
    assert.equal(await page.locator('#request-form [name=description]').inputValue(),'모니터 2대 증설해주세요~~');
    await page.locator('#request-form [name=tag]').selectOption('모니터');
    await page.locator('#request-form [name=wish]').selectOption('radio');
    assert.equal(await page.locator('#request-form [name=tag]').inputValue(),'');
    assert.equal(await page.locator('#request-form [name=tag] option[value="모니터"]').count(),0);
    await page.locator('#request-form [name=wish]').selectOption('network');await page.locator('#request-form [name=tag]').selectOption('모니터');
    await page.screenshot({path:'docs/design/mockup/preview-request.png',fullPage:true});
    await page.locator('#request-form button[type=submit]').click();
    const requestId=await page.evaluate(()=>state.requests.at(-1).id);
    assert.equal(await page.locator(`[data-request="${requestId}"]`).count(),1);

    await role('bnoc');await navigate('reception');await page.locator(`#content [data-request="${requestId}"]`).click();
    await page.locator('#assignment-form [name=department]').selectOption('network');
    await page.locator('#assignment-form [name=tag]').selectOption('모니터');await page.locator('#assignment-form .primary').click();
    const taskId=await page.evaluate(id=>state.tasks.find(t=>t.requestId===id).id,requestId);
    await role('network');await navigate('progress');await page.locator(`#content [data-task="${taskId}"]`).click();
    await page.locator('#cooperation-form [name=department]').selectOption('security');await page.locator('#cooperation-form [name=reason]').fill('보안 프로그램 설정 확인');
    await page.locator('#cooperation-form button').click();
    const countBefore=await page.evaluate(()=>state.tasks.length);
    const cooperationId=await page.evaluate(()=>state.cooperation.at(-1).id);
    await role('cyber');await page.locator(`.accept-form[data-id="${cooperationId}"] button`).click();
    assert.equal(await page.evaluate(()=>state.tasks.length),countBefore+1);
    const supportId=await page.evaluate(()=>state.tasks.at(-1).id);
    await page.locator(`#content [data-task="${supportId}"]`).click();
    assert.match(await page.locator('#dialog-body').textContent(),/공조/);
    await page.locator('#task-form [name=tag]').selectOption('보안 설정');await page.locator('#task-form [name=status]').selectOption('조치 완료');await page.locator('#task-form [name=note]').fill('보안 설정 확인 완료');await page.locator('#task-form button').click();
    assert.equal(await page.evaluate(id=>state.requests.find(r=>r.id===id).tag,requestId),'모니터');
    await role('network');await page.locator(`#content [data-task="${taskId}"]`).click();await page.locator('#task-form [name=status]').selectOption('조치 완료');await page.locator('#task-form [name=note]').fill('모니터 2대 증설 완료');await page.locator('#task-form button').click();
    await role('bnoc');await navigate('reception');await page.locator(`#content [data-request="${requestId}"]`).click();await page.locator('[data-close-request]').click();
    assert.equal(await page.evaluate(id=>state.requests.find(r=>r.id===id).closed,requestId),'2026-09-16');

    await navigate('statistics');await page.locator('#statistics-form [name=department]').selectOption('network');await page.locator('#statistics-form button').click();
    assert.equal(await page.locator('.department-bar').count(),1);
    await page.locator('#statistics-form [name=start]').fill('2026-01-01');await page.locator('#statistics-form [name=end]').fill('2026-01-31');await page.locator('#statistics-form button').click();
    assert.match(await page.locator('#content').textContent(),/조회 조건에 해당하는 작업이 없습니다/);
    await page.locator('#statistics-form [name=period]').selectOption('month');await page.locator('#statistics-form [name=department]').selectOption('');await page.locator('#statistics-form button').click();
    await page.locator('[data-stat-department=radio]').click();assert.match(await page.locator('#content').textContent(),/그래프·수치 선택 조건/);await page.locator('[data-clear-drill]').click();
    await page.screenshot({path:'docs/design/mockup/preview-statistics.png',fullPage:true});
    await role('network');assert.equal(await page.locator('#statistics-form [name=department] option').count(),1);
    await navigate('progress');await page.locator('[data-progress-view=calendar]').click();await page.locator('#calendar-mode').selectOption('week');await page.locator('#calendar-mode').selectOption('day');

    await page.setViewportSize({width:390,height:844});await role('user');await navigate('requests');
    for(const name of ['requests','guide','cpcon','dashboard']){
      await navigate(name);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`모바일 가로 넘침: ${name}`);
    }
    await page.screenshot({path:'docs/design/mockup/preview-mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS: CPCON 권한, 제목·수량·안내, 배정·공조·종결, 기간·부서 통계, 캘린더, 모바일. 브라우저 오류 없음.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
