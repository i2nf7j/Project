const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

// DOM 없이 목업 컨트롤러의 데이터 처리와 검증을 검사한다.
function setup(){
  const nodes=new Map();
  const get=selector=>{
    if(!nodes.has(selector))nodes.set(selector,{value:'',innerHTML:'',textContent:'',dataset:{},classList:{toggle(){}},setAttribute(){},removeAttribute(){},focus(){},close(){}});
    return nodes.get(selector);
  };
  const tabs=['inventory','security'].map(name=>Object.assign(get('#'+name+'-tab'),{dataset:{equipmentTab:name}}));
  const context=vm.createContext({
    $:get,document:{querySelectorAll:()=>tabs,querySelector:get},location:{hash:''},window:{addEventListener(){}},toast(){},
    dialog(title,html){get('#dialog-body').innerHTML=html;get('#equipment-form').elements={status:{value:'확인 필요'},version:{},reason:{},file:{files:[]}};},
    FormData:class{constructor(form){this.entries=Object.entries(form.data).flatMap(([key,value])=>(Array.isArray(value)?value:[value]).map(item=>[key,item]));}getAll(key){return this.entries.filter(entry=>entry[0]===key).map(entry=>entry[1]);}[Symbol.iterator](){return this.entries[Symbol.iterator]();}},URL,setTimeout
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs/design/mockup/equipment.js'),'utf8'),context);
  return {get,run:code=>vm.runInContext(code,context),submit(data,files=[]){const form=get('#equipment-form');form.data=data;form.elements.file.files=files;form.onsubmit({preventDefault(){}});}};
}
test('부서·망·검색 조건을 함께 적용하고 빈 결과를 표시한다',()=>{
  const s=setup();s.get('#equipment-department').value='네트워크체계팀';s.get('#equipment-network').value='국방망';s.get('#equipment-search').value='업무';s.run('renderEquipment()');
  assert.match(s.get('#equipment-count').textContent,/조회 1대/);
  s.get('#equipment-search').value='없는 장비';s.run('renderEquipment()');assert.match(s.get('#equipment-rows').innerHTML,/조건에 맞는 장비가 없습니다/);
});
test('장비 등록 후 동일 식별자로 수정하고 사용자 입력을 이스케이프한다',()=>{
  const s=setup();s.run('editEquipment()');
  const data={department:'가상지원반',network:'LTE망',name:'<script>예시</script>',project:'도입',year:'2026'};s.submit(data);
  assert.equal(s.run('equipment.length'),6);assert.equal(s.run('equipment[5].status'),'확인 필요');
  assert.match(s.get('#equipment-rows').innerHTML,/&lt;script&gt;/);
  s.run('editEquipment(6)');s.submit({...data,name:'변경 장비'});assert.equal(s.run('equipment.length'),6);assert.equal(s.run('equipment[5].name'),'변경 장비');
});
test('공백 장비명은 등록하지 않는다',()=>{
  const s=setup();s.run('editEquipment()');s.submit({name:'  ',project:'도입'});assert.equal(s.run('equipment.length'),5);assert.match(s.get('#equipment-error').textContent,/장비명/);
});
test('설치 완료의 버전과 설치 불가의 사유를 검사한다',()=>{
  const s=setup();s.run('equipmentTab="security";editEquipment(3)');
  s.submit({status:'설치 완료',version:' ',reason:'',note:''});assert.equal(s.run('equipment[2].status'),'미설치');
  s.submit({status:'설치 불가',version:'',reason:' ',note:''});assert.equal(s.run('equipment[2].status'),'미설치');
  s.submit({status:'설치 불가',version:'',reason:'호환성 제한',note:'공문 요청 중'});assert.equal(s.run('equipment[2].reason'),'호환성 제한');assert.match(s.get('#equipment-rows').innerHTML,/공문 미첨부/);
});
test('다중 첨부는 모든 파일을 검증한 뒤 추가하고 파일별 연결 해제를 지원한다',()=>{
  const s=setup();const data={status:'설치 불가',version:'',reason:'호환성 제한',note:'',documentTarget:['2']};
  s.run('equipmentTab="security";editEquipment(2)');
  s.submit(data,[{name:'정상.pdf',size:20},{name:'bad.exe',size:20}]);assert.equal(s.run('equipmentDocuments.length'),0);
  s.submit(data,[{name:'large.pdf',size:11*1024*1024}]);assert.equal(s.run('equipmentDocuments.length'),0);
  s.submit(data,[{name:'공문.pdf',size:20},{name:'추가.hwpx',size:20}]);assert.equal(s.run('documentsFor(2).length'),2);
  s.run('editEquipment(2)');s.submit(data,[{name:'추가2.pdf',size:20}]);assert.equal(s.run('documentsFor(2).length'),3);
  s.run('editEquipment(2)');s.submit({...data,removeDocument:['1','3']});assert.equal(s.run('documentsFor(2).length'),1);assert.equal(s.run('documentsFor(2)[0].file.name'),'추가.hwpx');
});
test('공문 원본을 여러 장비가 공유하고 현황 수정과 연결 해제는 장비별로 처리한다',()=>{
  const s=setup();s.run('equipment.push({...equipment[1],id:6,status:"확인 필요",reason:""});equipmentTab="security";editEquipment(2)');
  const data={status:'설치 불가',version:'',reason:'호환성 제한',note:'',documentTarget:['2','6']};
  s.submit(data,[{name:'사업공문.pdf',size:20},{name:'추가공문.pdf',size:20}]);
  assert.equal(s.run('equipmentDocuments.length'),2);assert.equal(s.run('documentsFor(6).length'),2);assert.equal(s.run('equipment[5].status'),'확인 필요');
  s.run('editEquipment(2)');s.submit({...data,removeDocument:['1']});assert.equal(s.run('documentsFor(2).length'),1);assert.equal(s.run('documentsFor(6).length'),2);
  s.run('equipment[5].name="이름 변경"');assert.equal(s.run('documentsFor(6).length'),2);
});
test('새 장비는 공문을 자동 상속하지 않으며 기존 공문을 재업로드 없이 연결한다',()=>{
  const s=setup();s.run('equipmentTab="security";editEquipment(2)');
  const data={status:'설치 불가',version:'',reason:'제한',note:'',documentTarget:['2']};
  s.submit(data,[{name:'사업공문.pdf',size:20}]);s.run('equipment.push({...equipment[1],id:6});editEquipment(6)');
  assert.equal(s.run('documentsFor(6).length'),0);assert.match(s.get('#dialog-body').innerHTML,/같은 사업의 기존 공문 연결/);
  s.submit({...data,documentTarget:['6'],reuseDocument:['1']});assert.equal(s.run('equipmentDocuments.length'),1);assert.equal(s.run('documentsFor(6).length'),1);
});
test('공문 대상 미선택 또는 다른 사업 장비 선택은 전체 저장을 거부한다',()=>{
  const s=setup();s.run('equipmentTab="security";editEquipment(2)');
  const data={status:'설치 완료',version:'2.0',reason:'',note:''};
  for(const targets of [[],['1']]){s.submit({...data,documentTarget:targets},[{name:'공문.pdf',size:20}]);assert.equal(s.run('equipmentDocuments.length'),0);assert.equal(s.run('equipment[1].status'),'설치 불가');}
});
test('사업 전체와 동일 장비명 빠른 선택의 대상을 구분한다',()=>{
  const s=setup();s.run('equipment.push({...equipment[1],id:6});equipment.push({...equipment[1],id:7,name:"다른 장비"});equipmentTab="security";editEquipment(2)');
  const boxes=[2,6,7].map(id=>({value:String(id),checked:id===2}));s.get('#equipment-form').querySelectorAll=()=>boxes;
  s.get('#document-scope').value='model';s.get('#document-scope').onchange();assert.deepEqual(boxes.map(b=>b.checked),[true,true,false]);
  s.get('#document-scope').value='project';s.get('#document-scope').onchange();assert.ok(boxes.every(b=>b.checked));
  s.get('#document-scope').value='single';s.get('#document-scope').onchange();assert.deepEqual(boxes.map(b=>b.checked),[true,false,false]);
});
test('장비 운영 진입과 대시보드 복귀 시 본문을 전환한다',()=>{
  const s=setup();s.run('location.hash="#equipment";equipmentRoute()');assert.equal(s.get('#dashboard-view').hidden,true);assert.equal(s.get('#equipment').hidden,false);
  s.run('location.hash="#tasks";equipmentRoute()');assert.equal(s.get('#dashboard-view').hidden,false);assert.equal(s.get('#equipment').hidden,true);
});

