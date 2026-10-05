/* 상위 조회자 전용 집계 시연 자료. 실제 비행단 실적·운영상태가 아닙니다. */
(() => {
  const asOf='2026-09-16';
  const systems=['기반통신체계','무선체계','정보체계','정보보호체계'];
  const departments=['네트워크체계반','무선체계반','정보체계반','사이버 통제실'];
  const wings=[
    {id:'17',name:'제17전투비행단',cpcon:5,statuses:['정상','정상','정비 중','정상'],notes:['가상 연결 점검 완료','가상 송수신 정상','가상 전원 예방정비','가상 보안 점검 완료'],counts:[8,5,4,3]},
    {id:'a',name:'가상 비행단 A',cpcon:4,statuses:['성능저하','정상','장애','정상'],notes:['가상 응답 지연 점검','가상 송수신 정상','가상 회선 장애 조치 중','가상 보안 점검 완료'],counts:[12,7,6,4]},
    {id:'b',name:'가상 비행단 B',cpcon:3,statuses:['정상','정비 중','정상','성능저하'],notes:['가상 연결 점검 완료','가상 장비 정기 점검','가상 전송 상태 정상','가상 업데이트 지연 점검'],counts:[5,9,3,6]}
  ].map((wing,index)=>({...wing,updated:asOf+' 14:00',records:departments.flatMap((department,d)=>[
    {department,created:'2026-08-28',completed:'2026-09-03',count:d+1},
    {department,created:'2026-08-30',completed:null,count:index+1},
    {department,created:'2026-09-05',completed:'2026-09-10',count:wing.counts[d]},
    {department,created:'2026-09-12',completed:null,count:wing.counts[d]-2},
    {department,created:'2026-09-15',completed:'2026-09-16',count:index+1}
  ])}));
  // 각 집계 건을 고유 작업으로 구성한 가상 자료. 실제 BNOC 저장 자료와는 별개다.
  const titles=['랜선 연결 장애 점검','무선 송수신 점검','전송 회선 복구','보안 업데이트 점검'];
  wings.forEach(wing=>{wing.records=wing.records.flatMap((r,batch)=>Array.from({length:r.count},(_,i)=>({
    ...r,count:1,id:`${wing.id}-${batch+1}-${i+1}`,title:titles[departments.indexOf(r.department)],
    result:r.completed?'점검 및 정상 동작 확인':'원인 확인 및 조치 진행 중'
  })));});
  function listTasks(wing,start,end,department){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end||end>asOf)throw new Error('시작일·종료일을 확인하세요. 시연 기준일은 '+asOf+'입니다.');
    return wing.records.map(r=>r.departmentHistory?{...r,department:r.departmentHistory.filter(h=>h.date<=end).at(-1)?.department||r.department}:r).filter(r=>(!department||r.department===department)&&r.created<=end&&(!r.completed||r.completed>=start));
  }
  function summarize(wing,start,end,department){
    const rows=listTasks(wing,start,end,department);
    const total=rows.reduce((n,r)=>n+r.count,0);
    const completed=rows.reduce((n,r)=>n+(r.completed&&r.completed<=end?r.count:0),0);
    return {total,completed,pending:total-completed,carry:rows.reduce((n,r)=>n+(r.created<start?r.count:0),0),rate:total?Math.round(completed/total*100):null};
  }
  // 비행단별 독립 가상 운영 구성. BNOC 브라우저 저장 자료를 다른 비행단에 재사용하지 않는다.
  wings.forEach((wing,w)=>{wing.operationDetails=systems.map((name,i)=>({id:wing.id+'-system-'+i,name,department:departments[i],status:wing.statuses[i],children:[{name:['업무망','기지 무선망','전송 구간','보안 서비스'][i],equipment:[{id:wing.id+'-eq-'+i,name:['코어 스위치','무선 기지국','전송 장비','방화벽'][i]+' '+wing.id.toUpperCase(),status:wing.statuses[i],location:wing.name+' 가상 통신실',asset:'DEMO-'+wing.id+'-'+(i+1)}]}],plans:[{title:name+' 예방점검',start:'2026-09-'+String(17+w+i).padStart(2,'0')+'T19:00',end:'2026-09-'+String(17+w+i).padStart(2,'0')+'T21:00',impact:i===0?'사용 불가':i===3?'영향 없음':'일부 제한',scope:wing.name+' 가상 '+['업무망 구역','무선망 구역','전송 구간','보안 서비스'][i]}]}));});
  const api={asOf,systems,departments,wings,summarize,listTasks};
  if(typeof module!=='undefined')module.exports=api;else window.WingViewer=api;
})();
