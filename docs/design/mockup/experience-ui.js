/* Inbox, appearance preference, and a dedicated read-only display layout. */
let displaySection='overview',displayReturnPage='dashboard';
const announcedNotices=new Set();
function updateExperienceTools(){
  const dark=document.documentElement.dataset.theme==='dark',toggle=$('#theme-toggle');
  if(toggle){toggle.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(dark?'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>':'<path d="M20.5 13.5A8.5 8.5 0 0 1 10.5 3.5a8.5 8.5 0 1 0 10 10Z"/>')+'</svg><span>'+(dark?'라이트':'다크')+'</span>';toggle.title=dark?'라이트 모드로 전환':'다크 모드로 전환';toggle.setAttribute('aria-pressed',String(dark));toggle.setAttribute('aria-label',dark?'라이트 모드로 전환':'다크 모드로 전환');}
  const unread=M.inbox.unread(state),bell=$('#inbox-button');
  if(bell){bell.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span>알림</span><span class="badge blue" aria-live="polite">'+unread.length+'</span>';bell.title='업무 알림 '+unread.length+'개 읽지 않음';bell.setAttribute('aria-label',bell.title);}
  const fresh=unread.filter(n=>!announcedNotices.has(state.role+':'+n.id));
  if(fresh.length){fresh.forEach(n=>announcedNotices.add(state.role+':'+n.id));queueMicrotask(()=>notify('새 업무 알림 '+fresh.length+'건 · 우측 상단 알림에서 확인하세요.'));}
}
function inboxDialog(){
  const rows=M.inbox.list(state);
  modal('업무 알림', '<div class="inbox-toolbar"><p>읽음 처리는 작업 확인·완료와 별도입니다.</p><button data-inbox-read-all '+(!M.inbox.unread(state).length?'disabled':'')+'>모두 읽음</button></div><div class="inbox-list">'+(rows.length?rows.map(n=>'<button class="inbox-item '+(n.readBy.includes(state.role)?'':'unread')+'" data-inbox-open="'+esc(n.id)+'"><span>'+esc(n.kind)+' · '+(n.readBy.includes(state.role)?'읽음':'읽지 않음')+'</span><strong>'+esc(n.title)+'</strong><small>'+esc(n.requestId)+' · '+esc(new Date(n.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))+'</small></button>').join(''):'<p class="empty">받은 알림이 없습니다.<br>새 요청·배정부터 알림이 쌓입니다.</p>')+'</div><p class="muted">브라우저 저장 시연 · 계정 전환으로 수신 확인 · 다른 PC 실시간 전송은 미연결</p>');
}
function openInboxItem(id){
  const n=M.inbox.list(state).find(n=>n.id===id);if(!n)return;
  M.inbox.read(state,id);persistDemoState();$('#dialog').close();
  const task=state.tasks.find(t=>t.id===n.taskId);
  if(n.taskId&&(!task||!M.canReadTask(state,task))){render();notify('재배정 등으로 현재 조회할 수 없는 작업입니다.');return;}
  if(document.body.classList.contains('display')){document.body.classList.remove('display');$('#display').textContent='▣ 전시기 모드';}
  page=n.taskId||n.kind==='공조 수신'?'progress':'reception';workQueue='';render();if(n.taskId)openTask(n.taskId);else if(n.kind!=='공조 수신')openRequest(n.requestId);
}
const displayCard=(title,body)=>'<section class="card display-panel"><h2>'+title+'</h2><div class="display-panel-body">'+body+'</div></section>';
function displayOperations(){
  if(state.role==='viewer')return V.wings.filter(w=>!viewerFilters.wing||w.id===viewerFilters.wing).map(w=>'<div class="display-wing"><h3>'+esc(w.name)+'</h3>'+V.systems.map((name,i)=>'<div class="display-row"><span>'+esc(name)+'</span>'+viewerStatus(w.statuses[i])+'</div>').join('')+'</div>').join('');
  return operationNodes().filter(n=>!n.parent&&!n.retired).map(n=>'<div class="display-row"><div><strong>'+esc(n.name)+'</strong><small>'+esc(n.updated.replace('T',' '))+' 확인</small></div>'+operationBadge(n.status)+'</div>').join('')||'<p>등록된 체계가 없습니다.</p>';
}
function displayMaintenance(){
  if(state.role==='viewer')return V.wings.filter(w=>!viewerFilters.wing||w.id===viewerFilters.wing).map(w=>{const s=V.summarize(w,viewerFilters.start,viewerFilters.end);return '<div class="display-row"><strong>'+esc(w.name)+'</strong><span>완료 '+s.completed+' / 대상 '+s.total+'</span></div>';}).join('');
  if(state.role==='user')return visibleRequests().filter(r=>!r.closed&&!r.cancelled).map(r=>'<div class="display-row"><span>'+esc(M.title(r))+'</span>'+badge(requestStatus(r))+'</div>').join('')||'<p>미종결 요청 없음</p>';
  return visibleTasks().filter(t=>!t.completed).map(t=>'<div class="display-row"><div><strong>'+esc(M.title(requestOf(t)))+'</strong><small>'+esc(M.departmentName(t.department))+'</small></div>'+badge(taskStatus(t))+'</div>').join('')||'<p>미완료 작업 없음</p>';
}
function displayDuty(){
  if(state.role==='viewer')return '<p>상위 조회자에게 근무자 명단은 제공하지 않습니다.</p>';
  const d=state.dutyRosters[M.today];return d?'<p class="muted">'+esc(d.start.replace('T',' '))+' ~ '+esc(d.end.replace('T',' '))+'</p>'+d.rows.map(r=>'<div class="display-row"><div><strong>'+esc(r.position)+'</strong><small>'+esc(r.unit||d.unit)+'</small></div><span>'+esc(r.rank+' '+r.name)+'<small>'+esc(r.phone)+'</small></span></div>').join(''):'<p>'+M.today+' 등록된 근무 편성 없음</p>';
}
function displayInstructions(){return instructionMainPositions.map(position=>{const row=instructionRows().filter(r=>r.position===position&&(r.type||'instruction')==='instruction').sort((a,b)=>b.date.localeCompare(a.date))[0];return '<div class="display-row"><div><small>'+esc(position)+(row?' · '+esc(row.date):'')+'</small><strong>'+esc(row?.title||'등록된 지시사항 없음')+'</strong></div></div>';}).join('');}
function displayDashboard(){
  const viewer=state.role==='viewer',sections=[['overview','종합'],['operations','운영현황'],['maintenance','정비현황'],...(!viewer?[['duty','근무자']]:[])];
  if(!sections.some(([id])=>id===displaySection))displaySection='overview';
  const counts=viewer?V.wings.filter(w=>!viewerFilters.wing||w.id===viewerFilters.wing).reduce((s,w)=>{const x=V.summarize(w,viewerFilters.start,viewerFilters.end);s.total+=x.total;s.pending+=x.pending;return s;},{total:0,pending:0}):{total:visibleRequests().filter(r=>!r.closed&&!r.cancelled).length,pending:state.role==='user'?visibleRequests().filter(r=>!r.primary&&!r.cancelled&&!r.closed).length:visibleTasks().filter(t=>!t.completed).length};
  const level=M.levels.find(l=>l.value===state.cpcon.level),site=G.forWing(M.sessions[state.role].wing);
  const metrics=viewer?[['조회 비행단',V.wings.filter(w=>!viewerFilters.wing||w.id===viewerFilters.wing).length],['관리대상',counts.total],['미완료',counts.pending],['기준일',V.asOf]]:[['미종결 요청',counts.total],[state.role==='user'?'배정 대기':'미완료 작업',counts.pending],['CPCON',level.roman+' · '+level.name],['GPS',site?G.statuses[site.status].label:'미설정']];
  const content=displaySection==='overview'?displayCard('체계별 운영상태',displayOperations())+displayCard(viewer?'비행단 정비 집계':'진행 정비 · 조회 허용 범위',displayMaintenance())+displayCard(viewer?'자료 기준':'근무자(야간)',viewer?'<p>제17비행단은 BNOC 연동 · 다른 비행단은 예시</p><p>정비 '+esc(viewerFilters.start)+' ~ '+esc(viewerFilters.end)+'</p><p>운영 '+esc(V.asOf)+' 14:00</p>':displayDuty())+displayCard('지시사항',displayInstructions()):displayCard(sections.find(([id])=>id===displaySection)[1],displaySection==='operations'?displayOperations():displaySection==='maintenance'?displayMaintenance():displayDuty());
  return '<div class="display-controls"><nav aria-label="전시기 화면">'+sections.map(([id,label])=>'<button data-display-section="'+id+'" aria-pressed="'+(id===displaySection)+'">'+label+'</button>').join('')+'</nav><span>업무 기준 '+M.today+' · 시연 자료</span></div><div class="display-metrics">'+metrics.map(([label,value])=>'<div'+(label==='CPCON'?' class="display-status display-cpcon-'+level.value+'"':label==='GPS'?' class="display-status display-gps-'+(site?.status||'missing')+'"':'')+'><small>'+label+'</small><strong>'+esc(value)+'</strong></div>').join('')+'</div><div class="display-board '+(displaySection==='overview'?'':'single')+'">'+content+'</div>';
}
const renderBeforeExperience=render;
render=function(){renderBeforeExperience();updateExperienceTools();if(document.body.classList.contains('display'))$('#content').innerHTML=displayDashboard();};
document.addEventListener('DOMContentLoaded',()=>{
  const tools=document.querySelector('.topbar .tools');
  const appearance=document.createElement('div');appearance.className='appearance-tools';appearance.innerHTML='<button id="inbox-button" type="button" aria-haspopup="dialog">알림</button><button id="theme-toggle" type="button" aria-pressed="false">☾ 다크</button>';
  tools.insertBefore(appearance,$('#display'));updateExperienceTools();
  $('#theme-toggle').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('ict-theme',dark?'dark':'light');}catch{notify('테마 설정을 저장하지 못했습니다. 현재 화면에만 적용합니다.');}updateExperienceTools();};
  $('#inbox-button').onclick=()=>{if(mayLeave())inboxDialog();};
  $('#display').onclick=()=>{const on=!document.body.classList.contains('display');if(on){displayReturnPage=page;displaySection='overview';page='dashboard';}else page=displayReturnPage;document.body.classList.toggle('display',on);$('#display').textContent=on?'전시기 종료':'▣ 전시기 모드';render();};
});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.displaySection){displaySection=b.dataset.displaySection;render();}
  if(b.dataset.inboxOpen)openInboxItem(b.dataset.inboxOpen);
  if(b.hasAttribute('data-inbox-read-all')){M.inbox.list(state).forEach(n=>M.inbox.read(state,n.id));persistDemoState();updateExperienceTools();inboxDialog();}
});
