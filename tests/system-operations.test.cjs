const assert=require('node:assert/strict');
const M=require('../docs/design/mockup/system-operations-model.js'),O=M.systemOperations,s=M.state();s.role='bnoc';
assert.equal(O.ensure(s).nodes.length,11);assert.equal(O.rootOf(s,'switch').id,'net');
assert.equal(O.plansOn(s,'2026-09-21','security').length,1);assert.equal(O.plansOn(s,'2026-09-22','security').length,1);assert.equal(O.plansOn(s,'2026-09-23').length,0);
const plan={target:'switch',title:'경계 검증',start:'2026-09-18T23:00',end:'2026-09-19T00:00',impact:'사용 불가',scope:'시험 구역',status:'예정'};
const p=O.savePlan(s,plan);assert.equal(O.plansOn(s,'2026-09-19').length,0);assert.equal(O.plansOn(s,'2026-09-18','net').length,1);
O.savePlan(s,{...p,status:'완료'},p.id);assert.equal(O.plansOn(s,'2026-09-18').length,0);
O.savePlan(s,{...p,status:'취소'},p.id);assert.equal(O.plansOn(s,'2026-09-18').length,0);
assert.throws(()=>O.savePlan(s,{...plan,end:plan.start}));assert.throws(()=>O.savePlan(s,{...plan,start:'2026-02-30T09:00'}));assert.throws(()=>O.savePlan(s,{...plan,target:'missing'}));
const n=O.saveNode(s,{name:'시험 장비',kind:'장비',parent:'lan',status:'정상'});assert.equal(O.rootOf(s,n.id).id,'net');
assert.throws(()=>O.saveNode(s,{name:'순환',kind:'하위 체계',parent:'lan',status:'정상'},'net'));
assert.throws(()=>O.saveNode(s,{name:'잘못된 부모',kind:'장비',parent:'switch',status:'정상'}));
for(const role of ['user','viewer','network']){s.role=role;assert.throws(()=>O.saveNode(s,{name:'권한',kind:'체계',status:'정상'}));assert.throws(()=>O.savePlan(s,plan));}
console.log('PASS system operations: hierarchy, permissions, overnight/exclusive end, filters, completion/cancellation, validation');

const moved=M.state();moved.role='bnoc';const before=O.ensure(moved).nodes.find(n=>n.id==='lan').updated;
assert.equal(O.canMove(moved,'lan','switch'),false);assert.equal(O.canMove(moved,'lan','lan'),false);assert.equal(O.canMove(moved,'net','radio'),false);assert.equal(O.canMove(moved,'switch','lan'),false);
O.moveNode(moved,'lan','trans');assert.equal(O.rootOf(moved,'switch').id,'trans');assert.equal(O.plansOn(moved,'2026-09-17','net').length,0);assert.equal(O.plansOn(moved,'2026-09-17','trans').length,1);assert.equal(O.ensure(moved).nodes.find(n=>n.id==='lan').updated,before);
assert.throws(()=>O.moveNode(moved,'lan','switch'));moved.role='user';assert.throws(()=>O.moveNode(moved,'switch','radio'));
console.log('PASS move: subtree, schedule association, status timestamp preservation, cycles and permissions');

const lifecycle=M.state();lifecycle.role='bnoc';
assert.match(O.removal(lifecycle,'net').blocked,/하위/);assert.match(O.removal(lifecycle,'switch').blocked,/예정/);
assert.throws(()=>O.removeNode(lifecycle,'access','잘못된 이름'));
O.removeNode(lifecycle,'access','접속 스위치 B');assert.equal(O.ensure(lifecycle).nodes.some(n=>n.id==='access'),false);
const history=O.ensure(lifecycle).plans.find(p=>p.target==='switch');O.savePlan(lifecycle,{...history,status:'완료'},history.id);
assert.equal(O.removeNode(lifecycle,'switch','코어 스위치 A'),'retire');assert.equal(O.ensure(lifecycle).plans.some(p=>p.id===history.id),true);
assert.equal(O.ensure(lifecycle).nodes.find(n=>n.id==='switch').retired,true);
assert.throws(()=>O.savePlan(lifecycle,{...history,status:'예정'},history.id));assert.throws(()=>O.moveNode(lifecycle,'switch','radio'));
lifecycle.role='viewer';assert.throws(()=>O.removeNode(lifecycle,'base','무선 기지국 A'));
console.log('PASS delete/retire: child and schedule guards, exact name, preserved history, retired restrictions, permission');
