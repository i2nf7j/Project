const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../docs/design/mockup/notification-model.js');
const data={target:'시험 장비',type:'점검',description:'시험',wish:'network',tag:'PC',urgency:'긴급',urgentReason:'작전 업무 중단',contexts:['지휘관 요청','작전 관련']};
test('긴급 사유 검증, 성격과 긴급도 분리, 통제 확인 권한·중복 방지',()=>{
 const s=M.state();s.role='user';const before=s.requests.length;
 assert.throws(()=>M.createRequest(s,{...data,urgentReason:' '}));assert.equal(s.requests.length,before);
 assert.throws(()=>M.createRequest(s,{...data,contexts:['임의 값']}));
 const r=M.createRequest(s,data);assert.equal(r.urgencyReview,null);assert.deepEqual(r.contexts,data.contexts);
 assert.match(s.notifications.at(-1).title,/긴급 요청/);
 for(const role of ['user','viewer','network']){s.role=role;assert.throws(()=>M.confirmUrgency(s,r.id));}
 s.role='bnoc';M.confirmUrgency(s,r.id);assert.equal(r.urgencyReview.by,'bnoc');assert.equal(r.requestHistory.length,1);
 assert.throws(()=>M.confirmUrgency(s,r.id));assert.equal(r.requestHistory.length,1);
 M.assign(s,r.id,'network','PC');assert.match(s.notifications.at(-1).title,/긴급 요청/);
 s.role='user';const ordinary=M.createRequest(s,{...data,urgency:'일반'});assert.equal(ordinary.urgency,'일반');assert.equal(ordinary.urgentReason,'');assert.deepEqual(ordinary.contexts,data.contexts);
});
test('배정 전 본인·BNOC·관리자만 사유와 이력으로 취소하며 작업·실적을 만들지 않는다',()=>{
 for(const role of ['user','bnoc','admin']){
  const s=M.state();s.role='user';const r=M.createRequest(s,data),before=s.tasks.length;s.role=role;
  assert.throws(()=>M.cancelRequest(s,r.id,' '));assert.ok(!r.cancelled);
  M.cancelRequest(s,r.id,' 중복 요청 ');assert.equal(r.cancelReason,'중복 요청');assert.equal(r.cancelledBy,role);assert.equal(r.requestHistory.length,1);assert.equal(M.requestStatus(s,r.id),'취소');assert.equal(s.tasks.length,before);
  assert.throws(()=>M.cancelRequest(s,r.id,'재취소'));s.role='bnoc';assert.throws(()=>M.assign(s,r.id,'network','PC'));assert.throws(()=>M.confirmUrgency(s,r.id));
 }
});
test('타인 요청·배정 이후 취소 차단 및 대리 접수 지원',()=>{
 const s=M.state();s.role='user';assert.throws(()=>M.cancelRequest(s,'R-DEMO-010','타인 요청'));
 const r=M.createRequest(s,data);s.role='network';assert.throws(()=>M.cancelRequest(s,r.id,'권한 없음'));
 s.role='bnoc';M.assign(s,r.id,'network','PC');assert.throws(()=>M.cancelRequest(s,r.id,'배정 이후'));
 const proxy=M.createRequest(s,{...data,requester:'전화 요청 부서'});assert.equal(proxy.owner,'proxy');assert.equal(proxy.urgencyReview,null);M.confirmUrgency(s,proxy.id);M.cancelRequest(s,proxy.id,'요청 철회');
});
