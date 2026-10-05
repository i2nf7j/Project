const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../docs/design/mockup/maintenance-model.js');

test('일괄 변경은 선택 인원만 수정하고 잘못된 선택·권한은 원본을 유지한다',()=>{
  const s=M.state(),ids=s.personnel.slice(0,2).map(p=>p.id);
  M.updatePersonnelStatus(s,ids,'휴가');
  assert.ok(s.personnel.slice(0,2).every(p=>p.status==='휴가'));
  assert.ok(s.personnel.slice(2).every(p=>p.status==='주간'));
  for(const [selection,status] of [[[],'주간'],[[ids[0],'missing'],'출장'],[ids,'없는 상태']]){
    const before=JSON.stringify(s);assert.throws(()=>M.updatePersonnelStatus(s,selection,status));assert.equal(JSON.stringify(s),before);
  }
  for(const role of Object.keys(M.sessions)){
    s.role=role;
    if(['bnoc','admin'].includes(role))M.updatePersonnelStatus(s,ids,'오프');
    else{const before=JSON.stringify(s);assert.throws(()=>M.updatePersonnelStatus(s,ids,'주간'));assert.equal(JSON.stringify(s),before);}
  }
});

test('BNOC·관리자만 병력과 근무 편성을 수정할 수 있다',()=>{
  for(const role of Object.keys(M.sessions)){
    const s=M.state();s.role=role;
    const person={...s.personnel[0],name:'수정 인원',department:'security',rank:'원사',status:'휴가'};
    const duty=structuredClone(s.duty);duty.rows[0].name='수정 근무자';
    if(['bnoc','admin'].includes(role)){
      M.updatePersonnel(s,person.id,person);M.updateDuty(s,duty);
      assert.equal(s.personnel[0].name,'수정 인원');assert.equal(s.personnel[0].department,'security');
      assert.equal(s.duty.rows[0].name,'수정 근무자');
    }else{
      const before=JSON.stringify(s);
      assert.throws(()=>M.updatePersonnel(s,person.id,person),/BNOC 또는 관리자/);
      assert.throws(()=>M.updateDuty(s,duty),/BNOC 또는 관리자/);
      assert.equal(JSON.stringify(s),before);
    }
  }
});
test('병력 수정은 잘못된 입력을 거부하고 초기 데이터에 영향을 주지 않는다',()=>{
  const s=M.state(),person={...s.personnel[0]},before=JSON.stringify(s);
  for(const bad of [{name:'  '},{name:'가'.repeat(41)},{rank:'없는 계급'},{department:'없는 부서'},{status:'없는 상태'}]){
    assert.throws(()=>M.updatePersonnel(s,person.id,{...person,...bad}));assert.equal(JSON.stringify(s),before);
  }
  assert.throws(()=>M.updatePersonnel(s,'missing',person));
  M.updatePersonnel(s,person.id,{...person,name:'  새 이름  '});
  assert.equal(s.personnel[0].name,'새 이름');assert.equal(M.state().personnel[0].name,person.name);
});
test('근무 편성은 날짜·필수값·중복을 검증한 뒤 전체를 저장한다',()=>{
  const s=M.state(),before=JSON.stringify(s);
  const invalid=[{end:s.duty.start},{end:'2026-09-08T09:00'},{start:'2026-02-30T18:00'},{manager:' '},{rows:[]},{rows:[s.duty.rows[0],s.duty.rows[0]]}];
  for(const bad of invalid){assert.throws(()=>M.updateDuty(s,{...structuredClone(s.duty),...bad}));assert.equal(JSON.stringify(s),before);}
  const duty=structuredClone(s.duty);duty.rows[0].name='저장되면 안 됨';duty.rows[1].phone=' ';
  assert.throws(()=>M.updateDuty(s,duty));assert.equal(JSON.stringify(s),before);
  duty.rows[1].phone='DEMO-9999';duty.start='2026-09-16T18:00';duty.end='2026-09-17T09:00';
  M.updateDuty(s,duty);assert.equal(s.duty.end,duty.end);assert.equal(s.duty.rows[1].phone,'DEMO-9999');
});
