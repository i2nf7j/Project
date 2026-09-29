const {test}=require('node:test');
const assert=require('node:assert/strict');
const V=require('../docs/design/mockup/viewer-model.js');
const M=require('../docs/design/mockup/maintenance-model.js');
test('비행단별 더미 자료와 부서 합계가 일치한다',()=>{
  assert.equal(V.wings.length,3);
  const results=V.wings.map(wing=>{
    const sum=V.summarize(wing,'2026-09-01',V.asOf);
    const departments=V.departments.map(d=>V.summarize(wing,'2026-09-01',V.asOf,d));
    for(const key of ['total','completed','pending','carry'])assert.equal(sum[key],departments.reduce((n,d)=>n+d[key],0));
    assert.equal(sum.total,sum.completed+sum.pending);
    assert.equal(wing.statuses.length,4);return sum.total;
  });
  assert.equal(new Set(results).size,3);
});
test('이월·완료일·과거 기간·빈 기간을 집계한다',()=>{
  const wing=V.wings[0],early=V.summarize(wing,'2026-09-01','2026-09-02');
  assert.equal(early.total,14);assert.equal(early.completed,0);assert.equal(early.carry,14);
  const day=V.summarize(wing,'2026-09-03','2026-09-03');assert.equal(day.completed,10);
  const empty=V.summarize(wing,'2026-01-01','2026-01-31');assert.equal(empty.total,0);assert.equal(empty.rate,null);
  assert.throws(()=>V.summarize(wing,'2026-09-10','2026-09-01'));
  assert.throws(()=>V.summarize(wing,'2026-09-01','2026-10-01'));
});
test('상위 조회자는 개별 작업 조회와 모든 수정이 금지된다',()=>{
  const s=M.state();s.role='viewer';
  assert.equal(M.canReadTask(s,s.tasks[0]),false);
  assert.equal(M.canWork(s,s.tasks[0]),false);
  assert.equal(M.canAssign(s),false);assert.equal(M.canSetCpcon(s),false);
});
