const {launchBrowser}=require('./browser.cjs');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url');

(async()=>{
  const browser=await launchBrowser();
  try{
    await fs.mkdir('tmp',{recursive:true});
    for(const entry of ['mockup.html','mockup-responsive-motion.html']){
      const p=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
      p.on('pageerror',error=>errors.push(error.message));
      await p.route('https://api.open-meteo.com/**',route=>route.abort());
      await p.goto(pathToFileURL(path.resolve('docs/design',entry)).href);await p.evaluate(()=>equipmentReady);
      for(const role of ['network','radio','transmission','cyber']){
        await p.locator('#demo-role').selectOption(role);await p.locator('nav [data-page=statistics]').click();
        const table=p.locator('.department-comparison');assert.equal(await table.locator('tbody tr').count(),4);
        assert.deepEqual(await table.locator('tbody tr').evaluateAll(rows=>rows.map(r=>Array.from(r.querySelectorAll('td')).map(c=>c.textContent))),[
          ['4','2','2','50%'],['2','1','1','50%'],['4','1','3','25%'],['2','0','2','0%']
        ]);
        assert.equal(await table.locator('button,a').count(),0);
        assert.equal(await table.locator('.badge').count(),1);
        assert.equal(await p.locator('#statistics-form [name=department] option').count(),1);
        const access=await p.evaluate(()=>{
          const own=M.sessions[state.role].department,other=state.tasks.find(t=>t.department!==own);
          openTask(other.id);
          return {dialogOpen:document.querySelector('#dialog').open,canRead:M.canReadTask(state,other),canWork:M.canWork(state,other),
            detailDepartments:[...new Set(M.summarize(state,filters).rows.map(t=>t.department))],
            exportDepartments:[...new Set(maintenanceReport(filters)[1].rows.map(r=>r[2]))],own,name:M.departmentName(own)};
        });
        assert.equal(access.dialogOpen,false);assert.equal(access.canRead,false);assert.equal(access.canWork,false);
        assert.deepEqual(access.detailDepartments,[access.own]);assert.deepEqual(access.exportDepartments,[access.name]);
      }
      await p.locator('#demo-role').selectOption('network');await p.locator('nav [data-page=statistics]').click();
      await p.locator('#statistics-form [name=period]').selectOption('custom');
      await p.locator('#statistics-form [name=start]').fill('2026-09-01');await p.locator('#statistics-form [name=end]').fill('2026-09-02');await p.locator('#statistics-form .primary').click();
      assert.deepEqual(await p.locator('[data-summary-department=network] td').allTextContents(),['2','0','2','0%']);
      assert.deepEqual(await p.locator('[data-summary-department=radio] td').allTextContents(),['0','0','0','—']);
      await p.locator('#statistics-form [name=period]').selectOption('month');await p.locator('#statistics-form .primary').click();
      assert.equal(await p.locator('[data-summary-department=radio] td').first().textContent(),'2');
      for(const theme of ['light','dark']){
        await p.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
        await p.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});
        assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        const panel=p.locator('section.card').filter({has:p.locator('.department-comparison')});
        assert.equal(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
        await panel.screenshot({path:'tmp/test-results/department-comparison-'+entry.replace('.html','')+'-'+theme+'.png'});
      }
      await p.locator('#demo-role').selectOption('user');assert.equal(await p.locator('.department-comparison').count(),0);
      assert.equal(await p.evaluate(()=>canVisit('statistics')),false);
      await p.locator('#demo-role').selectOption('viewer');assert.equal(await p.locator('.department-comparison').count(),0);
      await p.locator('#demo-role').selectOption('bnoc');await p.locator('nav [data-page=statistics]').click();
      assert.ok(await p.locator('[data-stat-department]').count()>1);
      assert.deepEqual(errors,[]);await p.close();
    }
    console.log('PASS department comparison: both entries, four roles, count-only access, own detail/export, periods/zero, PC light/dark');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
