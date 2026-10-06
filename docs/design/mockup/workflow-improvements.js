/* Shared workflow improvements for the browser mockup. No server authentication. */
state.notifications=state.notifications||[];
function addWorkNotification(to,title,requestId,taskId=''){state.notifications.push({id:'notice-'+crypto.randomUUID(),audience:to,kind:taskId?'작업 알림':'공조 수신',title,requestId,taskId,at:new Date().toISOString(),readBy:[]});persistDemoState();}
for(const name of ['requestCooperation','updateTask']){const action=M[name];M[name]=function(s,...args){const previous=name==='updateTask'?s.tasks.find(t=>t.id===args[0])?.completed:null,result=action(s,...args);if(name==='requestCooperation'){const c=s.cooperation.at(-1);addWorkNotification(c.to,'공조 수신 · '+c.reason,c.requestId);}if(name==='updateTask'){const t=s.tasks.find(t=>t.id===args[0]);if(!previous&&t.completed)addWorkNotification('bnoc','조치 완료 · '+M.title(s.requests.find(r=>r.id===t.requestId)),t.requestId,t.id);}return result;};}
function workNotificationList(){const rows=M.inbox.list(state);return rows.length?rows.map(n=>'<button class="notification" data-inbox-open="'+n.id+'"><span class="badge '+(n.readBy.includes(state.role)?'':'blue')+'">'+(n.readBy.includes(state.role)?'읽음':'새 알림')+'</span><strong>'+esc(n.title)+'</strong><small>'+esc(new Date(n.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))+'</small></button>').join(''):'<p class="muted">받은 알림이 없습니다.</p>';}
const beforeWorkflowRender=render;
render=function(){beforeWorkflowRender();
 if(!['user','viewer'].includes(state.role))$('#activity-card').innerHTML='<div class="cardhead"><h2>업무 알림</h2></div>'+workNotificationList();
 const requestNav=document.querySelector('nav [data-page=requests]');requestNav.textContent=M.canAssign(state)?'대리 접수':state.role==='user'?'정비 요청·내 요청':'관련 요청';
 const progressNav=document.querySelector('nav [data-page=progress]');progressNav.textContent=M.canAssign(state)?'정비 진행':'배정 작업';
 const exportBox=document.querySelector('.report-export-toolbar');if(exportBox){const details=document.createElement('details');details.className='report-export-menu';details.innerHTML='<summary>엑셀 다운로드</summary>';exportBox.before(details);details.append(exportBox);}
 if(page==='cpcon'){const list=document.querySelector('.level-list');if(list){const details=document.createElement('details');details.innerHTML='<summary>전체 단계 설명</summary>';list.before(details);details.append(list);}}
};
const previousWorkflowDashboard=dashboard;
dashboard=function(){
 if(M.canAssign(state)||state.role==='viewer')return previousWorkflowDashboard();
 if(state.role==='user')return card('내 정비 요청',requestList(visibleRequests()),link('requests','＋ 요청하기'))+card('근무자(야간)',duty(),link('duty'))+card('담당 부서 안내',guideTable(),link('guide'));
 const tasks=visibleTasks(),waiting=tasks.filter(t=>!t.confirmed&&!t.completed),today=tasks.filter(t=>t.scheduled===M.today&&!t.completed),held=tasks.filter(t=>taskStatus(t)==='보류');
 return card('확인할 배정 작업',taskTable(waiting),link('progress','배정 작업 전체 →'))+card('공조 요청·처리',cooperationList())+card('오늘 작업',taskTable(today))+card('보류 작업',taskTable(held))+card('체계별 운영현황',ops(),link('operations'))+card('근무자(야간)',duty(),link('duty'));
};

const rootDepartment={infrastructure:'network',net:'network',radio:'radio',trans:'transmission',security:'security'};
function linkOperationWork(plan,announce=false){
 let task=state.tasks.find(t=>t.operationPlanId===plan.id);
 if(!task){const root=SO.rootOf(state,plan.target),department=plan.department||rootDepartment[root?.id],requestId='R-PLAN-'+plan.id;
 state.requests.push({id:requestId,owner:'plan',requester:'BNOC 계획정비',target:plan.title,type:'점검',quantity:null,unit:'대',description:plan.note||plan.scope,wish:department,tag:null,primary:department,created:M.today,closed:null});
 task={id:'W-PLAN-'+plan.id,operationPlanId:plan.id,requestId,department,participation:'주관',tag:null,created:M.today,scheduled:plan.start.slice(0,10),completed:null,confirmed:false,history:[{date:M.today,status:'작업 예정'}],departments:[{date:M.today,department}],note:''};state.tasks.push(task);if(announce)addWorkNotification(department,'계획정비 배정 · '+plan.title,requestId,task.id);
 }
 task.scheduled=plan.start.slice(0,10);const request=state.requests.find(r=>r.id===task.requestId);if(request.owner==='plan'){task.cancelled=plan.status==='취소';request.target=plan.title;request.description=plan.note||plan.scope;request.cancelled=task.cancelled;}
 // Completion is handled by M.updateTask when saving, never while linking.
 plan.taskId=task.id;return task;
}
// Restore legacy saved completions without creating fresh notifications on page load.
for(const plan of operationPlans()){
 const task=linkOperationWork(plan);
 if(plan.status==='완료'&&!task.completed){task.completed=M.today;task.confirmed=true;task.note=plan.completionNote||plan.note||'계획정비 완료';task.history.push({date:M.today,status:'조치 완료'});}
 if(task.completed)plan.completionNote=task.note;
}
const saveLinkedPlan=SO.savePlan;
SO.savePlan=function(s,data,id=''){
 const task=s.tasks.find(t=>t.operationPlanId===id);
 if(task?.completed&&data.status!=='완료')throw Error('조치 완료된 작업은 재개·취소할 수 없습니다.');
 const chosen=data.taskId?s.tasks.find(t=>t.id===data.taskId&&((t===task)||(!t.completed&&!t.cancelled&&!t.operationPlanId))):null;
 if(data.taskId&&!chosen)throw Error('연결할 작업을 다시 선택하세요.');
 if(task&&chosen&&chosen!==task)throw Error('이미 연결된 작업은 변경할 수 없습니다.');
 const linked=chosen||task,department=linked?.department||data.department||rootDepartment[SO.rootOf(s,data.target)?.id];
 if(!M.departments.some(d=>d.id===department))throw Error('정비 담당 부서를 선택하세요.');
 const completionNote=data.completionNote??(linked?.completed?linked.note:'');
 if(data.status==='완료'){
  if(typeof completionNote!=='string'||!completionNote.trim())throw Error('완료 시 조치 결과를 입력하세요.');
  if(linked?.completed&&completionNote.trim()!==linked.note)throw Error('조치 완료한 작업의 결과는 변경할 수 없습니다.');
  if(linked&&!linked.completed){
   const request=s.requests.find(r=>r.id===linked.requestId);
   if(!M.canWork(s,linked)||!M.validTag(linked.department,linked.tag)||!request||request.closed||(request.cancelled&&request.owner!=='plan'))throw Error('완료할 수 없는 연결 작업입니다.');
  }
 }
 const plan=saveLinkedPlan(s,{...data,completionNote},id);plan.department=department;
 if(chosen)chosen.operationPlanId=plan.id;
 const work=linkOperationWork(plan,!task);
 if(plan.status==='완료'&&!work.completed)M.updateTask(s,work.id,{tag:work.tag,status:'조치 완료',note:plan.completionNote});
 persistDemoState();return plan;
};
const updateLinkedTask=M.updateTask;
M.updateTask=function(s,id,data){const result=updateLinkedTask(s,id,data),task=s.tasks.find(t=>t.id===id);if(task.operationPlanId){const plan=operationPlans().find(p=>p.id===task.operationPlanId);if(plan){if(plan.status!=='취소')plan.status=task.completed?'완료':'예정';if(task.completed)plan.completionNote=task.note;else plan.note=task.note;}}persistDemoState();return result;};
const openLinkedTask=openTask;
openTask=function(id){openLinkedTask(id);const task=visibleTasks().find(t=>t.id===id);if(task?.operationPlanId){const button=document.createElement('button');button.textContent='연결된 운영 영향·일정 보기';button.onclick=()=>{const plan=operationPlans().find(p=>p.id===task.operationPlanId);$('#dialog').close();page='operations';operationTab='schedule';operationDay=plan.start.slice(0,10);systemFilter=SO.rootOf(state,plan.target)?.id||'';render();};$('#dialog-body').prepend(button);}};
const operationCardWithWork=operationPlanCard;
operationPlanCard=function(plan){const task=state.tasks.find(t=>t.operationPlanId===plan.id);return operationCardWithWork(plan)+(task&&M.canReadTask(state,task)?'<button data-task="'+esc(task.id)+'">연결된 정비 작업 보기 →</button>':'');};
// Selected wing 17 reads the same saved model as BNOC, other wings remain named examples.
function refreshSharedWing(){const wing=V.wings.find(w=>w.id==='17');if(!wing)return;
 wing.records=state.tasks.filter(t=>!t.cancelled).map(t=>({id:t.id,department:M.departmentName(t.department),departmentHistory:t.departments.map(h=>({date:h.date,department:M.departmentName(h.department)})),created:t.created,completed:t.completed,count:1,title:M.title(state.requests.find(r=>r.id===t.requestId)),result:t.note||'조치 내용 미입력'}));
 const roots=operationNodes().filter(n=>!n.parent&&!n.retired);wing.statuses=V.systems.map(name=>(roots.find(n=>n.name===name)?.status||'미등록').replace('점검 중','정비 중'));wing.notes=V.systems.map(name=>roots.find(n=>n.name===name)?.note||'');wing.cpcon=state.cpcon.level;
 wing.updated=roots.map(n=>n.updated).sort().at(-1)?.replace('T',' ')||M.today;
 wing.operationDetails=roots.map(n=>({id:n.id,name:n.name,status:n.status,department:M.departmentName(rootDepartment[n.id]),children:[{name:n.name+' 하위 구성',equipment:operationNodes().filter(e=>e.kind==='장비'&&!e.retired&&SO.rootOf(state,e.id)?.id===n.id).map(e=>({id:e.id,name:e.name,asset:e.equipmentId?'EQ-'+e.equipmentId:e.id,location:SO.path(state,e.id),status:e.status}))}],plans:operationPlans().filter(p=>SO.rootOf(state,p.target)?.id===n.id&&p.status==='예정')}));
}
const beforeSharedRender=render;render=function(){refreshSharedWing();beforeSharedRender();};
const beforeSharedDailyReport=dailyReport;dailyReport=function(day){refreshSharedWing();return beforeSharedDailyReport(day);};
const beforeSharedMaintenanceReport=maintenanceReport;maintenanceReport=function(range){refreshSharedWing();return beforeSharedMaintenanceReport(range);};

const formWithWorkDepartment=operationForm;
operationForm=function(kind,id,parentId='',targetId=''){formWithWorkDepartment(kind,id,parentId,targetId);if(kind!=='plan'||!SO.canEdit(state))return;const form=$('#system-operation-form');if(!form)return;const plan=operationPlans().find(p=>p.id===id),task=state.tasks.find(t=>t.operationPlanId===id),selected=task?.department||rootDepartment[SO.rootOf(state,plan?.target||targetId)?.id]||'';const label=document.createElement('label');label.innerHTML='정비 담당 부서<select name="department">'+departmentOptions(selected,'대상 체계 기준 자동 지정')+'</select>';if(task)label.querySelector('select').disabled=true;form.querySelector('.error').before(label);if(!id){const work=document.createElement('label');work.className='wide';work.innerHTML='기존 작업 연결<select name="taskId"><option value="">새 계획정비 작업 생성</option>'+state.tasks.filter(t=>!t.completed&&!t.cancelled&&!t.operationPlanId).map(t=>'<option value="'+t.id+'">'+esc(workDisplayName(t.id)+' · '+M.title(state.requests.find(r=>r.id===t.requestId)))+'</option>').join('')+'</select>';form.querySelector('.error').before(work);}const result=document.createElement('label');result.className='wide';result.innerHTML='조치 결과 (완료 시 필수)<textarea name="completionNote"></textarea>';const resultInput=result.querySelector('textarea');resultInput.value=task?.completed?task.note:plan?.completionNote||'';resultInput.readOnly=Boolean(task?.completed);const syncResult=()=>{result.hidden=form.elements.status.value!=='완료';resultInput.disabled=result.hidden;resultInput.required=!result.hidden;};form.elements.status.addEventListener('change',syncResult);syncResult();form.querySelector('.error').before(result);const hint=document.createElement('p');hint.className='wide field-help';hint.textContent='새 계획정비는 정비 현황에 1건으로 집계됩니다. 기존 작업 연결은 중복 집계하지 않습니다. 신규는 등록·배정일, 완료는 조치 완료일 기준이며 새 계획정비 취소 시 집계에서 제외됩니다. 완료 시 조치 결과를 입력하면 연결 작업과 이력에 반영하고 BNOC에 한 번 알립니다.';form.querySelector('.error').before(hint);editBaselines.set(form,formValues(form));};
function syncEquipmentReferences(){
 let changed=false;
 for(const node of operationNodes().filter(n=>n.kind==='장비')){
  let asset=equipment.find(e=>e.id===node.equipmentId);
  if(!asset){const id=Math.max(0,...equipment.map(e=>e.id))+1;asset={id,department:M.departmentName(rootDepartment[SO.rootOf(state,node.id)?.id]),network:'기타',name:node.name,project:'운영 구성 장비',year:'2026',status:'확인 필요',version:'',reason:'',note:node.note};equipment.push(asset);node.equipmentId=id;changed=true;}
  node.name=asset.name;
 }
 return changed;
}
const linkedNodeSave=SO.saveNode;
SO.saveNode=function(s,data,id=''){
 const existing=operationNodes().find(n=>n.id===id),asset=data.equipmentId?equipment.find(e=>e.id===Number(data.equipmentId)):null;
 if(data.kind==='장비'&&!existing&&!asset)throw Error('장비 관리에 등록된 장비를 선택하세요.');
 if(asset&&operationNodes().some(n=>n.id!==id&&n.equipmentId===asset.id))throw Error('이미 운영 구성에 연결된 장비입니다. 기존 항목을 이동하세요.');
 const node=linkedNodeSave(s,asset?{...data,name:asset.name}:data,id);if(asset)node.equipmentId=asset.id;
 if(node.kind==='장비'){const record=equipment.find(e=>e.id===node.equipmentId);if(record){record.name=node.name;saveEquipmentData().catch(()=>notify('장비 저장에 실패했습니다.'));}}
 return node;
};
const assetOperationForm=operationForm;
operationForm=function(kind,id,parentId='',targetId=''){assetOperationForm(kind,id,parentId,targetId);if(kind!=='node'||id||!SO.canEdit(state))return;const form=$('#system-operation-form');if(!form)return;const label=document.createElement('label');label.className='wide';label.innerHTML='연결할 등록 장비 (장비 종류 선택 시 필수)<select name="equipmentId"><option value="">체계 등록 또는 장비 선택</option>'+equipment.filter(e=>!operationNodes().some(n=>n.equipmentId===e.id)).map(e=>'<option value="'+e.id+'">'+esc(e.name+' · '+e.department)+'</option>').join('')+'</select><span class="field-help">새 장비는 장비 관리에서 먼저 등록한 뒤 구성에 연결하세요.</span>';form.prepend(label);label.querySelector('select').onchange=e=>{const asset=equipment.find(a=>a.id===Number(e.target.value));if(asset){form.elements.name.value=asset.name;form.elements.kind.value='장비';}};editBaselines.set(form,formValues(form));};
const detailWithAsset=operationDetail;
operationDetail=function(){const node=operationNodes().find(n=>n.id===operationSelected);return detailWithAsset()+(node?.equipmentId&&canVisit('equipment')?'<p><button data-linked-asset="'+node.equipmentId+'">장비 관리에서 보기 →</button></p>':'');};
document.addEventListener('click',e=>{const button=e.target.closest('[data-linked-asset]');if(!button||!canVisit('equipment')||!mayLeave())return;const asset=equipment.find(a=>a.id===Number(button.dataset.linkedAsset));if(!asset)return;equipmentTab='inventory';page='equipment';render();$('#equipment-department').value='';$('#equipment-network').value='';const search=$('#equipment-search');if(search){search.value=asset.name;renderEquipment();}});
const beforeAssetRender=render;render=function(){if(typeof equipmentLoaded!=='undefined'&&equipmentLoaded)syncEquipmentReferences();beforeAssetRender();};
equipmentReady.then(async()=>{if(syncEquipmentReferences()){persistDemoState();try{await saveEquipmentData();}catch{notify('장비 연결 자료 저장에 실패했습니다.');}}render();});

