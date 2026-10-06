const {launchBrowser}=require('./browser.cjs');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await launchBrowser();
 try{for(const entry of ['mockup.html','mockup-responsive-motion.html']){
  const p=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://api.open-meteo.com/**',r=>r.abort());await p.goto(pathToFileURL(path.resolve('docs/design',entry)).href);await p.evaluate(()=>equipmentReady);
  await p.locator('nav [data-page=operations]').click();await p.locator('#operation-search').fill('NET-001');await p.locator('[data-operation-select=switch]').click();await p.locator('.operation-detail [data-operation-plan]').first().click();
  const form=p.locator('#system-operation-form');assert.equal(await form.locator('[name=completionNote]').isVisible(),false);
  await form.locator('[name=status]').selectOption('완료');assert.equal(await form.locator('[name=completionNote]').isVisible(),true);
  await form.locator('[name=completionNote]').fill('   ');const before=await p.evaluate(()=>JSON.stringify(state));await form.locator('.primary').click();
  assert.match(await form.locator('.error').textContent(),/조치 결과/);assert.equal(await p.evaluate(()=>JSON.stringify(state)),before);
  await form.locator('[name=completionNote]').fill('업데이트 후 통신 시험 정상');await form.locator('.primary').click();
  const snapshot=()=>p.evaluate(()=>{const plan=operationPlans().find(p=>p.id==='plan-1'),task=state.tasks.find(t=>t.id===plan.taskId);return {planStatus:plan.status,planNote:plan.note,result:plan.completionNote,note:task.note,completed:task.completed,confirmed:task.confirmed,history:task.history.filter(h=>h.status==='조치 완료').length,notices:state.notifications.filter(n=>n.taskId===task.id&&n.audience==='bnoc'&&n.title.startsWith('조치 완료')).length};});
  const completed=await snapshot();assert.equal(completed.planStatus,'완료');assert.equal(completed.result,'업데이트 후 통신 시험 정상');assert.equal(completed.note,completed.result);assert.equal(completed.planNote,'작업 완료 확인 후 서비스 재개');assert.ok(completed.completed);assert.equal(completed.confirmed,true);assert.equal(completed.history,1);assert.equal(completed.notices,1);
  await p.evaluate(()=>operationForm('plan','plan-1'));assert.equal(await form.locator('[name=completionNote]').isEditable(),false);await form.locator('.primary').click();assert.deepEqual(await snapshot(),completed);
  await p.reload();await p.evaluate(()=>equipmentReady);assert.deepEqual(await snapshot(),completed);
  const checks=await p.evaluate(()=>{
   const count=task=>state.notifications.filter(n=>n.taskId===task.id&&n.audience==='bnoc'&&n.title.startsWith('조치 완료')).length;
   const base={target:'switch',title:'연결 완료 검증',start:M.today+'T18:00',end:M.today+'T19:00',impact:'일부 제한',scope:'검증 구역',note:'계획 내용',status:'완료',completionNote:'조치 결과'};
   const expectFailure=fn=>{const before=JSON.stringify(state);try{fn();return false;}catch{return JSON.stringify(state)===before;}};
   const invalid=[];for(const completionNote of ['', '   ',null,123])invalid.push(expectFailure(()=>SO.savePlan(state,{...base,completionNote})));
   const task=state.tasks.find(t=>t.id==='W-DEMO-005'),size=state.tasks.length;
   const linked=SO.savePlan(state,{...base,taskId:task.id});const noDuplicate=state.tasks.length===size;
   SO.savePlan(state,{...linked},linked.id);
   const closedRequest=state.requests.find(r=>r.id==='R-DEMO-006');closedRequest.closed=M.today;
   const closedBlocked=expectFailure(()=>SO.savePlan(state,{...base,taskId:'W-DEMO-006'}));
   const denied=[];for(const role of ['user','network','viewer']){state.role=role;denied.push(expectFailure(()=>SO.savePlan(state,base)));}state.role='bnoc';
   const fresh=SO.savePlan(state,{...base,status:'완료'}),freshTask=state.tasks.find(t=>t.id===fresh.taskId);
   const planned=SO.savePlan(state,{...base,status:'예정',completionNote:''}),plannedTask=state.tasks.find(t=>t.id===planned.taskId);
   const role=Object.keys(M.sessions).find(r=>M.sessions[r].department===plannedTask.department);state.role=role;
   M.updateTask(state,plannedTask.id,{tag:plannedTask.tag,status:'조치 완료',note:'정비 진행에서 완료'});state.role='bnoc';
   SO.savePlan(state,{...planned},planned.id);
   const unchanged=expectFailure(()=>SO.savePlan(state,{...planned,completionNote:'수정 시도'},planned.id));
   const noReopen=expectFailure(()=>SO.savePlan(state,{...planned,status:'예정'},planned.id));
   return {invalid,closedBlocked,denied,noDuplicate,linkedNotice:count(task),freshNotice:count(freshTask),taskNotice:count(plannedTask),plannedStatus:planned.status,plannedResult:planned.completionNote,unchanged,noReopen};
  });
  assert.deepEqual(checks.invalid,[true,true,true,true]);assert.deepEqual(checks.denied,[true,true,true]);for(const key of ['closedBlocked','noDuplicate','unchanged','noReopen'])assert.equal(checks[key],true,key);
  for(const key of ['linkedNotice','freshNotice','taskNotice'])assert.equal(checks[key],1,key);assert.equal(checks.plannedStatus,'완료');assert.equal(checks.plannedResult,'정비 진행에서 완료');
  assert.deepEqual(errors,[]);await p.close();
 }
 console.log('PASS operation completion: both entries, required result, shared completion/history/notice, existing/new tasks, retry/reload, permissions, unchanged failures');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
