const editableForms='#operation-remove-form,#system-operation-form,#request-form,#assignment-form,#task-form,#cooperation-form,#cpcon-form,#personnel-form,#duty-form,#equipment-form,#instruction-form';
let editBaselines=new Map(),forcedEdit=false,workQueue='';
const formValues=form=>JSON.stringify([...form.elements].filter(e=>e.name).map(e=>[e.name,e.type==='file'?[...e.files].map(f=>f.name+f.size+f.lastModified):e.type==='checkbox'?e.checked:e.value]));
function watchEdits(){document.querySelectorAll(editableForms).forEach(form=>{if(!editBaselines.has(form))editBaselines.set(form,formValues(form));});}
function hasEdits(){return forcedEdit||[...editBaselines].some(([form,values])=>form.isConnected&&values!==formValues(form));}
function clearEdits(){editBaselines.clear();forcedEdit=false;watchEdits();}
function markEdits(){forcedEdit=true;}
function mayLeave(){if(!hasEdits())return true;if(!confirm('저장하지 않은 변경사항이 있습니다. 변경을 버리고 이동할까요?'))return false;clearEdits();return true;}
const originalModal=modal;
modal=function(...args){originalModal(...args);watchEdits();};
window.addEventListener('beforeunload',e=>{if(hasEdits()){e.preventDefault();e.returnValue='';}});
document.addEventListener('click',e=>{const target=e.target.closest('button,a');if(!target)return;
  if(target.matches('[data-page],[data-work-queue],a[href],#display,#settings,#close,[data-copy-duty]')&&!mayLeave()){e.preventDefault();e.stopImmediatePropagation();}
},true);
document.addEventListener('change',e=>{if(!e.target.matches('#demo-role,#staffing-date'))return;if(!mayLeave()){e.target.value=e.target.id==='demo-role'?state.role:staffingDate;e.stopImmediatePropagation();}},true);
document.addEventListener('DOMContentLoaded',()=>{$('#dialog').addEventListener('cancel',e=>{if(!mayLeave())e.preventDefault();});});
function readinessCards(){
  const requests=visibleRequests(),pending=requests.filter(r=>!r.primary&&!r.closed),held=visibleTasks().filter(t=>taskStatus(t)==='보류'),closing=requests.filter(r=>requestStatus(r)==='종결 대기');
  return `<div class="readiness">${[['접수 대기',pending.length,'pending'],['보류 작업',held.length,'held'],['종결 대기',closing.length,'closing']].map(([label,count,key])=>`<button class="tile" data-work-queue="${key}"><small>${label}</small><strong>${count}</strong><span>목록 보기 →</span></button>`).join('')}<button class="tile" data-page="personnel"><small>병력 현황 · ${M.today}</small><strong class="readiness-label">${state.personnelChecks[M.today]?'확인 완료':'확인 필요'}</strong><span>현황 확인 →</span></button></div>`;
}
const originalDashboard=dashboard;
dashboard=function(){if(!M.canAssign(state))return originalDashboard();const level=M.levels.find(l=>l.value===state.cpcon.level);return readinessCards()+`<div class="bnoc-status"><button class="tile cpcon-card cpcon-${level.value}" data-page="cpcon"><small>국방 사이버방호태세</small><strong>CPCON ${level.roman} · ${level.name}</strong><small>시연 자료 · ${esc(state.cpcon.applied.replace('T',' '))} 적용</small></button>${gpsDashboard()}</div>`+card('기준일 근무자(야간)',duty(),link('duty','편성 관리 →'))+`<div class="grid dashboard-secondary">${card('체계별 운영현황',ops(),link('operations'))}${card('정비 일정',calendar(),link('progress','작업 보기 →'))}</div><details class="environment-compact"><summary>현재 시각·날씨 · 업무 시연 기준일과 별도</summary><div class="grid"><div class="environment-card" data-weather-card></div><div class="environment-card" data-clock-card></div></div></details>`;};
const originalRender=render;
render=function(){
  originalRender();
  const personnelNotice=document.querySelector('#personnel-work-notice');if(personnelNotice)personnelNotice.hidden=state.role==='user';
  if(page==='equipment'){document.body.classList.add('gps-mode');$('#content').innerHTML=equipmentPage();bindEquipment();}
  if(workQueue&&['reception','progress'].includes(page)){const list=workQueue==='held'?card('보류 작업',taskTable(visibleTasks().filter(t=>taskStatus(t)==='보류'))):card(workQueue==='pending'?'접수 대기':'종결 대기',requestList(visibleRequests().filter(r=>workQueue==='pending'?!r.primary&&!r.closed:requestStatus(r)==='종결 대기')));$('#content').innerHTML=`<p class="stat-note">대시보드에서 선택한 항목 <button data-clear-work-queue>전체 목록 보기</button></p>`+list;}
  $('#subtitle').textContent=`${M.sessions[state.role].label} · 가상 자료 · 조회 기준일 ${['personnel','duty'].includes(page)?staffingDate:M.today} (업무 시연)`;
  clearEdits();showStorageStatus();
};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.workQueue){workQueue=b.dataset.workQueue;page=workQueue==='held'?'progress':'reception';render();}
  if(b.hasAttribute('data-clear-work-queue')){workQueue='';render();}
  if(b.dataset.page&&workQueue){workQueue='';render();}
});
document.addEventListener('click',async e=>{if(!e.target.closest('[data-reset-demo]'))return;if(!confirm('이 브라우저에 저장한 시연 자료와 장비 첨부파일을 초기화할까요?'))return;try{await clearEquipmentData();localStorage.removeItem(demoStorageKey);clearEdits();location.reload();}catch(error){notify('초기화하지 못했습니다. 브라우저 저장 설정을 확인하세요.');}});
// 모든 모델 변경이 성공한 뒤에만 저장한다. 조회·폼 입력은 저장하지 않는다.
for(const name of ['createRequest','assign','requestCooperation','accept','updateTask','close','setCpcon','updatePersonnel','setPersonnelPeriod','undoPersonnelPeriod','confirmPersonnel','saveDutyOn']){const action=M[name];M[name]=(...args)=>{const result=action(...args);persistDemoState();return result;};}
