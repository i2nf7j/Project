const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../docs/design/mockup/operations-model.js');
// Historical fixture is explicit; the current demo roster is seeded on M.today.
const currentState=M.state;M.state=()=>{const s=currentState();s.duty.start='2026-09-09T18:00';s.duty.end='2026-09-10T09:00';s.dutyRosters={'2026-09-09':structuredClone(s.duty)};return s;};
test('저장된 생활관 편성 제거 후 복사·저장 및 자동 오프 갱신',()=>{
 const s=M.state(),day='2026-09-15',next='2026-09-16',id=s.personnel[0].id;
 const removed={id:'D-DEMO-3',position:'생활관 근무자',rank:'중사',name:'가상 해솔',phone:'DEMO-1003',personId:id,kind:'야간'};
 s.duty.rows.push({...removed});s.dutyRosters[day]=structuredClone(s.duty);M.confirmPersonnel(s,next);
 assert.equal(M.personnelStatusOn(s,id,next),'오프');
 const vm=require('node:vm'),fs=require('node:fs');
 const context=vm.createContext({M,localStorage:{getItem:()=>JSON.stringify({version:1,state:s,at:'2026-09-16T00:00:00Z'})}});
 vm.runInContext(fs.readFileSync('docs/design/mockup/demo-storage.js','utf8'),context);
 const loaded=vm.runInContext('loadDemoState()',context);
 assert.equal(loaded.duty.rows.length,2);assert.equal(M.dutyOn(loaded,day).rows.length,2);
 assert.equal(M.personnelStatusOn(loaded,id,next),'주간');assert.equal(loaded.personnelChecks[next],undefined);
 const copied=M.previousDuty(loaded,next);M.saveDutyOn(loaded,next,copied);assert.equal(M.dutyOn(loaded,next).rows.length,2);
 assert.equal(loaded.personnel.length,s.personnel.length);
});
test('당직·야간 편성 다음 날 오프와 편성 교체·주간 전환',()=>{
 const s=M.state(),day='2026-09-15',next='2026-09-16',d=M.previousDuty(s,day),[a,b]=s.personnel;
 d.rows[0].personId=a.id;d.rows[0].kind='당직';d.rows[1].personId=b.id;d.rows[1].kind='야간';
 M.confirmPersonnel(s,next);const undo=M.setPersonnelPeriod(s,[a.id],'출장','2026-09-10','2026-09-10');M.saveDutyOn(s,day,d);
 assert.equal(s.personnelChecks[next],undefined);assert.throws(()=>M.undoPersonnelPeriod(s,undo));
 for(const p of [a,b]){assert.equal(M.personnelStatusOn(s,p.id,day),'주간');assert.equal(M.personnelStatusOn(s,p.id,next),'오프');assert.equal(M.personnelStatusOn(s,p.id,'2026-09-17'),'주간');}
 assert.match(M.personnelOffReasonOn(s,b.id,next),/야간 후 자동 오프/);
 d.rows[0].personId='';d.rows[1].kind='주간';M.saveDutyOn(s,day,d);
 assert.equal(M.personnelStatusOn(s,a.id,next),'주간');assert.equal(M.personnelStatusOn(s,b.id,next),'주간');
 d.rows[0].kind='잘못된 구분';const before=JSON.stringify(s);assert.throws(()=>M.saveDutyOn(s,day,d));assert.equal(JSON.stringify(s),before);
});
test('기간 야간·당직 다음 날 오프, 직접 지정 우선 및 되돌리기',()=>{
 const s=M.state(),id=s.personnel[0].id;
 M.confirmPersonnel(s,'2026-09-16');const undo=M.setPersonnelPeriod(s,[id],'야간','2026-09-15','2026-09-15');
 assert.equal(s.personnelChecks['2026-09-16'],undefined);assert.equal(M.personnelStatusOn(s,id,'2026-09-16'),'오프');
 M.undoPersonnelPeriod(s,undo);assert.ok(s.personnelChecks['2026-09-16']);assert.equal(M.personnelStatusOn(s,id,'2026-09-16'),'주간');
 M.setPersonnelPeriod(s,[id],'당직','2026-09-15','2026-09-15');
 M.setPersonnelPeriod(s,[id],'휴가','2026-09-16','2026-09-16');assert.equal(M.personnelStatusOn(s,id,'2026-09-16'),'휴가');assert.equal(M.personnelOffReasonOn(s,id,'2026-09-16'),'');
 const d=M.previousDuty(s,'2026-09-14');d.rows[0].personId=id;M.saveDutyOn(s,'2026-09-14',d);
 assert.equal(M.personnelStatusOn(s,id,'2026-09-15'),'당직');
 assert.equal(M.personnelStatusOn(JSON.parse(JSON.stringify(s)),id,'2026-09-16'),'휴가');
});
test('기간 적용·종료·겹침·확인 무효화·되돌리기',()=>{
 const s=M.state(),id=s.personnel[0].id;M.confirmPersonnel(s,M.today);
 const undo=M.setPersonnelPeriod(s,[id],'휴가',M.today,'2026-09-18');
 assert.equal(s.personnelChecks[M.today],undefined);assert.equal(M.personnelStatusOn(s,id,'2026-09-18'),'휴가');assert.equal(M.personnelStatusOn(s,id,'2026-09-19'),'주간');
 M.undoPersonnelPeriod(s,undo);assert.ok(s.personnelChecks[M.today]);assert.equal(M.personnelStatusOn(s,id,M.today),'주간');
 M.setPersonnelPeriod(s,[id],'출장',M.today,'2026-09-18');M.setPersonnelPeriod(s,[id],'오프','2026-09-17','2026-09-17');
 assert.equal(M.personnelStatusOn(s,id,'2026-09-17'),'오프');assert.equal(M.personnelStatusOn(s,id,'2026-09-18'),'출장');
 assert.throws(()=>M.undoPersonnelPeriod(s,undo));assert.throws(()=>M.confirmPersonnel(s,'2026-09-17'));
 const before=JSON.stringify(s);assert.throws(()=>M.setPersonnelPeriod(s,[id],'휴가','2026-02-30','2026-03-03'));assert.equal(JSON.stringify(s),before);
});
test('날짜별 근무 편성과 명단 연결·중복 검증',()=>{
 const s=M.state(),d=M.previousDuty(s,M.today);assert.equal(d.start,M.today+'T18:00');d.rows[0].personId=s.personnel[0].id;
 M.saveDutyOn(s,M.today,d);assert.equal(M.dutyOn(s,M.today).rows[0].name,s.personnel[0].name);assert.equal(M.dutyOn(s,M.today).rows[0].unit,'네트워크체계반');
 assert.equal(M.dutyOn(s,'2026-09-17').rows[0].name,'');assert.equal(M.dutyOn(s,'2026-09-09').rows[0].name,'가상 하늘');
 d.rows[1].personId=d.rows[0].personId;const before=JSON.stringify(s);assert.throws(()=>M.saveDutyOn(s,M.today,d));assert.equal(JSON.stringify(s),before);
});
test('비편집 역할은 날짜별 수정·확인·저장을 할 수 없다',()=>{
 for(const role of ['user','network','radio','transmission','cyber','viewer']){const s=M.state();s.role=role;const before=JSON.stringify(s);assert.throws(()=>M.confirmPersonnel(s,M.today));assert.throws(()=>M.setPersonnelPeriod(s,[s.personnel[0].id],'휴가',M.today,M.today));assert.throws(()=>M.saveDutyOn(s,M.today,M.previousDuty(s,M.today)));assert.equal(JSON.stringify(s),before);}
});
