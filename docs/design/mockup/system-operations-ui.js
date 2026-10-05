const SO=M.systemOperations;
SO.ensure(state);
let systemFilter='',operationDay=M.today,operationMove='',operationDrag='',operationTab='structure',operationSelected='net',operationSearch='',operationRetired=false;
const operationExpanded=new Set(['net']);
const operationBadge=value=>'<span class="badge '+({'정상':'green','성능저하':'amber','장애':'red','점검 중':'blue','영향 없음':'green','일부 제한':'amber','사용 불가':'red'}[value]||'')+'">'+esc(value)+'</span>';
const operationNodes=()=>SO.ensure(state).nodes;
const operationPlans=()=>SO.ensure(state).plans;
function visibleOperationNodes(){return operationNodes().filter(n=>operationRetired||!n.retired);}
function selectOperation(id){operationSelected=id;let n=operationNodes().find(n=>n.id===id);if(n){if(systemFilter)systemFilter=SO.rootOf(state,id).id;while(n){operationExpanded.add(n.id);n=operationNodes().find(p=>p.id===n.parent);}}}
function operationTree(parent=''){
  const nodes=visibleOperationNodes(),query=operationSearch.trim().toLowerCase(),matches=new Set();
  if(query)for(const node of nodes.filter(n=>(n.name+' '+n.note).toLowerCase().includes(query))){let n=node;while(n){matches.add(n.id);n=nodes.find(p=>p.id===n.parent);}}
  return nodes.filter(n=>n.parent===parent&&(parent||!systemFilter||n.id===systemFilter)&&(!query||matches.has(n.id))).map(n=>{
    const children=nodes.some(c=>c.parent===n.id),open=query||operationExpanded.has(n.id);
    return '<li><div class="operation-tree-row '+(n.id===operationSelected?'is-selected':'')+'" data-operation-drop="'+esc(n.id)+'">'+(children?'<button class="tree-toggle" data-operation-toggle="'+esc(n.id)+'" aria-expanded="'+!!open+'" aria-label="'+esc(n.name)+' 펼침 전환">'+(open?'▾':'▸')+'</button>':'<span class="tree-spacer"></span>')+'<button class="tree-name" data-operation-select="'+esc(n.id)+'" aria-current="'+(n.id===operationSelected)+'">'+esc(n.name)+'</button>'+operationBadge(n.retired?'운영 종료':n.status)+(SO.canEdit(state)&&n.parent&&!n.retired?'<button draggable="true" data-operation-move="'+esc(n.id)+'" aria-label="'+esc(n.name)+' 이동">⠿</button>':'')+'</div>'+(children&&open?'<ul>'+operationTree(n.id)+'</ul>':'')+'</li>';
  }).join('');
}
function operationDetail(){
  const n=operationNodes().find(n=>n.id===operationSelected);if(!n)return '<p class="operation-empty">왼쪽에서 체계 또는 장비를 선택하세요.</p>';
  const plans=operationPlans().filter(p=>p.target===n.id),next=plans.filter(p=>p.status==='예정'&&p.end>M.today+'T00:00').sort((a,b)=>a.start.localeCompare(b.start))[0],rule=SO.removal(state,n.id);
  return '<p class="muted">'+esc(SO.path(state,n.id))+'</p><div class="cardhead"><h2>'+esc(n.name)+'</h2>'+operationBadge(n.retired?'운영 종료':n.status)+'</div><dl class="operation-properties"><dt>종류</dt><dd>'+esc(n.kind)+'</dd><dt>위치·관리번호·설명</dt><dd>'+esc(n.note||'미등록')+'</dd><dt>상태 확인</dt><dd>'+esc(n.updated.replace('T',' '))+'</dd></dl>'+(SO.canEdit(state)&&!n.retired?'<div class="operation-actions"><button data-operation-node="'+esc(n.id)+'">수정</button>'+(n.kind!=='장비'?'<button data-operation-add-child="'+esc(n.id)+'">＋ 하위</button>':'')+(n.parent?'<button data-operation-move="'+esc(n.id)+'">이동</button>':'')+'<button class="operation-danger" data-operation-remove="'+esc(n.id)+'">'+(rule.label||'삭제·운영 종료')+'</button></div>':'')+'<div class="cardhead operation-section-title"><h3>다음 정비 · 시연 기준일 이후</h3>'+(SO.canEdit(state)&&!n.retired?'<button data-operation-plan-target="'+esc(n.id)+'">＋ 이 항목 정비 등록</button>':'')+'</div>'+(next?operationPlanCard(next):'<p class="muted">등록된 예정 정비가 없습니다.</p>')+'<details class="operation-history"><summary>이 항목의 정비 기록 '+plans.length+'건</summary>'+plans.map(operationPlanCard).join('')+'</details>'+(n.retired?'<p class="muted">운영 종료된 항목입니다. 정비 기록은 보존됩니다.</p>':'');
}
function operationPlanCard(p){
  return '<article class="operation-plan"><div class="cardhead"><strong>'+esc(p.title)+'</strong>'+operationBadge(p.impact)+'</div><p class="muted">'+esc(SO.path(state,p.target))+'</p><p>'+esc(p.start.replace('T',' '))+' ~ '+esc(p.end.replace('T',' '))+'</p><p><b>예상 영향</b> · '+esc(p.scope)+'</p>'+(p.note?'<p class="muted">'+esc(p.note)+'</p>':'')+'<div class="operation-plan-footer"><small>일정 '+esc(p.status)+' · 한국 표준시</small>'+(SO.canEdit(state)?'<button data-operation-plan="'+esc(p.id)+'">일정 수정</button>':'')+'</div></article>';
}
function operationCalendar(){
  const month=operationDay.slice(0,7),first=new Date(month+'-01T00:00:00Z'),offset=first.getUTCDay(),last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  return '<div class="operation-month"><button data-operation-month="-1" aria-label="이전 달">←</button><h3>'+month.replace('-','년 ')+'월</h3><button data-operation-month="1" aria-label="다음 달">→</button></div><div class="operation-calendar">'+['일','월','화','수','목','금','토'].map(d=>'<div class="operation-weekday">'+d+'</div>').join('')+Array.from({length:offset},()=>'<div></div>').join('')+Array.from({length:last},(_,i)=>{
    const day=month+'-'+String(i+1).padStart(2,'0'),plans=SO.plansOn(state,day,systemFilter),unavailable=plans.some(p=>p.impact==='사용 불가'),limited=plans.some(p=>p.impact==='일부 제한');
    return '<button class="operation-day '+(day===operationDay?'selected ':'')+(unavailable?'outage':limited?'limited':'')+'" data-operation-day="'+day+'" aria-pressed="'+(day===operationDay)+'" aria-label="'+day+' 정비 '+plans.length+'건"><span>'+String(i+1)+'</span>'+(day===M.today?'<small>기준일</small>':'')+(plans.length?'<small>정비 '+plans.length+'</small><span class="operation-day-impact">'+(unavailable?'불가 예상':limited?'제한 예상':'영향 없음')+'</span>':'')+'</button>';
  }).join('')+'</div><p class="muted operation-legend">빨강: 사용 불가 예상 · 주황: 일부 제한 예상<br>일정이 겹치면 가장 큰 영향을 표시합니다.</p>';
}
function systemOperationsPage(){
  const roots=visibleOperationNodes().filter(n=>!n.parent);
  if(systemFilter&&!roots.some(n=>n.id===systemFilter))systemFilter=roots[0]?.id||'';
  if(!visibleOperationNodes().some(n=>n.id===operationSelected&&(!systemFilter||SO.rootOf(state,n.id)?.id===systemFilter)))operationSelected=systemFilter;
  const selected=SO.plansOn(state,operationDay,systemFilter),all=operationPlans().filter(p=>(!systemFilter||SO.rootOf(state,p.target)?.id===systemFilter)),upcoming=all.filter(p=>p.status==='예정'&&p.end>operationDay+'T00:00').sort((a,b)=>a.start.localeCompare(b.start));
  const toolbar='<div class="operation-toolbar"><div><h2>체계 구성과 운영 예정</h2><p class="muted">체계를 선택하고 구성 또는 정비 일정을 확인하세요.</p></div><div class="operation-actions">'+(SO.canEdit(state)?'<button data-operation-node="">＋ 구성 등록</button><button class="primary" data-operation-plan="">＋ 정비 일정</button>':'<span class="badge">읽기 전용</span>')+'</div></div><div class="operation-filters"><label>체계<select id="operation-system"><option value="">전체 체계</option>'+roots.map(n=>'<option value="'+esc(n.id)+'" '+(systemFilter===n.id?'selected':'')+'>'+esc(n.name)+'</option>').join('')+'</select></label><p class="muted">가상 A대대 · 브라우저 저장<br>현재 확인 상태와 예정 영향은 별도입니다.</p></div><div class="operation-tabs" aria-label="운영현황 보기">'+[['structure','구성 관리'],['schedule','정비 일정']].map(([key,label])=>'<button data-operation-tab="'+key+'" aria-pressed="'+(operationTab===key)+'">'+label+'</button>').join('')+'</div>';
  if(operationTab==='schedule')return toolbar+'<div class="operation-filters"><label>예상 영향 조회일<input id="operation-date" type="date" value="'+operationDay+'"></label><button data-operation-day="'+M.today+'">시연 기준일</button></div><div class="operation-columns">'+card('정비 캘린더',operationCalendar(),SO.canEdit(state)?'<button data-operation-plan-target="'+esc(systemFilter)+'">＋ 선택일 정비 등록</button>':'')+card(operationDay+' 예상 영향',selected.length?selected.map(operationPlanCard).join(''):'<p class="operation-empty">등록된 정비 일정이 없습니다.</p>')+'</div>'+card('다가오는 정비',upcoming.length?upcoming.map(operationPlanCard).join(''):'<p class="muted">등록된 예정 정비가 없습니다.</p>')+'<details class="card"><summary>완료·취소 이력</summary>'+all.filter(p=>p.status!=='예정').map(operationPlanCard).join('')+'</details>';
  return toolbar+operationOverview(roots)+'<div class="operation-master-detail"><section class="card operation-navigation"><label class="operation-search">구성 검색<input id="operation-search" placeholder="장비명·관리번호 (조회 범위 내)" value="'+esc(operationSearch)+'"></label><label class="operation-archive"><input id="operation-retired" type="checkbox" '+(operationRetired?'checked':'')+'> 운영 종료 포함</label><p class="muted">화살표로 펼치기 · 이름을 선택하면 상세 표시</p><ul class="operation-tree">'+(operationTree()||'<li class="operation-empty">일치하는 구성이 없습니다.</li>')+'</ul></section><section class="card operation-detail">'+operationDetail()+'</section></div>';
}
function operationMoveForm(id){
  if(!SO.canEdit(state))return;
  operationMove=id;const destinations=operationNodes().filter(n=>SO.canMove(state,id,n.id));
  modal('구성 이동','<p>'+esc(SO.path(state,id))+'</p><p class="muted">하위 장비와 정비 연결도 함께 유지됩니다.</p><div class="operation-destinations">'+(destinations.map(n=>'<button data-operation-place="'+esc(n.id)+'">'+esc(SO.path(state,n.id))+' 아래로 이동</button>').join('')||'<p>이동 가능한 체계가 없습니다.</p>')+'</div>');
}
function operationRemoveForm(id){
  if(!SO.canEdit(state))return;
  const rule=SO.removal(state,id),n=operationNodes().find(n=>n.id===id);
  if(rule.blocked){modal('삭제·운영 종료 안내','<p>'+esc(rule.blocked)+'</p>');return;}
  modal(rule.label+' 확인','<form id="operation-remove-form" data-id="'+esc(id)+'"><p><b>'+esc(n.name)+'</b> 항목을 '+rule.label+'합니다.</p><p class="muted">'+(rule.action==='retire'?'정비 기록은 보존되며 기본 구성 목록에서 숨겨집니다.':'등록 항목이 영구 삭제됩니다.')+'</p><label class="operation-search">확인을 위해 항목 이름을 입력하세요<input name="name" required autocomplete="off"></label><p class="error" role="alert"></p><div class="form-actions"><button type="button" data-operation-cancel>취소</button><button class="operation-danger">'+rule.label+'</button></div></form>');
}
function operationForm(kind,id,parentId='',targetId=''){
  if(!SO.canEdit(state)){notify('BNOC 또는 관리자만 등록·수정할 수 있습니다.');return;}
  const isNode=kind==='node',data=(isNode?operationNodes():operationPlans()).find(n=>n.id===id)||{parent:parentId,target:targetId},field=(label,name,type,value,extra='')=>'<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+esc(value||'')+'" '+extra+'></label>',select=(label,name,values,value)=>'<label>'+label+'<select name="'+name+'">'+options(values,value)+'</select></label>';
  let body;
  if(isNode)body=field('항목명','name','text',data.name,'required maxlength="80"')+select('종류','kind',['체계','하위 체계','장비'],data.kind||'장비')+'<label>상위 구성<select name="parent"><option value="">없음 (최상위 체계)</option>'+operationNodes().filter(n=>!n.retired&&n.kind!=='장비'&&n.id!==id).map(n=>'<option value="'+esc(n.id)+'" '+(data.parent===n.id?'selected':'')+'>'+esc(SO.path(state,n.id))+'</option>').join('')+'</select></label>'+select('현재 확인 상태','status',SO.statuses,data.status||'정상')+field('설치 위치·관리번호·설명','note','text',data.note);
  else body=field('정비명','title','text',data.title,'required maxlength="100"')+'<label>정비 대상<select name="target" required><option value="">선택하세요</option>'+operationNodes().filter(n=>!n.retired||data.target===n.id).map(n=>'<option value="'+esc(n.id)+'" '+(data.target===n.id?'selected':'')+'>'+esc(SO.path(state,n.id))+'</option>').join('')+'</select></label>'+field('시작 (한국 표준시)','start','datetime-local',data.start||operationDay+'T09:00','required')+field('종료 (한국 표준시)','end','datetime-local',data.end||operationDay+'T10:00','required')+select('예상 영향','impact',SO.impacts,data.impact||'일부 제한')+select('일정 상태','status',['예정','완료','취소'],data.status||'예정')+field('영향 서비스·구역 (예: 본부 업무망)','scope','text',data.scope,'required')+field('정비 내용·우회 방안','note','text',data.note)+'<p class="field-help wide">장비 정비가 체계 전체 중단을 뜻하지는 않습니다. 실제 영향 범위를 적어 주세요. 완료·취소 일정은 예상 영향에서 제외되며 현재 상태는 별도로 확인·수정합니다.</p>';
  modal((isNode?'체계·장비 구성':'정비 일정')+(id?' 수정':' 등록'),'<form id="system-operation-form" class="request-form" data-kind="'+kind+'" data-id="'+esc(id)+'">'+body+'<p class="error wide" role="alert"></p><div class="form-actions wide"><button type="button" data-operation-cancel>취소</button><button class="primary">저장</button></div></form>');
}
const beforeSystemOperationsRender=render;
render=function(){beforeSystemOperationsRender();if(page==='operations'&&state.role!=='viewer'){document.body.classList.add('system-operations-mode');$('#content').innerHTML=systemOperationsPage();}else document.body.classList.remove('system-operations-mode');};
ops=function(){return operationNodes().filter(n=>!n.parent&&!n.retired).map(n=>'<div class="opsrow"><div><strong>'+esc(n.name)+'</strong><p class="muted">'+operationNodes().filter(c=>!c.retired&&c.kind==='장비'&&SO.rootOf(state,c.id)?.id===n.id).length+'대 등록 · '+esc(n.updated.replace('T',' '))+' 확인</p></div>'+operationBadge(n.status)+'</div>').join('');};
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-operation-add-child'))operationForm('node','',b.dataset.operationAddChild);
  if(b.hasAttribute('data-operation-move'))operationMoveForm(b.dataset.operationMove);
  if(b.dataset.operationTab){operationTab=b.dataset.operationTab;render();}
  if(b.dataset.operationSelect){selectOperation(b.dataset.operationSelect);render();}
  if(b.dataset.operationToggle){const id=b.dataset.operationToggle;operationExpanded.has(id)?operationExpanded.delete(id):operationExpanded.add(id);render();}
  if(b.dataset.operationRemove)operationRemoveForm(b.dataset.operationRemove);
  if(b.hasAttribute('data-operation-move-cancel')){operationMove='';render();}
  if(b.hasAttribute('data-operation-place'))placeOperation(operationMove,b.dataset.operationPlace);
  if(b.hasAttribute('data-operation-node'))operationForm('node',b.dataset.operationNode);
  if(b.hasAttribute('data-operation-plan-target'))operationForm('plan','','',b.dataset.operationPlanTarget);
  if(b.hasAttribute('data-operation-plan'))operationForm('plan',b.dataset.operationPlan);
  if(b.hasAttribute('data-operation-cancel')&&mayLeave()){$('#dialog').close();clearEdits();}
  if(b.dataset.operationDay){operationDay=b.dataset.operationDay;render();}
  if(b.dataset.operationMonth){const d=new Date(operationDay.slice(0,7)+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+Number(b.dataset.operationMonth));operationDay=d.toISOString().slice(0,10);render();}
});
document.addEventListener('change',e=>{if(e.target.id==='operation-system'){systemFilter=e.target.value;operationSelected=systemFilter;operationSearch='';operationExpanded.add(systemFilter);render();}if(e.target.id==='operation-date'&&e.target.validity.valid&&e.target.value){operationDay=e.target.value;render();}});
document.addEventListener('submit',e=>{const form=e.target;if(form.id!=='system-operation-form')return;e.preventDefault();try{const data=Object.fromEntries(new FormData(form));if(form.dataset.kind==='node'){const n=SO.saveNode(state,data,form.dataset.id);operationSearch='';selectOperation(n.id);}else SO.savePlan(state,data,form.dataset.id);persistDemoState();clearEdits();$('#dialog').close();render();notify('운영현황에 반영했습니다.');}catch(error){form.querySelector('.error').textContent=error.message;}});

function placeOperation(id,parentId){
  try{const n=SO.moveNode(state,id,parentId),destination=SO.path(state,parentId);operationMove='';operationDrag='';operationSearch='';selectOperation(id);$('#dialog').close();persistDemoState();render();notify(n.name+' → '+destination+' 아래로 이동했습니다.');}catch(error){notify(error.message);}
}
function clearOperationDrag(){operationDrag='';document.querySelectorAll('.operation-drop-ready,.operation-drop-over').forEach(el=>el.classList.remove('operation-drop-ready','operation-drop-over'));}
document.addEventListener('dragstart',e=>{
  const handle=e.target.closest('[data-operation-move]');if(!handle)return;
  if(!SO.canEdit(state)){e.preventDefault();return;}
  operationDrag=handle.dataset.operationMove;e.dataTransfer.setData('text/plain',operationDrag);e.dataTransfer.effectAllowed='move';
  document.querySelectorAll('[data-operation-drop]').forEach(el=>el.classList.toggle('operation-drop-ready',SO.canMove(state,operationDrag,el.dataset.operationDrop)));
});
document.addEventListener('dragover',e=>{
  if(!operationDrag)return;const target=e.target.closest('[data-operation-drop]');
  document.querySelectorAll('.operation-drop-over').forEach(el=>el.classList.remove('operation-drop-over'));
  if(target&&SO.canMove(state,operationDrag,target.dataset.operationDrop)){e.preventDefault();e.dataTransfer.dropEffect='move';target.classList.add('operation-drop-over');}
});
document.addEventListener('dragleave',e=>{const target=e.target.closest('[data-operation-drop]');if(target&&!target.contains(e.relatedTarget))target.classList.remove('operation-drop-over');});
document.addEventListener('drop',e=>{
  if(!operationDrag)return;const target=e.target.closest('[data-operation-drop]'),id=operationDrag;e.preventDefault();clearOperationDrag();
  if(target)placeOperation(id,target.dataset.operationDrop);
});
document.addEventListener('dragend',clearOperationDrag);

document.addEventListener('input',e=>{if(e.target.id!=='operation-search')return;operationSearch=e.target.value;const tree=document.querySelector('.operation-tree');tree.innerHTML=operationTree()||'<li class="operation-empty">일치하는 구성이 없습니다.</li>';});
document.addEventListener('change',e=>{if(e.target.id==='operation-retired'){operationRetired=e.target.checked;render();}});
document.addEventListener('submit',e=>{const form=e.target;if(form.id!=='operation-remove-form')return;e.preventDefault();try{const action=SO.removeNode(state,form.dataset.id,new FormData(form).get('name'));operationSelected='';persistDemoState();clearEdits();$('#dialog').close();render();notify(action==='retire'?'운영 종료했습니다. 기록은 보존됩니다.':'항목을 삭제했습니다.');}catch(error){form.querySelector('.error').textContent=error.message;}});

function operationOverview(roots){return '<div class="operation-overview">'+roots.map(n=>{const nodes=operationNodes().filter(c=>!c.retired&&c.kind==='장비'&&SO.rootOf(state,c.id)?.id===n.id),plans=SO.plansOn(state,operationDay,n.id);return '<button data-operation-select="'+esc(n.id)+'"><strong>'+esc(n.name)+'</strong>'+operationBadge(n.status)+'<small>장비 '+nodes.length+'대 · '+operationDay+' 정비 '+plans.length+'건</small></button>';}).join('')+'</div>';}

document.addEventListener('click',e=>{if(e.target.closest('[data-open-operation-schedule]')){page='operations';operationTab='schedule';render();}});
