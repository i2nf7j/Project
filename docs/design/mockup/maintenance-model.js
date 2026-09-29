/* 가상 업무 모델. 실제 인증·서버 저장을 대신하지 않습니다. */
(() => {
  const today = '2026-09-16';
  const types = ['점검','증설','설치','이전','불용','기타'];
  const departments = [
    {id:'network', name:'네트워크체계팀', duties:'PC·모니터 정비, 랜선 점검, PC 포맷', symptoms:'화면 출력 불가, PC 부팅 불가, 유선 연결 불가', phones:[['접수 문의','DEMO-1101'],['장비 담당','DEMO-1102']], tags:['PC','모니터','네트워크','기타']},
    {id:'radio', name:'무선체계팀', duties:'무선 장비 점검·설치 (시연 예시)', symptoms:'송수신 불량, 무선 장비 전원 불량', phones:[['접수 문의','DEMO-1201'],['장비 담당','DEMO-1202']], tags:['무선 장비','안테나','기타']},
    {id:'transmission', name:'전송체계팀', duties:'전송 장비·회선 점검 (시연 예시)', symptoms:'회선 단절, 전송 장비 경보', phones:[['접수 문의','DEMO-1301'],['회선 담당','DEMO-1302']], tags:['회선 점검','전송 장비','기타']},
    {id:'security', name:'사이버(정보보호)팀', duties:'정보보호 프로그램·보안 설정 점검 (시연 예시)', symptoms:'백신 업데이트 실패, 보안 프로그램 오류', phones:[['접수 문의','DEMO-1401']], tags:['정보보호 프로그램','보안 설정','기타']}
  ];
  const sessions = {
    bnoc:{label:'BNOC', wing:'17', department:null}, admin:{label:'관리자', wing:'17', department:null},
    user:{label:'일반 사용자 · 가상A', wing:'17', department:null},
    network:{label:'정비사 · 네트워크', wing:'17', department:'network'},
    radio:{label:'정비사 · 무선', wing:'17', department:'radio'},
    transmission:{label:'정비사 · 전송', wing:'17', department:'transmission'},
    cyber:{label:'사이버(정보보호) 특기', wing:'17', department:'security'},
    viewer:{label:'상위 조회자', wing:null, department:null}
  };
  const levels = [
    {value:5, roman:'V', name:'정상', english:'Normal', description:'통상적인 활동 상태'},
    {value:4, roman:'IV', name:'알파', english:'Alpha', description:'위험이 증가된 상태'},
    {value:3, roman:'III', name:'브라보', english:'Bravo', description:'특정한 공격 위험이 감지된 상태'},
    {value:2, roman:'II', name:'찰리', english:'Charlie', description:'제한적인 공격을 받은 상태'},
    {value:1, roman:'I', name:'델타', english:'Delta', description:'전면적인 공격이 발생한 비상 상태'}
  ];
  const departmentName = id => departments.find(d => d.id === id)?.name || '미지정';
  const validTag = (department, tag) => !tag || Boolean(departments.find(d => d.id === department)?.tags.includes(tag));
  const title = r => `[${r.requester}] ${r.target.trim()}${r.quantity ? ` ${r.quantity}${r.unit.trim()}` : ''} ${r.type} 요청`;
  function state() {
    const result = {role:'bnoc', cpcon:{level:5, applied:'2026-09-16T09:00', note:'시연용 정상 단계'}, requests:[], tasks:[], cooperation:[], sequence:20};
    const fixtures = [
      ['network','모니터','증설',2,'2026-09-02','2026-09-04','모니터'],
      ['network','PC','점검',1,'2026-08-28','2026-09-03','PC'],
      ['network','행정망','점검',null,'2026-09-09',null,'네트워크'],
      ['radio','무선 장비','설치',3,'2026-09-07','2026-09-10','무선 장비'],
      ['radio','안테나','이전',1,'2026-09-14',null,'안테나'],
      ['transmission','전송 장비','점검',1,'2026-08-25',null,'전송 장비'],
      ['transmission','회선','점검',null,'2026-09-11','2026-09-15','회선 점검'],
      ['security','보안 프로그램','점검',null,'2026-09-15',null,null]
    ];
    fixtures.forEach(([department,target,type,quantity,created,completed,tag], i) => {
      const id = `R-DEMO-${String(i+1).padStart(3,'0')}`;
      result.requests.push({id, requester:'가상 A부서', owner:'user', target, type, quantity, unit:'대', description:`${target} ${type} 관련 가상 요청입니다.`, wish:department, tag, primary:department, created, closed:completed});
      result.tasks.push({id:`W-DEMO-${String(i+1).padStart(3,'0')}`, requestId:id, department, tag, participation:'주관', created, scheduled:created, completed, confirmed:true, history:[{date:created,status:'작업 예정'}, {date:created,status:completed?'작업 중':(i===5?'보류':'작업 중')}, ...(completed?[{date:completed,status:'조치 완료'}]:[])], departments:[{date:created,department}], note: i===5?'점검 부품 도착 대기':'가상 작업 이력'});
    });
    result.requests.push({id:'R-DEMO-009', requester:'가상 A부서', owner:'user', target:'모니터', type:'증설', quantity:2, unit:'대', description:'모니터 2대 증설해주세요~~', wish:'network', tag:'모니터', primary:null, created:today, closed:null});
    result.requests.push({id:'R-DEMO-010', requester:'가상 B부서', owner:'other', target:'장비', type:'기타', quantity:null, unit:'대', description:'담당 부서를 모르겠습니다. 확인 부탁드립니다.', wish:null, tag:null, primary:null, created:today, closed:null});
    result.tasks.push({id:'W-DEMO-009', requestId:'R-DEMO-003', department:'transmission', tag:'회선 점검', participation:'공조', created:'2026-09-10', scheduled:'2026-09-10', completed:null, confirmed:true, history:[{date:'2026-09-10',status:'작업 중'}], departments:[{date:'2026-09-10',department:'transmission'}], note:'행정망 장애의 회선 구간 확인'});
    result.cooperation.push({id:'C-DEMO-001', requestId:'R-DEMO-003', from:'network', to:'security', reason:'보안 프로그램의 연결 차단 여부 확인', status:'대기'});
    return result;
  }
  const canAssign = s => ['bnoc','admin'].includes(s.role);
  const canSetCpcon = s => ['admin','cyber'].includes(s.role);
  const canReadTask = (s,t) => ['bnoc','admin'].includes(s.role) || sessions[s.role].department === t.department;
  const canWork = (s,t) => canAssign(s) || sessions[s.role].department === t.department;
  const statusAt = (t, date) => t.history.filter(h => h.date <= date).at(-1)?.status || '작업 예정';
  const departmentAt = (t,date) => t.departments.filter(h => h.date <= date).at(-1)?.department || t.department;
  function requireCondition(condition, message) {if (!condition) throw new Error(message);}
  function createRequest(s, data) {
    requireCondition(s.role === 'user', '일반 사용자 역할에서 요청을 등록하세요.');
    requireCondition(data.target?.trim() && types.includes(data.type) && data.description?.trim(), '요청 대상·유형·상세 내용을 입력하세요.');
    const quantity = data.quantity === '' || data.quantity == null ? null : Number(data.quantity);
    requireCondition(quantity === null || (Number.isInteger(quantity) && quantity > 0 && data.unit?.trim()), '수량은 양의 정수이며 수량 입력 시 단위가 필요합니다.');
    requireCondition(!data.wish || departments.some(d=>d.id===data.wish), '희망 부서를 확인하세요.');
    requireCondition(validTag(data.wish,data.tag), '희망 부서에 맞는 태그를 선택하세요.');
    const request = {...data, id:`R-DEMO-${++s.sequence}`, owner:'user', requester:'가상 A부서', target:data.target.trim(), quantity, unit:data.unit?.trim() || '대', primary:null, created:today, closed:null};
    s.requests.push(request);
    return request;
  }
  function assign(s, id, department, tag) {
    requireCondition(canAssign(s), 'BNOC 또는 관리자만 배정할 수 있습니다.');
    const r = s.requests.find(r=>r.id===id);
    requireCondition(r && !r.closed && departments.some(d=>d.id===department), '배정 가능한 요청과 주관 부서를 확인하세요.');
    requireCondition(validTag(department,tag), '주관 부서에 맞는 태그를 선택하세요.');
    const existing = s.tasks.find(t=>t.requestId===id && t.participation==='주관');
    requireCondition(!existing || !existing.completed, '조치 완료한 작업은 재배정할 수 없습니다.');
    requireCondition(!s.tasks.some(t=>t.requestId===id && t.participation==='공조' && t.department===department), '이미 공조 중인 부서입니다.');
    requireCondition(!s.cooperation.some(c=>c.requestId===id && c.to===department && c.status==='대기'), '이 부서의 공조 요청을 먼저 처리해야 합니다.');
    r.primary=department; r.tag=tag || null;
    if (existing) {
      if (existing.department!==department) {existing.departments.push({date:today,department}); existing.confirmed=false;}
      existing.department=department; existing.tag=r.tag;
    } else s.tasks.push({id:`W-DEMO-${++s.sequence}`, requestId:id, department, tag:r.tag, participation:'주관', created:today, scheduled:today, completed:null, confirmed:false, history:[{date:today,status:'작업 예정'}], departments:[{date:today,department}], note:''});
  }
  function requestCooperation(s, taskId, to, reason) {
    const t=s.tasks.find(t=>t.id===taskId);
    requireCondition(t && canWork(s,t) && !s.requests.find(r=>r.id===t.requestId).closed, '공조 요청 권한을 확인하세요.');
    requireCondition(departments.some(d=>d.id===to) && to!==t.department && reason.trim(), '다른 부서와 공조 사유를 입력하세요.');
    requireCondition(!s.tasks.some(w=>w.requestId===t.requestId && w.department===to) && !s.cooperation.some(c=>c.requestId===t.requestId && c.to===to && c.status==='대기'), '이미 참여 중이거나 공조 요청을 받은 부서입니다.');
    s.cooperation.push({id:`C-DEMO-${++s.sequence}`, requestId:t.requestId, from:t.department, to, reason:reason.trim(), status:'대기'});
  }
  function accept(s,id,tag) {
    const c=s.cooperation.find(c=>c.id===id);
    requireCondition(c && sessions[s.role].department===c.to, '공조받은 부서의 역할에서 수락하세요.');
    requireCondition(c.status==='대기', '이미 처리된 공조 요청입니다.');
    requireCondition(validTag(c.to,tag), '공조 부서에 맞는 태그를 선택하세요.');
    c.status='수락';
    s.tasks.push({id:`W-DEMO-${++s.sequence}`, requestId:c.requestId, department:c.to, tag:tag || null, participation:'공조', created:today, scheduled:today, completed:null, confirmed:false, history:[{date:today,status:'작업 예정'}], departments:[{date:today,department:c.to}], note:''});
  }
  function updateTask(s,id,{tag,status,note}) {
    const t=s.tasks.find(t=>t.id===id);
    requireCondition(t && canWork(s,t) && !t.completed, '수정할 수 없는 작업입니다.');
    requireCondition(validTag(t.department,tag), '담당 부서의 태그를 선택하세요.');
    requireCondition(['작업 예정','작업 중','보류','조치 완료'].includes(status), '상태를 확인하세요.');
    requireCondition(!['보류','조치 완료'].includes(status) || note.trim(), '보류 사유 또는 조치 결과를 입력하세요.');
    t.tag=tag || null; t.note=note.trim(); t.confirmed=true;
    t.history.push({date:today,status}); if (status==='조치 완료') t.completed=today;
  }
  function close(s,id) {
    const r=s.requests.find(r=>r.id===id), tasks=s.tasks.filter(t=>t.requestId===id);
    requireCondition(canAssign(s) && r && !r.closed, '종결 권한과 접수 상태를 확인하세요.');
    requireCondition(tasks.length && tasks.every(t=>t.completed) && !s.cooperation.some(c=>c.requestId===id && c.status==='대기'), '모든 작업 완료와 공조 요청 처리가 필요합니다.');
    r.closed=today;
  }
  function setCpcon(s,level,applied,note) {
    requireCondition(canSetCpcon(s), '관리자 또는 사이버(정보보호) 특기만 설정할 수 있습니다.');
    requireCondition(levels.some(l=>l.value===Number(level)) && applied, '단계와 적용 시각을 입력하세요.');
    s.cpcon={level:Number(level),applied,note:note.trim()};
  }
  function summarize(s,{start,end,department=''}) {
    requireCondition(/^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && start<=end, '시작일과 종료일을 확인하세요.');
    const cutoff=end<today?end:today;
    const allowed=['bnoc','admin','viewer'].includes(s.role) ? department : sessions[s.role].department;
    const tasks=s.role==='user'?[]:s.tasks.filter(t=>t.created<=cutoff && (!t.completed || t.completed>=start) && (!allowed || departmentAt(t,cutoff)===allowed));
    const rows=tasks.map(t=>({...t, department:departmentAt(t,cutoff), status:statusAt(t,cutoff)}));
    return {rows, cutoff, total:rows.length, carry:rows.filter(t=>t.created<start).length, added:rows.filter(t=>t.created>=start).length, completed:rows.filter(t=>t.completed && t.completed<=cutoff).length, pending:rows.filter(t=>!t.completed || t.completed>cutoff).length, primary:rows.filter(t=>t.participation==='주관').length, cooperation:rows.filter(t=>t.participation==='공조').length};
  }
  const api={today,types,departments,sessions,levels,departmentName,validTag,title,state,canAssign,canSetCpcon,canReadTask,canWork,statusAt,departmentAt,createRequest,assign,requestCooperation,accept,updateTask,close,setCpcon,summarize};
  if (typeof module!=='undefined') module.exports=api;
  else window.Maintenance=api;
})();
