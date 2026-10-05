/* Saved model data only: exports do not read editable DOM tables or infer historical snapshots. */
let reportDay=M.today;
const reportValidDay=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
function reportSheet(name,headers,rows,scope,note){return {name,headers,rows,widths:headers.map(h=>/경로|제목|설명|근거|범위|내용|방안|작업명/.test(h)?42:22),meta:scope+' · 추출 '+new Date().toLocaleString('sv-SE',{timeZone:'Asia/Seoul'})+' KST · '+M.sessions[state.role].label,note:'시연 자료 · '+note};}
function maintenanceReport(range){
 if(state.role==='user')throw Error('정비 현황 조회 권한이 없습니다.');
 if(!reportValidDay(range.start)||!reportValidDay(range.end)||range.start>range.end||range.end>M.today)throw Error('조회 기간을 확인하세요. 시연 기준일까지 가능합니다.');
 const scope=range.start+' ~ '+range.end;
 if(state.role==='viewer'){
  const wings=V.wings.filter(w=>!viewerFilters.wing||w.id===viewerFilters.wing);
  const summaries=wings.flatMap(w=>V.departments.map(d=>{const s=V.summarize(w,range.start,range.end,d);return [w.name,d,s.total,s.completed,s.pending,s.carry];}));
  const rows=wings.flatMap(w=>V.listTasks(w,range.start,range.end).map(t=>[w.name,t.department,t.id,t.title,ReportXlsx.date(t.created),t.completed&&t.completed<=range.end?'조치 완료':'작업 중',ReportXlsx.date(t.completed&&t.completed<=range.end?t.completed:''),t.completed&&t.completed<=range.end?t.result:'원인 확인 및 조치 진행 중']));
  return [reportSheet('정비 요약',['비행단','부서','관리대상','완료','미완료','이월'],summaries,scope+' · '+(wings.length===1?wings[0].name:'전체 비행단'),'제17비행단은 BNOC 저장자료, 그 외는 독립 예시. 기간 시작 이월 포함.'),reportSheet('정비 내역',['비행단','부서','작업 ID','작업명','배정일','기간 말 상태','완료일','조치 내용'],rows,scope,'기간 말 상태 기준. 부서별 그래프 선택은 적용하지 않은 전체 집계 대상.')];
 }
 const s=M.summarize(state,range),scopeText=scope+' · 가상 A대대 · '+M.departmentName(range.department||M.sessions[state.role].department).replace('미지정','전체 부서');
 return [reportSheet('정비 요약',['관리대상','이월','신규 배정','조치 완료','미완료','주관','공조'],[[s.total,s.carry,s.added,s.completed,s.pending,s.primary,s.cooperation]],scopeText,'기간 시작 미완료 + 기간 중 신규 배정. 작업 ID 기준. 그래프 상세 선택은 제외.'),reportSheet('정비 내역',['작업 ID','접수 ID','부서','요청 제목','참여','태그','배정일','기간 말 상태','완료일'],s.rows.map(t=>[t.id,t.requestId,M.departmentName(t.department),M.title(state.requests.find(r=>r.id===t.requestId)),t.participation,t.tag||'미지정',ReportXlsx.date(t.created),t.status,ReportXlsx.date(t.completed&&t.completed<=s.cutoff?t.completed:'')]),scopeText,'상태와 부서는 기간 말 기준. 과거 조치 메모 이력이 없어 메모는 포함하지 않음.')];
}
function dailyReport(day){
 if(!reportValidDay(day))throw Error('조회 날짜를 확인하세요.');
 const scope=day+' · 가상 A대대',D=ReportXlsx.date;
 if(state.role==='viewer'){
  const wings=V.wings.filter(w=>!viewerFilters.wing||w.id===viewerFilters.wing);
  return [reportSheet('운영현황',['비행단','체계','하위 구성','장비','관리번호','위치','현재 확인 상태','상태 기준'],wings.flatMap(w=>w.operationDetails.flatMap(s=>s.children.flatMap(c=>c.equipment.map(e=>[w.name,s.name,c.name,e.name,e.asset,e.location,e.status,w.updated])))),day+' · 상위 조회 범위','제17비행단은 BNOC 저장자료, 그 외는 독립 예시이며 선택일의 과거 상태가 아님.'),reportSheet('정비 예정 영향',['비행단','체계','정비명','시작','종료','예상 영향','영향 범위'],wings.flatMap(w=>w.operationDetails.flatMap(s=>s.plans.filter(p=>p.start.slice(0,10)<=day&&p.end>day+'T00:00').map(p=>[w.name,s.name,p.title,D(p.start),D(p.end),p.impact,p.scope]))),day+' · 상위 조회 범위','선택일과 겹치는 등록 일정. 실제 장애 확정이 아님.')];
 }
 if(!canVisit('duty')||!canVisit('operations'))throw Error('일일 현황 조회 권한을 확인하세요.');
 const people=(state.role==='user'?[]:state.personnel).slice().sort((a,b)=>a.department.localeCompare(b.department)||M.ranks.indexOf(a.rank)-M.ranks.indexOf(b.rank));
 const roster=state.dutyRosters[day],nodes=SO.ensure(state).nodes;
 const sheets=[reportSheet('병력 현황',['부서','계급','성명','선택일 상태','상태 근거','확인 여부'],people.map(p=>[M.departmentName(p.department),p.rank,p.name,M.personnelStatusOn(state,p.id,day),M.personnelOffReasonOn(state,p.id,day)||'기간별 지정 또는 기본 주간',state.personnelChecks[day]?'확인 완료':'확인 전']),scope,'병력 검색·선택 여부와 무관한 조회 허용 전체 명단. 명단·계급·소속은 현재 정보.'),reportSheet('근무자 야간',['구역·직책','근무 구분','계급','성명','소속','전화번호','근무 시작','근무 종료'],roster?roster.rows.map(r=>[r.position,r.kind||'당직',r.rank,r.name,r.unit||roster.unit,r.phone,D(roster.start),D(roster.end)]):[],scope,roster?'선택일에 시작하는 등록 편성. 다음 날 종료시각 포함.':'이 날짜의 근무 편성은 미등록입니다. 기본 편성을 만들어 내보내지 않습니다.'),reportSheet('운영현황',['체계','구성 경로','종류','이름','설명·관리번호','현재 확인 상태','확인 시각','운영 여부'],nodes.map(n=>[SO.rootOf(state,n.id)?.name,SO.path(state,n.id),n.kind,n.name,n.note,n.status,D(n.updated),n.retired?'운영 종료':'운영 중']),scope,'구성과 상태는 현재 저장값(운영 종료 포함). 선택일의 과거 운영상태가 아님.'),reportSheet('정비 예정 영향',['구성 경로','정비명','시작','종료','예상 영향','영향 범위','우회 방안·내용'],SO.plansOn(state,day).map(p=>[SO.path(state,p.target),p.title,D(p.start),D(p.end),p.impact,p.scope,p.note]),scope,'선택일과 겹치는 예정 일정. 완료·취소 제외. 실제 장애 확정이 아님.')];
 if(state.role!=='user'&&day<=M.today)sheets.push(...maintenanceReport({start:day,end:day,department:''}));
 return sheets.filter(sheet=>state.role!=='user'||sheet.name!=='병력 현황');
}
const renderBeforeReports=render;
render=function(){renderBeforeReports();if(!['dashboard','personnel','duty','operations','statistics'].includes(page))return;
 const statistics=page==='statistics',viewer=state.role==='viewer';if(statistics&&state.role==='user')return;
 const day=['personnel','duty'].includes(page)?staffingDate:page==='operations'?(viewer?viewerOperationDay:operationDay):reportDay;
 const box=document.createElement('section');box.className='card report-export-toolbar';
 box.innerHTML=statistics?'<div><strong>정비 현황 엑셀</strong><p class="muted">조회 적용된 시작일~종료일·부서/비행단 범위. 그래프 상세 선택 제외.</p></div><button data-report-maintenance>기간별 정비 현황 다운로드</button>':'<label>내보낼 기준일 <input id="report-day" type="date" value="'+esc(day)+'" required></label><button data-report-daily>'+(viewer?'운영현황 엑셀 다운로드':'일일 현황 통합 다운로드')+'</button><p class="muted">'+(viewer?'허용 비행단의 운영현황·정비 예정 영향':(state.role==='user'?'근무자(야간)·운영현황·정비 예정 영향':'병력·근무자(야간)·운영현황·정비 예정 영향')+(state.role!=='user'?' + 기준일까지의 당일 정비 현황':''))+'<br>운영상태는 현재 확인값. 편집 중인 내용은 저장 후 내려받으세요.</p>';
 $('#content').prepend(box);
};
document.addEventListener('click',async e=>{const button=e.target.closest('[data-report-daily],[data-report-maintenance]');if(!button)return;
 try{if(hasEdits())throw Error('편집 중인 내용을 먼저 저장하거나 취소하세요.');
 let sheets,filename;
 if(button.hasAttribute('data-report-daily')){const input=$('#report-day');if(!input.reportValidity())return;reportDay=input.value;sheets=dailyReport(reportDay);filename='일일현황_'+reportDay+'.xlsx';}
 else{const applied=state.role==='viewer'?viewerFilters:filters,form=$(state.role==='viewer'?'#viewer-filter':'#statistics-form');if(form){const input=Object.fromEntries(new FormData(form));if(['start','end',state.role==='viewer'?'wing':'department'].some(k=>String(input[k]||'')!==String(applied[k]||'')))throw Error('변경한 조회 조건을 먼저 조회 버튼으로 적용하세요.');}sheets=maintenanceReport(applied);filename='정비현황_'+applied.start+'_'+applied.end+'.xlsx';}
 button.disabled=true;const blob=await ReportXlsx.build(sheets),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);notify('엑셀 파일을 생성했습니다.');
 }catch(error){notify(error.message);}finally{button.disabled=false;}
});
