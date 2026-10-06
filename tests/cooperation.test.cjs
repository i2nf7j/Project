const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../docs/design/mockup/maintenance-model.js');
const id='C-DEMO-001',requestId='R-DEMO-003';

test('only recipient rejects and sender withdraws pending cooperation',()=>{
  for(const role of Object.keys(M.sessions))for(const decision of ['거절','철회']){
    const s=M.state();s.role=role;const before=JSON.stringify(s),allowed=decision==='거절'?role==='cyber':role==='network';
    if(!allowed){assert.throws(()=>M.resolveCooperation(s,id,decision,'사유'));assert.equal(JSON.stringify(s),before);continue;}
    const count=s.tasks.length;M.resolveCooperation(s,id,decision,'  잘못 요청  ');
    const c=s.cooperation[0];assert.equal(c.status,decision);assert.equal(c.resolutionReason,'잘못 요청');assert.equal(c.resolvedBy,role);assert.ok(Number.isFinite(Date.parse(c.resolvedAt)));assert.equal(s.tasks.length,count);
    assert.deepEqual(JSON.parse(JSON.stringify(s)).cooperation,s.cooperation);
  }
});
test('reason and action validation leave state unchanged',()=>{
  const s=M.state();s.role='network';const before=JSON.stringify(s);
  for(const reason of ['', '   ',null,undefined,123])assert.throws(()=>M.resolveCooperation(s,id,'철회',reason));
  assert.throws(()=>M.resolveCooperation(s,id,'수락','사유'));assert.throws(()=>M.resolveCooperation(s,'missing','철회','사유'));
  assert.equal(JSON.stringify(s),before);
});
test('resolved cooperation cannot be accepted or changed; a new request preserves its history',()=>{
  for(const decision of ['거절','철회']){
    const s=M.state();s.role=decision==='거절'?'cyber':'network';M.resolveCooperation(s,id,decision,'지원 불필요');
    const record={...s.cooperation[0]};assert.throws(()=>M.resolveCooperation(s,id,decision,'재처리'));
    s.role='cyber';assert.throws(()=>M.accept(s,id,''));
    s.role='network';M.requestCooperation(s,'W-DEMO-003','security','새로운 지원 범위');
    assert.equal(s.cooperation.length,2);assert.deepEqual(s.cooperation[0],record);
    assert.throws(()=>M.requestCooperation(s,'W-DEMO-003','security','중복'));
  }
  const s=M.state();s.role='cyber';M.accept(s,id,'');assert.throws(()=>M.resolveCooperation(s,id,'거절','이미 수락'));
  s.role='network';assert.throws(()=>M.resolveCooperation(s,id,'철회','이미 수락'));
});
test('closed or cancelled requests cannot resolve or accept cooperation',()=>{
  for(const key of ['closed','cancelled']){
    const s=M.state();s.requests.find(r=>r.id===requestId)[key]=M.today;s.role='cyber';
    const before=JSON.stringify(s);assert.throws(()=>M.resolveCooperation(s,id,'거절','사유'));assert.throws(()=>M.accept(s,id,''));
    assert.equal(JSON.stringify(s),before);s.role='bnoc';assert.throws(()=>M.close(s,requestId));
  }
});
test('pending cooperation blocks ready status and closing until resolved',()=>{
  const s=M.state();assert.equal(M.requestStatus(s,requestId),'조치 중');
  for(const t of s.tasks.filter(t=>t.requestId===requestId))M.updateTask(s,t.id,{tag:t.tag,status:'조치 완료',note:'조치 완료'});
  assert.equal(M.requestStatus(s,requestId),'공조 처리 대기');assert.throws(()=>M.close(s,requestId));
  s.role='network';M.resolveCooperation(s,id,'철회','추가 지원 불필요');assert.equal(M.requestStatus(s,requestId),'종결 대기');
  assert.throws(()=>M.close(s,requestId));s.role='bnoc';M.close(s,requestId);assert.equal(M.requestStatus(s,requestId),'종결');
});
