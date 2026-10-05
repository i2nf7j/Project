const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../docs/design/mockup/maintenance-model.js');

test('제목은 여섯 유형과 선택 수량을 사용하고 본문·태그는 사용하지 않는다',()=>{
  const request={requester:'A부서',target:' 모니터 ',quantity:2,unit:'대',description:'증설해주세요~~',tag:null};
  for(const type of M.types)assert.equal(M.title({...request,type}),`[A부서] 모니터 2대 ${type} 요청`);
  assert.equal(M.title({...request,type:'증설',quantity:null}),'[A부서] 모니터 증설 요청');
});

test('요청 등록 시 수량·부서 태그 검증과 신청 부서 고정',()=>{
  const s=M.state();s.role='user';
  const data={requester:'다른 부서',type:'증설',target:'모니터',quantity:'2',unit:'대',description:'모니터 2대 증설해주세요~~',wish:'network',tag:'모니터'};
  for(const quantity of ['0','-1','1.5','숫자아님'])assert.throws(()=>M.createRequest(s,{...data,quantity}));
  assert.throws(()=>M.createRequest(s,{...data,unit:''}));
  assert.throws(()=>M.createRequest(s,{...data,tag:'안테나'}));
  const r=M.createRequest(s,data);assert.equal(r.requester,'가상 A부서');assert.equal(r.quantity,2);assert.equal(s.tasks.length,9);
  assert.equal(M.createRequest(s,{...data,quantity:'',unit:'',wish:'',tag:''}).quantity,null);
});

test('BNOC 최초 주관 배정과 재배정은 접수·작업을 복제하지 않는다',()=>{
  const s=M.state();M.assign(s,'R-DEMO-009','network','모니터');
  assert.equal(s.tasks.length,10);assert.equal(s.tasks.at(-1).participation,'주관');
  assert.throws(()=>M.assign(s,'R-DEMO-009','radio','모니터'));
  M.assign(s,'R-DEMO-009','radio',null);assert.equal(s.tasks.length,10);
  assert.equal(s.tasks.at(-1).tag,null);assert.equal(s.requests.find(r=>r.id==='R-DEMO-009').tag,null);
});

test('공조 요청은 집계 제외, 수신 부서 수락 시 독립 태그의 작업 한 건 생성',()=>{
  const s=M.state();s.role='network';
  M.requestCooperation(s,'W-DEMO-003','radio','무선 구간 확인');const c=s.cooperation.at(-1);
  assert.equal(s.tasks.length,9);assert.throws(()=>M.accept(s,c.id,'무선 장비'));
  s.role='radio';M.accept(s,c.id,'무선 장비');assert.equal(s.tasks.length,10);
  assert.equal(s.tasks.at(-1).tag,'무선 장비');assert.equal(s.tasks.at(-1).participation,'공조');
  assert.equal(s.requests.find(r=>r.id===c.requestId).tag,'네트워크');
  assert.throws(()=>M.accept(s,c.id,'무선 장비'));assert.equal(s.tasks.length,10);
});

test('타 부서 작업 수정 거부와 공조 태그 독립',()=>{
  const s=M.state();s.role='network';assert.throws(()=>M.updateTask(s,'W-DEMO-009',{tag:'회선 점검',status:'작업 중',note:''}));
  s.role='transmission';M.updateTask(s,'W-DEMO-009',{tag:null,status:'조치 완료',note:'연결 확인 완료'});
  assert.equal(s.requests.find(r=>r.id==='R-DEMO-003').tag,'네트워크');
  assert.equal(s.tasks.find(t=>t.id==='W-DEMO-003').tag,'네트워크');
  assert.throws(()=>M.updateTask(s,'W-DEMO-009',{tag:null,status:'작업 중',note:''}));
});

test('종결은 모든 작업 완료 후 BNOC가 처리',()=>{
  const s=M.state();M.assign(s,'R-DEMO-009','network','모니터');const t=s.tasks.at(-1);
  assert.throws(()=>M.close(s,'R-DEMO-009'));
  s.role='network';M.updateTask(s,t.id,{tag:'모니터',status:'조치 완료',note:'증설 완료'});
  assert.throws(()=>M.close(s,'R-DEMO-009'));s.role='bnoc';M.close(s,'R-DEMO-009');
  assert.equal(s.requests.find(r=>r.id==='R-DEMO-009').closed,M.today);
});

test('CPCON은 관리자와 사이버 특기만 설정',()=>{
  const s=M.state();for(const role of ['bnoc','user','network','viewer']){s.role=role;assert.throws(()=>M.setCpcon(s,1,'2026-09-16T14:30','시연'));}
  for(const role of ['admin','cyber']){s.role=role;M.setCpcon(s,2,'2026-09-16T14:30','찰리 시연');assert.equal(s.cpcon.level,2);}
  assert.throws(()=>M.setCpcon(s,7,'2026-09-16T14:30',''));
});

test('기간 대상은 이월+신규 고유 작업이며 과거 완료 상태를 재현',()=>{
  const s=M.state();const month=M.summarize(s,{start:'2026-09-01',end:'2026-09-16'});
  assert.equal(month.total,9);assert.equal(month.carry,2);assert.equal(month.added,7);assert.equal(month.completed,4);assert.equal(month.pending,5);
  const past=M.summarize(s,{start:'2026-09-01',end:'2026-09-02',department:'network'});
  assert.equal(past.total,2);assert.equal(past.completed,0);assert.equal(past.pending,2);
  assert.ok(past.rows.every(t=>t.status!=='조치 완료'));
  assert.equal(M.summarize(s,{start:'2026-09-03',end:'2026-09-03',department:'network'}).completed,1);
});

test('상세를 포함한 집계는 자기 부서 권한을 유지하며 빈 결과·기간 역전을 처리한다',()=>{
  const s=M.state();s.role='network';const own=M.summarize(s,{start:'2026-09-01',end:'2026-09-16',department:'radio'});
  assert.equal(own.total,3);assert.ok(own.rows.every(t=>t.department==='network'));
  const empty=M.summarize(s,{start:'2026-01-01',end:'2026-01-31'});assert.equal(empty.total,0);
  assert.throws(()=>M.summarize(s,{start:'2026-09-16',end:'2026-09-01'}));
  s.role='user';assert.equal(M.summarize(s,{start:'2026-09-01',end:'2026-09-16'}).total,0);
});

test('부서 비교는 같은 대대 네 부서 수치만 반환하고 상세·수정 권한은 확대하지 않는다',()=>{
  const s=M.state(),range={start:'2026-09-01',end:'2026-09-16'};
  for(const role of ['network','radio','transmission','cyber']){
    s.role=role;
    const rows=M.summarizeDepartments(s,{...range,department:M.sessions[role].department});
    assert.deepEqual(rows.map(r=>[r.department,r.total,r.completed,r.pending]),[
      ['network',3,2,1],['radio',2,1,1],['transmission',3,1,2],['security',1,0,1]
    ]);
    for(const row of rows){
      assert.deepEqual(Object.keys(row).sort(),['department','total','completed','pending','rate'].sort());
      assert.equal(row.rate,row.completed/row.total);
    }
    const other=s.tasks.find(t=>t.department!==M.sessions[role].department);
    assert.equal(M.canReadTask(s,other),false);assert.equal(M.canWork(s,other),false);
    assert.throws(()=>M.updateTask(s,other.id,{tag:other.tag,status:'작업 중',note:'forbidden'}));
  }
  for(const role of ['user','viewer','unknown']){s.role=role;assert.throws(()=>M.summarizeDepartments(s,range));}
});

test('부서 비교는 기간 말 재배정·취소 제외·0건을 반영하고 전체 합계와 일치한다',()=>{
  const s=M.state();M.assign(s,'R-DEMO-003','radio',null);
  const past=M.summarizeDepartments(s,{start:'2026-09-01',end:'2026-09-15'});
  assert.equal(past.find(r=>r.department==='network').total,3);
  const range={start:'2026-09-01',end:M.today};
  const current=M.summarizeDepartments(s,range);
  assert.equal(current.find(r=>r.department==='network').total,2);
  assert.equal(current.find(r=>r.department==='radio').total,3);
  for(const key of ['total','completed','pending'])assert.equal(current.reduce((sum,r)=>sum+r[key],0),M.summarize(s,range)[key]);
  s.tasks.find(t=>t.id==='W-DEMO-008').cancelled=true;
  assert.deepEqual(M.summarizeDepartments(s,range).find(r=>r.department==='security'),{department:'security',total:0,completed:0,pending:0,rate:null});
  assert.ok(M.summarizeDepartments(s,{start:'2026-01-01',end:'2026-01-31'}).every(r=>r.total===0&&r.rate===null));
  assert.throws(()=>M.summarizeDepartments(s,{start:M.today,end:'2026-09-01'}));
});

test('재배정 전 기간은 당시 부서로 집계',()=>{
  const s=M.state();M.assign(s,'R-DEMO-003','radio',null);
  const past=M.summarize(s,{start:'2026-09-01',end:'2026-09-15',department:'network'});
  assert.ok(past.rows.some(t=>t.id==='W-DEMO-003'));
  const current=M.summarize(s,{start:'2026-09-01',end:'2026-09-16',department:'radio'});
  assert.ok(current.rows.some(t=>t.id==='W-DEMO-003'));assert.equal(s.tasks.length,9);
});
