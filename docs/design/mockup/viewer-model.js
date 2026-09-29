/* 상위 조회자 전용 집계 시연 자료. 실제 비행단 실적·운영상태가 아닙니다. */
(() => {
  const asOf='2026-09-16';
  const systems=['네트워크체계','무선체계','전송체계','정보보호체계'];
  const departments=['네트워크체계팀','무선체계팀','전송체계팀','사이버(정보보호)팀'];
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
  function summarize(wing,start,end,department){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end||end>asOf)throw new Error('시작일·종료일을 확인하세요. 시연 기준일은 '+asOf+'입니다.');
    const rows=wing.records.filter(r=>(!department||r.department===department)&&r.created<=end&&(!r.completed||r.completed>=start));
    const total=rows.reduce((n,r)=>n+r.count,0);
    const completed=rows.reduce((n,r)=>n+(r.completed&&r.completed<=end?r.count:0),0);
    return {total,completed,pending:total-completed,carry:rows.reduce((n,r)=>n+(r.created<start?r.count:0),0),rate:total?Math.round(completed/total*100):null};
  }
  const api={asOf,systems,departments,wings,summarize};
  if(typeof module!=='undefined')module.exports=api;else window.WingViewer=api;
})();
